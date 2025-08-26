/**
 * Shared interface for usage tracking data that matches the ThorAPI model
 */
export interface UsageTransaction {
  spentAt: Date;
  credits: number;
  modelProvider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  id?: string;
  ownerId?: string;
  createdDate?: Date;
  keyHash?: string;
  lastAccessedById?: string;
  lastAccessedDate?: Date;
  lastModifiedById?: string;
  lastModifiedDate?: Date;
}

/**
 * Interface for usage tracking data input
 */
export interface UsageTrackingData {
  modelProvider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  credits: number;
}
