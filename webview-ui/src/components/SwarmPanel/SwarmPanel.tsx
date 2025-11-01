import React, { useEffect, useState } from 'react';

type AgentMeta = {
    id: string;
    userId?: string;
    version?: string;
    lastSeen?: string;
    [k: string]: any;
};

function genMessageId() {
    return Math.random().toString(36).substring(2, 12);
}

export const SwarmPanel: React.FC = () => {
    const [agents, setAgents] = useState<AgentMeta[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [command, setCommand] = useState<string>('ping');

    useEffect(() => {
        const onWs = (ev: Event) => {
            try {
                const ce = ev as CustomEvent;
                const msg = ce.detail; // expected normalized WebsocketMessage
                if (!msg || !msg.payload) return;
                // payload may be a JSON string
                let payload: any = msg.payload;
                if (typeof payload === 'string') {
                    try { payload = JSON.parse(payload); } catch { /* ignore */ }
                }

                // Detect agents broadcast: payload.agents
                if (payload && payload.agents && Array.isArray(payload.agents)) {
                    setAgents(payload.agents.map((a: any) => ({ id: String(a.id || a.instanceId || a.name || a.key || ''), ...a })));
                    return;
                }

                // Backward compat: topic/status style messages
                if (payload && payload.event === 'valor.status' && payload.agents) {
                    setAgents(payload.agents);
                    return;
                }
            } catch (e) {
                // ignore
            }
        };

        window.addEventListener('websocket-message', onWs as EventListener);
        // Also listen to generic postMessage for hub P2P
        const onHub = (ev: MessageEvent) => {
            try {
                const data = ev.data;
                if (data?.type === 'P2P:message' && data.message?.type === 'presence:state' && Array.isArray(data.message.payload?.ids)) {
                    setAgents(data.message.payload.ids.map((id: string) => ({ id })));
                }
            } catch {
                /* ignore */
}
        };
        window.addEventListener('message', onHub);

        return () => {
            window.removeEventListener('websocket-message', onWs as EventListener);
            window.removeEventListener('message', onHub);
        };
    }, []);

    const sendApp = (type: string, payload: any) => {
        const appMsg = {
            type,
            payload,
            senderId: (window as any).__valoride_senderId || 'valoride-ui',
            messageId: genMessageId(),
            timestamp: Date.now(),
        };
        try { window.dispatchEvent(new CustomEvent('websocket-send', { detail: appMsg })); } catch { /* ignore */ }
        try { (window as any).acquireVsCodeApi?.()?.postMessage?.({ type: 'P2P:send', message: appMsg }); } catch { /* ignore */ }
    };

    const doRollcall = () => sendApp('presence:rollcall', { id: (window as any).__valoride_instanceId || 'ui' });

    const sendCommand = (targetId?: string) => {
        const payload = { id: genMessageId(), type: 'command', data: { cmd: command }, sourceInstanceId: (window as any).__valoride_instanceId || 'ui', targetInstanceId: targetId };
        sendApp('command', payload);
    };

    return (
        <div style={{ padding: 12, fontFamily: 'Inter, Arial, sans-serif' }}>
            <h3>Valor SWARM — Agents</h3>
            <div style={{ marginBottom: 8 }}>
                <button onClick={doRollcall}>Roll Call</button>
                <button onClick={() => sendCommand(undefined)} style={{ marginLeft: 8 }}>Broadcast Command</button>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                    <h4>Active Agents ({agents.length})</h4>
                    <ul>
                        {agents.map((a) => (
                            <li key={a.id} style={{ padding: 6, borderBottom: '1px solid #eee' }}>
                                <label style={{ cursor: 'pointer' }}>
                                    <input type="radio" name="agent" checked={selected === a.id} onChange={() => setSelected(a.id)} />
                                    <strong style={{ marginLeft: 8 }}>{a.id}</strong>
                                </label>
                                <div style={{ fontSize: 12, color: '#666' }}>{a.userId ? `user:${a.userId}` : ''} {a.version ? ` v${a.version}` : ''}</div>
                                <div style={{ fontSize: 11, color: '#999' }}>{a.lastSeen}</div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div style={{ width: 320 }}>
                    <h4>Command</h4>
                    <div>
                        <input value={command} onChange={(e) => setCommand(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div style={{ marginTop: 8 }}>
                        <button onClick={() => sendCommand(selected ?? undefined)}>Send to Selected</button>
                        <button onClick={() => sendCommand(undefined)} style={{ marginLeft: 8 }}>Send Broadcast</button>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
                        Commands use the existing mothership "command" envelope and will be delivered to the target's
                        websocket handler. Use simple built-in commands like "ping" or JSON payloads for structured control.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SwarmPanel;
