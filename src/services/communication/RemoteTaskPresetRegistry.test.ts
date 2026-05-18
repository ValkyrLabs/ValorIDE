import { RemoteTaskPresetRegistry } from "./RemoteTaskPresetRegistry";

describe("RemoteTaskPresetRegistry", () => {
  it("saves org and team presets", () => {
    const registry = new RemoteTaskPresetRegistry();

    registry.save({
      id: "org-bugfix",
      name: "Org Bugfix",
      scope: "org",
      scopeId: "valkyrlabs",
      templateId: "bugfix",
      payload: { issue: "#14", target: "launcher" },
      now: 1000,
    });

    registry.save({
      id: "team-docs",
      name: "Team Docs",
      scope: "team",
      scopeId: "platform",
      templateId: "docs",
      payload: { topic: "deployment checklist" },
      now: 1200,
    });

    expect(registry.list({ scope: "org", scopeId: "valkyrlabs" })).toHaveLength(
      1,
    );
    expect(registry.list({ scope: "team", scopeId: "platform" })).toHaveLength(
      1,
    );
  });

  it("updates an existing preset deterministically", () => {
    const registry = new RemoteTaskPresetRegistry();

    registry.save({
      id: "org-bugfix",
      name: "Org Bugfix",
      scope: "org",
      scopeId: "valkyrlabs",
      templateId: "bugfix",
      payload: { issue: "#14", target: "launcher" },
      now: 1000,
    });

    const updated = registry.save({
      id: "org-bugfix",
      name: "Org Bugfix v2",
      scope: "org",
      scopeId: "valkyrlabs",
      templateId: "bugfix",
      payload: { issue: "#14", target: "session panel" },
      now: 2000,
    });

    expect(updated.createdAt).toBe(1000);
    expect(updated.updatedAt).toBe(2000);
    expect(updated.payload.target).toBe("session panel");
  });
});
