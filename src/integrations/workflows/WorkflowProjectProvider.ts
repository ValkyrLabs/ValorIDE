import * as vscode from "vscode";
import { TokenStorageService } from "../../services/auth/TokenStorageService";
import { getValkyrLabsRtkApiClient } from "../../services/valkyrai/ValkyrLabsRtkApi";
import { getValkyraiBasePath } from "../../utils/serverValkyraiHost";
import { collectWorkflowPages } from "./workflowCollection";
import { workflowStudioWebviewHtml } from "./workflowStudioWebview";

type WorkflowListItem = {
  id: string;
  name?: string;
  description?: string;
  status?: string;
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
    const response = await getValkyrLabsRtkApiClient().request<T>({
      url: `${base}/${path.replace(/^\/+/, "")}`,
      headers: {
        Authorization: `Bearer ${token}`,
        jwtSession: token,
      },
    });
    return response.data;
  }

  async listWorkflows(): Promise<WorkflowListItem[]> {
    const workflows = await collectWorkflowPages((page, size) =>
      this.get<unknown>(`Workflow?page=${page}&size=${size}`),
    );
    return workflows
      .filter((workflow) => workflow.id)
      .map((workflow) => ({
        id: String(workflow.id),
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
      }));
  }

  async createStudioHandoff(workflowId: string): Promise<string> {
    const token = await TokenStorageService.getInstance(
      this.context,
    ).getJwtToken();
    if (!token) {
      throw new Error("Sign in to ValorIDE before opening Workflow Studio.");
    }
    const base = getValkyraiBasePath().replace(/\/+$/, "");
    const response = await getValkyrLabsRtkApiClient().request<{
      ticket?: string;
    }>({
      url: `${base}/auth/valoride/webview-ticket`,
      method: "POST",
      json: { workflowId },
      headers: {
        Authorization: `Bearer ${token}`,
        jwtSession: token,
      },
    });
    if (!response.data?.ticket) {
      throw new Error("ValkyrAI did not return a Workflow Studio handoff.");
    }
    const launchUrl = new URL(`${base}/auth/valoride/webview-session`);
    launchUrl.searchParams.set("ticket", response.data.ticket);
    launchUrl.searchParams.set("workflowId", workflowId);
    return launchUrl.toString();
  }
}

const openWorkflowStudioPanel = (
  launchUrl: string,
  workflow: WorkflowListItem,
  refreshHandoff: () => Promise<string>,
  output: vscode.OutputChannel,
) => {
  const workflowName = workflow.name || workflow.description || workflow.id;
  const panel = vscode.window.createWebviewPanel(
    "valoride.workflowStudio",
    `Workflow Studio: ${workflowName}`,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [],
    },
  );
  const render = (url: string) => {
    panel.webview.html = workflowStudioWebviewHtml(url, workflowName);
  };
  render(launchUrl);

  let retrying = false;
  panel.webview.onDidReceiveMessage(async (message: unknown) => {
    if (
      retrying ||
      !message ||
      typeof message !== "object" ||
      (message as { type?: string }).type !== "valoride.workflowStudio.retry"
    ) {
      return;
    }
    retrying = true;
    try {
      render(await refreshHandoff());
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to create a new Workflow Studio session.";
      output.appendLine(`[WorkflowStudio] Retry failed: ${errorMessage}`);
      await panel.webview.postMessage({
        type: "valoride.workflowStudio.retryFailed",
        message: errorMessage,
      });
    } finally {
      retrying = false;
    }
  });
};

class WorkflowTreeItem extends vscode.TreeItem {
  constructor(readonly workflow: WorkflowListItem) {
    super(
      workflow.name || workflow.description || workflow.id,
      vscode.TreeItemCollapsibleState.None,
    );
    this.description = workflow.status || workflow.id.slice(0, 8);
    this.tooltip = `${workflow.name || "Workflow"}\n${workflow.id}\nOpen authenticated Workflow Studio`;
    this.iconPath = new vscode.ThemeIcon("type-hierarchy-sub");
    this.contextValue = "valkyrWorkflowProject";
    this.command = {
      command: "valoride.workflows.openStudio",
      title: "Open Workflow Studio",
      arguments: [workflow],
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
  const treeProvider = new WorkflowTreeProvider(client);
  const openStudio = async (requestedWorkflow?: WorkflowListItem | string) => {
    let workflow: WorkflowListItem | undefined =
      typeof requestedWorkflow === "string"
        ? { id: requestedWorkflow }
        : requestedWorkflow;
    if (!workflow?.id) {
      const workflows = await client.listWorkflows();
      const selected = await vscode.window.showQuickPick(
        workflows.map((candidate) => ({
          label: candidate.name || candidate.description || candidate.id,
          description: candidate.status,
          detail: candidate.id,
          workflow: candidate,
        })),
        {
          title: "Open ValkyrAI Workflow Studio",
          placeHolder: "Choose an authorized workflow",
        },
      );
      workflow = selected?.workflow;
    }
    if (!workflow?.id) return;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Opening authenticated Workflow Studio",
      },
      async () => {
        try {
          const launchUrl = await client.createStudioHandoff(workflow!.id);
          openWorkflowStudioPanel(
            launchUrl,
            workflow!,
            () => client.createStudioHandoff(workflow!.id),
            output,
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Workflow Studio failed to open";
          output.appendLine(`[WorkflowStudio] ${message}`);
          void vscode.window.showErrorMessage(message);
        }
      },
    );
  };

  context.subscriptions.push(
    vscode.window.createTreeView("valoride-dev.WorkflowProjectsView", {
      treeDataProvider: treeProvider,
      showCollapseAll: false,
    }),
    vscode.commands.registerCommand("valoride.workflows.refresh", () =>
      treeProvider.refresh(),
    ),
    vscode.commands.registerCommand(
      "valoride.workflows.openStudio",
      openStudio,
    ),
    // Keep old keybindings/callers working while changing the click behavior.
    vscode.commands.registerCommand(
      "valoride.workflows.openProject",
      openStudio,
    ),
  );
}
