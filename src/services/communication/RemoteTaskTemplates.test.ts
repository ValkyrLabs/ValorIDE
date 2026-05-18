import { RemoteTaskTemplateCatalog } from "./RemoteTaskTemplates";

describe("RemoteTaskTemplateCatalog", () => {
  it("exposes one-click template catalog", () => {
    const catalog = new RemoteTaskTemplateCatalog();
    const templates = catalog.list();

    expect(templates.map((template) => template.id)).toEqual([
      "bugfix",
      "refactor",
      "docs",
      "data-patch",
    ]);
  });

  it("renders parameterized prompts and defaults", () => {
    const catalog = new RemoteTaskTemplateCatalog();

    const prompt = catalog.renderPrompt("docs", {
      topic: "runbook alerts",
    });

    expect(prompt).toContain("runbook alerts");
    expect(prompt).toContain("engineers");
  });

  it("builds execution summary with reusable links", () => {
    const catalog = new RemoteTaskTemplateCatalog();

    const summary = catalog.buildExecutionSummary(
      "bugfix",
      {
        issue: "#14",
        target: "remote task launcher",
      },
      ["https://example.com/runs/1", "https://example.com/pr/22"],
    );

    expect(summary.title).toBe("Bugfix");
    expect(summary.prompt).toContain("#14");
    expect(summary.outputLinks).toHaveLength(2);
  });
});
