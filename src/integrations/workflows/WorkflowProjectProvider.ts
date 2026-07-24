import axios from "axios";
import * as vscode from "vscode";
import { TokenStorageService } from "../../services/auth/TokenStorageService";
import { getValkyraiBasePath } from "../../utils/serverValkyraiHost";
import {
  buildWorkflowProjectFiles,
  workflowProjectRootName,
  type WorkflowProjectSnapshot,
} from "../../services/workflows/workflowProjectProjection";

export const WORKFLOW_PROJECT_SCHEME = "valkyr-workflow";

type WorkflowListItem = {
  id: string;
  name?: string;
  description?: string;
  status?: string;
};

const collection = (value: unknown): Record<string, any>[] => {
  if (Array.isArray(value)) return value as Record<string, any>[];
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, any>;
  const embedded =
    record._embedded && typeof record._embedded === "object"
      ? Object.values(record._embedded).find(Array.isArray)
      : undefined;
  const found = [
    record.content,
    record.items,
    record.results,
    record.workflows,
    embedded,
  ].find(Array.isArray);
  return Array.isArray(found) ? found : [];
};

class WorkflowEngineeringClient {
  constructor(private readonly context: vscode.ExtensionContext) {}

  private async get<T>(path: string): Promise<T> {
    const token = await TokenStorageService.getInstance(
      this.context,
    ).getJwtToken();
    if (!token) {
      throw new Error("Sign in to ValorIDE before opening workflow projects.");
    }
    const base = getValkyraiBasePath().replace(/\/+$/, "");
    const response = await axios.get<T>(`${base}/${path.replace(/^\/+/, "")}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        jwtSession: token,
      },
      timeout: 30_000,
    });
    return response.data;
  }

  async listWorkflows(): Promise<WorkflowListItem[]> {
    const response = await this.get<unknown>("Workflow");
    return collection(response)
      .filter((workflow) => workflow.id)
      .map((workflow) => ({
        id: String(workflow.id),
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
      }));
  }

  async loadSnapshot(workflowId: string): Promise<WorkflowProjectSnapshot> {
    const inspection = await this.get<Record<string, any>>(
      `vaiworkflow/engineering/workflows/${encodeURIComponent(workflowId)}`,
    );
    const versions = collection(inspection.versions).slice(0, 50);
    const recentExecutions = collection(inspection.recentExecutions).slice(
      0,
      20,
    );

    const testEntries = await Promise.all(
      versions.map(async (version) => {
        try {
          const tests = await this.get<unknown>(
            `vaiworkflow/versions/${encodeURIComponent(String(version.id))}/tests`,
          );
          return [String(version.id), collection(tests)] as const;
        } catch {
          return [String(version.id), []] as const;
        }
      }),
    );
    const explanationEntries = await Promise.all(
      recentExecutions.map(async (execution) => {
        try {
          const explanation = await this.get<Record<string, any>>(
            `vaiworkflow/engineering/executions/${encodeURIComponent(String(execution.id))}/explain`,
          );
          return [String(execution.id), explanation] as const;
        } catch {
          return [
            String(execution.id),
            {
              execution,
              diagnosis: "Detailed trace is not available to this principal.",
              recommendedActions: [],
            },
          ] as const;
        }
      }),
    );

    return {
      workflow: inspection.workflow || { id: workflowId },
      latestVersion: inspection.latestVersion,
      versions,
      deployments: collection(inspection.deployments),
      recentExecutions,
      testsByVersion: Object.fromEntries(testEntries),
      explanationsByExecution: Object.fromEntries(explanationEntries),
    };
  }
}

export class WorkflowProjectFileSystemProvider
  implements vscode.FileSystemProvider
{
  private readonly files = new Map<string, Uint8Array>();
  private readonly changed = new vscode.EventEmitter<
    vscode.FileChangeEvent[]
  >();
  readonly onDidChangeFile = this.changed.event;

  watch(): vscode.Disposable {
    return new vscode.Disposable(() => undefined);
  }

  setProject(root: string, files: Record<string, string>) {
    const prefix = `/${root}/`;
    for (const key of [...this.files.keys()]) {
      if (key.startsWith(prefix)) this.files.delete(key);
    }
    const encoder = new TextEncoder();
    Object.entries(files).forEach(([relativePath, content]) => {
      this.files.set(
        `${prefix}${relativePath.replace(/^\/+/, "")}`,
        encoder.encode(content),
      );
    });
    this.changed.fire([
      {
        type: vscode.FileChangeType.Changed,
        uri: vscode.Uri.parse(`${WORKFLOW_PROJECT_SCHEME}:/${root}`),
      },
    ]);
  }

  stat(uri: vscode.Uri): vscode.FileStat {
    const path = this.path(uri);
    const now = Date.now();
    const file = this.files.get(path);
    if (file) {
      return {
        type: vscode.FileType.File,
        ctime: 0,
        mtime: now,
        size: file.byteLength,
        permissions: vscode.FilePermission.Readonly,
      };
    }
    if (this.isDirectory(path)) {
      return {
        type: vscode.FileType.Directory,
        ctime: 0,
        mtime: now,
        size: 0,
        permissions: vscode.FilePermission.Readonly,
      };
    }
    throw vscode.FileSystemError.FileNotFound(uri);
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
    const path = this.path(uri).replace(/\/$/, "");
    if (!this.isDirectory(path)) throw vscode.FileSystemError.FileNotFound(uri);
    const prefix = path === "/" ? "/" : `${path}/`;
    const entries = new Map<string, vscode.FileType>();
    this.files.forEach((_content, filePath) => {
      if (!filePath.startsWith(prefix)) return;
      const remainder = filePath.slice(prefix.length);
      const [name, ...rest] = remainder.split("/");
      if (name) {
        entries.set(
          name,
          rest.length ? vscode.FileType.Directory : vscode.FileType.File,
        );
      }
    });
    return [...entries.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    );
  }

  readFile(uri: vscode.Uri): Uint8Array {
    const file = this.files.get(this.path(uri));
    if (!file) throw vscode.FileSystemError.FileNotFound(uri);
    return file;
  }

  createDirectory(): void {
    throw vscode.FileSystemError.NoPermissions(
      "Workflow projects are read-only",
    );
  }

  writeFile(): void {
    throw vscode.FileSystemError.NoPermissions(
      "Workflow projects are read-only",
    );
  }

  delete(): void {
    throw vscode.FileSystemError.NoPermissions(
      "Workflow projects are read-only",
    );
  }

  rename(): void {
    throw vscode.FileSystemError.NoPermissions(
      "Workflow projects are read-only",
    );
  }

  private path(uri: vscode.Uri) {
    return decodeURIComponent(uri.path || "/").replace(/\/{2,}/g, "/");
  }

  private isDirectory(path: string) {
    const prefix = path === "/" ? "/" : `${path.replace(/\/$/, "")}/`;
    return [...this.files.keys()].some((filePath) =>
      filePath.startsWith(prefix),
    );
  }
}

class WorkflowTreeItem extends vscode.TreeItem {
  constructor(readonly workflow: WorkflowListItem) {
    super(
      workflow.name || workflow.description || workflow.id,
      vscode.TreeItemCollapsibleState.None,
    );
    this.description = workflow.status || workflow.id.slice(0, 8);
    this.tooltip = `${workflow.name || "Workflow"}\n${workflow.id}\nOpen authenticated read-only project`;
    this.iconPath = new vscode.ThemeIcon("type-hierarchy-sub");
    this.contextValue = "valkyrWorkflowProject";
    this.command = {
      command: "valoride.workflows.openProject",
      title: "Open Workflow Project",
      arguments: [workflow.id],
    };
  }
}

class WorkflowTreeProvider
  implements vscode.TreeDataProvider<WorkflowTreeItem>
{
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changed.event;

  constructor(private readonly client: WorkflowEngineeringClient) {}

  refresh() {
    this.changed.fire();
  }

  getTreeItem(element: WorkflowTreeItem) {
    return element;
  }

  async getChildren(): Promise<WorkflowTreeItem[]> {
    return (await this.client.listWorkflows()).map(
      (workflow) => new WorkflowTreeItem(workflow),
    );
  }
}

export function registerWorkflowProjects(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
) {
  const client = new WorkflowEngineeringClient(context);
  const fileSystem = new WorkflowProjectFileSystemProvider();
  const treeProvider = new WorkflowTreeProvider(client);
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider(
      WORKFLOW_PROJECT_SCHEME,
      fileSystem,
      { isCaseSensitive: true, isReadonly: true },
    ),
    vscode.window.createTreeView("valoride-dev.WorkflowProjectsView", {
      treeDataProvider: treeProvider,
      showCollapseAll: false,
    }),
    vscode.commands.registerCommand("valoride.workflows.refresh", () =>
      treeProvider.refresh(),
    ),
    vscode.commands.registerCommand(
      "valoride.workflows.openProject",
      async (requestedWorkflowId?: string) => {
        let workflowId = requestedWorkflowId;
        if (!workflowId) {
          const workflows = await client.listWorkflows();
          const selected = await vscode.window.showQuickPick(
            workflows.map((workflow) => ({
              label: workflow.name || workflow.description || workflow.id,
              description: workflow.status,
              detail: workflow.id,
              workflowId: workflow.id,
            })),
            {
              title: "Open ValkyrAI workflow as a read-only project",
              placeHolder: "Choose an authorized workflow",
            },
          );
          workflowId = selected?.workflowId;
        }
        if (!workflowId) return;

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Projecting immutable workflow evidence",
          },
          async () => {
            try {
              const snapshot = await client.loadSnapshot(workflowId!);
              const root = workflowProjectRootName(snapshot.workflow);
              fileSystem.setProject(root, buildWorkflowProjectFiles(snapshot));
              const rootUri = vscode.Uri.parse(
                `${WORKFLOW_PROJECT_SCHEME}:/${root}`,
              );
              const existingIndex =
                vscode.workspace.workspaceFolders?.findIndex(
                  (folder) => folder.uri.toString() === rootUri.toString(),
                );
              if (existingIndex == null || existingIndex < 0) {
                vscode.workspace.updateWorkspaceFolders(
                  vscode.workspace.workspaceFolders?.length || 0,
                  0,
                  { uri: rootUri, name: snapshot.workflow.name || root },
                );
              }
              await vscode.window.showTextDocument(
                vscode.Uri.joinPath(rootUri, "README.md"),
                { preview: false },
              );
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Workflow project failed";
              output.appendLine(`[WorkflowProjects] ${message}`);
              void vscode.window.showErrorMessage(message);
            }
          },
        );
      },
    ),
  );
}
