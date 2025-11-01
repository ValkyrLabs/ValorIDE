import * as vscode from "vscode";
import * as path from "path";
async function updateTsconfigPaths(tsconfigUri, rootAliasTargets, options) {
    const doc = await vscode.workspace.fs.readFile(tsconfigUri);
    let json;
    try {
        json = JSON.parse(Buffer.from(doc).toString("utf8"));
    }
    catch (e) {
        vscode.window.showWarningMessage(`Skipping invalid JSON: ${tsconfigUri.fsPath}`);
        return;
    }
    json.compilerOptions = json.compilerOptions || {};
    json.compilerOptions.baseUrl = json.compilerOptions.baseUrl || ".";
    json.compilerOptions.paths = json.compilerOptions.paths || {};
    // Overwrite the managed aliases to point at the selected extracted folder
    json.compilerOptions.paths["@thor/*"] = [rootAliasTargets.thorAll];
    json.compilerOptions.paths["@valkyr/component-library/*"] = [rootAliasTargets.componentLib];
    json.compilerOptions.paths["@thor/redux/services/*"] = [rootAliasTargets.reduxServices];
    if (options?.includeSrc) {
        const toAdd = Array.isArray(options.includeSrc) ? options.includeSrc : [options.includeSrc];
        const include = Array.isArray(json.include) ? json.include : [];
        for (const pat of toAdd) {
            if (!include.includes(pat))
                include.push(pat);
        }
        if (include.length)
            json.include = include;
    }
    const pretty = JSON.stringify(json, null, 2);
    await vscode.workspace.fs.writeFile(tsconfigUri, Buffer.from(pretty, "utf8"));
}
export function registerAliasCommands(context) {
    const disposable = vscode.commands.registerCommand("valoride.addThorAliasesFromFolder", async (resourceUri) => {
        // 1) Select one or more Thor project folders
        const selectedFolders = resourceUri
            ? [resourceUri]
            : (await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: true,
                openLabel: "Select Thor project folder(s)",
            })) || [];
        if (!selectedFolders || selectedFolders.length === 0)
            return;
        // 2) Choose which tsconfig files to update
        const allTsconfigs = await vscode.workspace.findFiles("**/tsconfig*.json", "**/node_modules/**");
        if (allTsconfigs.length === 0) {
            vscode.window.showWarningMessage("No tsconfig files found in workspace to update.");
            return;
        }
        const picks = await vscode.window.showQuickPick(allTsconfigs.map((u) => ({ label: path.basename(u.fsPath), description: u.fsPath, uri: u })), { canPickMany: true, title: "Select tsconfig files to update" });
        if (!picks || picks.length === 0)
            return;
        // 3) Options
        const optionPicks = await vscode.window.showQuickPick([
            { label: "Update paths for @thor and @valkyr/component-library", picked: true, key: "paths" },
            { label: "Add include for selected src folders", picked: true, key: "include" },
            { label: "Preview updated tsconfig(s) before saving", picked: false, key: "preview" },
        ], { canPickMany: true, title: "What should be updated?" });
        const doPaths = optionPicks?.some((p) => p.key === "paths") !== false;
        const doInclude = optionPicks?.some((p) => p.key === "include") !== false;
        const doPreview = optionPicks?.some((p) => p.key === "preview") === true;
        // 4) Compute and apply updates
        for (const pick of picks) {
            const tsUri = pick.uri;
            const tsDir = path.dirname(tsUri.fsPath);
            // For multi-folder selection, prefer the most recently picked folder for relative path computation per tsconfig
            const includePatterns = [];
            let combinedTargets = { componentLib: "", reduxServices: "", thorAll: "" };
            for (const folder of selectedFolders) {
                const relToFolder = path.relative(tsDir, folder.fsPath) || ".";
                const componentLib = path.join(relToFolder, "src", "components", "*").replace(/\\/g, "/");
                const reduxServices = path
                    .join(relToFolder, "src", "thor", "redux", "services", "*")
                    .replace(/\\/g, "/");
                const thorAll = path.join(relToFolder, "src", "thor", "*").replace(/\\/g, "/");
                // last one wins for alias patterns; user can run again for different variants
                combinedTargets = { componentLib, reduxServices, thorAll };
                if (doInclude)
                    includePatterns.push(path.join(relToFolder, "src").replace(/\\/g, "/"));
            }
            if (doPreview) {
                // Prepare diff-style preview without saving
                const original = await vscode.workspace.fs.readFile(tsUri).then((b) => Buffer.from(b).toString("utf8"));
                let json = {};
                try {
                    json = JSON.parse(original);
                }
                catch (e) {
                    void e;
                }
                if (doPaths) {
                    json.compilerOptions = json.compilerOptions || {};
                    json.compilerOptions.baseUrl = json.compilerOptions.baseUrl || ".";
                    json.compilerOptions.paths = json.compilerOptions.paths || {};
                    json.compilerOptions.paths["@thor/*"] = [combinedTargets.thorAll];
                    json.compilerOptions.paths["@valkyr/component-library/*"] = [combinedTargets.componentLib];
                    json.compilerOptions.paths["@thor/redux/services/*"] = [combinedTargets.reduxServices];
                }
                if (doInclude && includePatterns.length) {
                    const includeArr = Array.isArray(json.include) ? json.include : [];
                    for (const pat of includePatterns)
                        if (!includeArr.includes(pat))
                            includeArr.push(pat);
                    if (includeArr.length)
                        json.include = includeArr;
                }
                const updated = JSON.stringify(json, null, 2);
                const left = await vscode.workspace.openTextDocument({ content: original, language: "json" });
                const right = await vscode.workspace.openTextDocument({ content: updated, language: "json" });
                const title = `Preview: ${path.basename(tsUri.fsPath)}`;
                await vscode.commands.executeCommand('vscode.diff', left.uri, right.uri, title);
            }
            else {
                await updateTsconfigPaths(tsUri, combinedTargets, {
                    includeSrc: doInclude ? includePatterns : undefined,
                });
            }
        }
        if (!doPreview) {
            vscode.window.showInformationMessage("Aliases and includes updated in selected tsconfig files.");
        }
        else {
            vscode.window.showInformationMessage("Preview(s) opened. Save changes manually if desired.");
        }
    });
    context.subscriptions.push(disposable);
}
//# sourceMappingURL=aliasCommands.js.map