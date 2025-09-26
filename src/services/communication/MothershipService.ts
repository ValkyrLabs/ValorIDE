import {
  WebsocketMessage,
  WebsocketMessageTypeEnum,
  WebsocketMessageToJSON,
  WebsocketMessageFromJSON,
} from "@thor/model";
import { BASE_PATH } from "@thor/src/runtime";
import { EventEmitter } from "events";

export interface MothershipConnectionOptions {
  jwtToken: string;
  userId?: string;
  instanceId?: string;
  baseUrl?: string;
}

export interface RemoteCommand {
  id: string;
  type: string;
  payload: any;
  sourceInstanceId: string;
  targetInstanceId?: string;
}

/**
 * MothershipService manages the websocket connection to the ValkyrAI backend
 * for real-time communication and remote control capabilities.
 */
export class MothershipService extends EventEmitter {
  private websocket: WebSocket | null = null;
  private options: MothershipConnectionOptions;
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private instanceId: string;
  // Simple guard to avoid ack loops
  private suppressAckTopics = new Set<string>(['ack', 'nack']);

  constructor(options: MothershipConnectionOptions) {
    super();
    this.options = options;
    this.instanceId = options.instanceId || this.generateInstanceId();
  }

  private generateInstanceId(): string {
    return `valoride-${Math.random().toString(36).substring(2, 15)}`;
  }

  public async connect(): Promise<void> {
    if (this.connected && this.websocket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const baseUrl = this.normalizeWsUrl(this.options.baseUrl) ?? this.getDefaultWebsocketUrl();
      const wsUrl = new URL('/chat', baseUrl);
      wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';

      // Add JWT token as query parameter for authentication
      wsUrl.searchParams.set('token', this.options.jwtToken);
      wsUrl.searchParams.set('instanceId', this.instanceId);

      this.websocket = new WebSocket(wsUrl.toString());

      this.websocket.onopen = () => {
        console.log('Mothership websocket connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.startPingInterval();
        this.emit('connected');

        // Send initial registration message
        this.sendMessage({
          type: WebsocketMessageTypeEnum.SERVICE,
          payload: JSON.stringify({
            action: 'register',
            instanceId: this.instanceId,
            userId: this.options.userId,
            timestamp: Date.now(),
          }),
          time: new Date().toISOString(),
          user: { id: this.options.userId || 'anonymous' } as any,
        });

        // Announce presence and request roll call using BROADCAST payload envelope
        try {
          this.sendAppTopic('presence:join', { id: this.instanceId });
          this.sendAppTopic('auth:ack', { id: this.instanceId });
          this.sendAppTopic('presence:rollcall', { id: this.instanceId });
        } catch (e) {
          console.warn('Failed to send presence/rollcall on connect:', e);
        }
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const message = WebsocketMessageFromJSON(data);
          this.handleIncomingMessage(message);
        } catch (error) {
          console.error('Failed to parse mothership message:', error);
        }
      };

      this.websocket.onclose = (event) => {
        console.log('Mothership websocket closed:', event.code, event.reason);
        this.connected = false;
        this.stopPingInterval();
        this.emit('disconnected', event);

        // Attempt reconnection if not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.websocket.onerror = (error) => {
        console.error('Mothership websocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Failed to connect to mothership:', error);
      this.emit('error', error);
      throw error;
    }
  }

  private getDefaultWebsocketUrl(): string {
    const envOverride =
      this.normalizeWsUrl(
        (process.env.VALORIDE_WSS_BASE_PATH ?? process.env.VITE_wssBasePath ?? "").trim() || undefined,
      );
    if (envOverride) return envOverride;

    const derived = this.normalizeWsUrl(BASE_PATH);
    if (derived) return derived;

    return "ws://localhost:8080";
  }

  private normalizeWsUrl(input?: string | null): string | undefined {
    if (!input) return undefined;
    const trimmed = input.trim();
    if (!trimmed) return undefined;

    if (/^wss?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    try {
      const url = new URL(trimmed);
      if (url.protocol === "https:" || url.protocol === "http:") {
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      }
      return url.toString();
    } catch (error) {
      return undefined;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, Math.min(this.reconnectAttempts - 1, 4));

    console.log(`Scheduling mothership reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      if (!this.connected) {
        this.connect().catch((error) => {
          console.error('Mothership reconnect failed:', error);
        });
      }
    }, delay);
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: WebsocketMessageTypeEnum.SERVICE,
          payload: JSON.stringify({ action: 'ping' }),
          time: new Date().toISOString(),
        });
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleIncomingMessage(message: WebsocketMessage): void {
    try {
      const payload = message.payload ? JSON.parse(message.payload) : {};

      switch (message.type) {
        case WebsocketMessageTypeEnum.SERVICE:
          if (payload.action === 'pong') {
            // Handle ping response
            return;
          }
          break;

        case WebsocketMessageTypeEnum.AGENT:
          // Remote command from another ValorIDE instance or ValkyrAI agent
          this.handleRemoteCommand(payload);
          break;

        case 'command' as any:
          // Command type for mothership protocol
          this.handleRemoteCommand(payload);
          break;

        case WebsocketMessageTypeEnum.BROADCAST:
          // Broadcast message to all connected instances
          this.emit('broadcast', payload);
          break;

        case WebsocketMessageTypeEnum.PRIVATE:
          // Direct message to this instance
          this.emit('privateMessage', payload);
          break;

        default:
          console.log('Received mothership message:', message);
          this.emit('message', message);
      }

      // Handle ack/nack and roll-call using the BROADCAST-style payload envelope
      // Payload convention: { topic, payload, senderId, messageId, timestamp }
      try {
        const topic = payload?.topic as string | undefined;
        const senderId = payload?.senderId as string | undefined;
        const messageId = payload?.messageId as string | undefined;

        if (topic && typeof topic === 'string') {
          // Respond to roll call requests from other instances
          if (topic === 'presence:rollcall' && senderId && senderId !== this.instanceId) {
            this.sendAppTopic('presence:here', { id: this.instanceId });
          }

          // Avoid acknowledging acks to prevent loops
          if (!this.suppressAckTopics.has(topic) && messageId && (senderId || '') !== this.instanceId) {
            this.sendAppTopic('ack', { messageId, to: senderId, from: this.instanceId });
          }
        }
      } catch (e) {
        // Non-fatal if payload shape doesn't match
      }
    } catch (error) {
      console.error('Error handling mothership message:', error);
    }
  }

  private handleRemoteCommand(payload: any): void {
    try {
      const command: RemoteCommand = {
        id: payload.id || Math.random().toString(36),
        type: payload.type,
        payload: payload.data || payload.payload,
        sourceInstanceId: payload.sourceInstanceId,
        targetInstanceId: payload.targetInstanceId,
      };

      // Only process commands targeted at this instance or broadcast commands
      if (command.targetInstanceId && command.targetInstanceId !== this.instanceId) {
        return;
      }

      console.log('Received remote command:', command);
      this.emit('remoteCommand', command);
    } catch (error) {
      console.error('Error processing remote command:', error);
    }
  }

  public sendMessage(message: Partial<WebsocketMessage>): void {
    if (!this.connected || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message - mothership not connected');
      return;
    }

    try {
      const fullMessage: WebsocketMessage = {
        id: message.id || Math.random().toString(36),
        type: message.type || WebsocketMessageTypeEnum.USER,
        payload: message.payload || '',
        time: message.time || new Date().toISOString(),
        user: message.user || { id: this.options.userId || 'anonymous' } as any,
        ...message,
      };

      const jsonMessage = WebsocketMessageToJSON(fullMessage);
      this.websocket.send(JSON.stringify(jsonMessage));
    } catch (error) {
      console.error('Failed to send mothership message:', error);
    }
  }

  public sendValorIDEAction(taskId: string, action: string, data: any): void {
    this.sendMessage({
      type: WebsocketMessageTypeEnum.AGENT,
      payload: JSON.stringify({
        action: 'valoride_action',
        taskId,
        actionType: action,
        data,
        instanceId: this.instanceId,
        timestamp: Date.now(),
      }),
    });
  }

  public sendRemoteCommand(command: Omit<RemoteCommand, 'sourceInstanceId'>): void {
    this.sendMessage({
      type: 'command' as any, // Using command type for mothership protocol
      payload: JSON.stringify({
        ...command,
        sourceInstanceId: this.instanceId,
        timestamp: Date.now(),
      }),
    });
  }

  /**
   * Helper to send an application-level topic message wrapped in a WebsocketMessage payload
   * that other bridges (e.g., thorBridge) also understand.
   */
  public sendAppTopic(topic: string, data: any, type: WebsocketMessageTypeEnum = WebsocketMessageTypeEnum.BROADCAST): void {
    const envelope = {
      topic,
      payload: data,
      senderId: this.instanceId,
      messageId: Math.random().toString(36).slice(2, 12),
      timestamp: Date.now(),
    };
    this.sendMessage({
      type,
      payload: JSON.stringify(envelope),
      time: new Date().toISOString(),
    });
  }

  public disconnect(): void {
    this.stopPingInterval();

    if (this.websocket) {
      this.websocket.close(1000, 'Client disconnect');
      this.websocket = null;
    }

    this.connected = false;
    this.emit('disconnected');
  }

  public isConnected(): boolean {
    return this.connected && this.websocket?.readyState === WebSocket.OPEN;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public updateJwtToken(newToken: string): void {
    this.options.jwtToken = newToken;

    // Reconnect with new token if currently connected
    if (this.connected) {
      this.disconnect();
      setTimeout(() => {
        this.connect().catch(console.error);
      }, 1000);
    }
  }
}
