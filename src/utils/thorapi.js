import * as path from "path";
import * as vscode from "vscode";
import { DEFAULT_ADVANCED_SETTINGS } from "@shared/AdvancedSettings";
function getConfiguredThorapiFolder() {
    const cfg = vscode.workspace.getConfiguration("valoride");
    const raw = cfg.get("advanced.thorapi.outputFolder") ?? DEFAULT_ADVANCED_SETTINGS.thorapi.outputFolder;
    const trimmed = raw.trim();
    return trimmed || DEFAULT_ADVANCED_SETTINGS.thorapi.outputFolder;
}
export function resolveThorapiFolderPath(basePath) {
    const folderSetting = getConfiguredThorapiFolder();
    if (path.isAbsolute(folderSetting)) {
        return folderSetting;
    }
    if (!basePath) {
        return folderSetting;
    }
    return path.join(basePath, folderSetting);
}
export function thorapiSettingChanged(event) {
    return (event.affectsConfiguration("valoride.advanced.thorapi.outputFolder") ||
        event.affectsConfiguration("valoride.advanced.thorapi"));
}
//# sourceMappingURL=thorapi.js.map