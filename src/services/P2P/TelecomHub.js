/**
 * TelecomHub: extension-side fan-in/fan-out hub for ValorIDE instances.
 * - Receives P2P messages from any webview via onDidReceiveMessage.
 * - Broadcasts them to all other registered webviews via postMessage.
 * - Optionally, can be extended to bridge to a server socket.
 */
export class TelecomHub {
    static instance = null;
    providers = new Map();
    static getInstance() {
        if (!this.instance)
            this.instance = new TelecomHub();
        return this.instance;
    }
    /** Register a WebviewProvider to participate in local P2P. */
    registerProvider(provider) {
        if (this.providers.has(provider))
            return;
        const id = Math.random().toString(36).slice(2);
        const view = provider.view;
        if (!view)
            return;
        const webview = view.webview;
        const subscription = webview.onDidReceiveMessage((message) => {
            if (!message || typeof message !== "object")
                return;
            // Explicit connect request from webview: re-send presence snapshot and rebroadcast join
            if (message.type === "P2P:connect") {
                const selfMeta = this.providers.get(provider);
                if (!selfMeta)
                    return;
                // Send snapshot to requester
                this.sendPresenceSnapshot(provider, selfMeta.id);
                // Re-announce join to others to kick handshakes
                const join = {
                    type: "presence:join",
                    payload: { id: selfMeta.id },
                    senderId: selfMeta.id,
                    messageId: Math.random().toString(36).slice(2, 12),
                    timestamp: Date.now(),
                };
                this.broadcast(join, provider);
                return;
            }
            if (message.type === "P2P:send") {
                const msg = message.message;
                if (!msg)
                    return;
                // Fan-out to all other providers
                this.broadcast(msg, provider);
            }
        });
        // Auto-cleanup on dispose
        const disposeHandle = view.onDidDispose(() => {
            subscription.dispose();
            disposeHandle.dispose();
            this.providers.delete(provider);
            // Broadcast presence leave
            const leave = {
                type: "presence:leave",
                payload: { id },
                senderId: id,
                messageId: Math.random().toString(36).slice(2, 12),
                timestamp: Date.now(),
            };
            this.broadcast(leave);
        });
        this.providers.set(provider, { id, dispose: () => { subscription.dispose(); disposeHandle.dispose(); } });
        // Send current presence snapshot to the new provider
        this.sendPresenceSnapshot(provider, id);
        // Broadcast presence join to others
        const join = {
            type: "presence:join",
            payload: { id },
            senderId: id,
            messageId: Math.random().toString(36).slice(2, 12),
            timestamp: Date.now(),
        };
        this.broadcast(join, provider);
    }
    /** Broadcast a message to all providers except the optional origin. */
    broadcast(message, origin) {
        for (const [prov] of this.providers) {
            if (origin && prov === origin)
                continue;
            try {
                prov.view?.webview.postMessage({ type: "P2P:message", message });
            }
            catch (err) {
                // ignore individual postMessage failures
            }
        }
    }
    sendPresenceSnapshot(provider, selfId) {
        const others = Array.from(this.providers.entries())
            .filter(([prov]) => prov !== provider)
            .map(([, meta]) => meta.id);
        try {
            provider.view?.webview.postMessage({
                type: "P2P:message",
                message: {
                    type: "presence:state",
                    payload: { ids: others },
                    senderId: selfId,
                    messageId: Math.random().toString(36).slice(2, 12),
                    timestamp: Date.now(),
                },
            });
        }
        catch (e) {
            // ignore
        }
    }
}
//# sourceMappingURL=TelecomHub.js.map