import * as fs from "node:fs";
import path from "node:path";
import * as vscode from "vscode";
import { PathAccess } from "../../services/access/PathAccess";

export const ACP_FILE_LIMIT = 2 * 1024 * 1024;

export interface AcpWriteProposal {
  path: string;
  currentContent: string;
  proposedContent: string;
  isNewFile: boolean;
  isDirty: boolean;
}

export interface AcpFileSystemHooks {
  /** The owner checks workspace trust, session identity, and current turn lifetime. */
  assertActive(): void | Promise<void>;
  /** Native user review; do not derive approval from agent-authored text. */
  confirmWrite(proposal: AcpWriteProposal): Promise<boolean>;
}

interface CheckedPath {
  filename: string;
  fingerprint?: string;
}

const credentialSegment =
  /^(?:\.git|\.aws|\.ssh|\.gnupg|\.kube|\.docker|\.env(?:\..*)?|\.npmrc|\.pypirc|\.netrc|credentials(?:\..*)?|id_rsa|id_ed25519|secrets?(?:\.(?:json|ya?ml|toml))?)$/i;
const credentialExtension = /\.(?:pem|key|p12|pfx|keystore)$/i;
const controlSegment =
  /^(?:\.vscode|\.vscode-test|\.codex|\.agents|\.claude|\.cursor|\.github|\.husky|\.valoride|hooks)$/i;
const controlFile =
  /^(?:AGENTS\.md|CLAUDE\.md|\.valorignore|\.valorideignore|\.mcp\.json|mcp(?:\.config)?\.json|\.bashrc|\.bash_profile|\.zshrc|\.zprofile|\.profile)$/i;

function within(root: string, filename: string) {
  const relative = path.relative(root, filename);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

function unsafePathText(filename: string) {
  return (
    filename.length > 16_384 ||
    Array.from(filename).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    /[\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/.test(filename)
  );
}

function fingerprint(stat: fs.Stats) {
  return [
    stat.dev,
    stat.ino,
    stat.size,
    stat.mtimeMs,
    stat.ctimeMs,
    stat.mode,
    stat.nlink,
  ].join(":");
}

function bounded(text: string) {
  if (
    typeof text !== "string" ||
    Buffer.byteLength(text, "utf8") > ACP_FILE_LIMIT
  ) {
    throw new Error("ACP text files are limited to 2 MiB.");
  }
  if (text.includes("\0"))
    throw new Error("ACP text-file operations do not support binary content.");
  return text;
}

/**
 * Client-owned file operations, independently checked on each request. ACP is
 * not an OS sandbox: these checks do not constrain the agent's own subprocess.
 * Existing files are edited in the editor and deliberately never auto-saved.
 */
export class AcpFileSystem {
  private readonly root: string;
  private readonly rootIdentity: string;
  private readonly writes = new Set<string>();

  constructor(
    root: string,
    private readonly hooks: AcpFileSystemHooks,
  ) {
    if (!path.isAbsolute(root) || unsafePathText(root))
      throw new Error("ACP requires an absolute workspace root.");
    this.root = fs.realpathSync(root);
    if (
      this.root
        .split(path.sep)
        .some(
          (part) => credentialSegment.test(part) || controlSegment.test(part),
        )
    ) {
      throw new Error(
        "ACP cannot use credential or execution-control directories as a workspace.",
      );
    }
    const stat = fs.lstatSync(this.root);
    if (!stat.isDirectory())
      throw new Error("ACP requires a local workspace directory.");
    this.rootIdentity = `${stat.dev}:${stat.ino}`;
  }

  private checkPath(
    filename: string,
    write = false,
    allowMissing = false,
  ): CheckedPath {
    if (
      typeof filename !== "string" ||
      !path.isAbsolute(filename) ||
      unsafePathText(filename)
    ) {
      throw new Error("ACP file paths must be absolute local paths.");
    }
    const target = path.normalize(filename);
    if (target === this.root || !within(this.root, target))
      throw new Error("ACP file is outside the session workspace.");
    const rootStat = fs.lstatSync(this.root);
    if (
      !rootStat.isDirectory() ||
      rootStat.isSymbolicLink() ||
      fs.realpathSync(this.root) !== this.root ||
      `${rootStat.dev}:${rootStat.ino}` !== this.rootIdentity
    ) {
      throw new Error(
        "The ACP workspace changed. Reconnect before accessing files.",
      );
    }
    const parts = path.relative(this.root, target).split(path.sep);
    if (
      parts.some(
        (part) =>
          credentialSegment.test(part) || credentialExtension.test(part),
      )
    ) {
      throw new Error(
        "ACP cannot access credential or version-control internals.",
      );
    }
    if (
      write &&
      parts.some((part) => controlSegment.test(part) || controlFile.test(part))
    ) {
      throw new Error(
        "ACP cannot edit agent, editor, hook, or approval configuration. Edit it directly in the editor.",
      );
    }
    let current = this.root;
    for (let index = 0; index < parts.length; index++) {
      current = path.join(current, parts[index]);
      let stat: fs.Stats;
      try {
        stat = fs.lstatSync(current);
      } catch (error) {
        if (
          (error as NodeJS.ErrnoException).code === "ENOENT" &&
          index === parts.length - 1 &&
          allowMissing
        )
          return { filename: target };
        throw new Error(
          "ACP file or parent directory is missing or inaccessible.",
        );
      }
      // Conservative by design: aliases, including broken links and directory
      // junctions, cannot move a reviewed write to a different target.
      if (stat.isSymbolicLink() || fs.realpathSync(current) !== current)
        throw new Error("ACP does not access symlink paths.");
      if (index < parts.length - 1) {
        if (!stat.isDirectory())
          throw new Error("ACP file parent is not a directory.");
      } else {
        if (!stat.isFile() || stat.nlink !== 1)
          throw new Error("ACP requires a regular file without hard links.");
        if (stat.size > ACP_FILE_LIMIT)
          throw new Error("ACP text files are limited to 2 MiB.");
        return { filename: target, fingerprint: fingerprint(stat) };
      }
    }
    throw new Error("ACP file path is invalid.");
  }

  private checkAccess(filename: string, write = false, allowMissing = false) {
    const checked = this.checkPath(filename, write, allowMissing);
    const visited = new Set<string>();
    const inspectIgnore = (file: string) => {
      if (visited.has(file)) return;
      if (visited.size >= 50)
        throw new Error(
          "ACP ignore-file configuration exceeds its safety limit.",
        );
      visited.add(file);
      const candidate = this.checkPath(file, false, true);
      if (!candidate.fingerprint) return;
      const content = fs.readFileSync(candidate.filename, "utf8");
      if (content.length > 100_000)
        throw new Error(
          "ACP ignore-file configuration exceeds its safety limit.",
        );
      for (const line of content.split(/\r?\n/)) {
        const include = /^!include\s+(.+)$/.exec(line.trim());
        if (include) inspectIgnore(path.resolve(this.root, include[1]));
      }
    };
    inspectIgnore(path.join(this.root, ".valorignore"));
    inspectIgnore(path.join(this.root, ".valorideignore"));
    if (
      !new PathAccess({ workspaceRoot: this.root }).validateAccess(
        checked.filename,
      )
    ) {
      throw new Error("ACP file access is excluded by the workspace policy.");
    }
    return checked;
  }

  private async openDocument(filename: string) {
    const known = vscode.workspace.textDocuments.find(
      (doc) =>
        doc.uri.scheme === "file" &&
        path.normalize(doc.uri.fsPath) === filename,
    );
    const document =
      known ||
      (await vscode.workspace.openTextDocument(vscode.Uri.file(filename)));
    if (
      document.uri.scheme !== "file" ||
      path.normalize(document.uri.fsPath) !== filename ||
      document.isClosed
    ) {
      throw new Error("ACP file did not open as the requested local document.");
    }
    return document;
  }

  async readTextFile(request: {
    path: string;
    line?: number | null;
    limit?: number | null;
  }): Promise<{ content: string }> {
    await this.hooks.assertActive();
    const line = request.line ?? 1;
    const limit = request.limit;
    if (
      !Number.isSafeInteger(line) ||
      line < 1 ||
      (limit != null && (!Number.isSafeInteger(limit) || limit < 0))
    ) {
      throw new Error(
        "ACP line must be a positive 1-based integer and limit a nonnegative integer.",
      );
    }
    const checked = this.checkAccess(request.path);
    const document = await this.openDocument(checked.filename);
    await this.hooks.assertActive();
    this.checkAccess(checked.filename);
    if (document.isClosed) throw new Error("The ACP document was closed.");
    const content = bounded(document.getText());
    const starts = [0];
    for (const match of content.matchAll(/\r\n|\r|\n/g))
      starts.push(match.index! + match[0].length);
    const start = starts[line - 1] ?? content.length;
    const end =
      limit == null
        ? content.length
        : (starts[line - 1 + limit] ?? content.length);
    return { content: content.slice(start, end) };
  }

  async writeTextFile(request: {
    path: string;
    content: string;
  }): Promise<Record<string, never>> {
    await this.hooks.assertActive();
    const proposedContent = bounded(request.content);
    const checked = this.checkAccess(request.path, true, true);
    if (this.writes.has(checked.filename))
      throw new Error("An ACP write for this file is already awaiting review.");
    this.writes.add(checked.filename);
    try {
      const document = checked.fingerprint
        ? await this.openDocument(checked.filename)
        : undefined;
      const currentContent = document ? bounded(document.getText()) : "";
      const version = document?.version;
      const isDirty = document?.isDirty ?? false;
      await this.hooks.assertActive();
      const approved = await this.hooks.confirmWrite({
        path: checked.filename,
        currentContent,
        proposedContent,
        isNewFile: !document,
        isDirty,
      });
      if (!approved) throw new Error("ACP file write was not approved.");
      await this.hooks.assertActive();
      // No awaits between these final guards and submitting the edit. VS Code
      // applies edits to its versioned text documents; a false result is failure.
      const current = this.checkAccess(checked.filename, true, true);
      if (
        current.fingerprint !== checked.fingerprint ||
        (document &&
          (document.isClosed ||
            document.version !== version ||
            document.isDirty !== isDirty ||
            document.getText() !== currentContent))
      ) {
        throw new Error(
          "The file changed during ACP review. Read and review it again.",
        );
      }
      const uri = vscode.Uri.file(checked.filename);
      const edit = new vscode.WorkspaceEdit();
      if (document) {
        edit.replace(
          uri,
          new vscode.Range(
            document.positionAt(0),
            document.positionAt(currentContent.length),
          ),
          proposedContent,
        );
      } else {
        if (
          vscode.workspace.textDocuments.some(
            (doc) =>
              doc.uri.scheme === "file" &&
              path.normalize(doc.uri.fsPath) === checked.filename,
          )
        ) {
          throw new Error(
            "The file was opened during ACP review. Read and review it again.",
          );
        }
        edit.createFile(uri, {
          overwrite: false,
          ignoreIfExists: false,
          contents: Buffer.from(proposedContent, "utf8"),
        });
      }
      if (!(await vscode.workspace.applyEdit(edit)))
        throw new Error(
          "VS Code rejected the reviewed ACP edit; no success was reported.",
        );
      try {
        await this.hooks.assertActive();
        this.checkAccess(checked.filename, true);
        const updated = document || (await this.openDocument(checked.filename));
        await this.hooks.assertActive();
        this.checkAccess(checked.filename, true);
        if (updated.isClosed || updated.getText() !== proposedContent) {
          throw new Error("The document changed again.");
        }
      } catch (error) {
        const reason =
          error instanceof Error
            ? error.message
            : "Session or file validation failed.";
        // Cancellation is not rollback. Never undo subsequent developer edits,
        // report success, or encourage a blind replay after this boundary.
        throw new Error(
          `The ACP edit was submitted, but final confirmation failed: ${reason} It may already be present; inspect the document before retrying.`,
        );
      }
      return {};
    } finally {
      this.writes.delete(checked.filename);
    }
  }
}
