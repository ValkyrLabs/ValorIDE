import React, { useEffect, useCallback, useRef } from 'react';
import { useValorIDEMothership } from '../../hooks/useValorIDEMothership';

interface ChatMothershipProviderProps {
  children: React.ReactNode;
  currentTaskId?: string;
}

/**
 * Provider component that automatically tracks all chat actions and sends them to the mothership
 * This ensures ValkyrAI and other ValorIDE instances stay synchronized with what's happening
 */
export const ChatMothershipProvider: React.FC<ChatMothershipProviderProps> = ({
  children,
  currentTaskId,
}) => {
  const mothership = useValorIDEMothership();
  const lastTaskIdRef = useRef<string | undefined>(currentTaskId);

  // Debug logging to see connection status
  useEffect(() => {
    console.log('🛸 ChatMothershipProvider: Connection status:', {
      isConnected: mothership.isConnected,
      instanceId: mothership.instanceId,
      currentTaskId
    });
  }, [mothership.isConnected, mothership.instanceId, currentTaskId]);

  // Track task context changes
  useEffect(() => {
    if (currentTaskId && currentTaskId !== lastTaskIdRef.current) {
      console.log('🛸 ChatMothershipProvider: Setting current task:', currentTaskId);
      mothership.setCurrentTask(currentTaskId);
      lastTaskIdRef.current = currentTaskId;
    }
  }, [currentTaskId, mothership]);

  // Set up global event listeners to track various actions
  useEffect(() => {
    console.log('🛸 ChatMothershipProvider: Setting up event listeners');

    // Track chat messages sent by user
    const handleChatMessage = (event: CustomEvent) => {
      const { messageId, content, taskId } = event.detail;
      console.log('🛸 ChatMothershipProvider: Chat message event received:', { messageId, content, taskId });
      mothership.trackChatMessage(messageId, content, taskId || currentTaskId);
    };

    // Track tool usage
    const handleToolUse = (event: CustomEvent) => {
      const { toolName, arguments: args, taskId } = event.detail;
      console.log('🛸 ChatMothershipProvider: Tool use event received:', { toolName, args, taskId });
      mothership.trackToolUse(toolName, args, taskId || currentTaskId);
    };

    // Track file operations
    const handleFileEdit = (event: CustomEvent) => {
      const { fileName, content, taskId } = event.detail;
      console.log('🛸 ChatMothershipProvider: File edit event received:', { fileName, taskId });
      mothership.trackFileEdit(fileName, content, taskId || currentTaskId);
    };

    // Track command execution
    const handleCommandExecute = (event: CustomEvent) => {
      const { command, taskId } = event.detail;
      console.log('🛸 ChatMothershipProvider: Command execute event received:', { command, taskId });
      mothership.trackCommandExecute(command, taskId || currentTaskId);
    };

    // Track task completion
    const handleTaskComplete = (event: CustomEvent) => {
      const { taskId, result } = event.detail;
      console.log('🛸 ChatMothershipProvider: Task complete event received:', { taskId, result });
      mothership.trackTaskComplete(taskId, result);
    };

    // Track task start
    const handleTaskStart = (event: CustomEvent) => {
      const { taskId, description } = event.detail;
      console.log('🛸 ChatMothershipProvider: Task start event received:', { taskId, description });
      mothership.trackTaskStart(taskId, description);
    };

    // Track active tools updates
    const handleActiveToolsUpdate = (event: CustomEvent) => {
      const { tools } = event.detail;
      console.log('🛸 ChatMothershipProvider: Active tools update event received:', { tools });
      mothership.updateActiveTools(tools);
    };

    // Track open files updates
    const handleOpenFilesUpdate = (event: CustomEvent) => {
      const { files } = event.detail;
      console.log('🛸 ChatMothershipProvider: Open files update event received:', { files });
      mothership.updateOpenFiles(files);
    };

    // Track API data (requests, responses, stream chunks)
    const handleApiData = (event: CustomEvent) => {
      const { type, data, timestamp } = event.detail;
      console.log('🛸 ChatMothershipProvider: API data event received:', { type, timestamp });
      
      // Send API data directly to mothership websocket with high priority
      mothership.sendChatAction({
        type: 'api_data',
        taskId: currentTaskId,
        metadata: {
          api_type: type,
          api_data: data,
          timestamp: timestamp
        }
      });
    };

    // Handle remote messages from other ValorIDE instances
    const handleRemoteMessage = (event: CustomEvent) => {
      const { text, sender, instanceId, timestamp, taskId } = event.detail;
      console.log('🛸 ChatMothershipProvider: Remote message received:', { text, sender, instanceId });
      
      // Display remote message in chat interface (would integrate with ChatView)
      // For now just log it - integration with ChatView would show it as a message
    };

    // Handle outgoing cross-instance chat
    const handleCrossInstanceChat = (event: CustomEvent) => {
      const { message, targetInstanceId, timestamp } = event.detail;
      console.log('🛸 ChatMothershipProvider: Cross-instance chat event:', { message, targetInstanceId });
      
      if (targetInstanceId) {
        mothership.sendRemoteCommand(targetInstanceId, 'cross_instance_chat', {
          message,
          fromInstance: mothership.instanceId,
          timestamp,
          taskId: currentTaskId
        });
      } else {
        mothership.broadcastToAll('cross_instance_chat', {
          message,
          fromInstance: mothership.instanceId,
          timestamp,
          taskId: currentTaskId
        });
      }
    };

    // Handle outgoing remote API commands
    const handleRemoteApiCommand = (event: CustomEvent) => {
      const { apiAction, targetInstanceId, ...payload } = event.detail;
      console.log('🛸 ChatMothershipProvider: Remote API command event:', { apiAction, targetInstanceId });
      
      if (targetInstanceId) {
        mothership.sendRemoteCommand(targetInstanceId, 'remote_api_command', {
          apiAction,
          ...payload,
          taskId: currentTaskId
        });
      } else {
        mothership.broadcastToAll('remote_api_command', {
          apiAction,
          ...payload,
          taskId: currentTaskId
        });
      }
    };

    // Handle outgoing remote chat messages
    const handleRemoteChatMessage = (event: CustomEvent) => {
      const { message, targetInstanceId, sender, timestamp } = event.detail;
      console.log('🛸 ChatMothershipProvider: Remote chat message event:', { message, targetInstanceId, sender });
      
      if (targetInstanceId) {
        mothership.sendRemoteCommand(targetInstanceId, 'remote_chat_message', {
          message,
          sender,
          instanceId: mothership.instanceId,
          timestamp,
          taskId: currentTaskId
        });
      } else {
        mothership.broadcastToAll('remote_chat_message', {
          message,
          sender,
          instanceId: mothership.instanceId,
          timestamp,
          taskId: currentTaskId
        });
      }
    };

    // Add event listeners
    window.addEventListener('valoride-chat-message', handleChatMessage as EventListener);
    window.addEventListener('valoride-tool-use', handleToolUse as EventListener);
    window.addEventListener('valoride-file-edit', handleFileEdit as EventListener);
    window.addEventListener('valoride-command-execute', handleCommandExecute as EventListener);
    window.addEventListener('valoride-task-complete', handleTaskComplete as EventListener);
    window.addEventListener('valoride-task-start', handleTaskStart as EventListener);
    window.addEventListener('valoride-active-tools-update', handleActiveToolsUpdate as EventListener);
    window.addEventListener('valoride-open-files-update', handleOpenFilesUpdate as EventListener);
    window.addEventListener('valoride-api-data', handleApiData as EventListener);
    window.addEventListener('valoride-remote-message', handleRemoteMessage as EventListener);
    window.addEventListener('valoride-cross-instance-chat', handleCrossInstanceChat as EventListener);
    window.addEventListener('valoride-remote-api-command', handleRemoteApiCommand as EventListener);
    window.addEventListener('valoride-remote-chat-message', handleRemoteChatMessage as EventListener);

    // Cleanup
    return () => {
      console.log('🛸 ChatMothershipProvider: Cleaning up event listeners');
      window.removeEventListener('valoride-chat-message', handleChatMessage as EventListener);
      window.removeEventListener('valoride-tool-use', handleToolUse as EventListener);
      window.removeEventListener('valoride-file-edit', handleFileEdit as EventListener);
      window.removeEventListener('valoride-command-execute', handleCommandExecute as EventListener);
      window.removeEventListener('valoride-task-complete', handleTaskComplete as EventListener);
      window.removeEventListener('valoride-task-start', handleTaskStart as EventListener);
      window.removeEventListener('valoride-active-tools-update', handleActiveToolsUpdate as EventListener);
      window.removeEventListener('valoride-open-files-update', handleOpenFilesUpdate as EventListener);
      window.removeEventListener('valoride-api-data', handleApiData as EventListener);
      window.removeEventListener('valoride-remote-message', handleRemoteMessage as EventListener);
      window.removeEventListener('valoride-cross-instance-chat', handleCrossInstanceChat as EventListener);
      window.removeEventListener('valoride-remote-api-command', handleRemoteApiCommand as EventListener);
      window.removeEventListener('valoride-remote-chat-message', handleRemoteChatMessage as EventListener);
    };
  }, [mothership, currentTaskId]);

  // Function to dispatch events for other components to use
  const dispatchChatAction = useCallback((type: string, data: any) => {
    console.log('🛸 ChatMothershipProvider: Dispatching event:', type, data);
    const event = new CustomEvent(`valoride-${type}`, { detail: data });
    window.dispatchEvent(event);
  }, []);

  // Make dispatch function available globally for other components
  useEffect(() => {
    (window as any).valorideDispatchChatAction = dispatchChatAction;
    console.log('🛸 ChatMothershipProvider: Global dispatch function set');
    
    return () => {
      delete (window as any).valorideDispatchChatAction;
      console.log('🛸 ChatMothershipProvider: Global dispatch function removed');
    };
  }, [dispatchChatAction]);

  return <>{children}</>;
};

// Utility functions for other components to easily dispatch events
export const MothershipTracking = {
  trackChatMessage: (messageId: string, content: string, taskId?: string) => {
    console.log('🛸 MothershipTracking.trackChatMessage called:', { messageId, content, taskId });
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('chat-message', { messageId, content, taskId });
    } else {
      console.warn('🛸 MothershipTracking: No dispatch function available');
    }
  },

  trackToolUse: (toolName: string, args?: any, taskId?: string) => {
    console.log('🛸 MothershipTracking.trackToolUse called:', { toolName, args, taskId });
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('tool-use', { toolName, arguments: args, taskId });
    } else {
      console.warn('🛸 MothershipTracking: No dispatch function available');
    }
  },

  trackFileEdit: (fileName: string, content?: string, taskId?: string) => {
    console.log('🛸 MothershipTracking.trackFileEdit called:', { fileName, taskId });
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('file-edit', { fileName, content, taskId });
    } else {
      console.warn('🛸 MothershipTracking: No dispatch function available');
    }
  },

  trackCommandExecute: (command: string, taskId?: string) => {
    console.log('🛸 MothershipTracking.trackCommandExecute called:', { command, taskId });
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('command-execute', { command, taskId });
    } else {
      console.warn('🛸 MothershipTracking: No dispatch function available');
    }
  },

  trackTaskComplete: (taskId: string, result?: any) => {
    console.log('🛸 MothershipTracking.trackTaskComplete called:', { taskId, result });
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('task-complete', { taskId, result });
    } else {
      console.warn('🛸 MothershipTracking: No dispatch function available');
    }
  },

  updateActiveTools: (tools: string[]) => {
    console.log('🛸 MothershipTracking.updateActiveTools called:', { tools });
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('active-tools-update', { tools });
    } else {
      console.warn('🛸 MothershipTracking: No dispatch function available');
    }
  },

  updateOpenFiles: (files: string[]) => {
    console.log('🛸 MothershipTracking.updateOpenFiles called:', { files });
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('open-files-update', { files });
    } else {
      console.warn('🛸 MothershipTracking: No dispatch function available');
    }
  },

  // Send message to another ValorIDE instance
  sendCrossInstanceMessage: (message: string, targetInstanceId?: string) => {
    console.log('🛸 MothershipTracking.sendCrossInstanceMessage called:', { message, targetInstanceId });
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('cross-instance-chat', { 
        message, 
        targetInstanceId,
        timestamp: Date.now() 
      });
    } else {
      console.warn('🛸 MothershipTracking: No dispatch function available');
    }
  },

  // Remote control API - inject response into another instance
  injectApiResponse: (content: string, targetInstanceId?: string) => {
    console.log('🛸 MothershipTracking.injectApiResponse called:', { content, targetInstanceId });
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('remote-api-command', { 
        apiAction: 'inject_response',
        content,
        targetInstanceId,
        timestamp: Date.now() 
      });
    } else {
      console.warn('🛸 MothershipTracking: No dispatch function available');
    }
  },

  // Remote control API - trigger API call in another instance  
  triggerRemoteApiCall: (model: string, messages: any[], targetInstanceId?: string) => {
    console.log('🛸 MothershipTracking.triggerRemoteApiCall called:', { model, targetInstanceId });
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('remote-api-command', { 
        apiAction: 'trigger_api_call',
        model,
        messages,
        targetInstanceId,
        timestamp: Date.now() 
      });
    } else {
      console.warn('🛸 MothershipTracking: No dispatch function available');
    }
  },

  // Send chat message to ValkyrAI or other instances
  sendRemoteChatMessage: (message: string, targetInstanceId?: string) => {
    console.log('🛸 MothershipTracking.sendRemoteChatMessage called:', { message, targetInstanceId });
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('remote-chat-message', { 
        message,
        targetInstanceId,
        sender: 'valoride',
        timestamp: Date.now() 
      });
    } else {
      console.warn('🛸 MothershipTracking: No dispatch function available');
    }
  },
};

export default ChatMothershipProvider;
