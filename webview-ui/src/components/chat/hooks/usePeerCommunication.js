import { useState, useEffect, useCallback } from "react";
import { useCommunicationService } from "@/context/CommunicationServiceContext";
import { vscode } from "@/utils/vscode";
export const usePeerCommunication = () => {
    const communicationService = useCommunicationService();
    const [peerCount, setPeerCount] = useState(0);
    const [p2pOpen, setP2pOpen] = useState(0);
    const [isConnectingPeers, setIsConnectingPeers] = useState(false);
    const [multipleInstances, setMultipleInstances] = useState(false);
    const [handshakeMessages, setHandshakeMessages] = useState([]);
    useEffect(() => {
        const handlePresence = (list) => setPeerCount(Array.isArray(list) ? list.length : (typeof list === 'number' ? list : 0));
        const handleP2PStatus = (s) => setP2pOpen(typeof s?.open === 'number' ? s.open : 0);
        communicationService.on("presence", handlePresence);
        communicationService.on("p2p-status", handleP2PStatus);
        return () => {
            communicationService.off("presence", handlePresence);
            communicationService.off("p2p-status", handleP2PStatus);
        };
    }, [communicationService]);
    // Compute multi-instance status from peer count (more accurate than MCP servers)
    useEffect(() => {
        setMultipleInstances(peerCount > 0);
    }, [peerCount]);
    // Always listen for inter-instance messages to surface handshake feedback
    useEffect(() => {
        const handleCommMessage = (message) => {
            if (!message || !message.type)
                return;
            if (message.type === "ping") {
                communicationService.sendMessage("ack", { receivedAt: Date.now() });
                setHandshakeMessages((msgs) => [...msgs, `Received ping at ${new Date().toLocaleTimeString()}`]);
            }
            else if (message.type === "ack") {
                setHandshakeMessages((msgs) => [...msgs, `Received ack at ${new Date().toLocaleTimeString()}`]);
            }
            else if (message.type === "nack") {
                setHandshakeMessages((msgs) => [...msgs, `Received nack at ${new Date().toLocaleTimeString()}`]);
            }
        };
        communicationService.on("message", handleCommMessage);
        return () => {
            communicationService.off("message", handleCommMessage);
        };
    }, [communicationService]);
    const handleRobotIconClick = useCallback(() => {
        communicationService.sendMessage("ping", { sentAt: Date.now() });
        setHandshakeMessages((msgs) => [...msgs, `Sent ping at ${new Date().toLocaleTimeString()}`]);
    }, [communicationService]);
    const connectToPeers = useCallback(() => {
        // Ask the extension hub to (re)broadcast presence so VSCode views discover each other
        communicationService.connectToVsCodePeers?.();
        // Initiate websocket broker connection (serverconsole style connectivity)
        try {
            // Trigger websocket connection attempt via custom event
            window.dispatchEvent(new CustomEvent("P2P-connect-broker", {
                detail: {
                    timestamp: Date.now(),
                    reason: "peer-discovery"
                }
            }));
            // Send presence announcement over websocket broker
            window.dispatchEvent(new CustomEvent("websocket-send", {
                detail: {
                    type: "presence:announce",
                    payload: {
                        id: communicationService.senderId || "unknown",
                        timestamp: Date.now(),
                        role: "valoride-client"
                    },
                    senderId: communicationService.senderId || "unknown",
                    messageId: Math.random().toString(36).substring(2, 12),
                    timestamp: Date.now()
                }
            }));
        }
        catch (e) {
            console.warn("Failed to establish websocket broker connection:", e);
        }
        // Also re-initiate P2P handshakes with any known peers
        communicationService.reconnectPeers?.();
        // Proactively ping to provoke acks and show activity
        communicationService.sendMessage("ping", { sentAt: Date.now() });
        vscode.postMessage({ type: "displayVSCodeInfo", text: `Broadcasting presence & connecting to broker… ${new Date().toLocaleTimeString()}` });
        setIsConnectingPeers(true);
        // Clear connecting state and summarize
        setTimeout(() => {
            setIsConnectingPeers(false);
            const svc = communicationService;
            const thorStatus = svc.thorConnected ? "Connected" : "Disconnected";
            const hubStatus = svc.hubConnected ? "Connected" : "Disconnected";
            vscode.postMessage({
                type: "displayVSCodeInfo",
                text: `Peers: ${peerCount} | P2P: ${p2pOpen} | Thor: ${thorStatus} | Hub: ${hubStatus}`
            });
        }, 900);
    }, [communicationService, peerCount, p2pOpen]);
    return {
        peerCount,
        p2pOpen,
        isConnectingPeers,
        multipleInstances,
        handshakeMessages,
        handleRobotIconClick,
        connectToPeers
    };
};
//# sourceMappingURL=usePeerCommunication.js.map