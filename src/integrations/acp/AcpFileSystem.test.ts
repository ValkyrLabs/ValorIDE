import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as vscode from "vscode";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { ACP_FILE_LIMIT, AcpFileSystem } from "./AcpFileSystem";

jest.mock("vscode", () => ({
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
      this.edits.push({ kind: "replace", uri, range, content });
    }
    createFile(uri: unknown, options: unknown) {
      this.edits.push({ kind: "create", uri, options });
    }
  },
  workspace: {
    textDocuments: [],
    openTextDocument: jest.fn(),
    applyEdit: jest.fn(),
  },
}));

type FakeDocument = {
  uri: { scheme: string; fsPath: string };
  version: number;
  isDirty: boolean;
  isClosed: boolean;
  content: string;
  getText(): string;
  positionAt(offset: number): { offset: number };
  save: jest.Mock;
};
const workspace = vscode.workspace as unknown as {
  textDocuments: FakeDocument[];
  openTextDocument: jest.Mock;
  applyEdit: jest.Mock;
};

describe("ACP client-owned filesystem", () => {
  let fixture: string, root: string, target: string, active: boolean;
  let adapter: AcpFileSystem;
  let confirmWrite: jest.Mock;
  const makeDocument = (
    filename: string,
    content: string,
    dirty = false,
  ): FakeDocument => ({
    uri: { scheme: "file", fsPath: filename },
    content,
    version: 1,
    isDirty: dirty,
    isClosed: false,
    getText() {
      return this.content;
    },
    positionAt(offset) {
      return { offset };
    },
    save: jest.fn(),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    fixture = await fs.realpath(
      await fs.mkdtemp(path.join(os.tmpdir(), "valoride-acp-fs-")),
    );
    root = path.join(fixture, "workspace");
    await fs.mkdir(root);
    target = path.join(root, "main.ts");
    await fs.writeFile(target, "disk\nsecond\nthird\n");
    active = true;
    confirmWrite = jest.fn(async () => true);
    adapter = new AcpFileSystem(root, {
      assertActive: () => {
        if (!active) throw new Error("session cancelled");
      },
      confirmWrite,
    });
    workspace.textDocuments = [];
    workspace.openTextDocument.mockImplementation(
      async (uri: { fsPath: string }) => {
        const doc = makeDocument(
          uri.fsPath,
          await fs.readFile(uri.fsPath, "utf8"),
        );
        workspace.textDocuments.push(doc);
        return doc;
      },
    );
    workspace.applyEdit.mockImplementation(async (edit: { edits: any[] }) => {
      for (const operation of edit.edits) {
        if (operation.kind === "create") {
          await fs.writeFile(operation.uri.fsPath, operation.options.contents, {
            flag: "wx",
          });
        } else {
          const doc = workspace.textDocuments.find(
            (d) => d.uri.fsPath === operation.uri.fsPath,
          )!;
          doc.content = operation.content;
          doc.version++;
          doc.isDirty = true;
        }
      }
      return true;
    });
  });

  afterEach(async () => {
    await fs.rm(fixture, { recursive: true, force: true });
  });

  it("reads current unsaved text with 1-based ranges, preserving CRLF", async () => {
    const doc = makeDocument(target, "unsaved\r\nsecond\r\nthird\r\n", true);
    workspace.textDocuments.push(doc);
    expect(await adapter.readTextFile({ path: target })).toEqual({
      content: doc.content,
    });
    expect(
      await adapter.readTextFile({ path: target, line: 2, limit: 1 }),
    ).toEqual({ content: "second\r\n" });
    expect(await adapter.readTextFile({ path: target, line: 3 })).toEqual({
      content: "third\r\n",
    });
    expect(await adapter.readTextFile({ path: target, limit: 0 })).toEqual({
      content: "",
    });
    expect(await adapter.readTextFile({ path: target, line: 20 })).toEqual({
      content: "",
    });
    expect(doc.save).not.toHaveBeenCalled();
    expect(workspace.openTextDocument).not.toHaveBeenCalled();
  });

  it.each([
    { line: 0 },
    { line: -1 },
    { line: 1.5 },
    { limit: -1 },
    { limit: Infinity },
  ])("rejects invalid line slicing %j", async (slice) => {
    await expect(
      adapter.readTextFile({ path: target, ...slice }),
    ).rejects.toThrow(/1-based/);
  });

  it("rejects relative paths, traversal, and a path-prefix sibling", async () => {
    for (const filename of [
      "main.ts",
      path.join(root, "..", "outside.txt"),
      root + "-other/main.ts",
      "file:///tmp/main.ts",
    ]) {
      await expect(adapter.readTextFile({ path: filename })).rejects.toThrow(
        /absolute|outside/,
      );
    }
    expect(workspace.openTextDocument).not.toHaveBeenCalled();
  });

  it("rejects control and invisible-direction characters in paths", async () => {
    for (const name of ["a\u202e.ts", "a\u001b.ts", "a\u200b.ts"]) {
      await expect(
        adapter.readTextFile({ path: path.join(root, name) }),
      ).rejects.toThrow(/absolute local paths/);
    }
  });

  it.each([
    ".env",
    "nested/.env.local",
    ".ssh/id_rsa",
    ".aws/credentials",
    "token.pem",
    ".git/config",
  ])(
    "denies credential/internal path %s for reads and writes",
    async (relative) => {
      const filename = path.join(root, relative);
      await expect(adapter.readTextFile({ path: filename })).rejects.toThrow(
        /credential|version-control/,
      );
      await expect(
        adapter.writeTextFile({ path: filename, content: "no" }),
      ).rejects.toThrow(/credential|version-control/);
      expect(confirmWrite).not.toHaveBeenCalled();
    },
  );

  it.each([
    ".vscode/settings.json",
    ".codex/config.toml",
    ".agents/policy.json",
    "hooks/pre-commit",
    "AGENTS.md",
    ".valorignore",
  ])("denies execution or approval control writes %s", async (relative) => {
    await expect(
      adapter.writeTextFile({ path: path.join(root, relative), content: "no" }),
    ).rejects.toThrow(/configuration/);
    expect(confirmWrite).not.toHaveBeenCalled();
  });

  it("rejects symlink escapes, directory symlinks, internal aliases and broken links", async () => {
    const outside = path.join(fixture, "outside.txt");
    await fs.writeFile(outside, "secret");
    await fs.symlink(outside, path.join(root, "escape"));
    await fs.symlink(fixture, path.join(root, "parent"));
    await fs.symlink(target, path.join(root, "alias"));
    await fs.symlink(path.join(fixture, "missing"), path.join(root, "broken"));
    for (const name of ["escape", "parent/outside.txt", "alias", "broken"]) {
      await expect(
        adapter.readTextFile({ path: path.join(root, name) }),
      ).rejects.toThrow(/symlink/);
      await expect(
        adapter.writeTextFile({ path: path.join(root, name), content: "no" }),
      ).rejects.toThrow(/symlink/);
    }
    expect(await fs.readFile(outside, "utf8")).toBe("secret");
  });

  it("rejects multiply-linked files rather than allowing a hardlink escape", async () => {
    await fs.link(target, path.join(fixture, "alias"));
    await expect(adapter.readTextFile({ path: target })).rejects.toThrow(
      /hard links/,
    );
    await expect(
      adapter.writeTextFile({ path: target, content: "no" }),
    ).rejects.toThrow(/hard links/);
  });

  it("honors workspace ignore rules and denies unsafe ignore includes", async () => {
    await fs.writeFile(path.join(root, ".valorignore"), "main.ts\n");
    await expect(adapter.readTextFile({ path: target })).rejects.toThrow(
      /excluded/,
    );
    await fs.writeFile(
      path.join(root, ".valorignore"),
      "!include ../outside-ignore\n",
    );
    await expect(adapter.readTextFile({ path: target })).rejects.toThrow(
      /outside/,
    );
    await fs.writeFile(path.join(fixture, "outside-ignore"), "");
    await fs.unlink(path.join(root, ".valorignore"));
    await fs.symlink(
      path.join(fixture, "outside-ignore"),
      path.join(root, ".valorignore"),
    );
    await expect(adapter.readTextFile({ path: target })).rejects.toThrow(
      /symlink/,
    );
  });

  it("limits disk and editor content and rejects binary text", async () => {
    await fs.writeFile(target, Buffer.alloc(ACP_FILE_LIMIT + 1, 65));
    await expect(adapter.readTextFile({ path: target })).rejects.toThrow(
      /2 MiB/,
    );
    await fs.writeFile(target, "small");
    workspace.textDocuments.push(
      makeDocument(target, "x".repeat(ACP_FILE_LIMIT + 1), true),
    );
    await expect(adapter.readTextFile({ path: target })).rejects.toThrow(
      /2 MiB/,
    );
    await expect(
      adapter.writeTextFile({
        path: target,
        content: "x".repeat(ACP_FILE_LIMIT + 1),
      }),
    ).rejects.toThrow(/2 MiB/);
    await expect(
      adapter.writeTextFile({ path: target, content: "binary\0value" }),
    ).rejects.toThrow(/binary/);
  });

  it("reviews and updates a dirty buffer without saving it or replacing its disk copy", async () => {
    const doc = makeDocument(target, "unsaved developer edit", true);
    workspace.textDocuments.push(doc);
    await expect(
      adapter.writeTextFile({ path: target, content: "reviewed new content" }),
    ).resolves.toEqual({});
    expect(confirmWrite).toHaveBeenCalledWith({
      path: target,
      currentContent: "unsaved developer edit",
      proposedContent: "reviewed new content",
      isNewFile: false,
      isDirty: true,
    });
    expect(doc.content).toBe("reviewed new content");
    expect(doc.isDirty).toBe(true);
    expect(doc.save).not.toHaveBeenCalled();
    expect(await fs.readFile(target, "utf8")).toBe("disk\nsecond\nthird\n");
  });

  it("creates a reviewed file without overwriting anything", async () => {
    const filename = path.join(root, "new.ts");
    await expect(
      adapter.writeTextFile({ path: filename, content: "created\n" }),
    ).resolves.toEqual({});
    expect(confirmWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        isNewFile: true,
        currentContent: "",
        isDirty: false,
      }),
    );
    const operation = workspace.applyEdit.mock.calls[0][0].edits[0];
    expect(operation.options).toMatchObject({
      overwrite: false,
      ignoreIfExists: false,
    });
    expect(await fs.readFile(filename, "utf8")).toBe("created\n");
  });

  it("does not create directories to fulfill a write", async () => {
    await expect(
      adapter.writeTextFile({
        path: path.join(root, "missing/new.ts"),
        content: "no",
      }),
    ).rejects.toThrow(/parent directory/);
    expect(confirmWrite).not.toHaveBeenCalled();
    await expect(fs.stat(path.join(root, "missing"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("denied review does not create or edit files", async () => {
    confirmWrite.mockResolvedValue(false);
    await expect(
      adapter.writeTextFile({ path: target, content: "no" }),
    ).rejects.toThrow(/not approved/);
    await expect(
      adapter.writeTextFile({ path: path.join(root, "new.ts"), content: "no" }),
    ).rejects.toThrow(/not approved/);
    expect(workspace.applyEdit).not.toHaveBeenCalled();
  });

  it.each(["version", "content", "closed", "dirty"])(
    "rejects an editor %s change during review",
    async (field) => {
      const doc = makeDocument(target, "review baseline");
      workspace.textDocuments.push(doc);
      confirmWrite.mockImplementation(async () => {
        if (field === "version") doc.version++;
        if (field === "content") doc.content = "new user text";
        if (field === "closed") doc.isClosed = true;
        if (field === "dirty") doc.isDirty = true;
        return true;
      });
      await expect(
        adapter.writeTextFile({ path: target, content: "no" }),
      ).rejects.toThrow(/changed during/);
      expect(workspace.applyEdit).not.toHaveBeenCalled();
    },
  );

  it("rejects disk changes and symlink substitution during review", async () => {
    confirmWrite.mockImplementation(async () => {
      await fs.writeFile(target, "external change");
      return true;
    });
    await expect(
      adapter.writeTextFile({ path: target, content: "no" }),
    ).rejects.toThrow(/changed during/);
    confirmWrite.mockImplementation(async () => {
      await fs.unlink(target);
      await fs.symlink(path.join(fixture, "outside"), target);
      return true;
    });
    await expect(
      adapter.writeTextFile({ path: target, content: "no" }),
    ).rejects.toThrow(/symlink/);
    expect(workspace.applyEdit).not.toHaveBeenCalled();
  });

  it("rejects a new target created while the user reviews it", async () => {
    const filename = path.join(root, "new.ts");
    confirmWrite.mockImplementation(async () => {
      await fs.writeFile(filename, "created elsewhere");
      return true;
    });
    await expect(
      adapter.writeTextFile({ path: filename, content: "no" }),
    ).rejects.toThrow(/changed during/);
    expect(await fs.readFile(filename, "utf8")).toBe("created elsewhere");
    expect(workspace.applyEdit).not.toHaveBeenCalled();
  });

  it("fails closed for a non-file or redirected editor document", async () => {
    workspace.openTextDocument.mockResolvedValue({
      ...makeDocument(target, "x"),
      uri: { scheme: "untitled", fsPath: target },
    });
    await expect(adapter.readTextFile({ path: target })).rejects.toThrow(
      /local document/,
    );
  });

  it("checks active authority before reads and after write approval", async () => {
    active = false;
    await expect(adapter.readTextFile({ path: target })).rejects.toThrow(
      /cancelled/,
    );
    active = true;
    confirmWrite.mockImplementation(async () => {
      active = false;
      return true;
    });
    await expect(
      adapter.writeTextFile({ path: target, content: "no" }),
    ).rejects.toThrow(/cancelled/);
    expect(workspace.applyEdit).not.toHaveBeenCalled();
  });

  it("does not claim success when VS Code refuses a WorkspaceEdit", async () => {
    workspace.applyEdit.mockResolvedValue(false);
    await expect(
      adapter.writeTextFile({ path: target, content: "no" }),
    ).rejects.toThrow(/rejected/);
  });

  it("rejects concurrent pending writes to the same file", async () => {
    let approve!: (value: boolean) => void;
    confirmWrite.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          approve = resolve;
        }),
    );
    const first = adapter.writeTextFile({ path: target, content: "first" });
    while (!approve) await new Promise((resolve) => setImmediate(resolve));
    await expect(
      adapter.writeTextFile({ path: target, content: "second" }),
    ).rejects.toThrow(/already awaiting/);
    approve(true);
    await first;
    expect(workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("rejects replacement of the pinned root", async () => {
    await fs.rename(root, root + "-original");
    await fs.mkdir(root);
    await fs.writeFile(target, "different root");
    await expect(adapter.readTextFile({ path: target })).rejects.toThrow(
      /workspace changed/,
    );
  });

  it("does not use protected directories as workspace roots", async () => {
    const protectedRoot = path.join(fixture, ".ssh");
    await fs.mkdir(protectedRoot);
    expect(
      () =>
        new AcpFileSystem(protectedRoot, {
          assertActive: () => {},
          confirmWrite,
        }),
    ).toThrow(/credential|execution-control/);
  });

  it("does not trust a successful apply result without verifying the visible content", async () => {
    workspace.applyEdit.mockResolvedValue(true);
    await expect(
      adapter.writeTextFile({ path: target, content: "not applied" }),
    ).rejects.toThrow(/document changed again/i);
  });
});
