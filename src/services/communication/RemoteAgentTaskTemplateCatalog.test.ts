import { RemoteAgentTaskTemplateCatalog } from "./RemoteAgentTaskTemplateCatalog";

describe("RemoteAgentTaskTemplateCatalog", () => {
  it("lists the default remote task templates", () => {
    const catalog = new RemoteAgentTaskTemplateCatalog();
    const templates = catalog.list();

    expect(templates.map((t) => t.id)).toEqual([
      "bugfix",
      "refactor",
      "docs",
      "data-patch",
    ]);
    expect(templates[0].fields.some((field) => field.key === "area")).toBe(
      true,
    );
  });

  it("builds parameterized prompts", () => {
    const catalog = new RemoteAgentTaskTemplateCatalog();

    const task = catalog.buildTask("bugfix", {
      area: "billing webhook",
      symptoms: "charge retries duplicate invoices",
      repro: "POST webhook twice with same event id",
    });

    expect(task).toContain("billing webhook");
    expect(task).toContain("duplicate invoices");
  });

  it("rejects missing required fields", () => {
    const catalog = new RemoteAgentTaskTemplateCatalog();

    expect(() =>
      catalog.buildTask("docs", {
        topic: "remote presets",
      }),
    ).toThrow("Missing required field for docs: audience");
  });
});
