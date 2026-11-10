import fs from "node:fs";
import { describe, expect, it } from "@jest/globals";
import path from "node:path";
import ts from "typescript";
import { answerExternalTaskAsk, type ExternalTaskAnswer } from "./ExternalTaskInteraction";
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@shared/AutoApprovalSettings";

// Execute the production methods themselves without importing/starting provider SDKs,
// browser sessions, MCP connections, or a VS Code host during the regression test.
function productionMethod(file: string, className: string, methodName: string, bindings: Record<string, unknown>) {
  const filePath = path.resolve(__dirname, file);
  const source = ts.createSourceFile(filePath, fs.readFileSync(filePath, "utf8"), ts.ScriptTarget.Latest, true);
  const owner = source.statements.find((node): node is ts.ClassDeclaration => ts.isClassDeclaration(node) && node.name?.text === className)!;
  const method = owner.members.find(member => methodName === "constructor" ? ts.isConstructorDeclaration(member) : ts.isMethodDeclaration(member) && member.name.getText(source) === methodName)!;
  const methodText = ts.createPrinter().printNode(ts.EmitHint.Unspecified, method, source);
  const code = ts.transpileModule(`class Harness { ${methodText} }; return Harness;`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  return new Function(...Object.keys(bindings), code)(...Object.values(bindings));
}

describe("real Task external ask hook", () => {
  const poll = jest.fn();
  const Harness = productionMethod("index.ts", "Task", "ask", { answerExternalTaskAsk, pWaitFor: poll });
  function setup() {
    const task = new Harness();
    Object.assign(task, { abort: false, abandoned: false, valorideMessages: [], nextMessageTimestamp: () => 17,
      postStateToWebview: jest.fn(async () => undefined), saveValorIDEMessagesAndUpdateHistory: jest.fn(async () => undefined), postMessageToWebview: jest.fn(async () => undefined),
      partialMessageCoalescer: { enqueue: jest.fn(), discardPendingAndWait: jest.fn(async () => undefined) },
      addToValorIDEMessages: async (message: unknown) => { task.valorideMessages.push(message); },
    });
    return task;
  }

  it("routes only a finalized actual ask after it becomes active, without polling/button races", async () => {
    const task = setup();
    task.externalInteractions = { onFatalError: jest.fn(), ask: jest.fn(async (message) => {
      expect(task.awaitingAskResponse).toBe(true);
      expect(message).toEqual({ ts: 17, type: "ask", ask: "command", text: "git status" });
      return { response: "yesButtonClicked" };
    }) };
    await expect(task.ask("command", "git status")).resolves.toEqual({ response: "yesButtonClicked" });
    expect(task.awaitingAskResponse).toBe(false); expect(poll).not.toHaveBeenCalled();
  });

  it("never asks for permission on incomplete streamed tool data", async () => {
    const task = setup(); task.externalInteractions = { ask: jest.fn(), onFatalError: jest.fn() };
    await expect(task.ask("command", "git", true)).rejects.toThrow("ignored");
    expect(task.externalInteractions.ask).not.toHaveBeenCalled();
  });

  it.each(["abort", "abandoned", "superseded"])("discards approval when the original ask is %s", async state => {
    const task = setup();
    let approve!: (answer: ExternalTaskAnswer) => void;
    task.externalInteractions = { onFatalError: jest.fn(), ask: () => new Promise(resolve => { approve = resolve; }) };
    const result = task.ask("command", "touch result.txt"); const rejected = expect(result).rejects.toThrow("no longer active");
    await new Promise(resolve => setImmediate(resolve));
    if (state === "superseded") task.lastMessageTs++; else task[state] = true;
    approve({ response: "yesButtonClicked" }); await rejected;
    expect(task.awaitingAskResponse).toBe(false);
  });

  it("controller factory never assigns the visible task and always clones disabled approval", async () => {
    const constructed: any[][] = [];
    class FakeTask { valorideMessages: unknown[] = []; constructor(...args: any[]) { constructed.push(args); } }
    const state = { apiConfiguration: { apiProvider: "valkyrai", governedCodingInference: { unsafe: true } }, selectedLlmDetails: { id: "local-choice" }, browserSettings: {}, chatSettings: { mode: "act" }, customInstructions: "local", autoApprovalSettings: { enabled: true } };
    const Controller = productionMethod("../controller/index.ts", "Controller", "createDetachedAcpTask", { getAllExtensionState: async () => state, DEFAULT_AUTO_APPROVAL_SETTINGS, Task: FakeTask });
    const controller = new Controller();
    Object.assign(controller, { context: {}, mcpHub: {}, workspaceTracker: {}, updateTaskHistory: jest.fn(), resolveTaskApiConfiguration: async (config: object) => ({ ...config, valkyraiSessionJwt: "local-token" }) });
    const hooks = { assertActive: jest.fn(async () => undefined), onMessages: jest.fn(), onMessage: jest.fn(), onTerminal: jest.fn(), ask: jest.fn(), onFatalError: jest.fn() };
    const task = await controller.createDetachedAcpTask("ACP prompt", hooks);
    expect(task).toBeInstanceOf(FakeTask); expect(controller.task).toBeUndefined();
    expect(constructed[0][8]).toEqual({ apiProvider: "valkyrai", valkyraiSessionJwt: "local-token" });
    expect(constructed[0][9]).toEqual(DEFAULT_AUTO_APPROVAL_SETTINGS);
    expect(constructed[0][9].actions).not.toBe(DEFAULT_AUTO_APPROVAL_SETTINGS.actions);
    expect(constructed[0][13]).toBe("ACP prompt");
    expect(constructed[0].at(-1)).toBe(hooks);
    controller.task = { unrelated: true };
    await expect(controller.createDetachedAcpTask("Another", hooks)).rejects.toThrow("Clear the current");
    expect(controller.task).toEqual({ unrelated: true }); expect(constructed).toHaveLength(1);
  });

  it("tool execution disables workspace hooks only for external agent tasks", () => {
    const hookOptions: any[] = [];
    class HookService { constructor(options: unknown) { hookOptions.push(options); } }
    class ToolManager { constructor(readonly context: any) {} }
    const Engine = productionMethod("ToolExecutionEngine.ts", "ToolExecutionEngine", "constructor", { ToolApprovalManager: class {}, ToolManager, ValorIDEHookService: HookService });
    const task = { taskId: "task", ask: jest.fn(), say: jest.fn(), shouldAutoApproveTool: jest.fn(), shouldAutoApproveToolWithPath: jest.fn(), sayAndCreateMissingParamError: jest.fn(), removeLastPartialMessageIfExistsWithType: jest.fn(), isExternalAgentTask: () => true };
    const external = new Engine(task, "/workspace");
    expect(hookOptions[0].enabled).toBe(false);
    expect(external.toolManager.context.isExternalAgentTask()).toBe(true);
    task.isExternalAgentTask = () => false;
    new Engine(task, "/workspace");
    expect(hookOptions[1].enabled).toBeUndefined();
  });
});
