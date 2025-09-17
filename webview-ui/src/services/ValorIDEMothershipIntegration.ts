import { WebsocketMessage, WebsocketMessageTypeEnum, WebsocketMessageToJSON } from "@thor/model";
import { MothershipService, RemoteCommand } from "../../../src/services/communication/MothershipService";

export interface ChatAction {
  type: 'chat_message' | 'task_start' | 'task_complete' | 'tool_use' | 'file_edit' | 'command_execute' | 'api_data';
  taskId?: string;
  messageId?: string;
  toolName?: string;
  fileName?: string;
  command?: string;
  content?: string;
  metadata?: any;
}

export interface ValorIDEState {
  currentTaskId?: string;
  activeTools: string[];
  openFiles: string[];
  lastActivity: Date;
}

/**
 * Integrates ValorIDE chat actions with the mothership WebSocket system
 * Sends every significant action to ValkyrAI for coordination and remote control
 */
export class ValorIDEMothershipIntegration {
  private mothershipService: MothershipService | null = null;
  private currentState: ValorIDEState = {
    activeTools: [],
    openFiles: [],
    lastActivity: new Date(),
  };
  private actionQueue: ChatAction[] = [];
  private isProcessingQueue = false;

  constructor(mothershipService: MothershipService | null) {
    this.mothershipService = mothershipService;
    
    if (mothershipService) {
      this.setupEventListeners();
    }
  }

  public updateMothershipService(service: MothershipService | null): void {
    this.mothershipService = service;
    if (service) {
      this.setupEventListeners();
      // Process any queued actions
      this.processActionQueue();
    }
  }

  private setupEventListeners(): void {
    if (!this.mothershipService) return;

    // Listen for remote commands from other ValorIDE instances or ValkyrAI agents
    this.mothershipService.on('remoteCommand', (command: RemoteCommand) => {
      this.handleRemoteCommand(command);
    });

    // Listen for broadcast messages
    this.mothershipService.on('broadcast', (payload: any) => {
      this.handleBroadcastMessage(payload);
    });
  }

  /**
   * Send a ValorIDE action to the mothership using command protocol
   */
  public async sendChatAction(action: ChatAction): Promise<void> {
    console.log('🚀 sendChatAction called with:', action);
    this.updateLastActivity();

    // Debug connection status
    const isConnected = this.mothershipService?.isConnected();
    const instanceId = this.mothershipService?.getInstanceId();
    console.log('🚀 Mothership service status:', { 
      hasService: !!this.mothershipService,
      isConnected,
      instanceId,
      queueLength: this.actionQueue.length
    });

    if (!isConnected) {
      // Queue the action for when connection is restored
      this.actionQueue.push(action);
      console.warn('🚀 Mothership not connected, queuing action:', action.type);
      return;
    }

    try {
      // Use command type for mothership protocol communication
      const message: WebsocketMessage = {
        type: 'command' as any, // Using command type as specified for mothership protocol
        payload: JSON.stringify({
          source: 'valoride',
          command: action.type,
          taskId: action.taskId || this.currentState.currentTaskId,
          data: {
            messageId: action.messageId,
            toolName: action.toolName,
            fileName: action.fileName,
            command: action.command,
            content: action.content,
            metadata: action.metadata,
          },
          state: this.getCurrentState(),
          instanceId: instanceId,
          timestamp: Date.now(),
        }),
        time: new Date().toISOString(),
      };

      console.log('🚀 Sending message to mothership:', {
        messageType: message.type,
        payloadLength: message.payload?.length,
        actionType: action.type,
        taskId: action.taskId,
        messagePreview: message.payload?.substring(0, 200) + '...'
      });

      // Actually send the message
      const result = this.mothershipService.sendMessage(message);
      console.log('🚀 sendMessage result:', result);
      console.log('🚀 Successfully sent ValorIDE command to mothership:', action.type);
    } catch (error) {
      console.error('🚀 Failed to send chat action to mothership:', error);
      console.error('🚀 Error details:', {
        errorMessage: error?.message,
        errorStack: error?.stack,
        actionType: action.type
      });
    }
  }

  /**
   * Handle remote commands from mothership or other ValorIDE instances
   */
  private handleRemoteCommand(command: RemoteCommand): void {
    console.log('Processing remote command:', command);

    try {
      const payload = typeof command.payload === 'string' 
        ? JSON.parse(command.payload) 
        : command.payload;

      switch (command.type) {
        case 'execute_tool':
          this.handleRemoteToolExecution(payload);
          break;
        case 'open_file':
          this.handleRemoteFileOpen(payload);
          break;
        case 'send_message':
          this.handleRemoteMessage(payload);
          break;
        case 'sync_state':
          this.handleStateSyncRequest(payload);
          break;
        case 'task_coordination':
          this.handleTaskCoordination(payload);
          break;
        case 'remote_chat_message':
          this.handleRemoteChatMessage(payload);
          break;
        case 'remote_api_command':
          this.handleRemoteApiCommand(payload);
          break;
        case 'cross_instance_chat':
          this.handleCrossInstanceChat(payload);
          break;
        default:
          console.warn('Unknown remote command type:', command.type);
          // Forward to extension for handling
          this.forwardToExtension({
            type: 'remoteCommand',
            command,
          });
      }
    } catch (error) {
      console.error('Error handling remote command:', error);
    }
  }

  private handleRemoteToolExecution(payload: any): void {
    console.log('Remote tool execution requested:', payload);
    
    // Forward to the VS Code extension
    this.forwardToExtension({
      type: 'executeRemoteTool',
      toolName: payload.toolName,
      arguments: payload.arguments,
      taskId: payload.taskId,
    });
  }

  private handleRemoteFileOpen(payload: any): void {
    console.log('Remote file open requested:', payload);
    
    this.forwardToExtension({
      type: 'openFile',
      filePath: payload.filePath,
      line: payload.line,
      column: payload.column,
    });
  }

  private handleRemoteMessage(payload: any): void {
    console.log('Remote message received:', payload);
    
    // Display the message in the chat interface
    this.forwardToExtension({
      type: 'displayRemoteMessage',
      message: payload.message,
      sender: payload.sender,
      priority: payload.priority,
    });
  }

  private handleStateSyncRequest(payload: any): void {
    // Send current state to requesting instance
    this.sendChatAction({
      type: 'task_start', // Use existing type for state sync
      metadata: {
        syncResponse: true,
        requestId: payload.requestId,
        state: this.getCurrentState(),
      },
    });
  }

  private handleTaskCoordination(payload: any): void {
    console.log('Task coordination message:', payload);
    
    if (payload.action === 'task_handoff') {
      this.currentState.currentTaskId = payload.taskId;
      this.forwardToExtension({
        type: 'taskHandoff',
        taskId: payload.taskId,
        description: payload.description,
        fromInstanceId: payload.fromInstanceId,
      });
    }
  }

  private handleBroadcastMessage(payload: any): void {
    console.log('Broadcast message received:', payload);
    
    if (payload.type === 'system_announcement') {
      this.forwardToExtension({
        type: 'systemAnnouncement',
        message: payload.message,
        level: payload.level,
      });
    }
  }

  /**
   * Handle remote chat messages from other ValorIDE instances or ValkyrAI
   */
  private handleRemoteChatMessage(payload: any): void {
    console.log('Remote chat message received:', payload);
    
    // Inject remote chat message into current chat interface
    if (typeof window !== 'undefined' && (window as any).valorideDispatchChatAction) {
      (window as any).valorideDispatchChatAction('remote-message', {
        text: payload.message,
        sender: payload.sender,
        instanceId: payload.instanceId,
        timestamp: payload.timestamp,
        taskId: payload.taskId
      });
    }
  }

  /**
   * Handle remote API control commands (e.g., trigger new API calls, modify responses)
   */
  private handleRemoteApiCommand(payload: any): void {
    console.log('Remote API command received:', payload);
    
    switch (payload.apiAction) {
      case 'inject_response':
        // Inject synthetic API response into the chat stream
        if (typeof window !== 'undefined' && (window as any).valorideDispatchChatAction) {
          (window as any).valorideDispatchChatAction('api-data', {
            type: 'stream_chunk',
            data: {
              choices: [{
                delta: {
                  content: payload.content,
                  role: 'assistant'
                }
              }]
            },
            timestamp: Date.now(),
            source: 'remote_control'
          });
        }
        break;
        
      case 'trigger_api_call':
        // Trigger new API call with specified parameters
        this.forwardToExtension({
          type: 'triggerRemoteApiCall',
          model: payload.model,
          messages: payload.messages,
          taskId: payload.taskId,
        });
        break;
        
      case 'modify_stream':
        // Modify ongoing stream with new content
        if (typeof window !== 'undefined' && (window as any).valorideDispatchChatAction) {
          (window as any).valorideDispatchChatAction('api-data', {
            type: 'stream_chunk',
            data: payload.streamData,
            timestamp: Date.now(),
            source: 'remote_modification'
          });
        }
        break;
    }
  }

  /**
   * Handle cross-instance chat between multiple ValorIDE instances
   */
  private handleCrossInstanceChat(payload: any): void {
    console.log('Cross-instance chat message:', payload);
    
    // Display chat message from another ValorIDE instance in current interface
    this.forwardToExtension({
      type: 'displayCrossInstanceMessage',
      message: payload.message,
      fromInstance: payload.fromInstance,
      timestamp: payload.timestamp,
      taskId: payload.taskId,
    });
  }

  private forwardToExtension(message: any): void {
    try {
      (window as any).vscode?.postMessage(message);
    } catch (error) {
      console.error('Failed to forward message to extension:', error);
    }
  }

  private async processActionQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.mothershipService?.isConnected()) {
      return;
    }

    this.isProcessingQueue = true;
    console.log('🚀 Processing action queue:', `${this.actionQueue.length} queued actions`);

    while (this.actionQueue.length > 0 && this.mothershipService?.isConnected()) {
      const action = this.actionQueue.shift();
      if (action) {
        console.log('🚀 Processing queued action:', action.type);
        await this.sendChatAction(action);
        // Small delay to avoid overwhelming the connection
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.isProcessingQueue = false;
    console.log('🚀 Finished processing action queue');
  }

  /**
   * Update current task context
   */
  public setCurrentTask(taskId: string): void {
    console.log('🚀 Setting current task:', taskId);
    this.currentState.currentTaskId = taskId;
    this.sendChatAction({
      type: 'task_start',
      taskId,
      metadata: { action: 'task_context_update' },
    });
  }

  /**
   * Update active tools list
   */
  public updateActiveTools(tools: string[]): void {
    this.currentState.activeTools = [...tools];
    this.updateLastActivity();
  }

  /**
   * Update open files list
   */
  public updateOpenFiles(files: string[]): void {
    this.currentState.openFiles = [...files];
    this.updateLastActivity();
  }

  /**
   * Send remote command to another ValorIDE instance or ValkyrAI
   */
  public sendRemoteCommand(targetInstanceId: string, type: string, data: any): void {
    if (!this.mothershipService?.isConnected()) {
      console.warn('Cannot send remote command - mothership not connected');
      return;
    }

    const command: Omit<RemoteCommand, 'sourceInstanceId'> = {
      id: Math.random().toString(36).substring(2, 15),
      type,
      payload: data,
      targetInstanceId,
    };

    this.mothershipService.sendRemoteCommand(command);
  }

  /**
   * Broadcast a message to all connected ValorIDE instances
   */
  public broadcastToAll(type: string, data: any): void {
    if (!this.mothershipService?.isConnected()) {
      console.warn('Cannot broadcast - mothership not connected');
      return;
    }

    this.mothershipService.sendMessage({
      type: WebsocketMessageTypeEnum.BROADCAST,
      payload: JSON.stringify({
        source: 'valoride',
        type,
        data,
        instanceId: this.mothershipService.getInstanceId(),
        timestamp: Date.now(),
      }),
    });
  }

  /**
   * Get current ValorIDE state
   */
  public getCurrentState(): ValorIDEState {
    return {
      ...this.currentState,
      lastActivity: new Date(),
    };
  }

  private updateLastActivity(): void {
    this.currentState.lastActivity = new Date();
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.actionQueue = [];
    this.currentState = {
      activeTools: [],
      openFiles: [],
      lastActivity: new Date(),
    };
  }
}
