import { RemoteCodingTaskPresetCatalog } from "./RemoteCodingTaskPresetCatalog";

describe("RemoteCodingTaskPresetCatalog", () => {
  it("exposes core templates", () => {
    const catalog = new RemoteCodingTaskPresetCatalog();
    const ids = catalog.listTemplates().map((template) => template.id);
    expect(ids).toEqual(["bugfix", "refactor", "docs", "data-patch"]);
  });

  it("renders template tasks and supports saved presets", () => {
    const catalog = new RemoteCodingTaskPresetCatalog();

    const rendered = catalog.renderTask("bugfix", {
      area: "oauth callback",
      repro: "click login and observe 500",
      riskSurface: "billing endpoints",
    });
    expect(rendered).toContain("oauth callback");

    catalog.savePreset({
      id: "team-bugfix",
      name: "Team bugfix preset",
      scope: "team",
      ownerId: "core-platform",
      templateId: "bugfix",
      params: {
        area: "account sync",
        repro: "sync endpoint times out",
      },
      now: 100,
    });

    const listed = catalog.listSavedPresets("team", "core-platform");
    expect(listed).toHaveLength(1);
    expect(catalog.renderTaskFromPreset("team-bugfix")).toContain(
      "account sync",
    );
    expect(catalog.renderTaskFromPreset("team-bugfix")).toContain(
      "release notes",
    );
  });
});
