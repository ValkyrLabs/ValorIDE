import * as fs from "node:fs";
import * as path from "node:path";

describe("project and workflow view contributions", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../../package.json"), "utf8"),
  );

  for (const [view, command, title] of [
    ["valoride-dev.ProjectsView", "valoride.projects.create", "Create New App"],
    [
      "valoride-dev.WorkflowProjectsView",
      "valoride.workflows.create",
      "Create Workflow",
    ],
  ]) {
    it(`offers an empty-state creation button in ${view}`, () => {
      expect(manifest.contributes.commands).toContainEqual(
        expect.objectContaining({ command, title }),
      );
      const welcome = manifest.contributes.viewsWelcome.find(
        (entry: { view: string }) => entry.view === view,
      );
      expect(welcome?.contents.split("\n")).toContain(
        `[${title}](command:${command})`,
      );
    });
  }

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
