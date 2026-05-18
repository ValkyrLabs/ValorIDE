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
        "thorapi.rest",
        "graymatter.memory",
        "swarm.command",
      ]),
    );
    expect(announcement.localExecution).toEqual({
      browser: true,
      filesystem: true,
      mcp: true,
      terminal: true,
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
  });
});
