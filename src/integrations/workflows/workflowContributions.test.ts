import * as fs from "node:fs";
import * as path from "node:path";

describe("workflow view contributions", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../../package.json"), "utf8"),
  );

  it("contributes a visible refresh action to the Workflows panel title", () => {
    expect(manifest.contributes.commands).toContainEqual(
      expect.objectContaining({
        command: "valoride.workflows.refresh",
        title: "Refresh Workflows",
        icon: "$(refresh)",
      }),
    );
    expect(manifest.contributes.menus["view/title"]).toContainEqual({
      command: "valoride.workflows.refresh",
      group: "navigation@1",
      when: "view == valoride-dev.WorkflowProjectsView",
    });
  });
});
