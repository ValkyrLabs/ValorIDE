/**
 * Shared TypeScript types and utilities for ValorIDE SWARM messaging protocol.
 * Used by ValorIDE extension for unified message handling with ValkyrAI backend.
 * 
 * @see ../../../ValkyrAI/docs/AGENTIC_SWARM_PROTOCOL.md
 */

export enum SwarmMessageType {
    COMMAND = 'command',
    RESPONSE = 'response',
    BROADCAST = 'broadcast',
    EVENT = 'event',
    ACK = 'ack',
    NACK = 'nack',
}

export enum SwarmEntityType {
    AGENT = 'agent',
    SERVER = 'server',
    WORKFLOW = 'workflow',
    USER = 'user',
    BROADCAST = 'broadcast',
}

export enum SwarmPriority {
    LOW = 'low',
    NORMAL = 'normal',
    HIGH = 'high',
    URGENT = 'urgent',
}

export interface SwarmEntity {
    instanceId?: string;
    type: SwarmEntityType;
    principalId?: string;
    username?: string;
}

export interface SwarmPayload {
    action: string;
    data: Record<string, any>;
    metadata?: {
        workflowId?: string;
        sessionId?: string;
        correlationId?: string;
        [key: string]: any;
    };
}

export interface SwarmSecurity {
    signature?: string;
    encrypted?: boolean;
}

export interface SwarmMessage {
    id: string;
    type: SwarmMessageType;
    from: SwarmEntity;
    to: SwarmEntity;
    timestamp: string;
    ackId?: string;
    payload: SwarmPayload;
    security?: SwarmSecurity;
    ttl?: number;
    priority?: SwarmPriority;
}

/**
 * Build a SWARM protocol message envelope.
 */
export function buildSwarmMessage(
    type: SwarmMessageType,
    from: SwarmEntity,
    to: SwarmEntity,
    action: string,
    data: Record<string, any>,
    options?: {
        ackId?: string;
        metadata?: Record<string, any>;
        ttl?: number;
        priority?: SwarmPriority;
    }
): SwarmMessage {
    return {
        id: generateMessageId(),
        type,
        from,
        to,
        timestamp: new Date().toISOString(),
        ackId: options?.ackId,
        payload: {
            action,
            data,
            metadata: options?.metadata,
        },
        ttl: options?.ttl || 300000, // 5 minutes default
        priority: options?.priority || SwarmPriority.NORMAL,
    };
}

/**
 * Generate unique message ID (UUID v4).
 */
export function generateMessageId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Build ACK message for a received message.
 */
export function buildAck(
    originalMessage: SwarmMessage,
    from: SwarmEntity,
    data?: Record<string, any>
): SwarmMessage {
    return buildSwarmMessage(
        SwarmMessageType.ACK,
        from,
        originalMessage.from,
        'acknowledged',
        data || { status: 'ok' },
        { ackId: originalMessage.id }
    );
}

/**
 * Build NACK message for a rejected/failed message.
 */
export function buildNack(
    originalMessage: SwarmMessage,
    from: SwarmEntity,
    error: string,
    errorCode?: string
): SwarmMessage {
    return buildSwarmMessage(
        SwarmMessageType.NACK,
        from,
        originalMessage.from,
        'rejected',
        { error, code: errorCode || 'ERR_UNKNOWN' },
        { ackId: originalMessage.id }
    );
}

/**
 * Validate message envelope structure.
 */
export function validateSwarmMessage(message: any): message is SwarmMessage {
    return (
        message &&
        typeof message.id === 'string' &&
        typeof message.type === 'string' &&
        message.from &&
        message.to &&
        typeof message.timestamp === 'string' &&
        message.payload &&
        typeof message.payload.action === 'string'
    );
}

/**
 * Parse raw WebSocket message into SwarmMessage if valid.
 */
export function parseSwarmMessage(raw: string | Record<string, any>): SwarmMessage | null {
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return validateSwarmMessage(parsed) ? (parsed as SwarmMessage) : null;
    } catch {
        return null;
    }
}

/**
 * Ack/Nack tracker for managing pending acknowledgments.
 */
export class AckTracker {
    private pending = new Map<
        string,
        {
            message: SwarmMessage;
            resolve: (response: SwarmMessage) => void;
            reject: (error: Error) => void;
            timeout: ReturnType<typeof setTimeout>;
        }
    >();

    /**
     * Send message and wait for ACK/NACK.
     */
    async sendAndWaitForAck(
        message: SwarmMessage,
        sendFn: (message: SwarmMessage) => void,
        timeoutMs: number = 30000
    ): Promise<SwarmMessage> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(message.id);
                reject(new Error(`Timeout waiting for ack/nack (${timeoutMs}ms)`));
            }, timeoutMs);

            this.pending.set(message.id, {
                message,
                resolve,
                reject,
                timeout,
            });

            sendFn(message);
        });
    }

    /**
     * Handle incoming ACK/NACK message.
     */
    handleAckNack(message: SwarmMessage): boolean {
        if (!message.ackId) {
            return false;
        }

        const pending = this.pending.get(message.ackId);
        if (!pending) {
            return false;
        }

        clearTimeout(pending.timeout);
        this.pending.delete(message.ackId);

        if (message.type === SwarmMessageType.ACK) {
            pending.resolve(message);
        } else if (message.type === SwarmMessageType.NACK) {
            pending.reject(
                new Error(
                    message.payload.data.error || 'Request rejected by recipient'
                )
            );
        }

        return true;
    }

    /**
     * Cancel all pending acks (on disconnect).
     */
    cancelAll(): void {
        for (const [id, pending] of this.pending.entries()) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Connection closed'));
        }
        this.pending.clear();
    }

    /**
     * Get count of pending acks.
     */
    getPendingCount(): number {
        return this.pending.size;
    }
}

/**
 * Default export for convenience.
 */
export default {
    SwarmMessageType,
    SwarmEntityType,
    SwarmPriority,
    buildSwarmMessage,
    buildAck,
    buildNack,
    validateSwarmMessage,
    parseSwarmMessage,
    generateMessageId,
    AckTracker,
};
