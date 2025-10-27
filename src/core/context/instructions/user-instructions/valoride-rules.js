import path from "path";
import { ensureRulesDirectoryExists, GlobalFileNames, } from "@core/storage/disk";
import { fileExistsAtPath, isDirectory, readDirectory } from "@utils/fs";
import { formatResponse } from "@core/prompts/responses";
import fs from "fs/promises";
import { getGlobalState, getWorkspaceState, updateGlobalState, updateWorkspaceState, } from "@core/storage/state";
export const getGlobalValorIDERules = async (globalValorIDERulesFilePath, toggles) => {
    if (await fileExistsAtPath(globalValorIDERulesFilePath)) {
        if (await isDirectory(globalValorIDERulesFilePath)) {
            try {
                const rulesFilePaths = await readDirectory(globalValorIDERulesFilePath);
                const rulesFilesTotalContent = await getValorIDERulesFilesTotalContent(rulesFilePaths, globalValorIDERulesFilePath, toggles);
                if (rulesFilesTotalContent) {
                    const valorideRulesFileInstructions = formatResponse.valorideRulesGlobalDirectoryInstructions(globalValorIDERulesFilePath, rulesFilesTotalContent);
                    return valorideRulesFileInstructions;
                }
            }
            catch {
                console.error(`Failed to read .valoriderules directory at ${globalValorIDERulesFilePath}`);
            }
        }
        else {
            console.error(`${globalValorIDERulesFilePath} is not a directory`);
            return undefined;
        }
    }
    return undefined;
};
export const getLocalValorIDERules = async (cwd, toggles) => {
    const valorideRulesFilePath = path.resolve(cwd, GlobalFileNames.valorideRules);
    let valorideRulesFileInstructions;
    if (await fileExistsAtPath(valorideRulesFilePath)) {
        if (await isDirectory(valorideRulesFilePath)) {
            try {
                const rulesFilePaths = await readDirectory(valorideRulesFilePath);
                const rulesFilesTotalContent = await getValorIDERulesFilesTotalContent(rulesFilePaths, cwd, toggles);
                if (rulesFilesTotalContent) {
                    valorideRulesFileInstructions =
                        formatResponse.valorideRulesLocalDirectoryInstructions(cwd, rulesFilesTotalContent);
                }
            }
            catch {
                console.error(`Failed to read .valoriderules directory at ${valorideRulesFilePath}`);
            }
        }
        else {
            try {
                if (valorideRulesFilePath in toggles &&
                    toggles[valorideRulesFilePath] !== false) {
                    const ruleFileContent = (await fs.readFile(valorideRulesFilePath, "utf8")).trim();
                    if (ruleFileContent) {
                        valorideRulesFileInstructions =
                            formatResponse.valorideRulesLocalFileInstructions(cwd, ruleFileContent);
                    }
                }
            }
            catch {
                console.error(`Failed to read .valoriderules file at ${valorideRulesFilePath}`);
            }
        }
    }
    return valorideRulesFileInstructions;
};
const getValorIDERulesFilesTotalContent = async (rulesFilePaths, basePath, toggles) => {
    const ruleFilesTotalContent = await Promise.all(rulesFilePaths.map(async (filePath) => {
        const ruleFilePath = path.resolve(basePath, filePath);
        const ruleFilePathRelative = path.relative(basePath, ruleFilePath);
        if (ruleFilePath in toggles && toggles[ruleFilePath] === false) {
            return null;
        }
        return (`${ruleFilePathRelative}\n` +
            (await fs.readFile(ruleFilePath, "utf8")).trim());
    })).then((contents) => contents.filter(Boolean).join("\n\n"));
    return ruleFilesTotalContent;
};
export async function synchronizeRuleToggles(rulesDirectoryPath, currentToggles) {
    // Create a copy of toggles to modify
    const updatedToggles = { ...currentToggles };
    try {
        const pathExists = await fileExistsAtPath(rulesDirectoryPath);
        if (pathExists) {
            const isDir = await isDirectory(rulesDirectoryPath);
            if (isDir) {
                // DIRECTORY CASE
                const filePaths = await readDirectory(rulesDirectoryPath);
                const existingRulePaths = new Set();
                for (const filePath of filePaths) {
                    const ruleFilePath = path.resolve(rulesDirectoryPath, filePath);
                    existingRulePaths.add(ruleFilePath);
                    const pathHasToggle = ruleFilePath in updatedToggles;
                    if (!pathHasToggle) {
                        updatedToggles[ruleFilePath] = true;
                    }
                }
                // Clean up toggles for non-existent files
                for (const togglePath in updatedToggles) {
                    const pathExists = existingRulePaths.has(togglePath);
                    if (!pathExists) {
                        delete updatedToggles[togglePath];
                    }
                }
            }
            else {
                // FILE CASE
                // Add toggle for this file
                const pathHasToggle = rulesDirectoryPath in updatedToggles;
                if (!pathHasToggle) {
                    updatedToggles[rulesDirectoryPath] = true;
                }
                // Remove toggles for any other paths
                for (const togglePath in updatedToggles) {
                    if (togglePath !== rulesDirectoryPath) {
                        delete updatedToggles[togglePath];
                    }
                }
            }
        }
        else {
            // PATH DOESN'T EXIST CASE
            // Clear all toggles since the path doesn't exist
            for (const togglePath in updatedToggles) {
                delete updatedToggles[togglePath];
            }
        }
    }
    catch (error) {
        console.error(`Failed to synchronize rule toggles for path: ${rulesDirectoryPath}`, error);
    }
    return updatedToggles;
}
export async function refreshValorIDERulesToggles(context, workingDirectory) {
    // Global toggles
    const globalValorIDERulesToggles = (await getGlobalState(context, "globalValorIDERulesToggles")) || {};
    const globalValorIDERulesFilePath = await ensureRulesDirectoryExists();
    const updatedGlobalToggles = await synchronizeRuleToggles(globalValorIDERulesFilePath, globalValorIDERulesToggles);
    await updateGlobalState(context, "globalValorIDERulesToggles", updatedGlobalToggles);
    // Local toggles
    const localValorIDERulesToggles = (await getWorkspaceState(context, "localValorIDERulesToggles")) || {};
    const localValorIDERulesFilePath = path.resolve(workingDirectory, GlobalFileNames.valorideRules);
    const updatedLocalToggles = await synchronizeRuleToggles(localValorIDERulesFilePath, localValorIDERulesToggles);
    await updateWorkspaceState(context, "localValorIDERulesToggles", updatedLocalToggles);
    return {
        globalToggles: updatedGlobalToggles,
        localToggles: updatedLocalToggles,
    };
}
export const createRuleFile = async (isGlobal, filename, cwd) => {
    try {
        let filePath;
        if (isGlobal) {
            const globalValorIDERulesFilePath = await ensureRulesDirectoryExists();
            filePath = path.join(globalValorIDERulesFilePath, filename);
        }
        else {
            const localValorIDERulesFilePath = path.resolve(cwd, GlobalFileNames.valorideRules);
            await fs.mkdir(localValorIDERulesFilePath, { recursive: true });
            filePath = path.join(localValorIDERulesFilePath, filename);
        }
        const fileExists = await fileExistsAtPath(filePath);
        if (fileExists) {
            return { filePath, fileExists };
        }
        await fs.writeFile(filePath, "", "utf8");
        return { filePath, fileExists: false };
    }
    catch (error) {
        return { filePath: null, fileExists: false };
    }
};
export async function deleteRuleFile(context, rulePath, isGlobal) {
    try {
        // Check if file exists
        const fileExists = await fileExistsAtPath(rulePath);
        if (!fileExists) {
            return {
                success: false,
                message: `Rule file does not exist: ${rulePath}`,
            };
        }
        // Delete the file from disk
        await fs.unlink(rulePath);
        // Get the filename for messages
        const fileName = path.basename(rulePath);
        // Update the appropriate toggles
        if (isGlobal) {
            const toggles = (await getGlobalState(context, "globalValorIDERulesToggles")) || {};
            delete toggles[rulePath];
            await updateGlobalState(context, "globalValorIDERulesToggles", toggles);
        }
        else {
            const toggles = (await getWorkspaceState(context, "localValorIDERulesToggles")) || {};
            delete toggles[rulePath];
            await updateWorkspaceState(context, "localValorIDERulesToggles", toggles);
        }
        return {
            success: true,
            message: `Rule file "${fileName}" deleted successfully`,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error deleting rule file: ${errorMessage}`, error);
        return {
            success: false,
            message: `Failed to delete rule file.`,
        };
    }
}
//# sourceMappingURL=valoride-rules.js.map