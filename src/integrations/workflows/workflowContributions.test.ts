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
  it("ships the form templates and makes binding reachable from a workflow row and a trusted TS editor", () => {
    const cmd = "valoride.workflows.bindAction";
    expect(manifest.files).toContain("assets/workflow-binding/");
    expect(manifest.contributes.commands).toContainEqual(
      expect.objectContaining({ command: cmd, icon: "$(link)" }),
    );
    expect(
      manifest.contributes.menus["view/item/context"].find(
        (item: any) => item.command === cmd,
      ),
    ).toMatchObject({
      group: "inline@1",
      when: expect.stringContaining("valkyrWorkflowProject"),
    });
    expect(
      manifest.contributes.menus["editor/context"].find(
        (item: any) => item.command === cmd,
      ).when,
    ).toContain("typescriptreact");
  });
});
