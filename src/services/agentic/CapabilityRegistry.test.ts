import {
  CapabilityRegistry,
  createDefaultValorCapabilities,
} from "./CapabilityRegistry";

describe("CapabilityRegistry", () => {
  it("announces ValorIDE local execution capabilities for SWARM registration", () => {
    const registry = new CapabilityRegistry(createDefaultValorCapabilities());

    const announcement = registry.toSwarmAnnouncement({
      instanceId: "valoride-local-1",
      version: "3.20.820",
      workspaceFolders: ["/workspace/app"],
    });

    expect(announcement.instanceId).toBe("valoride-local-1");
    expect(
      announcement.capabilities.map((capability) => capability.id),
    ).toEqual(
      expect.arrayContaining([
        "filesystem.read",
        "filesystem.write",
        "psr.edit",
        "terminal.execute",
        "browser.automation",
        "mcp.tool",
        "workflow.execute",
        "automation.schedule",
        "checkpoint.manage",
        "connector.read",
        "thorapi.rest",
        "graymatter.memory",
        "swarm.command",
      ]),
    );
    expect(announcement.localExecution).toEqual({
      automation: true,
      browser: true,
      checkpoint: true,
      connector: true,
      filesystem: true,
      graymatter: true,
      mcp: true,
      swarm: true,
      terminal: true,
      thorapi: true,
      workflow: true,
    });
  });

  it("removes disabled capabilities from announcements", () => {
    const registry = new CapabilityRegistry(createDefaultValorCapabilities());

    registry.updateCapability("terminal.execute", { enabled: false });

    const announcement = registry.toSwarmAnnouncement({
      instanceId: "valoride-local-1",
      version: "3.20.820",
      workspaceFolders: [],
    });

    expect(
      announcement.capabilities.map((capability) => capability.id),
    ).not.toContain("terminal.execute");
    expect(announcement.localExecution.terminal).toBe(false);
    expect(announcement.localExecution.graymatter).toBe(true);
    expect(announcement.localExecution.swarm).toBe(true);
    expect(announcement.localExecution.thorapi).toBe(true);
    expect(announcement.localExecution.workflow).toBe(true);
  });
});
