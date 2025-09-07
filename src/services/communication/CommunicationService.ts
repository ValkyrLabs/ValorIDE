import EventEmitter from "events";

export type CommunicationMessage = {
  type: string;
  payload: any;
  senderId: string;
  messageId: string;
  timestamp: number;
};

export type CommunicationRole = "manager" | "worker";

interface CommunicationServiceOptions {
  role: CommunicationRole;
  senderId?: string;
}

/**
 * CommunicationService wraps the existing ValkyrAI WebSocket client
 * to provide inter-window communication between ValorIDE instances.
 * Now with robust error handling for all environments.
 */
export class CommunicationService extends EventEmitter {
  private role: CommunicationRole;
  private senderId: string;
  private connected: boolean = false;
  public ready: boolean = false;
  public error: Error | null = null;
  private vscodeApi: any | null = null;
  public hubConnected: boolean = false;
  public thorConnected: boolean = false;
  private peers: Set<string> = new Set();

  constructor(options: CommunicationServiceOptions) {
    super();
    this.role = options.role;
    this.senderId = options.senderId ?? this.generateSenderId();
    // Prevent Node/EventEmitter from crashing the process on 'error' with no listeners
    // Consumers can still subscribe to 'error', but we default to a no-op handler.
    if (this.listenerCount("error") === 0) {
      this.on("error", () => {
        // Swallow by default; actual logging happens in emitSafeError
      });
    }
  }

  private generateSenderId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  public static isSupported(): boolean {
    // Only run in browser-like environments
    return typeof window !== "undefined" && typeof window.addEventListener === "function";
  }

  public connect() {
    if (this.connected) return;
    if (!CommunicationService.isSupported()) {
      // Gracefully noop in non-browser environments (e.g., VS Code extension host)
      this.ready = false;
      this.error = new Error(
        "CommunicationService: Not running in a browser context.",
      );
      // Log as a warning instead of emitting 'error' to avoid crashing the host.
      if (typeof console !== "undefined") {
        console.warn(this.error.message);
      }
      return;
    }
    try {
      // Thor/STOMP bridge -> emits CustomEvent('websocket-message', { detail }) in webview
      window.addEventListener("websocket-message", this.handleIncomingMessage);

      // VS Code extension hub -> receives postMessage({ type: 'telecom:message', message })
      window.addEventListener("message", (evt: MessageEvent) => {
        try {
          const data: any = evt.data;
          if (data && data.type === "telecom:message" && data.message) {
            const msg = data.message as CommunicationMessage;
            if (msg.senderId !== this.senderId) {
              this.emit("message", msg);
              // Track presence from hub
              if (msg.type === "presence:join" && msg.payload?.id) {
                this.peers.add(msg.payload.id);
                this.emit("presence", Array.from(this.peers));
              }
              if (msg.type === "presence:leave" && msg.payload?.id) {
                this.peers.delete(msg.payload.id);
                this.emit("presence", Array.from(this.peers));
              }
              if (msg.type === "presence:state" && Array.isArray(msg.payload?.ids)) {
                this.peers = new Set(msg.payload.ids);
                this.emit("presence", Array.from(this.peers));
              }
            }
          }
        } catch (e) {
          // ignore
        }
      });

      // VS Code API (webview only)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.vscodeApi = (window as any).acquireVsCodeApi?.();
      } catch {
        this.vscodeApi = null;
      }
      this.hubConnected = !!this.vscodeApi;

      // Thor connection status from thorBridge
      window.addEventListener("telecom-status", (evt: Event) => {
        try {
          const ce = evt as CustomEvent<{ thorConnected: boolean; phase: string }>;
          this.thorConnected = !!ce.detail?.thorConnected;
          // ready when either hub or thor connected
          this.ready = this.hubConnected || this.thorConnected;
          this.emit("status", { hubConnected: this.hubConnected, thorConnected: this.thorConnected, phase: ce.detail?.phase });
        } catch {
          // ignore
        }
      });
      this.connected = true;
      this.ready = this.hubConnected || this.thorConnected;
      this.error = null;
    } catch (err: any) {
      this.ready = false;
      this.error = err instanceof Error ? err : new Error(String(err));
      this.emitSafeError(this.error, "connect");
    }
  }

  public disconnect() {
    if (!this.connected) return;
    if (!CommunicationService.isSupported()) return;
    try {
      window.removeEventListener("websocket-message", this.handleIncomingMessage);
      this.connected = false;
      this.ready = false;
    } catch (err: any) {
      this.error = err instanceof Error ? err : new Error(String(err));
      this.emitSafeError(this.error, "disconnect");
    }
  }

  private handleIncomingMessage = (event: Event) => {
    try {
      const customEvent = event as CustomEvent;
      const message: CommunicationMessage = customEvent.detail;
      if (!message || typeof message !== "object") return;
      if (message.senderId === this.senderId) {
        // Ignore own messages
        return;
      }
      this.emit("message", message);
    } catch (err: any) {
      this.error = err instanceof Error ? err : new Error(String(err));
      this.emitSafeError(this.error, "message handler");
    }
  };

  public sendMessage(type: string, payload: any) {
    if (!this.connected || !CommunicationService.isSupported()) {
      if (typeof console !== "undefined") {
        console.warn("CommunicationService: Not connected or not supported, cannot send message.");
      }
      return;
    }
    try {
      const message: CommunicationMessage = {
        type,
        payload,
        senderId: this.senderId,
        messageId: this.generateMessageId(),
        timestamp: Date.now(),
      };
      // Thor/STOMP bridge listener (inside webview) picks this up
      const event = new CustomEvent("websocket-send", { detail: message });
      window.dispatchEvent(event);

      // Local multi-instance via VS Code hub
      if (this.vscodeApi) {
        try {
          this.vscodeApi.postMessage({ type: "telecom:send", message });
        } catch {
          // ignore postMessage errors
        }
      }
    } catch (err: any) {
      this.error = err instanceof Error ? err : new Error(String(err));
      this.emitSafeError(this.error, "sendMessage");
    }
  }

  private generateMessageId(): string {
    return Math.random().toString(36).substring(2, 12);
  }

  private emitSafeError(error: Error, context: string) {
    if (typeof console !== "undefined") {
      console.error(`CommunicationService ${context} error:`, error);
    }
    // Always emit 'error' safely; default no-op listener prevents crash
    this.emit("error", error);
  }
}
