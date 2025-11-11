import { useEffect, useRef, useCallback } from 'react';
import { useMothership } from '../context/MothershipContext';
import { ValorIDEMothershipIntegration } from '../services/ValorIDEMothershipIntegration';
/**
 * Hook that provides ValorIDE-specific mothership integration
 * Automatically sends chat actions and handles remote commands
 */
export const useValorIDEMothership = () => {
    const { mothershipService, isConnected, instanceId } = useMothership();
    const integrationRef = useRef(null);
    // Initialize the integration service
    useEffect(() => {
        if (!integrationRef.current) {
            integrationRef.current = new ValorIDEMothershipIntegration(mothershipService);
        }
        else {
            integrationRef.current.updateMothershipService(mothershipService);
        }
    }, [mothershipService]);
    // Send chat action to mothership
    const sendChatAction = useCallback(async (action) => {
        if (integrationRef.current) {
            await integrationRef.current.sendChatAction(action);
        }
    }, []);
    // Set current task context
    const setCurrentTask = useCallback((taskId) => {
        if (integrationRef.current) {
            integrationRef.current.setCurrentTask(taskId);
        }
    }, []);
    // Update active tools
    const updateActiveTools = useCallback((tools) => {
        if (integrationRef.current) {
            integrationRef.current.updateActiveTools(tools);
        }
    }, []);
    // Update open files
    const updateOpenFiles = useCallback((files) => {
        if (integrationRef.current) {
            integrationRef.current.updateOpenFiles(files);
        }
    }, []);
    // Send remote command to specific instance
    const sendRemoteCommand = useCallback((targetInstanceId, type, data) => {
        if (integrationRef.current) {
            integrationRef.current.sendRemoteCommand(targetInstanceId, type, data);
        }
    }, []);
    // Broadcast to all instances
    const broadcastToAll = useCallback((type, data) => {
        if (integrationRef.current) {
            integrationRef.current.broadcastToAll(type, data);
        }
    }, []);
    // Get current state
    const getCurrentState = useCallback(() => {
        return integrationRef.current?.getCurrentState() || null;
    }, []);
    // Cleanup
    useEffect(() => {
        return () => {
            if (integrationRef.current) {
                integrationRef.current.dispose();
            }
        };
    }, []);
    // Helper functions for common actions
    const trackChatMessage = useCallback(async (messageId, content, taskId) => {
        await sendChatAction({
            type: 'chat_message',
            messageId,
            taskId,
            content,
            metadata: {
                timestamp: Date.now(),
                length: content.length,
            },
        });
    }, [sendChatAction]);
    const trackToolUse = useCallback(async (toolName, args, taskId) => {
        await sendChatAction({
            type: 'tool_use',
            toolName,
            taskId,
            metadata: {
                arguments: args,
                timestamp: Date.now(),
            },
        });
    }, [sendChatAction]);
    const trackFileEdit = useCallback(async (fileName, content, taskId) => {
        await sendChatAction({
            type: 'file_edit',
            fileName,
            taskId,
            content,
            metadata: {
                timestamp: Date.now(),
            },
        });
    }, [sendChatAction]);
    const trackCommandExecute = useCallback(async (command, taskId) => {
        await sendChatAction({
            type: 'command_execute',
            command,
            taskId,
            metadata: {
                timestamp: Date.now(),
            },
        });
    }, [sendChatAction]);
    const trackTaskStart = useCallback(async (taskId, description) => {
        await sendChatAction({
            type: 'task_start',
            taskId,
            metadata: {
                description,
                timestamp: Date.now(),
            },
        });
    }, [sendChatAction]);
    const trackTaskComplete = useCallback(async (taskId, result) => {
        await sendChatAction({
            type: 'task_complete',
            taskId,
            metadata: {
                result,
                timestamp: Date.now(),
            },
        });
    }, [sendChatAction]);
    return {
        // Connection status
        isConnected,
        instanceId,
        // Core integration methods
        sendChatAction,
        setCurrentTask,
        updateActiveTools,
        updateOpenFiles,
        sendRemoteCommand,
        broadcastToAll,
        getCurrentState,
        // Helper methods for common tracking
        trackChatMessage,
        trackToolUse,
        trackFileEdit,
        trackCommandExecute,
        trackTaskStart,
        trackTaskComplete,
    };
};
export default useValorIDEMothership;
//# sourceMappingURL=useValorIDEMothership.js.map