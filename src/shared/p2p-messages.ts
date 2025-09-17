/**
 * Defines the standard message envelope for all ValorIDE P2P websocket communication.
 */
export interface P2pMessageEnvelope<T> {
  sourceId: string;
  targetId: string | 'broadcast';
  messageId: string;
  type: P2pMessageType;
  payload: T;
  timestamp: string; // ISO 8601 format
}

/**
 * Enum of all supported P2P message types.
 */
export enum P2pMessageType {
  LlmResponse = 'llm_response',
  UserCommand = 'user_command',
}

/**
 * Payload for the `LlmResponse` message type.
 * Contains the full response from the assistant.
 */
export interface LlmResponsePayload {
  taskId: string;
  llmResponse: any; // This should be the AssistantMessage object
}

/**
 * Payload for the `UserCommand` message type.
 * Used to remotely execute a command in another IDE instance.
 */
export interface UserCommandPayload {
  taskId?: string | null;
  command: string;
  args?: Record<string, any>;
}
