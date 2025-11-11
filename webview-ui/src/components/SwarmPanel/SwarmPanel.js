import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
function genMessageId() {
    return Math.random().toString(36).substring(2, 12);
}
export const SwarmPanel = () => {
    const [agents, setAgents] = useState([]);
    const [selected, setSelected] = useState(null);
    const [command, setCommand] = useState('ping');
    useEffect(() => {
        const onWs = (ev) => {
            try {
                const ce = ev;
                const msg = ce.detail; // expected normalized WebsocketMessage
                if (!msg || !msg.payload)
                    return;
                // payload may be a JSON string
                let payload = msg.payload;
                if (typeof payload === 'string') {
                    try {
                        payload = JSON.parse(payload);
                    }
                    catch { /* ignore */ }
                }
                // Detect agents broadcast: payload.agents
                if (payload && payload.agents && Array.isArray(payload.agents)) {
                    setAgents(payload.agents.map((a) => ({ id: String(a.id || a.instanceId || a.name || a.key || ''), ...a })));
                    return;
                }
                // Backward compat: topic/status style messages
                if (payload && payload.event === 'valor.status' && payload.agents) {
                    setAgents(payload.agents);
                    return;
                }
            }
            catch (e) {
                // ignore
            }
        };
        window.addEventListener('websocket-message', onWs);
        // Also listen to generic postMessage for hub P2P
        const onHub = (ev) => {
            try {
                const data = ev.data;
                if (data?.type === 'P2P:message' && data.message?.type === 'presence:state' && Array.isArray(data.message.payload?.ids)) {
                    setAgents(data.message.payload.ids.map((id) => ({ id })));
                }
            }
            catch {
                /* ignore */
            }
        };
        window.addEventListener('message', onHub);
        return () => {
            window.removeEventListener('websocket-message', onWs);
            window.removeEventListener('message', onHub);
        };
    }, []);
    const sendApp = (type, payload) => {
        const appMsg = {
            type,
            payload,
            senderId: window.__valoride_senderId || 'valoride-ui',
            messageId: genMessageId(),
            timestamp: Date.now(),
        };
        try {
            window.dispatchEvent(new CustomEvent('websocket-send', { detail: appMsg }));
        }
        catch { /* ignore */ }
        try {
            window.acquireVsCodeApi?.()?.postMessage?.({ type: 'P2P:send', message: appMsg });
        }
        catch { /* ignore */ }
    };
    const doRollcall = () => sendApp('presence:rollcall', { id: window.__valoride_instanceId || 'ui' });
    const sendCommand = (targetId) => {
        const payload = { id: genMessageId(), type: 'command', data: { cmd: command }, sourceInstanceId: window.__valoride_instanceId || 'ui', targetInstanceId: targetId };
        sendApp('command', payload);
    };
    return (_jsxs("div", { style: { padding: 12, fontFamily: 'Inter, Arial, sans-serif' }, children: [_jsx("h3", { children: "Valor SWARM \u2014 Agents" }), _jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("button", { onClick: doRollcall, children: "Roll Call" }), _jsx("button", { onClick: () => sendCommand(undefined), style: { marginLeft: 8 }, children: "Broadcast Command" })] }), _jsxs("div", { style: { display: 'flex', gap: 12 }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsxs("h4", { children: ["Active Agents (", agents.length, ")"] }), _jsx("ul", { children: agents.map((a) => (_jsxs("li", { style: { padding: 6, borderBottom: '1px solid #eee' }, children: [_jsxs("label", { style: { cursor: 'pointer' }, children: [_jsx("input", { type: "radio", name: "agent", checked: selected === a.id, onChange: () => setSelected(a.id) }), _jsx("strong", { style: { marginLeft: 8 }, children: a.id })] }), _jsxs("div", { style: { fontSize: 12, color: '#666' }, children: [a.userId ? `user:${a.userId}` : '', " ", a.version ? ` v${a.version}` : ''] }), _jsx("div", { style: { fontSize: 11, color: '#999' }, children: a.lastSeen })] }, a.id))) })] }), _jsxs("div", { style: { width: 320 }, children: [_jsx("h4", { children: "Command" }), _jsx("div", { children: _jsx("input", { value: command, onChange: (e) => setCommand(e.target.value), style: { width: '100%' } }) }), _jsxs("div", { style: { marginTop: 8 }, children: [_jsx("button", { onClick: () => sendCommand(selected ?? undefined), children: "Send to Selected" }), _jsx("button", { onClick: () => sendCommand(undefined), style: { marginLeft: 8 }, children: "Send Broadcast" })] }), _jsx("div", { style: { marginTop: 12, fontSize: 12, color: '#666' }, children: "Commands use the existing mothership \"command\" envelope and will be delivered to the target's websocket handler. Use simple built-in commands like \"ping\" or JSON payloads for structured control." })] })] })] }));
};
export default SwarmPanel;
//# sourceMappingURL=SwarmPanel.js.map