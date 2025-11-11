import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { MothershipService } from "../../../src/services/communication/MothershipService";
import { useExtensionState } from "./ExtensionStateContext";
const MothershipContext = createContext(null);
export const MothershipProvider = ({ children }) => {
    const { jwtToken, userInfo, authenticatedUser } = useExtensionState();
    const [mothershipService, setMothershipService] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const [instanceId, setInstanceId] = useState(null);
    const serviceRef = useRef(null);
    // Listen for JWT token updates from the login process
    useEffect(() => {
        const handleJwtUpdate = (event) => {
            const { token, source } = event.detail;
            console.log('JWT token updated from', source, 'connecting to mothership...');
            if (token && !serviceRef.current) {
                initializeMothershipService(token);
            }
            else if (token && serviceRef.current) {
                serviceRef.current.updateJwtToken(token);
            }
        };
        window.addEventListener('jwt-token-updated', handleJwtUpdate);
        return () => {
            window.removeEventListener('jwt-token-updated', handleJwtUpdate);
        };
    }, []);
    // Initialize service when JWT token is available
    useEffect(() => {
        if (jwtToken && !serviceRef.current) {
            initializeMothershipService(jwtToken);
        }
    }, [jwtToken]);
    const initializeMothershipService = useCallback(async (token) => {
        try {
            setConnectionError(null);
            const userId = userInfo?.id || authenticatedUser?.id || 'anonymous';
            const options = {
                jwtToken: token,
                userId,
            };
            const service = new MothershipService(options);
            // Set up event listeners
            service.on('connected', () => {
                console.log('Connected to mothership');
                setIsConnected(true);
                setConnectionError(null);
                setInstanceId(service.getInstanceId());
            });
            service.on('disconnected', () => {
                console.log('Disconnected from mothership');
                setIsConnected(false);
            });
            service.on('error', (error) => {
                console.error('Mothership error:', error);
                setConnectionError(error);
                setIsConnected(false);
            });
            service.on('remoteCommand', (command) => {
                console.log('Received remote command:', command);
                handleRemoteCommand(command);
            });
            service.on('broadcast', (payload) => {
                console.log('Received broadcast:', payload);
                // Handle broadcast messages (e.g., system announcements)
            });
            service.on('privateMessage', (payload) => {
                console.log('Received private message:', payload);
                // Handle direct messages to this instance
            });
            serviceRef.current = service;
            setMothershipService(service);
            // Connect to the mothership
            await service.connect();
        }
        catch (error) {
            console.error('Failed to initialize mothership service:', error);
            setConnectionError(error instanceof Error ? error : new Error(String(error)));
        }
    }, [userInfo, authenticatedUser]);
    const handleRemoteCommand = useCallback((command) => {
        // Forward remote commands to the VS Code extension via the vscode API
        // Use a more generic approach to avoid type conflicts
        try {
            window.vscode?.postMessage({
                type: 'remoteCommand',
                command,
            });
        }
        catch (error) {
            console.error('Failed to forward remote command:', error);
        }
    }, []);
    const sendValorIDEAction = useCallback((taskId, action, data) => {
        if (serviceRef.current?.isConnected()) {
            serviceRef.current.sendValorIDEAction(taskId, action, data);
        }
        else {
            console.warn('Cannot send ValorIDE action - mothership not connected');
        }
    }, []);
    const sendRemoteCommand = useCallback((command) => {
        if (serviceRef.current?.isConnected()) {
            serviceRef.current.sendRemoteCommand(command);
        }
        else {
            console.warn('Cannot send remote command - mothership not connected');
        }
    }, []);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (serviceRef.current) {
                serviceRef.current.disconnect();
                serviceRef.current = null;
            }
        };
    }, []);
    const contextValue = {
        mothershipService,
        isConnected,
        connectionError,
        instanceId,
        sendValorIDEAction,
        sendRemoteCommand,
    };
    return (_jsx(MothershipContext.Provider, { value: contextValue, children: children }));
};
export const useMothership = () => {
    const context = useContext(MothershipContext);
    if (!context) {
        throw new Error('useMothership must be used within a MothershipProvider');
    }
    return context;
};
// Optional hook for components that may or may not have the provider
export const useMothershipOptional = () => {
    return useContext(MothershipContext);
};
//# sourceMappingURL=MothershipContext.js.map