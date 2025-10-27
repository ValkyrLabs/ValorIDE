import * as vscode from "vscode";
import * as path from "path";
import { resolveThorapiFolderPath, thorapiSettingChanged } from "@utils/thorapi";
export class ProjectsTreeDataProvider {
    output;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(output) {
        this.output = output;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.None);
        item.tooltip = `${element.name}` + (element.mtime ? ` — ${new Date(element.mtime).toLocaleString()}` : "");
        item.resourceUri = element.uri;
        item.contextValue = "thorProject";
        item.iconPath = new vscode.ThemeIcon("folder-library");
        item.command = {
            command: "valoride.projects.reveal",
            title: "Reveal in Explorer",
            arguments: [element.uri],
        };
        return item;
    }
    async getChildren(element) {
        if (element)
            return [];
        const folders = vscode.workspace.workspaceFolders || [];
        const results = [];
        for (const folder of folders) {
            try {
                const thorapiPath = resolveThorapiFolderPath(folder.uri.fsPath);
                const thorapi = vscode.Uri.file(thorapiPath);
                const entries = await vscode.workspace.fs.readDirectory(thorapi);
                for (const [name, fileType] of entries) {
                    if (fileType !== vscode.FileType.Directory)
                        continue;
                    if (!/^v\d+\./i.test(name))
                        continue;
                    const uri = vscode.Uri.joinPath(thorapi, name);
                    let mtime;
                    try {
                        const stat = await vscode.workspace.fs.stat(uri);
                        mtime = typeof stat.mtime === "number" ? stat.mtime : undefined;
                    }
                    catch (err) {
                        // Debug: unable to stat project folder; leave mtime undefined
                        this.output.appendLine(`[Projects][debug] stat failed for ${uri.fsPath}: ${String(err)}`);
                    }
                    const version = (name.match(/^v(\d+)[.-]?/i) || [])[1] || "";
                    results.push({ name, version, uri, mtime });
                }
            }
            catch (e) {
                // ignore missing thorapi folder
            }
        }
        // Sort by mtime desc then name
        results.sort((a, b) => (b.mtime || 0) - (a.mtime || 0) || a.name.localeCompare(b.name));
        return results;
    }
}
export function registerProjectsView(context, output) {
    const provider = new ProjectsTreeDataProvider(output);
    const view = vscode.window.createTreeView("valoride-dev.ProjectsView", {
        treeDataProvider: provider,
        showCollapseAll: false,
    });
    context.subscriptions.push(view);
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
        if (thorapiSettingChanged(event)) {
            provider.refresh();
        }
    }));
    const getUriArg = (arg) => {
        if (arg)
            return arg;
        const sel = view.selection?.[0];
        return sel?.uri;
    };
    context.subscriptions.push(vscode.commands.registerCommand("valoride.projects.refresh", () => provider.refresh()), 
    // Build selected project based on detected tool
    vscode.commands.registerCommand("valoride.projects.build", async (uri) => {
        const u = getUriArg(uri);
        if (!u)
            return;
        await runProjectTask(u, "build");
    }), 
    // Run selected project based on detected tool
    vscode.commands.registerCommand("valoride.projects.run", async (uri) => {
        const u = getUriArg(uri);
        if (!u)
            return;
        await runProjectTask(u, "run");
    }), vscode.commands.registerCommand("valoride.projects.openInWindow", async (uri) => {
        const u = getUriArg(uri);
        if (u)
            await vscode.commands.executeCommand("vscode.openFolder", u, true);
    }), vscode.commands.registerCommand("valoride.projects.openTerminal", async (uri) => {
        const u = getUriArg(uri);
        if (u) {
            const term = vscode.window.createTerminal({ cwd: u.fsPath, name: path.basename(u.fsPath) });
            term.show();
        }
    }), vscode.commands.registerCommand("valoride.projects.reveal", async (uri) => {
        const u = getUriArg(uri);
        if (u)
            await vscode.commands.executeCommand("revealInExplorer", u);
    }), vscode.commands.registerCommand("valoride.projects.openReadme", async (uri) => {
        const u = getUriArg(uri);
        if (!u)
            return;
        const candidates = [
            "README.md",
            "readme.md",
            "README",
            "README.txt",
        ];
        for (const filename of candidates) {
            const file = vscode.Uri.joinPath(u, filename);
            try {
                await vscode.workspace.fs.stat(file);
                await vscode.window.showTextDocument(file, { preview: false });
                return;
            }
            catch (err) {
                // Debug: no README at this candidate path; continue
                output.appendLine(`[Projects][debug] README not found: ${file.fsPath}: ${String(err)}`);
            }
        }
        vscode.window.showInformationMessage("No README found in project root.");
    }), vscode.commands.registerCommand("valoride.projects.copyPath", async (uri) => {
        const u = getUriArg(uri);
        if (u)
            await vscode.env.clipboard.writeText(u.fsPath);
    }));
}
async function pathExists(uri) {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    }
    catch {
        return false;
    }
}
async function detectTools(uri) {
    const tools = [];
    const hasPom = await pathExists(vscode.Uri.joinPath(uri, "pom.xml"));
    const hasMvnw = await pathExists(vscode.Uri.joinPath(uri, "mvnw"));
    if (hasPom || hasMvnw)
        tools.push("maven");
    const hasGradle = (await pathExists(vscode.Uri.joinPath(uri, "gradlew"))) ||
        (await pathExists(vscode.Uri.joinPath(uri, "build.gradle"))) ||
        (await pathExists(vscode.Uri.joinPath(uri, "build.gradle.kts")));
    if (hasGradle)
        tools.push("gradle");
    const hasPkg = await pathExists(vscode.Uri.joinPath(uri, "package.json"));
    if (hasPkg)
        tools.push("node");
    return tools;
}
async function preferTool(uri) {
    const tools = await detectTools(uri);
    // Prefer Maven > Gradle > Node for backend servers
    if (tools.includes("maven"))
        return "maven";
    if (tools.includes("gradle"))
        return "gradle";
    if (tools.includes("node"))
        return "node";
    return undefined;
}
async function runProjectTask(uri, task) {
    const tool = await preferTool(uri);
    if (!tool) {
        vscode.window.showWarningMessage(`No supported build tool detected in ${uri.fsPath}. Expected Maven/Gradle/Node.`);
        return;
    }
    const termName = `${path.basename(uri.fsPath)}: ${task}`;
    const term = vscode.window.createTerminal({ cwd: uri.fsPath, name: termName });
    term.show();
    const run = (cmd) => term.sendText(cmd, true);
    if (tool === "maven") {
        const hasWrapper = await pathExists(vscode.Uri.joinPath(uri, "mvnw"));
        const mvn = hasWrapper ? "./mvnw" : "mvn";
        if (task === "build") {
            run(`${mvn} -q -DskipTests clean package`);
        }
        else {
            run(`${mvn} -q spring-boot:run`);
        }
        return;
    }
    if (tool === "gradle") {
        const hasWrapper = await pathExists(vscode.Uri.joinPath(uri, "gradlew"));
        const gradle = hasWrapper ? "./gradlew" : "gradle";
        if (task === "build") {
            run(`${gradle} build -x test`);
        }
        else {
            // Try bootRun if Spring Boot plugin is present, otherwise run default run task
            run(`${gradle} bootRun`);
        }
        return;
    }
    if (tool === "node") {
        // Prefer pnpm > yarn > npm based on lockfiles
        const hasPnpm = await pathExists(vscode.Uri.joinPath(uri, "pnpm-lock.yaml"));
        const hasYarn = await pathExists(vscode.Uri.joinPath(uri, "yarn.lock"));
        const pm = hasPnpm ? "pnpm" : hasYarn ? "yarn" : "npm";
        if (task === "build") {
            run(`${pm} install`);
            run(pm === "npm" ? `${pm} run build` : `${pm} build`);
        }
        else {
            run(pm === "npm" ? `${pm} run start` : `${pm} start`);
        }
        return;
    }
}
//# sourceMappingURL=ProjectsView.js.map