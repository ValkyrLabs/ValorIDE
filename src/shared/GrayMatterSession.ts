// Shared types for GrayMatter session state

export type GrayMatterSessionStatus =
  | "forbidden"
  | "quota"
  | "ready"
  | "unauthenticated"
  | "unavailable";

export type GrayMatterRecoveryActionId =
  | "buy_credits"
  | "open_account";

export interface GrayMatterRecoveryAction {
  command: "valoride.accountButtonClicked";
  id: GrayMatterRecoveryActionId;
  label: string;
  primary?: boolean;
}

export interface GrayMatterRecovery {
  actions: GrayMatterRecoveryAction[];
  backendBaseUrl: string;
  command: "valoride.accountButtonClicked";
  message: string;
  reason: GrayMatterSessionStatus;
  retryable: boolean;
}

export interface GrayMatterCapabilities {
  agent: boolean;
  grayMatter: boolean;
  memoryEntry: boolean;
  memoryQuery: boolean;
  memoryRead: boolean;
  memoryWrite: boolean;
  project: boolean;
  projectObjectLink: boolean;
  swarmGraph: boolean;
  swarmOps: boolean;
}

export interface GrayMatterSessionState {
  baseUrl: string;
  capabilities: GrayMatterCapabilities;
  checkedAt: string;
  controlSurface?: GrayMatterControlSurface;
  error?: string;
  recovery?: GrayMatterRecovery;
  status: GrayMatterSessionStatus;
}

export const defaultGrayMatterCapabilities: GrayMatterCapabilities = {
  agent: false,
  grayMatter: false,
  memoryEntry: false,
  memoryQuery: false,
  memoryRead: false,
  memoryWrite: false,
  project: false,
  projectObjectLink: false,
  swarmGraph: false,
  swarmOps: false,
};

export interface GrayMatterControlSurface {
  clients?: Record<string, GrayMatterClientProfile>;
  endpoints?: Record<string, Record<string, string>>;
  generatedAt?: string;
  memory?: {
    adminActions?: string[];
    entryTypes?: string[];
    excludedPrimitives?: string[];
    policy?: string;
    primitives?: string[];
  };
  objectGraph?: {
    agenticInterfaces?: string[];
    businessDomains?: string[];
    coordinationPrimitives?: string[];
    externalAgentFamilies?: string[];
    memoryPrimitives?: string[];
    mode?: string;
    relationshipPolicy?: string;
    schemaEndpoint?: string;
    source?: string;
    suitePrimitives?: string[];
  };
  principalId?: string;
  semantic?: {
    activeProvider?: string;
    activeRows?: number;
    qualityState?: string;
    recommendedAction?: string;
    reindexRecommended?: boolean;
    staleRows?: number;
  };
  suite?: {
    agenticChat?: string;
    agenticIde?: string;
    backend?: string;
    gridProducts?: string[];
    memoryLayer?: string;
    name?: string;
    productSurfaces?: string[];
  };
  swarm?: {
    coordinationOnly?: boolean;
    graphEndpoint?: string;
    policy?: string;
    registrationEndpoint?: string;
    supportedAgentFamilies?: string[];
  };
}

export interface GrayMatterClientProfile {
  agenticWorkInterface?: boolean;
  appGenerationClient?: boolean;
  displayName?: string;
  endpoints?: Record<string, string>;
  grayMatterClient?: boolean;
  role?: string;
  suiteProducts?: string[];
  swarmAgent?: boolean;
  workCapabilities?: string[];
}
