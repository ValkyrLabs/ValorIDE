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

  // Track task context changes
  useEffect(() => {
    if (currentTaskId && currentTaskId !== lastTaskIdRef.current) {
      mothership.setCurrentTask(currentTaskId);
      lastTaskIdRef.current = currentTaskId;
    }
  }, [currentTaskId, mothership]);

  // Set up global event listeners to track various actions
  useEffect(() => {
    // Track chat messages sent by user
    const handleChatMessage = (event: CustomEvent) => {
      const { messageId, content, taskId } = event.detail;
      mothership.trackChatMessage(messageId, content, taskId || currentTaskId);
    };

    // Track tool usage
    const handleToolUse = (event: CustomEvent) => {
      const { toolName, arguments: args, taskId } = event.detail;
      mothership.trackToolUse(toolName, args, taskId || currentTaskId);
    };

    // Track file operations
    const handleFileEdit = (event: CustomEvent) => {
      const { fileName, content, taskId } = event.detail;
      mothership.trackFileEdit(fileName, content, taskId || currentTaskId);
    };

    // Track command execution
    const handleCommandExecute = (event: CustomEvent) => {
      const { command, taskId } = event.detail;
      mothership.trackCommandExecute(command, taskId || currentTaskId);
    };

    // Track task completion
    const handleTaskComplete = (event: CustomEvent) => {
      const { taskId, result } = event.detail;
      mothership.trackTaskComplete(taskId, result);
    };

    // Track active tools updates
    const handleActiveToolsUpdate = (event: CustomEvent) => {
      const { tools } = event.detail;
      mothership.updateActiveTools(tools);
    };

    // Track open files updates
    const handleOpenFilesUpdate = (event: CustomEvent) => {
      const { files } = event.detail;
      mothership.updateOpenFiles(files);
    };

    // Add event listeners
    window.addEventListener('valoride-chat-message', handleChatMessage as EventListener);
    window.addEventListener('valoride-tool-use', handleToolUse as EventListener);
    window.addEventListener('valoride-file-edit', handleFileEdit as EventListener);
    window.addEventListener('valoride-command-execute', handleCommandExecute as EventListener);
    window.addEventListener('valoride-task-complete', handleTaskComplete as EventListener);
    window.addEventListener('valoride-active-tools-update', handleActiveToolsUpdate as EventListener);
    window.addEventListener('valoride-open-files-update', handleOpenFilesUpdate as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('valoride-chat-message', handleChatMessage as EventListener);
      window.removeEventListener('valoride-tool-use', handleToolUse as EventListener);
      window.removeEventListener('valoride-file-edit', handleFileEdit as EventListener);
      window.removeEventListener('valoride-command-execute', handleCommandExecute as EventListener);
      window.removeEventListener('valoride-task-complete', handleTaskComplete as EventListener);
      window.removeEventListener('valoride-active-tools-update', handleActiveToolsUpdate as EventListener);
      window.removeEventListener('valoride-open-files-update', handleOpenFilesUpdate as EventListener);
    };
  }, [mothership, currentTaskId]);

  // Function to dispatch events for other components to use
  const dispatchChatAction = useCallback((type: string, data: any) => {
    const event = new CustomEvent(`valoride-${type}`, { detail: data });
    window.dispatchEvent(event);
  }, []);

  // Make dispatch function available globally for other components
  useEffect(() => {
    (window as any).valorideDispatchChatAction = dispatchChatAction;
    
    return () => {
      delete (window as any).valorideDispatchChatAction;
    };
  }, [dispatchChatAction]);

  return <>{children}</>;
};

// Utility functions for other components to easily dispatch events
export const MothershipTracking = {
  trackChatMessage: (messageId: string, content: string, taskId?: string) => {
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('chat-message', { messageId, content, taskId });
    }
  },

  trackToolUse: (toolName: string, args?: any, taskId?: string) => {
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('tool-use', { toolName, arguments: args, taskId });
    }
  },

  trackFileEdit: (fileName: string, content?: string, taskId?: string) => {
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('file-edit', { fileName, content, taskId });
    }
  },

  trackCommandExecute: (command: string, taskId?: string) => {
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('command-execute', { command, taskId });
    }
  },

  trackTaskComplete: (taskId: string, result?: any) => {
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('task-complete', { taskId, result });
    }
  },

  updateActiveTools: (tools: string[]) => {
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('active-tools-update', { tools });
    }
  },

  updateOpenFiles: (files: string[]) => {
    const dispatch = (window as any).valorideDispatchChatAction;
    if (dispatch) {
      dispatch('open-files-update', { files });
    }
  },
};

export default ChatMothershipProvider;
