// Shared types for GrayMatter session state

export type GrayMatterSessionStatus =
  | "forbidden"
  | "quota"
  | "ready"
  | "unauthenticated"
  | "unavailable";

export interface GrayMatterCapabilities {
  agent: boolean;
  grayMatter: boolean;
  memoryEntry: boolean;
  memoryQuery: boolean;
  memoryRead: boolean;
  memoryWrite: boolean;
  swarmGraph: boolean;
  swarmOps: boolean;
}

export interface GrayMatterSessionState {
  baseUrl: string;
  capabilities: GrayMatterCapabilities;
  checkedAt: string;
  error?: string;
  status: GrayMatterSessionStatus;
}

export const defaultGrayMatterCapabilities: GrayMatterCapabilities = {
  agent: false,
  grayMatter: false,
  memoryEntry: false,
  memoryQuery: false,
  memoryRead: false,
  memoryWrite: false,
  swarmGraph: false,
  swarmOps: false,
};
