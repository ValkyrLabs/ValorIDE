import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { addMessage } from "../components/ServerConsole/websocketSlice";
import { WebsocketMessageTypeEnum } from "../thor/model";
const useWebSocket = (url) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const dispatch = useDispatch();
    const sendMessage = useCallback((message) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(message);
        }
    }, [socket]);
    useEffect(() => {
        const newSocket = new WebSocket(url);
        newSocket.onopen = () => {
            console.log("WebSocket connected");
            setIsConnected(true);
            setSocket(newSocket);
            const event = {
                type: WebsocketMessageTypeEnum.CONSOLE,
                payload: "status: 'connected'",
                createdDate: new Date(),
            };
            dispatch(addMessage(event));
        };
        newSocket.onclose = () => {
            console.log("WebSocket disconnected");
            setIsConnected(false);
            setSocket(null);
            const event = {
                type: WebsocketMessageTypeEnum.CONSOLE,
                payload: "status: 'disconnected'",
                createdDate: new Date(),
            };
            dispatch(addMessage(event));
        };
        newSocket.onerror = (error) => {
            console.error("WebSocket error:", error);
            const event = {
                type: WebsocketMessageTypeEnum.ERROR,
                payload: "status: 'error'",
                createdDate: new Date(),
            };
            dispatch(addMessage(event));
        };
        newSocket.onmessage = (event) => {
            console.log("WebSocket message:", event.data);
            try {
                const parsedEvent = JSON.parse(event.data);
                dispatch(addMessage(parsedEvent));
                dispatch(addMessage({
                    type: WebsocketMessageTypeEnum.CONSOLE,
                    payload: event.data,
                    createdDate: new Date(),
                }));
            }
            catch (error) {
                console.error("Failed to parse WebSocket message:", error);
            }
        };
        return () => {
            newSocket.close();
        };
    }, [url, dispatch]);
    const sendLoggedMessage = useCallback((message) => {
        sendMessage(message);
        const event = {
            type: WebsocketMessageTypeEnum.CONSOLE,
            payload: "CLIENT LOG MESSAGE:  " + message,
            createdDate: new Date(),
        };
        dispatch(addMessage(event));
    }, [sendMessage, dispatch]);
    return { socket, isConnected, sendMessage: sendLoggedMessage };
};
export default useWebSocket;
//# sourceMappingURL=useWebSocket.js.map