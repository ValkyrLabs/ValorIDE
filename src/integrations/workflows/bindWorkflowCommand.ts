import fs from "fs/promises";
import path from "path";
import * as vscode from "vscode";
import { ts } from "ts-morph";
import { assertNoProjectLinks } from "../../services/generatedProjectInstall";
import { isWorkflowStudioId } from "../../shared/WorkflowStudioTarget";
import { getValkyraiBasePath } from "../../utils/serverValkyraiHost";
import {
  bindingEdits,
  bindingFiles,
  bindingFor,
  Deployment,
  sourceImport,
  Version,
} from "./workflowBinding";

type Ref = { id: string; name?: string; backend?: string };
export interface BindingClient {
  listWorkflows(): Promise<Ref[]>;
  bindingData(
    id: string,
    backend: string,
  ): Promise<{
    versions: Version[];
    deployments: Deployment[];
    assertCurrent: () => Promise<void>;
  }>;
}
const inside = (base: string, file: string) => {
  const rel = path.relative(base, file);
  return (
    !rel.startsWith(".." + path.sep) && rel !== ".." && !path.isAbsolute(rel)
  );
};
export async function bindingDestination(file: string, root: string) {
  const rel = path.relative(root, file);
  if (
    !inside(root, file) ||
    rel
      .split(path.sep)
      .some(
        (part) =>
          [
            "node_modules",
            "dist",
            "target",
            "build",
            "typescript-redux-query",
            "bundle-assets",
            "export-reference",
            "valkyr-workflows",
          ].includes(part) || part.startsWith("."),
      )
  )
    throw new Error(
      "Choose an authored TypeScript file inside the workspace, not a generated SDK or dependency.",
    );
  await assertNoProjectLinks(root, rel);
  const config = ts.findConfigFile(path.dirname(file), ts.sys.fileExists);
  let scope =
    config && inside(root, config) ? path.dirname(config) : path.dirname(file);
  const source = path.join(scope, "src");
  if (inside(source, file)) scope = source;
  let thorapi = false;
  if (config && inside(root, config)) {
    const parsed = ts.readConfigFile(config, ts.sys.readFile);
    if (!parsed.error) {
      const opts = ts.parseJsonConfigFileContent(
        { ...parsed.config, include: [], files: [] },
        ts.sys,
        path.dirname(config),
        {},
        config,
      ).options;
      thorapi = [
        "@thorapi/redux/customBaseQuery",
        "@thorapi/utils/resolveApiBaseUrl",
      ].every(
        (spec) =>
          !!ts.resolveModuleName(spec, file, opts, ts.sys).resolvedModule,
      );
    }
  }
  let react = /\.tsx$/i.test(file);
  for (
    let dir = path.dirname(file);
    !react && inside(root, dir);
    dir = path.dirname(dir)
  ) {
    try {
      const file = path.join(dir, "package.json");
      await assertNoProjectLinks(root, path.relative(root, file));
      const pkg = JSON.parse(await fs.readFile(file, "utf8"));
      react = !!(
        pkg.dependencies?.react ||
        pkg.peerDependencies?.react ||
        pkg.devDependencies?.react
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (dir === root) break;
  }
  return { directory: path.join(scope, "valkyr-workflows"), thorapi, react };
}

export function registerBindWorkflow(
  context: vscode.ExtensionContext,
  client: BindingClient,
) {
  return vscode.commands.registerCommand(
    "valoride.workflows.bindAction",
    async (item?: { workflow?: Ref }) => {
      try {
        const editor = vscode.window.activeTextEditor,
          doc = editor?.document;
        if (
          !editor ||
          !doc ||
          !["typescript", "typescriptreact"].includes(doc.languageId) ||
          doc.uri.scheme !== "file"
        )
          throw new Error(
            "Open an authored .ts or .tsx file and place the cursor on its action, JSX tag, or event.",
          );
        const folder = vscode.workspace.getWorkspaceFolder(doc.uri),
          file = doc.uri.fsPath;
        if (
          !vscode.workspace.isTrusted ||
          !folder ||
          folder.uri.scheme !== "file"
        )
          throw new Error(
            "Workflow bindings require a trusted local workspace.",
          );
        const snapshot = doc.getText(),
          version = doc.version,
          pos = doc.offsetAt(editor.selection.active);
        const dest = await bindingDestination(file, folder.uri.fsPath);
        const backend = item?.workflow?.backend ?? getValkyraiBasePath();
        const wf =
          item?.workflow ??
          (
            await vscode.window.showQuickPick(
              (await client.listWorkflows()).map((w) => ({
                label: w.name || w.id,
                description: w.id,
                w,
              })),
              {
                title: "Assign workflow to this TypeScript action or component",
              },
            )
          )?.w;
        if (!wf) return;
        if (!isWorkflowStudioId(wf.id))
          throw new Error("Invalid workflow identity.");
        const state = await client.bindingData(wf.id, backend);
        const active = state.deployments.filter(
          (d) =>
            d.workflowId === wf.id &&
            String(d.status).toUpperCase() === "ACTIVE",
        );
        if (!active.length)
          throw new Error(
            "This workflow has no active deployment. Save and activate the intended version in Workflow Studio first.",
          );
        const deployment =
          active.length === 1
            ? active[0]
            : (
                await vscode.window.showQuickPick(
                  active.map((d) => ({
                    label: d.environment,
                    description: d.workflowVersionId,
                    detail: d.id,
                    d,
                  })),
                  { title: "Which active deployment should this app run?" },
                )
              )?.d;
        if (!deployment) return;
        const immutable = state.versions.find(
          (v) =>
            v.id === deployment.workflowVersionId && v.workflowId === wf.id,
        );
        if (!immutable)
          throw new Error(
            "The selected deployment's immutable launch schema is unavailable.",
          );
        const b = bindingFor(backend, wf.name || wf.id, deployment, immutable);
        const edits = bindingEdits(
          file,
          snapshot,
          pos,
          b,
          sourceImport(file, path.join(dest.directory, b.deploymentId)),
        );
        const template = (name: string) =>
          fs.readFile(
            context.asAbsolutePath(
              "assets/workflow-binding/" + name + ".ts.tpl",
            ),
            "utf8",
          );
        const files = bindingFiles(
          b,
          await template("runtime"),
          dest.thorapi ? await template("thorapiTransport") : undefined,
          dest.react,
        );
        const workspaceEdit = new vscode.WorkspaceEdit();
        let newFiles = 0;
        for (const [name, contents] of Object.entries(files)) {
          const target = path.join(dest.directory, name);
          await assertNoProjectLinks(
            folder.uri.fsPath,
            path.relative(folder.uri.fsPath, target),
          );
          const existing = await fs
            .readFile(target, "utf8")
            .catch((err: NodeJS.ErrnoException) => {
              if (err.code !== "ENOENT") throw err;
              return undefined;
            });
          if (
            vscode.workspace.textDocuments.some(
              (d) => d.isDirty && d.uri.fsPath === target,
            )
          )
            throw new Error(
              "Save the edited workflow component before binding.",
            );
          if (existing !== undefined) {
            if (existing !== contents)
              throw new Error(
                "The workflow component already exists with different contents: " +
                  target +
                  ". Your edits were preserved.",
              );
            continue;
          }
          // Supply creation bytes atomically. In the actual extension host, create + insert
          // can leave new unopened project components as empty files on disk.
          workspaceEdit.createFile(vscode.Uri.file(target), {
            overwrite: false,
            ignoreIfExists: false,
            contents: Buffer.from(contents, "utf8"),
          });
          newFiles++;
        }
        if (!newFiles && !edits.length) {
          void vscode.window.showInformationMessage(
            "This workflow is already assigned here.",
          );
          return;
        }
        for (const edit of edits)
          workspaceEdit.replace(
            doc.uri,
            new vscode.Range(
              doc.positionAt(edit.start),
              doc.positionAt(edit.end),
            ),
            edit.text,
          );
        await state.assertCurrent();
        if (
          !vscode.workspace.isTrusted ||
          vscode.window.activeTextEditor !== editor ||
          doc.version !== version
        )
          throw new Error(
            "The active editor or file changed. Select the intended action and bind again.",
          );
        if (!(await vscode.workspace.applyEdit(workspaceEdit)))
          throw new Error(
            "VS Code could not apply this workflow assignment. Review the editor before retrying.",
          );
        const generated = vscode.Uri.file(
          path.join(
            dest.directory,
            b.deploymentId,
            dest.react ? "Form.tsx" : "action.ts",
          ),
        );
        void vscode.window
          .showInformationMessage(
            "Assigned " +
              b.name +
              " (" +
              deployment.environment +
              "). No workflow was run.",
            "Open workflow form",
          )
          .then((choice) =>
            choice === "Open workflow form"
              ? vscode.window.showTextDocument(generated).then(() => undefined)
              : undefined,
          );
      } catch (error) {
        void vscode.window.showErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to bind the workflow.",
        );
      }
    },
  );
}
