export type CapabilityKind =
  | "automation"
  | "browser"
  | "checkpoint"
  | "connector"
  | "filesystem"
  | "graymatter"
  | "mcp"
  | "psr"
  | "swarm"
  | "terminal"
  | "thorapi";

export type CapabilityRisk = "low" | "medium" | "high";

export interface CapabilityDescriptor {
  id: string;
  label: string;
  kind: CapabilityKind;
  enabled: boolean;
  requiresApproval: boolean;
  risk: CapabilityRisk;
  localOnly?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CapabilitySnapshotInput {
  approvalPolicy?: string;
  instanceId: string;
  principal?: {
    principalId?: string;
    username?: string;
  };
  selectedModelId?: string;
  selectedPromptId?: string;
  selectedPromptName?: string;
  version: string;
  workspaceFolders: string[];
  workspaceSummary?: {
    folderCount: number;
    folders: string[];
  };
}

export interface LocalExecutionCapabilities {
  automation: boolean;
  browser: boolean;
  checkpoint: boolean;
  connector: boolean;
  filesystem: boolean;
  mcp: boolean;
  terminal: boolean;
}

export interface CapabilityAnnouncement extends CapabilitySnapshotInput {
  capabilities: CapabilityDescriptor[];
  generatedAt: string;
  localExecution: LocalExecutionCapabilities;
}

export const createDefaultValorCapabilities = (): CapabilityDescriptor[] => [
  {
    id: "filesystem.read",
    label: "Read workspace files",
    kind: "filesystem",
    enabled: true,
    requiresApproval: false,
    risk: "low",
    localOnly: true,
  },
  {
    id: "filesystem.write",
    label: "Write workspace files",
    kind: "filesystem",
    enabled: true,
    requiresApproval: true,
    risk: "high",
    localOnly: true,
  },
  {
    id: "psr.edit",
    label: "Precision search and replace",
    kind: "psr",
    enabled: true,
    requiresApproval: true,
    risk: "medium",
    localOnly: true,
  },
  {
    id: "terminal.execute",
    label: "Execute local commands",
    kind: "terminal",
    enabled: true,
    requiresApproval: true,
    risk: "high",
    localOnly: true,
  },
  {
    id: "browser.automation",
    label: "Automate local browser sessions",
    kind: "browser",
    enabled: true,
    requiresApproval: true,
    risk: "medium",
    localOnly: true,
  },
  {
    id: "mcp.tool",
    label: "Run installed MCP tools",
    kind: "mcp",
    enabled: true,
    requiresApproval: true,
    risk: "medium",
    localOnly: true,
  },
  {
    id: "automation.schedule",
    label: "Schedule guarded automations",
    kind: "automation",
    enabled: true,
    requiresApproval: true,
    risk: "medium",
    localOnly: true,
  },
  {
    id: "checkpoint.manage",
    label: "Create and restore task checkpoints",
    kind: "checkpoint",
    enabled: true,
    requiresApproval: true,
    risk: "medium",
    localOnly: true,
  },
  {
    id: "connector.read",
    label: "Read authorized connector data",
    kind: "connector",
    enabled: true,
    requiresApproval: true,
    risk: "medium",
  },
  {
    id: "thorapi.rest",
    label: "Use generated ThorAPI client",
    kind: "thorapi",
    enabled: true,
    requiresApproval: false,
    risk: "medium",
  },
  {
    id: "graymatter.memory",
    label: "Read and write GrayMatter memory",
    kind: "graymatter",
    enabled: true,
    requiresApproval: false,
    risk: "medium",
  },
  {
    id: "swarm.command",
    label: "Receive SWARM commands",
    kind: "swarm",
    enabled: true,
    requiresApproval: true,
    risk: "high",
  },
];

export class CapabilityRegistry {
  private readonly capabilities = new Map<string, CapabilityDescriptor>();

  constructor(
    capabilities: CapabilityDescriptor[] = createDefaultValorCapabilities(),
    private readonly now: () => Date = () => new Date(),
  ) {
    for (const capability of capabilities) {
      this.capabilities.set(capability.id, { ...capability });
    }
  }

  listCapabilities(): CapabilityDescriptor[] {
    return Array.from(this.capabilities.values()).map((capability) => ({
      ...capability,
      metadata: capability.metadata ? { ...capability.metadata } : undefined,
    }));
  }

  updateCapability(
    id: string,
    patch: Partial<Omit<CapabilityDescriptor, "id">>,
  ): CapabilityDescriptor {
    const existing = this.capabilities.get(id);
    if (!existing) {
      throw new Error(`Unknown ValorIDE capability: ${id}`);
    }

    const updated = {
      ...existing,
      ...patch,
      metadata: patch.metadata
        ? { ...existing.metadata, ...patch.metadata }
        : existing.metadata,
    };
    this.capabilities.set(id, updated);
    return { ...updated };
  }

  toSwarmAnnouncement(input: CapabilitySnapshotInput): CapabilityAnnouncement {
    const capabilities = this.listCapabilities().filter(
      (capability) => capability.enabled,
    );

    const hasCapability = (id: string) =>
      capabilities.some((capability) => capability.id === id);

    return {
      ...input,
      capabilities,
      generatedAt: this.now().toISOString(),
      localExecution: {
        automation: hasCapability("automation.schedule"),
        browser: hasCapability("browser.automation"),
        checkpoint: hasCapability("checkpoint.manage"),
        connector: hasCapability("connector.read"),
        filesystem:
          hasCapability("filesystem.read") || hasCapability("filesystem.write"),
        mcp: hasCapability("mcp.tool"),
        terminal: hasCapability("terminal.execute"),
      },
    };
  }
}
