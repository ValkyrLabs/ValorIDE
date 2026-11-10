import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as vscode from "vscode";
import { afterEach, beforeEach, expect, it } from "@jest/globals";
import type { ToolContext } from "../BaseToolHandler";

jest.mock("vscode", () => ({
  window: { activeTextEditor: undefined },
  Uri: { file: (filename: string) => ({ scheme: "file", fsPath: filename }) },
  Range: class {
    constructor(
      public start: unknown,
      public end: unknown,
    ) {}
  },
  WorkspaceEdit: class {
    edits: any[] = [];
    replace(uri: unknown, range: unknown, content: string) {
      this.edits.push({ uri, range, content });
    }
    createFile(uri: unknown, options: unknown) {
      this.edits.push({ uri, options });
    }
  },
  workspace: {
    isTrusted: true,
    workspaceFolders: [],
    textDocuments: [],
    openTextDocument: jest.fn(),
    applyEdit: jest.fn(),
  },
}));
jest.mock("@services/glob/list-files", () => ({ listFiles: jest.fn() }));
jest.mock("@services/ripgrep", () => ({ regexSearchFiles: jest.fn() }));
jest.mock("@services/tree-sitter", () => ({
  parseSourceCodeForDefinitionsTopLevel: jest.fn(),
}));
jest.mock("@services/psr", () => ({ precisionSearchAndReplace: jest.fn() }));
jest.mock("@integrations/misc/extract-text", () => ({
  extractTextFromFile: jest.fn(),
}));
jest.mock("@core/prompts/responses", () => ({
  formatResponse: {
    toolError: (text: string) => text,
    toolResult: (text: string) => text,
    formatFilesList: () => "scan results",
  },
}));
jest.mock("@services/telemetry/TelemetryService", () => ({
  telemetryService: { captureToolUsage: jest.fn() },
}));
jest.mock("@integrations/notifications", () => ({
  showSystemNotification: jest.fn(),
}));

const { FileToolHandler } = jest.requireActual(
  "../FileToolHandler",
) as typeof import("../FileToolHandler");
const { listFiles } = jest.requireMock("@services/glob/list-files");
const { regexSearchFiles } = jest.requireMock("@services/ripgrep");
const { parseSourceCodeForDefinitionsTopLevel } = jest.requireMock(
  "@services/tree-sitter",
);
const { precisionSearchAndReplace } = jest.requireMock("@services/psr");
const workspace = vscode.workspace as any;
let fixture: string,
  root: string,
  target: string,
  context: ToolContext,
  handler: InstanceType<typeof FileToolHandler>,
  active: boolean;
const block = (name = "write_to_file", params: Record<string, string> = {}) =>
  ({
    type: "tool_use",
    name,
    params: { path: "main.ts", content: "approved content\n", ...params },
  }) as any;

beforeEach(async () => {
  jest.clearAllMocks();
  fixture = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "acp-tools-")),
  );
  root = path.join(fixture, "workspace");
  await fs.mkdir(root);
  target = path.join(root, "main.ts");
  await fs.writeFile(target, "before\n");
  active = true;
  workspace.isTrusted = true;
  workspace.workspaceFolders = [{ uri: { scheme: "file", fsPath: root } }];
  workspace.textDocuments = [];
  workspace.openTextDocument.mockImplementation(async (uri: any) => {
    const doc = {
      uri,
      version: 1,
      isDirty: false,
      isClosed: false,
      content: await fs.readFile(uri.fsPath, "utf8"),
      getText() {
        return this.content;
      },
      positionAt(offset: number) {
        return { offset };
      },
      save: jest.fn(),
    };
    workspace.textDocuments.push(doc);
    return doc;
  });
  workspace.applyEdit.mockImplementation(async (edit: any) => {
    for (const operation of edit.edits) {
      if (operation.options)
        await fs.writeFile(operation.uri.fsPath, operation.options.contents, {
          flag: "wx",
        });
      else {
        const doc = workspace.textDocuments.find(
          (d: any) => d.uri.fsPath === operation.uri.fsPath,
        );
        doc.content = operation.content;
        doc.version++;
        doc.isDirty = true;
      }
    }
    return true;
  });
  context = {
    cwd: root,
    taskId: "external-test",
    isExternalAgentTask: () => true,
    isTaskActive: () => active,
    autoApprovalSettings: { enabled: true },
    shouldAutoApproveToolWithPath: jest.fn(() => true),
    shouldAutoApproveTool: jest.fn(() => true),
    ask: jest.fn(async () => ({ response: "yesButtonClicked" })),
    say: jest.fn(async () => undefined),
    saveCheckpoint: jest.fn(),
    removeLastPartialMessageIfExistsWithType: jest.fn(),
    consecutiveAutoApprovedRequestsCount: 0,
    consecutiveMistakeCount: 0,
    fileContextTracker: {
      markFileAsEditedByValorIDE: jest.fn(),
      trackFileContext: jest.fn(),
    },
    valorideIgnoreController: { validateAccess: () => true },
    diffViewProvider: {
      open: jest.fn(),
      update: jest.fn(),
      saveChanges: jest.fn(),
      revertChanges: jest.fn(),
    },
  } as unknown as ToolContext;
  handler = new FileToolHandler(context);
  listFiles.mockResolvedValue([[target], false]);
  regexSearchFiles.mockResolvedValue("scan results");
  parseSourceCodeForDefinitionsTopLevel.mockResolvedValue("scan results");
});
afterEach(async () => {
  await fs.rm(fixture, { recursive: true, force: true });
});

it.each([
  "write_to_file",
  "replace_in_file",
  "precision_search_and_replace",
  "read_file",
  "list_files",
  "search_files",
])("does not preview, ask, read or edit partial %s", async (name) => {
  await handler.execute(block(name), true);
  expect(context.ask).not.toHaveBeenCalled();
  expect(workspace.openTextDocument).not.toHaveBeenCalled();
  expect(workspace.applyEdit).not.toHaveBeenCalled();
  expect(context.diffViewProvider.open).not.toHaveBeenCalled();
});

it("awaits exact remote approval before applying and never saves the developer document", async () => {
  let decide!: (answer: any) => void;
  (context.ask as jest.Mock).mockImplementation(
    () =>
      new Promise((resolve) => {
        decide = resolve;
      }),
  );
  const pending = handler.execute(block(), false);
  for (let i = 0; i < 30 && !decide; i++)
    await new Promise((resolve) => setTimeout(resolve, 2));
  expect(decide).toBeDefined();
  expect(workspace.applyEdit).not.toHaveBeenCalled();
  expect(await fs.readFile(target, "utf8")).toBe("before\n");
  expect(JSON.parse((context.ask as jest.Mock).mock.calls[0][1])).toMatchObject(
    {
      path: target,
      content: "approved content\n",
      persistence: expect.stringContaining("buffer"),
    },
  );
  decide({ response: "yesButtonClicked" });
  expect(await pending).toMatchObject({
    outcome: "succeeded",
    toolResponse: expect.stringContaining("UNSAVED"),
  });
  expect(workspace.textDocuments[0].content).toBe("approved content\n");
  expect(workspace.textDocuments[0].save).not.toHaveBeenCalled();
  expect(context.diffViewProvider.open).not.toHaveBeenCalled();
  expect(await fs.readFile(target, "utf8")).toBe("before\n");
});

it.each(["noButtonClicked", "messageResponse"])(
  "never creates or edits after %s",
  async (response) => {
    (context.ask as jest.Mock).mockResolvedValue({ response });
    expect(
      await handler.execute(block("write_to_file", { path: "new.ts" }), false),
    ).toMatchObject({ outcome: "rejected" });
    await expect(fs.stat(path.join(root, "new.ts"))).rejects.toThrow();
    expect(workspace.applyEdit).not.toHaveBeenCalled();
    expect(context.diffViewProvider.open).not.toHaveBeenCalled();
  },
);

it("creates a new file only after one explicit write permission", async () => {
  expect(
    await handler.execute(block("write_to_file", { path: "new.ts" }), false),
  ).toMatchObject({ outcome: "succeeded" });
  expect(await fs.readFile(path.join(root, "new.ts"), "utf8")).toBe(
    "approved content\n",
  );
  expect(context.ask).toHaveBeenCalledTimes(1);
});

it("rejects dirty targets and preserves unsaved developer text", async () => {
  const doc = await workspace.openTextDocument(vscode.Uri.file(target));
  doc.isDirty = true;
  doc.content = "developer unsaved";
  expect(await handler.execute(block(), false)).toMatchObject({
    outcome: "failed",
    toolResponse: expect.stringContaining("unsaved"),
  });
  expect(doc.save).not.toHaveBeenCalled();
  expect(workspace.applyEdit).not.toHaveBeenCalled();
  expect(context.ask).not.toHaveBeenCalled();
});

it("rejects a developer edit racing the remote approval", async () => {
  (context.ask as jest.Mock).mockImplementation(async () => {
    const doc = workspace.textDocuments[0];
    doc.content = "developer newer";
    doc.version++;
    doc.isDirty = true;
    return { response: "yesButtonClicked" };
  });
  expect(await handler.execute(block(), false)).toMatchObject({
    outcome: "failed",
  });
  expect(workspace.applyEdit).not.toHaveBeenCalled();
  expect(workspace.textDocuments[0].content).toBe("developer newer");
});

it("does not apply after task cancellation or trust revocation during review", async () => {
  (context.ask as jest.Mock).mockImplementation(async () => {
    active = false;
    return { response: "yesButtonClicked" };
  });
  expect(await handler.execute(block(), false)).toMatchObject({
    outcome: "failed",
  });
  expect(workspace.applyEdit).not.toHaveBeenCalled();
});

it("reads unsaved content only after read permission", async () => {
  const doc = await workspace.openTextDocument(vscode.Uri.file(target));
  doc.isDirty = true;
  doc.content = "unsaved current";
  expect(await handler.execute(block("read_file"), false)).toMatchObject({
    outcome: "succeeded",
    toolResponse: "unsaved current",
  });
  expect(context.ask).toHaveBeenCalledTimes(1);
  expect(doc.save).not.toHaveBeenCalled();
});

it("does not read file content when read permission is denied", async () => {
  (context.ask as jest.Mock).mockResolvedValue({ response: "noButtonClicked" });
  expect(await handler.execute(block("read_file"), false)).toMatchObject({
    outcome: "rejected",
  });
  expect(workspace.openTextDocument).not.toHaveBeenCalled();
});

it("includes the effective default search expression in the initial request", async () => {
  expect(
    await handler.execute(block("search_files", { path: "." }), false),
  ).toMatchObject({ outcome: "succeeded" });
  const proposal = JSON.parse((context.ask as jest.Mock).mock.calls[0][1]);
  expect(proposal.parameters.regex).toBe(".");
});

it("rejects an approved scan target changed into an escaping symlink", async () => {
  const directory = path.join(root, "nested");
  await fs.mkdir(directory);
  (context.ask as jest.Mock).mockImplementation(async () => {
    await fs.rmdir(directory);
    await fs.symlink(fixture, directory);
    return { response: "yesButtonClicked" };
  });
  expect(
    await handler.execute(block("list_files", { path: "nested" }), false),
  ).toMatchObject({ outcome: "failed" });
  expect(listFiles).not.toHaveBeenCalled();
});

it("replacement asks to read, then reviews the complete resulting content without opening a diff", async () => {
  const diff = "<<<<<<< SEARCH\nbefore\n=======\nafter\n>>>>>>> REPLACE";
  expect(
    await handler.execute(block("replace_in_file", { diff }), false),
  ).toMatchObject({ outcome: "succeeded" });
  expect(context.ask).toHaveBeenCalledTimes(2);
  const proposal = JSON.parse((context.ask as jest.Mock).mock.calls[1][1]);
  expect(proposal.content).toBe("after\n");
  expect(context.diffViewProvider.open).not.toHaveBeenCalled();
});

it.each(["list_files", "list_code_definition_names", "search_files"])(
  "requires request-only approval before %s scans and has no duplicate ask",
  async (name) => {
    (context.ask as jest.Mock).mockImplementation(async () => {
      expect(listFiles).not.toHaveBeenCalled();
      expect(regexSearchFiles).not.toHaveBeenCalled();
      expect(parseSourceCodeForDefinitionsTopLevel).not.toHaveBeenCalled();
      return { response: "yesButtonClicked" };
    });
    const result = await handler.execute(
      block(name, { path: ".", regex: "needle" }),
      false,
    );
    expect(result.toolResponse).toBe("scan results");
    expect(result).toMatchObject({ outcome: "succeeded" });
    expect(context.ask).toHaveBeenCalledTimes(1);
    expect((context.ask as jest.Mock).mock.calls[0][1]).not.toContain(
      "scan results",
    );
  },
);

it.each(["list_files", "list_code_definition_names", "search_files"])(
  "does not scan %s on rejection",
  async (name) => {
    (context.ask as jest.Mock).mockResolvedValue({
      response: "noButtonClicked",
    });
    expect(
      await handler.execute(block(name, { path: "." }), false),
    ).toMatchObject({ outcome: "rejected" });
    expect(listFiles).not.toHaveBeenCalled();
    expect(regexSearchFiles).not.toHaveBeenCalled();
    expect(parseSourceCodeForDefinitionsTopLevel).not.toHaveBeenCalled();
  },
);

it("blocks PSR, path escapes, protected targets and oversized proposals without mutation", async () => {
  expect(
    await handler.execute(block("precision_search_and_replace"), false),
  ).toMatchObject({ outcome: "blocked" });
  expect(
    await handler.execute(
      block("write_to_file", { path: "../outside.ts" }),
      false,
    ),
  ).toMatchObject({ outcome: "failed" });
  expect(
    await handler.execute(block("write_to_file", { path: ".env" }), false),
  ).toMatchObject({ outcome: "failed" });
  expect(
    await handler.execute(
      block("write_to_file", { content: "x".repeat(60_000) }),
      false,
    ),
  ).toMatchObject({ outcome: "failed" });
  expect(precisionSearchAndReplace).not.toHaveBeenCalled();
  expect(workspace.applyEdit).not.toHaveBeenCalled();
  expect(context.ask).not.toHaveBeenCalled();
});
