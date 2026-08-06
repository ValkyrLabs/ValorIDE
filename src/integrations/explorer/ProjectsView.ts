import * as vscode from "vscode";
import { randomBytes } from "crypto";
import * as path from "path";
import {
  resolveThorapiFolderPath,
  thorapiSettingChanged,
} from "@utils/thorapi";
import { openUrlWithSimpleBrowser } from "@utils/openUrl";
import { resolveProjectCommandUri } from "./projectCommandUri";
import {
  commandWithJavaHome,
  discoverProjectRuntime,
  findAvailablePort,
  findCompatibleJavaHome,
  localProjectUrl,
  ProjectTarget,
  waitForUrl,
} from "./projectRuntime";

type Project = {
  name: string;
  version: string;
  uri: vscode.Uri;
  mtime?: number;
};

export class ProjectsTreeDataProvider
  implements vscode.TreeDataProvider<Project>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    Project | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private output: vscode.OutputChannel) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Project): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.name,
      vscode.TreeItemCollapsibleState.None,
    );
    item.tooltip =
      `${element.name}` +
      (element.mtime ? ` — ${new Date(element.mtime).toLocaleString()}` : "");
    item.resourceUri = element.uri;
    (item as any).contextValue = "thorProject";
    item.iconPath = new vscode.ThemeIcon("folder-library");
    item.command = {
      command: "valoride.projects.reveal",
      title: "Reveal in Explorer",
      arguments: [element.uri],
    };
    return item;
  }

  async getChildren(element?: Project): Promise<Project[]> {
    if (element) return [];
    const folders = vscode.workspace.workspaceFolders || [];
    const results: Project[] = [];

    for (const folder of folders) {
      try {
        const thorapiPath = resolveThorapiFolderPath(folder.uri.fsPath);
        const thorapi = vscode.Uri.file(thorapiPath);
        const entries = await vscode.workspace.fs.readDirectory(thorapi);
        for (const [name, fileType] of entries) {
          if (fileType !== vscode.FileType.Directory) continue;
          if (!/^v\d+\./i.test(name)) continue;
          const uri = vscode.Uri.joinPath(thorapi, name);
          let mtime: number | undefined;
          try {
            const stat = await vscode.workspace.fs.stat(uri);
            mtime =
              typeof (stat as any).mtime === "number"
                ? (stat as any).mtime
                : undefined;
          } catch (err) {
            // Debug: unable to stat project folder; leave mtime undefined
            this.output.appendLine(
              `[Projects][debug] stat failed for ${uri.fsPath}: ${String(err)}`,
            );
          }
          const version = (name.match(/^v(\d+)[.-]?/i) || [])[1] || "";
          results.push({ name, version, uri, mtime });
        }
      } catch (e) {
        // ignore missing thorapi folder
      }
    }

    // Sort by mtime desc then name
    results.sort(
      (a, b) => (b.mtime || 0) - (a.mtime || 0) || a.name.localeCompare(b.name),
    );
    return results;
  }
}

export function registerProjectsView(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
) {
  const provider = new ProjectsTreeDataProvider(output);
  const view = vscode.window.createTreeView("valoride-dev.ProjectsView", {
    treeDataProvider: provider,
    showCollapseAll: false,
  });
  context.subscriptions.push(view);
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (thorapiSettingChanged(event)) {
        provider.refresh();
      }
    }),
  );

  const getUriArg = (arg?: unknown) =>
    resolveProjectCommandUri(arg, view.selection?.[0]);

  context.subscriptions.push(
    vscode.commands.registerCommand("valoride.projects.refresh", () =>
      provider.refresh(),
    ),
    // Build selected project based on detected tool
    vscode.commands.registerCommand(
      "valoride.projects.build",
      async (target?: unknown) => {
        const u = getUriArg(target);
        if (!u) return;
        await runProjectTask(u, "build", output);
      },
    ),
    // Run selected project based on detected tool
    vscode.commands.registerCommand(
      "valoride.projects.run",
      async (target?: unknown) => {
        const u = getUriArg(target);
        if (!u) return;
        await runProjectTask(u, "run", output);
      },
    ),
    vscode.commands.registerCommand(
      "valoride.projects.openInWindow",
      async (target?: unknown) => {
        const u = getUriArg(target);
        if (u)
          await vscode.commands.executeCommand("vscode.openFolder", u, true);
      },
    ),
    vscode.commands.registerCommand(
      "valoride.projects.openTerminal",
      async (target?: unknown) => {
        const u = getUriArg(target);
        if (u) {
          const term = vscode.window.createTerminal({
            cwd: u.fsPath,
            name: path.basename(u.fsPath),
          });
          term.show();
        }
      },
    ),
    vscode.commands.registerCommand(
      "valoride.projects.reveal",
      async (target?: unknown) => {
        const u = getUriArg(target);
        if (u) await vscode.commands.executeCommand("revealInExplorer", u);
      },
    ),
    vscode.commands.registerCommand(
      "valoride.projects.openReadme",
      async (target?: unknown) => {
        const u = getUriArg(target);
        if (!u) return;
        const candidates = ["README.md", "readme.md", "README", "README.txt"];
        for (const filename of candidates) {
          const file = vscode.Uri.joinPath(u, filename);
          try {
            await vscode.workspace.fs.stat(file);
            await vscode.window.showTextDocument(file, { preview: false });
            return;
          } catch (err) {
            // Debug: no README at this candidate path; continue
            output.appendLine(
              `[Projects][debug] README not found: ${file.fsPath}: ${String(err)}`,
            );
          }
        }
        vscode.window.showInformationMessage(
          "No README found in project root.",
        );
      },
    ),
    vscode.commands.registerCommand(
      "valoride.projects.copyPath",
      async (target?: unknown) => {
        const u = getUriArg(target);
        if (u) await vscode.env.clipboard.writeText(u.fsPath);
      },
    ),
  );
}

async function pathExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

type Task = "build" | "run";

const javaEnvironment = (javaHome: string) => ({
  JAVA_HOME: javaHome,
  PATH: `${path.join(javaHome, "bin")}${path.delimiter}${process.env.PATH || ""}`,
});

const createProjectTerminal = (
  target: ProjectTarget,
  name: string,
  env?: Record<string, string>,
) =>
  vscode.window.createTerminal({
    cwd: target.directory,
    name,
    env,
  });

async function projectCommand(
  target: ProjectTarget,
  task: Task,
  javaHome?: string,
) {
  let thor_command: string;
  if (target.tool === "maven") {
    const hasWrapper = await pathExists(
      vscode.Uri.file(path.join(target.directory, "mvnw")),
    );
    const mvn = hasWrapper ? "./mvnw" : "mvn";
    thor_command =
      task === "build"
        ? `${mvn} -DskipTests clean package`
        : `${mvn} spring-boot:run`;
  } else if (target.tool === "gradle") {
    const hasWrapper = await pathExists(
      vscode.Uri.file(path.join(target.directory, "gradlew")),
    );
    const gradle = hasWrapper ? "./gradlew" : "gradle";
    thor_command =
      task === "build" ? `${gradle} build -x test` : `${gradle} bootRun`;
  } else {
    thor_command =
      task === "build"
        ? "npm install && npm run build"
        : "npm install && npm run start";
  }

  return javaHome && target.tool !== "node"
    ? commandWithJavaHome(thor_command, javaHome)
    : thor_command;
}

async function requireCompatibleJava(layoutName: string) {
  const java = await findCompatibleJavaHome();
  if (!java) {
    throw new Error(
      `${layoutName} requires JDK 17-23, but ValorIDE could not find one. Install JDK 21 or configure JAVA_HOME.`,
    );
  }
  return java;
}

async function buildProject(uri: vscode.Uri, output: vscode.OutputChannel) {
  const layout = await discoverProjectRuntime(uri.fsPath);
  const targets = [layout.backend, layout.frontend].filter(
    (target): target is ProjectTarget => Boolean(target),
  );
  if (targets.length === 0) {
    vscode.window.showWarningMessage(
      `No supported build tool detected in ${uri.fsPath} or its generated backend/UI source roots. Expected Maven, Gradle, or Node.`,
    );
    return;
  }

  const needsJava = targets.some((target) => target.tool !== "node");
  const java = needsJava
    ? await requireCompatibleJava(path.basename(uri.fsPath))
    : undefined;
  if (java) {
    output.appendLine(
      `[Projects] Building with JDK ${java.major} from ${java.home}`,
    );
  }

  for (const target of targets) {
    const role = target === layout.backend ? "backend" : "ui";
    const terminal = createProjectTerminal(
      target,
      `${path.basename(uri.fsPath)}: build ${role}`,
      target.tool === "node" || !java ? undefined : javaEnvironment(java.home),
    );
    terminal.show(false);
    terminal.sendText(
      await projectCommand(
        target,
        "build",
        target.tool === "node" ? undefined : java?.home,
      ),
      true,
    );
  }
}

async function runProject(uri: vscode.Uri, output: vscode.OutputChannel) {
  const layout = await discoverProjectRuntime(uri.fsPath);
  if (!layout.backend && !layout.frontend) {
    vscode.window.showWarningMessage(
      `No supported build tool detected in ${uri.fsPath} or its generated backend/UI source roots. Expected Maven, Gradle, or Node.`,
    );
    return;
  }

  const projectName = path.basename(uri.fsPath);
  const splitGeneratedApp = Boolean(layout.backend && layout.frontend);
  let backendPort: number | undefined;
  let frontendPort: number | undefined;
  let localPassword: string | undefined;

  if (layout.backend) {
    const java = await requireCompatibleJava(projectName);
    backendPort = await findAvailablePort(8080);
    localPassword = splitGeneratedApp
      ? randomBytes(24).toString("base64url")
      : undefined;
    const jwtSecret = randomBytes(48).toString("base64");
    const databaseName = projectName
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase();
    const backendEnv: Record<string, string> = {
      ...javaEnvironment(java.home),
      SERVER_PORT: String(backendPort),
    };
    if (splitGeneratedApp && localPassword) {
      Object.assign(backendEnv, {
        SPRING_DATASOURCE_URL: `jdbc:h2:mem:${databaseName || "valoride_app"};MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE`,
        SPRING_DATASOURCE_USERNAME: "sa",
        SPRING_DATASOURCE_PASSWORD: "",
        SPRING_DATASOURCE_DRIVER_CLASS_NAME: "org.h2.Driver",
        SPRING_JPA_DATABASE_PLATFORM: "org.hibernate.dialect.H2Dialect",
        VALKYR_BOOTSTRAP_ADMIN_PASSWORD: localPassword,
        VALKYRAI_GENERATED_RUNTIME_LOCAL_LOGIN_ENABLED: "true",
        JWT_SECRET: jwtSecret,
      });
    }
    output.appendLine(
      `[Projects] Starting backend with JDK ${java.major} on http://127.0.0.1:${backendPort}`,
    );
    const terminal = createProjectTerminal(
      layout.backend,
      `${projectName}: backend`,
      backendEnv,
    );
    terminal.show(false);
    terminal.sendText(
      await projectCommand(layout.backend, "run", java.home),
      true,
    );
  }

  if (layout.frontend) {
    frontendPort = await findAvailablePort(5173);
    const frontendEnv: Record<string, string> = {
      VITE_PORT: String(frontendPort),
    };
    if (backendPort) {
      frontendEnv.VITE_API_PROXY_TARGET = `http://127.0.0.1:${backendPort}`;
    }
    const terminal = createProjectTerminal(
      layout.frontend,
      `${projectName}: ui`,
      frontendEnv,
    );
    terminal.show(false);
    terminal.sendText(await projectCommand(layout.frontend, "run"), true);
  }

  if (localPassword) {
    void vscode.window
      .showInformationMessage(
        `Local app credentials — Username: super  Password: ${localPassword}`,
        "Copy Password",
      )
      .then(async (selection) => {
        if (selection === "Copy Password") {
          await vscode.env.clipboard.writeText(localPassword!);
        }
      });
  }

  if (frontendPort) {
    const url = localProjectUrl(frontendPort);
    output.appendLine(`[Projects] Waiting for generated UI at ${url}`);
    if (await waitForUrl(url)) {
      await openUrlWithSimpleBrowser(url, `${projectName} — Local App`);
    } else {
      void vscode.window.showErrorMessage(
        `${projectName} UI did not become ready at ${url}. Check the backend and UI terminals.`,
      );
    }
  }
}

async function runProjectTask(
  uri: vscode.Uri,
  task: Task,
  output: vscode.OutputChannel,
) {
  try {
    if (task === "build") {
      await buildProject(uri, output);
    } else {
      await runProject(uri, output);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`[Projects] ${task} failed: ${message}`);
    void vscode.window.showErrorMessage(`Project ${task} failed: ${message}`);
  }
}
