import * as vscode from "vscode";
import { registerProjectRoundTripCommands } from "./projectRoundTripCommands";
import { importLocalProjectPackage } from "../services/localProjectImport";
import { ProjectBlueprintConflict, readProjectBlueprintState, specificationHash, synchronizeProjectBlueprint } from "../services/projectBlueprintSync";
import { getSecret } from "../core/storage/state";

jest.mock("vscode", () => ({
  CancellationError: class CancellationError extends Error {},
  ProgressLocation: { Notification: 15 },
  Uri: {
    file: (fsPath: string) => ({ fsPath, toString: () => `file:${fsPath}` }),
    parse: (uri: string) => ({ toString: () => uri }),
    joinPath: (root: any, relative: string) => ({ fsPath: `${root.fsPath}/${relative}` }),
  },
  commands: { registerCommand: jest.fn(() => ({ dispose: jest.fn() })), executeCommand: jest.fn(async () => undefined) },
  workspace: { isTrusted: true, textDocuments: [], workspaceFolders: [{ uri: { fsPath: "/workspace" } }], registerTextDocumentContentProvider: jest.fn(() => ({ dispose: jest.fn() })) },
  window: { showOpenDialog: jest.fn(), showInformationMessage: jest.fn(), showWarningMessage: jest.fn(), showErrorMessage: jest.fn(), withProgress: jest.fn() },
}));
jest.mock("../core/storage/state", () => ({ getSecret: jest.fn() }));
jest.mock("../utils/serverValkyraiHost", () => ({ getValkyraiBasePath: () => "https://api.example/v1" }));
jest.mock("../utils/thorapi", () => ({ resolveThorapiFolderPath: (root: string) => `${root}/.thorapi` }));
jest.mock("../services/localProjectImport", () => ({ importLocalProjectPackage: jest.fn() }));
jest.mock("../services/projectBlueprintSync", () => ({
  ...jest.requireActual("../services/projectBlueprintSync"), synchronizeProjectBlueprint: jest.fn(), readProjectBlueprintState: jest.fn(),
}));

describe("native project round-trip commands", () => {
  let commands: Map<string, (...args: any[]) => Promise<any>>;
  let cancelled: boolean; let refresh: jest.Mock;
  const project = () => vscode.Uri.file("/workspace/Round-Trip-v1.0.0");
  const canonical = { applicationId: "11111111-1111-4111-8111-111111111111", specId: "22222222-2222-4222-8222-222222222222", filename: "openapi.json", etag: "c".repeat(64), specification: { openapi: "3.0.3", info: { title: "Round Trip", version: "1.0.0" }, paths: { "/remote": {} } } };
  beforeEach(() => {
    jest.clearAllMocks(); cancelled = false; refresh = jest.fn(); commands = new Map();
    (vscode.workspace as any).isTrusted = true;
    (vscode.workspace as any).textDocuments = [];
    (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, callback) => { commands.set(name, callback); return { dispose: jest.fn() }; });
    (vscode.window.withProgress as jest.Mock).mockImplementation(async (_options, callback) => callback({ report: jest.fn() }, { get isCancellationRequested() { return cancelled; } }));
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showOpenDialog as jest.Mock).mockResolvedValue(undefined);
    (getSecret as jest.Mock).mockResolvedValue("disposable-fixture-session");
    (importLocalProjectPackage as jest.Mock).mockImplementation(async (request) => { await request.assertCurrent(); return { extractedPath: "/workspace/.thorapi/Round-Trip-v1.0.0", preservedFiles: ["runtime/adapter.py"], configurationWarnings: [] }; });
    (synchronizeProjectBlueprint as jest.Mock).mockImplementation(async (request) => { await request.assertCurrent(); return { status: "saved", document: canonical, localEditsRemain: false }; });
    (readProjectBlueprintState as jest.Mock).mockResolvedValue({ specificationPath: "openapi.json" });
    registerProjectRoundTripCommands({} as any, { appendLine: jest.fn() } as any, () => project(), refresh);
  });

  it("registers the import and sync commands and returns the installed project without waiting on the success notification", async () => {
    expect([...commands.keys()]).toEqual(["valoride.projects.import", "valoride.projects.syncBlueprint"]);
    (vscode.window.showInformationMessage as jest.Mock).mockImplementation(() => new Promise(() => {}));
    const result = await commands.get("valoride.projects.import")!(vscode.Uri.file("/project-export.zip"), vscode.Uri.file("/workspace/.thorapi"));
    expect(result.extractedPath).toContain("Round-Trip-v1.0.0"); expect(refresh).toHaveBeenCalledTimes(1);
    expect(importLocalProjectPackage).toHaveBeenCalledWith(expect.objectContaining({ archivePath: "/project-export.zip", parent: "/workspace/.thorapi", workspaceRoot: "/workspace" }));
  });

  it("cancels either file-picker stage without starting an import", async () => {
    await commands.get("valoride.projects.import")!();
    (vscode.window.showOpenDialog as jest.Mock).mockResolvedValueOnce([vscode.Uri.file("/project-export.zip")]).mockResolvedValueOnce(undefined);
    await commands.get("valoride.projects.import")!();
    expect(importLocalProjectPackage).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled();
  });

  it("honors native cancellation and workspace trust before import writes, then allows retry", async () => {
    cancelled = true;
    expect(await commands.get("valoride.projects.import")!(vscode.Uri.file("/project-export.zip"), vscode.Uri.file("/workspace/.thorapi"))).toBeUndefined();
    expect(refresh).not.toHaveBeenCalled(); expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    cancelled = false; (vscode.workspace as any).isTrusted = false;
    await commands.get("valoride.projects.import")!(vscode.Uri.file("/project-export.zip"), vscode.Uri.file("/workspace/.thorapi"));
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringMatching(/Trust this workspace/));
    (vscode.workspace as any).isTrusted = true;
    expect(await commands.get("valoride.projects.import")!(vscode.Uri.file("/project-export.zip"), vscode.Uri.file("/workspace/.thorapi"))).toBeDefined();
  });

  it("requires a signed-in account for canonical sync and reports a cancelled in-flight operation accurately", async () => {
    (getSecret as jest.Mock).mockResolvedValueOnce(undefined);
    await commands.get("valoride.projects.syncBlueprint")!(); expect(synchronizeProjectBlueprint).not.toHaveBeenCalled();
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringMatching(/Sign in/));
    cancelled = true; await commands.get("valoride.projects.syncBlueprint")!();
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(expect.stringMatching(/may have completed; retry checks/));
  });

  it("leaves a conflict cancelled without adopting a fresh base or starting another sync", async () => {
    (synchronizeProjectBlueprint as jest.Mock).mockRejectedValueOnce(new ProjectBlueprintConflict(canonical));
    expect(await commands.get("valoride.projects.syncBlueprint")!()).toBeUndefined();
    expect(synchronizeProjectBlueprint).toHaveBeenCalledTimes(1); expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it("saves dirty editor changes before sync and refuses publication when the editor save fails", async () => {
    const save = jest.fn().mockResolvedValue(false);
    (vscode.workspace as any).textDocuments = [{ uri: { fsPath: "/workspace/Round-Trip-v1.0.0/openapi.json" }, isDirty: true, save }];
    await commands.get("valoride.projects.syncBlueprint")!();
    expect(save).toHaveBeenCalledTimes(1); expect(synchronizeProjectBlueprint).not.toHaveBeenCalled();
    save.mockResolvedValue(true); await commands.get("valoride.projects.syncBlueprint")!();
    expect(save).toHaveBeenCalledTimes(2); expect(synchronizeProjectBlueprint).toHaveBeenCalledTimes(1);
  });

  it("shows a read-only canonical diff, and cancelling review does not publish", async () => {
    (synchronizeProjectBlueprint as jest.Mock).mockRejectedValueOnce(new ProjectBlueprintConflict(canonical));
    (vscode.window.showWarningMessage as jest.Mock).mockResolvedValueOnce("Review changes");
    await commands.get("valoride.projects.syncBlueprint")!();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith("vscode.diff", expect.anything(), expect.objectContaining({ fsPath: "/workspace/Round-Trip-v1.0.0/openapi.json" }), expect.any(String));
    const provider = (vscode.workspace.registerTextDocumentContentProvider as jest.Mock).mock.calls[0][1];
    const reviewUri = (vscode.commands.executeCommand as jest.Mock).mock.calls[0][1];
    expect(JSON.parse(provider.provideTextDocumentContent(reviewUri))).toEqual(canonical.specification);
    expect(synchronizeProjectBlueprint).toHaveBeenCalledTimes(1);
  });

  it("publishes after explicit conflict review with the exact reviewed ETag and document hash", async () => {
    (synchronizeProjectBlueprint as jest.Mock).mockRejectedValueOnce(new ProjectBlueprintConflict(canonical));
    (vscode.window.showWarningMessage as jest.Mock).mockResolvedValueOnce("Review changes");
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValueOnce("Publish reviewed changes");
    expect((await commands.get("valoride.projects.syncBlueprint")!()).status).toBe("saved");
    expect(synchronizeProjectBlueprint).toHaveBeenCalledTimes(2);
    expect(synchronizeProjectBlueprint).toHaveBeenLastCalledWith(expect.objectContaining({ reviewedBase: { etag: canonical.etag, specificationHash: specificationHash(canonical.specification) } }));
  });
});
