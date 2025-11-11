/**
 * Shared TypeScript types and utilities for ValorIDE SWARM messaging protocol.
 * Used by ValorIDE extension for unified message handling with ValkyrAI backend.
 *
 * @see ../../../ValkyrAI/docs/AGENTIC_SWARM_PROTOCOL.md
 */
export var SwarmMessageType;
(function (SwarmMessageType) {
    SwarmMessageType["COMMAND"] = "command";
    SwarmMessageType["RESPONSE"] = "response";
    SwarmMessageType["BROADCAST"] = "broadcast";
    SwarmMessageType["EVENT"] = "event";
    SwarmMessageType["ACK"] = "ack";
    SwarmMessageType["NACK"] = "nack";
})(SwarmMessageType || (SwarmMessageType = {}));
export var SwarmEntityType;
(function (SwarmEntityType) {
    SwarmEntityType["AGENT"] = "agent";
    SwarmEntityType["SERVER"] = "server";
    SwarmEntityType["WORKFLOW"] = "workflow";
    SwarmEntityType["USER"] = "user";
    SwarmEntityType["BROADCAST"] = "broadcast";
})(SwarmEntityType || (SwarmEntityType = {}));
export var SwarmPriority;
(function (SwarmPriority) {
    SwarmPriority["LOW"] = "low";
    SwarmPriority["NORMAL"] = "normal";
    SwarmPriority["HIGH"] = "high";
    SwarmPriority["URGENT"] = "urgent";
})(SwarmPriority || (SwarmPriority = {}));
/**
 * Build a SWARM protocol message envelope.
 */
export function buildSwarmMessage(type, from, to, action, data, options) {
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
export function generateMessageId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
/**
 * Build ACK message for a received message.
 */
export function buildAck(originalMessage, from, data) {
    return buildSwarmMessage(SwarmMessageType.ACK, from, originalMessage.from, 'acknowledged', data || { status: 'ok' }, { ackId: originalMessage.id });
}
/**
 * Build NACK message for a rejected/failed message.
 */
export function buildNack(originalMessage, from, error, errorCode) {
    return buildSwarmMessage(SwarmMessageType.NACK, from, originalMessage.from, 'rejected', { error, code: errorCode || 'ERR_UNKNOWN' }, { ackId: originalMessage.id });
}
/**
 * Validate message envelope structure.
 */
export function validateSwarmMessage(message) {
    return (message &&
        typeof message.id === 'string' &&
        typeof message.type === 'string' &&
        message.from &&
        message.to &&
        typeof message.timestamp === 'string' &&
        message.payload &&
        typeof message.payload.action === 'string');
}
/**
 * Parse raw WebSocket message into SwarmMessage if valid.
 */
export function parseSwarmMessage(raw) {
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return validateSwarmMessage(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}
/**
 * Ack/Nack tracker for managing pending acknowledgments.
 */
export class AckTracker {
    pending = new Map();
    /**
     * Send message and wait for ACK/NACK.
     */
    async sendAndWaitForAck(message, sendFn, timeoutMs = 30000) {
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
    handleAckNack(message) {
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
        }
        else if (message.type === SwarmMessageType.NACK) {
            pending.reject(new Error(message.payload.data.error || 'Request rejected by recipient'));
        }
        return true;
    }
    /**
     * Cancel all pending acks (on disconnect).
     */
    cancelAll() {
        for (const [id, pending] of this.pending.entries()) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Connection closed'));
        }
        this.pending.clear();
    }
    /**
     * Get count of pending acks.
     */
    getPendingCount() {
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
//# sourceMappingURL=swarm-protocol.js.map