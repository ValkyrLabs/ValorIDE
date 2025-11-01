import EventEmitter from "events";
/**
 * CommunicationService wraps STOMP/WebSocket and VSCode hub messaging,
 * normalizing all messages into WebsocketMessage entities.
 */
export class CommunicationService extends EventEmitter {
    role;
    senderId;
    connected = false;
    ready = false;
    error = null;
    vscodeApi = null;
    hubConnected = false;
    thorConnected = false;
    peers = new Set();
    // Lightweight WebRTC P2P support for resilience
    rtcPeers = new Map();
    rtcChannels = new Map();
    rtcEnabled = true;
    iceServers = [{ urls: ["stun:stun.l.google.com:19302"] }];
    p2pOpenCount = 0;
    constructor(options) {
        super();
        this.role = options.role;
        this.senderId = options.senderId ?? this.generateSenderId();
        // Prevent uncaught 'error' crashes
        if (this.listenerCount("error") === 0) {
            this.on("error", () => { });
        }
    }
    generateSenderId() {
        return Math.random().toString(36).substring(2, 10);
    }
    static isSupported() {
        return typeof window !== "undefined" && typeof window.addEventListener === "function";
    }
    connect() {
        if (this.connected)
            return;
        if (!CommunicationService.isSupported()) {
            this.error = new Error("CommunicationService: Not running in a browser context.");
            console.warn(this.error.message);
            return;
        }
        try {
            // Listen for Thor/STOMP bridge messages from webview (AppMessage shape)
            window.addEventListener("websocket-message", (evt) => {
                const custom = evt;
                const appMsg = custom.detail;
                if (!appMsg || typeof appMsg.type !== "string")
                    return;
                // Handle potential WebRTC signaling tunneled via Thor broker
                if (appMsg.type.startsWith("webrtc:")) {
                    this.handleWebRTCSignal(appMsg);
                    return;
                }
                // Handle presence mirrored via broker
                if (appMsg.type.startsWith("presence:")) {
                    try {
                        if (appMsg.type === "presence:join") {
                            if (appMsg.payload?.id && appMsg.payload.id !== this.senderId) {
                                this.peers.add(appMsg.payload.id);
                                this.tryInitiateWebRTC(appMsg.payload.id);
                            }
                        }
                        else if (appMsg.type === "presence:leave") {
                            if (appMsg.payload?.id) {
                                this.peers.delete(appMsg.payload.id);
                                this.teardownPeer(appMsg.payload.id);
                            }
                        }
                        else if (appMsg.type === "presence:state" && Array.isArray(appMsg.payload?.ids)) {
                            this.peers = new Set(appMsg.payload.ids);
                            this.peers.forEach((id) => this.tryInitiateWebRTC(id));
                        }
                        this.emit("presence", Array.from(this.peers));
                    }
                    catch {
                        // ignore malformed presence payloads
                    }
                    return;
                }
                // Normalize AppMessage to WebsocketMessage for consumers
                try {
                    const ws = {
                        id: appMsg.messageId,
                        type: appMsg.type,
                        payload: JSON.stringify(appMsg.payload ?? {}),
                        time: new Date(appMsg.timestamp || Date.now()).toISOString(),
                        user: { id: appMsg.senderId || "" },
                    };
                    this.emit("message", ws);
                }
                catch {
                    // ignore invalid payloads
                }
            });
            // Listen for VSCode extension hub messages
            window.addEventListener("message", (evt) => {
                const data = evt.data;
                if (data?.type === "P2P:message" && data.message) {
                    const appMsg = data.message;
                    if (appMsg.senderId !== this.senderId) {
                        // Handle presence and WebRTC signaling first
                        if (appMsg.type?.startsWith?.("webrtc:")) {
                            this.handleWebRTCSignal(appMsg);
                            return;
                        }
                        const wsMsg = {
                            id: appMsg.messageId,
                            type: appMsg.type,
                            payload: JSON.stringify(appMsg.payload),
                            time: new Date(appMsg.timestamp).toISOString(),
                            user: { id: appMsg.senderId },
                        };
                        this.emit("message", wsMsg);
                        // Manage presence
                        if (appMsg.type === "presence:join") {
                            this.peers.add(appMsg.payload.id);
                            this.tryInitiateWebRTC(appMsg.payload.id);
                            // Mirror presence over broker for cross-window discovery
                            try {
                                this.sendMessage("presence:join", { id: appMsg.payload.id });
                            }
                            catch (e) {
                                void e;
                            }
                        }
                        if (appMsg.type === "presence:leave") {
                            this.peers.delete(appMsg.payload.id);
                            this.teardownPeer(appMsg.payload.id);
                            // Mirror presence over broker for cross-window discovery
                            try {
                                this.sendMessage("presence:leave", { id: appMsg.payload.id });
                            }
                            catch (e) {
                                void e;
                            }
                        }
                        if (appMsg.type === "presence:state" && Array.isArray(appMsg.payload.ids)) {
                            this.peers = new Set(appMsg.payload.ids);
                            // Opportunistically initiate P2P with stable ordering to avoid glare
                            this.peers.forEach((id) => this.tryInitiateWebRTC(id));
                        }
                        this.emit("presence", Array.from(this.peers));
                    }
                }
            });
            // Acquire VSCode API for hub post back
            try {
                this.vscodeApi = window.acquireVsCodeApi?.();
            }
            catch {
                this.vscodeApi = null;
            }
            this.hubConnected = !!this.vscodeApi;
            // Listen for STOMP connection status events
            window.addEventListener("P2P-status", (evt) => {
                const ce = evt;
                this.thorConnected = !!ce.detail?.thorConnected;
                this.ready = this.hubConnected || this.thorConnected;
                this.emit("status", {
                    hubConnected: this.hubConnected,
                    thorConnected: this.thorConnected,
                    phase: ce.detail.phase,
                });
            });
            this.connected = true;
            this.ready = this.hubConnected;
            // Aggressively trigger local peer discovery and P2P handshakes.
            // Do an immediate kick, then a short burst of retries to catch
            // tabs/views that are still initializing.
            const kick = () => {
                try {
                    this.connectToVsCodePeers();
                    this.reconnectPeers();
                }
                catch { /* ignore */ }
            };
            // Immediate kick to engage hub promptly
            kick();
            // Initial kick shortly after connect to allow VS Code to
            // wire up the webview message channel.
            setTimeout(kick, 50);
            // Fast retries for ~5s or until we see peers
            let attempts = 0;
            const maxAttempts = 20; // ~5s at 250ms
            const retry = setInterval(() => {
                attempts++;
                if (this.peers.size > 0 || attempts >= maxAttempts) {
                    clearInterval(retry);
                    return;
                }
                kick();
            }, 250);
        }
        catch (err) {
            this.error = err instanceof Error ? err : new Error(String(err));
            this.emit("error", this.error);
        }
    }
    disconnect() {
        if (!this.connected || !CommunicationService.isSupported())
            return;
        try {
            window.removeEventListener("websocket-message", () => { });
            window.removeEventListener("message", () => { });
            this.connected = false;
            this.ready = false;
        }
        catch (err) {
            this.error = err instanceof Error ? err : new Error(String(err));
            this.emit("error", this.error);
        }
    }
    sendMessage(appType, payload) {
        if (!this.connected) {
            console.warn("CommunicationService: Not connected, cannot send.");
            return;
        }
        const appMsg = {
            type: appType,
            payload,
            senderId: this.senderId,
            messageId: this.generateMessageId(),
            timestamp: Date.now(),
        };
        window.dispatchEvent(new CustomEvent("websocket-send", { detail: appMsg }));
        if (this.vscodeApi) {
            try {
                this.vscodeApi.postMessage({ type: "P2P:send", message: appMsg });
            }
            catch (err) {
                // Ignore failures when VS Code host is not available
                void err;
            }
        }
        // Opportunistically mirror over active P2P channels for resilience
        try {
            this.rtcChannels.forEach((ch) => {
                if (ch.readyState === "open")
                    ch.send(JSON.stringify(appMsg));
            });
        }
        catch (err) {
            // Do not disrupt normal flow
            void err;
        }
    }
    /**
     * Ask the VS Code extension hub to (re)sync presence and announce us
     * so that other ValorIDE views in this VS Code instance can connect.
     */
    connectToVsCodePeers() {
        if (!this.vscodeApi)
            return;
        try {
            this.vscodeApi.postMessage({ type: "P2P:connect" });
        }
        catch (e) {
            // ignore
        }
    }
    generateMessageId() {
        return Math.random().toString(36).substring(2, 12);
    }
    // ===== WebRTC helpers =====
    getOrderedPair(otherId) {
        // Deterministic role selection to avoid glare
        return { caller: this.senderId < otherId };
    }
    /** Public toggle for enabling/disabling WebRTC P2P. */
    setP2PEnabled(enabled) {
        this.rtcEnabled = !!enabled;
        if (!this.rtcEnabled) {
            try {
                this.rtcChannels.forEach((_, id) => this.teardownPeer(id));
            }
            catch { /* ignore */ }
        }
        this.emit("p2p-status", this.getP2PStatus());
        try {
            window.dispatchEvent(new CustomEvent("P2P-p2p", { detail: this.getP2PStatus() }));
        }
        catch { /* ignore */ }
    }
    async tryInitiateWebRTC(peerId) {
        if (!this.rtcEnabled)
            return;
        if (!peerId || peerId === this.senderId)
            return;
        if (this.rtcPeers.has(peerId))
            return;
        const { caller } = this.getOrderedPair(peerId);
        if (!caller)
            return; // Only caller side creates offer
        try {
            const pc = this.createPeer(peerId);
            const channel = pc.createDataChannel("valoride");
            this.attachChannel(peerId, channel);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.sendMessage("webrtc:offer", { to: peerId, from: this.senderId, sdp: offer });
        }
        catch (e) {
            // Swallow P2P init failures to keep resilience best-effort
            void e;
        }
    }
    createPeer(peerId) {
        const pc = new RTCPeerConnection({ iceServers: this.iceServers });
        pc.onicecandidate = (ev) => {
            if (!ev.candidate)
                return;
            this.sendMessage("webrtc:ice", { to: peerId, from: this.senderId, candidate: ev.candidate });
        };
        pc.ondatachannel = (ev) => {
            this.attachChannel(peerId, ev.channel);
        };
        pc.onconnectionstatechange = () => {
            if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
                this.teardownPeer(peerId);
            }
        };
        this.rtcPeers.set(peerId, pc);
        return pc;
    }
    attachChannel(peerId, ch) {
        ch.onopen = () => {
            this.emit("p2p", { peerId, state: "open" });
            this.p2pOpenCount = this.countOpenChannels();
            this.emit("p2p-status", this.getP2PStatus());
            try {
                window.dispatchEvent(new CustomEvent("P2P-p2p", { detail: this.getP2PStatus() }));
            }
            catch (e) {
                void e;
            }
        };
        ch.onclose = () => {
            this.emit("p2p", { peerId, state: "closed" });
            this.p2pOpenCount = this.countOpenChannels();
            this.emit("p2p-status", this.getP2PStatus());
            try {
                window.dispatchEvent(new CustomEvent("P2P-p2p", { detail: this.getP2PStatus() }));
            }
            catch (e) {
                void e;
            }
        };
        ch.onerror = () => {
            this.emit("p2p", { peerId, state: "error" });
            this.p2pOpenCount = this.countOpenChannels();
            this.emit("p2p-status", this.getP2PStatus());
            try {
                window.dispatchEvent(new CustomEvent("P2P-p2p", { detail: this.getP2PStatus() }));
            }
            catch (e) {
                void e;
            }
        };
        ch.onmessage = (ev) => {
            try {
                const app = JSON.parse(ev.data);
                // Normalize to WebsocketMessage shape for consumers when possible
                if (app && app.type && app.messageId) {
                    const ws = {
                        id: app.messageId,
                        type: app.type,
                        payload: JSON.stringify(app.payload ?? {}),
                        time: new Date(app.timestamp || Date.now()).toISOString(),
                        user: { id: app.senderId || peerId },
                    };
                    this.emit("message", ws);
                }
            }
            catch {
                // ignore malformed P2P payloads
            }
        };
        this.rtcChannels.set(peerId, ch);
    }
    teardownPeer(peerId) {
        try {
            this.rtcChannels.get(peerId)?.close();
        }
        catch (e) {
            void e;
        }
        this.rtcChannels.delete(peerId);
        try {
            this.rtcPeers.get(peerId)?.close();
        }
        catch (e) {
            void e;
        }
        this.rtcPeers.delete(peerId);
        this.p2pOpenCount = this.countOpenChannels();
        this.emit("p2p-status", this.getP2PStatus());
        try {
            window.dispatchEvent(new CustomEvent("P2P-p2p", { detail: this.getP2PStatus() }));
        }
        catch (e) {
            void e;
        }
    }
    async handleWebRTCSignal(msg) {
        if (!this.rtcEnabled)
            return;
        const { type, payload, senderId } = msg;
        const from = payload?.from || senderId;
        const to = payload?.to;
        if (to && to !== this.senderId)
            return; // Not addressed to us
        if (type === "webrtc:offer") {
            try {
                const pc = this.rtcPeers.get(from) || this.createPeer(from);
                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                this.sendMessage("webrtc:answer", { to: from, from: this.senderId, sdp: answer });
            }
            catch (e) {
                void e;
            }
            return;
        }
        if (type === "webrtc:answer") {
            try {
                const pc = this.rtcPeers.get(from);
                if (!pc)
                    return;
                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            }
            catch (e) {
                void e;
            }
            return;
        }
        if (type === "webrtc:ice") {
            try {
                const pc = this.rtcPeers.get(from);
                if (!pc)
                    return;
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            }
            catch (e) {
                void e;
            }
            return;
        }
    }
    // Public P2P API
    reconnectPeers() {
        try {
            this.rtcChannels.forEach((_, id) => this.teardownPeer(id));
            this.peers.forEach((id) => this.tryInitiateWebRTC(id));
        }
        catch (e) {
            void e;
        }
    }
    configureIceServers(servers) {
        if (Array.isArray(servers) && servers.length > 0)
            this.iceServers = servers;
    }
    getP2PStatus() {
        return { open: this.p2pOpenCount, peers: this.peers.size };
    }
    countOpenChannels() {
        let n = 0;
        this.rtcChannels.forEach((ch) => { if (ch.readyState === "open")
            n++; });
        return n;
    }
}
//# sourceMappingURL=CommunicationService.js.map