import * as vscode from "vscode";
import { registerApplicationGitToolbar } from "./applicationGitToolbar";

jest.mock("vscode", () => ({
  commands: { registerCommand: jest.fn(), executeCommand: jest.fn() },
  window: { showWarningMessage: jest.fn(), showQuickPick: jest.fn(), showErrorMessage: jest.fn() },
  workspace: { isTrusted: true },
}));
const id = "11111111-1111-4111-8111-111111111111";
const app = (directory: string, applicationId?: string) => ({
  name: "Same title", version: "1", applicationId, uri: { scheme: "file", fsPath: directory } as vscode.Uri,
});
describe("Apps toolbars", () => {
  beforeEach(() => jest.clearAllMocks());
  const invoke = async (rows: ReturnType<typeof app>[], action: string) => {
    registerApplicationGitToolbar(async () => rows);
    return (vscode.commands.registerCommand as jest.Mock).mock.lastCall[1](id, action);
  };
  it("targets the installed application ID, never another same-name app", async () => {
    const match = app("/workspace/download", id);
    await invoke([app("/unrelated"), match], "push");
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith("valoride.projects.publishSource", match.uri, id);
  });
  it("requires an explicit selection across multiple checkouts", async () => {
    const copies = [app("/a", id), app("/b", id)];
    (vscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce(undefined);
    await invoke(copies, "pull");
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
    (vscode.window.showQuickPick as jest.Mock).mockImplementationOnce(async choices => choices[1]);
    await invoke(copies, "pull");
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith("valoride.projects.pullSource", copies[1].uri, id);
  });
  it("never falls through to an unrelated selected project or arbitrary command", async () => {
    await invoke([app("/legacy")], "push");
    await invoke([app("/match", id)], "unrecognized");
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });
});
