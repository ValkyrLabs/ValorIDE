import pWaitFor from "p-wait-for";
import * as vscode from "vscode";
import { arePathsEqual } from "@utils/path";
import { mergePromise, TerminalProcess, } from "./TerminalProcess";
import { TerminalRegistry } from "./TerminalRegistry";
export class TerminalManager {
    terminalIds = new Set();
    processes = new Map();
    disposables = [];
    constructor() {
        let disposable;
        try {
            disposable = vscode.window.onDidStartTerminalShellExecution?.(async (e) => {
                // Creating a read stream here results in a more consistent output. This is most obvious when running the `date` command.
                e?.execution?.read();
            });
        }
        catch (error) {
            // console.error("Error setting up onDidEndTerminalShellExecution", error)
        }
        if (disposable) {
            this.disposables.push(disposable);
        }
    }
    runCommand(terminalInfo, command) {
        terminalInfo.busy = true;
        terminalInfo.lastCommand = command;
        const process = new TerminalProcess();
        this.processes.set(terminalInfo.id, process);
        process.once("completed", () => {
            terminalInfo.busy = false;
        });
        // if shell integration is not available, remove terminal so it does not get reused as it may be running a long-running process
        process.once("no_shell_integration", () => {
            console.log(`no_shell_integration received for terminal ${terminalInfo.id}`);
            // Remove the terminal so we can't reuse it (in case it's running a long-running process)
            TerminalRegistry.removeTerminal(terminalInfo.id);
            this.terminalIds.delete(terminalInfo.id);
            this.processes.delete(terminalInfo.id);
        });
        const promise = new Promise((resolve, reject) => {
            process.once("continue", () => {
                resolve();
            });
            process.once("error", (error) => {
                console.error(`Error in terminal ${terminalInfo.id}:`, error);
                reject(error);
            });
        });
        // if shell integration is already active, run the command immediately
        if (terminalInfo.terminal.shellIntegration) {
            process.waitForShellIntegration = false;
            process.run(terminalInfo.terminal, command);
        }
        else {
            // docs recommend waiting 3s for shell integration to activate
            pWaitFor(() => terminalInfo.terminal.shellIntegration !== undefined, {
                timeout: 4000,
            }).finally(() => {
                const existingProcess = this.processes.get(terminalInfo.id);
                if (existingProcess && existingProcess.waitForShellIntegration) {
                    existingProcess.waitForShellIntegration = false;
                    existingProcess.run(terminalInfo.terminal, command);
                }
            });
        }
        return mergePromise(process, promise);
    }
    async getOrCreateTerminal(cwd) {
        const terminals = TerminalRegistry.getAllTerminals();
        // Find available terminal from our pool first (created for this task)
        const matchingTerminal = terminals.find((t) => {
            if (t.busy) {
                return false;
            }
            const terminalCwd = t.terminal.shellIntegration?.cwd; // one of valoride's commands could have changed the cwd of the terminal
            if (!terminalCwd) {
                return false;
            }
            return arePathsEqual(vscode.Uri.file(cwd).fsPath, terminalCwd.fsPath);
        });
        if (matchingTerminal) {
            this.terminalIds.add(matchingTerminal.id);
            return matchingTerminal;
        }
        // If no matching terminal exists, try to find any non-busy terminal
        const availableTerminal = terminals.find((t) => !t.busy);
        if (availableTerminal) {
            // Navigate back to the desired directory
            await this.runCommand(availableTerminal, `cd "${cwd}"`);
            this.terminalIds.add(availableTerminal.id);
            return availableTerminal;
        }
        // If all terminals are busy, create a new one
        const newTerminalInfo = TerminalRegistry.createTerminal(cwd);
        this.terminalIds.add(newTerminalInfo.id);
        return newTerminalInfo;
    }
    getTerminals(busy) {
        return Array.from(this.terminalIds)
            .map((id) => TerminalRegistry.getTerminal(id))
            .filter((t) => t !== undefined && t.busy === busy)
            .map((t) => ({ id: t.id, lastCommand: t.lastCommand }));
    }
    getUnretrievedOutput(terminalId) {
        if (!this.terminalIds.has(terminalId)) {
            return "";
        }
        const process = this.processes.get(terminalId);
        return process ? process.getUnretrievedOutput() : "";
    }
    isProcessHot(terminalId) {
        const process = this.processes.get(terminalId);
        return process ? process.isHot : false;
    }
    disposeAll() {
        // for (const info of this.terminals) {
        // 	//info.terminal.dispose() // dont want to dispose terminals when task is aborted
        // }
        this.terminalIds.clear();
        this.processes.clear();
        this.disposables.forEach((disposable) => disposable.dispose());
        this.disposables = [];
    }
}
//# sourceMappingURL=TerminalManager.js.map