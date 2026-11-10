const vscode = require("vscode");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");

exports.run = async () => {
  const { AcpFileSystem } = await vscode.extensions
    .getExtension("valoride-tests.acp-filesystem-fixture")
    .activate();
  const root = await fs.realpath(
    vscode.workspace.workspaceFolders[0].uri.fsPath,
  );
  const target = path.join(root, "main.ts");
  const document = await vscode.workspace.openTextDocument(
    vscode.Uri.file(target),
  );
  await vscode.window.showTextDocument(document);
  const replace = async (text) => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length),
      ),
      text,
    );
    assert(await vscode.workspace.applyEdit(edit));
  };
  let active = true;
  let review = async () => true;
  const proposals = [];
  const files = new AcpFileSystem(root, {
    assertActive: () => {
      if (!active || !vscode.workspace.isTrusted)
        throw new Error("ACP fixture session cancelled");
    },
    confirmWrite: async (proposal) => {
      proposals.push(proposal);
      return review(proposal);
    },
  });

  await replace("unsaved user baseline\nsecond line\n");
  assert(document.isDirty, "fixture must contain a real unsaved editor change");
  assert.deepEqual(
    await files.readTextFile({ path: target, line: 2, limit: 1 }),
    { content: "second line\n" },
  );
  assert.equal(await fs.readFile(target, "utf8"), "disk baseline\n");

  assert.deepEqual(
    await files.writeTextFile({ path: target, content: "reviewed change\n" }),
    {},
  );
  assert.equal(document.getText(), "reviewed change\n");
  assert(document.isDirty, "ACP must not silently save developer buffers");
  assert.equal(await fs.readFile(target, "utf8"), "disk baseline\n");
  assert.equal(
    proposals[0].currentContent,
    "unsaved user baseline\nsecond line\n",
  );
  assert.equal(proposals[0].isDirty, true);

  const created = path.join(root, "created.ts");
  assert.deepEqual(
    await files.writeTextFile({ path: created, content: "created content\n" }),
    {},
  );
  assert.equal(
    await fs.readFile(created, "utf8"),
    "created content\n",
    "WorkspaceEdit must actually populate the new file",
  );

  const outside = path.join(path.dirname(root), "outside.txt");
  await fs.writeFile(outside, "outside fixture");
  await fs.symlink(outside, path.join(root, "escape"));
  await assert.rejects(files.readTextFile({ path: outside }), /outside/);
  await assert.rejects(
    files.writeTextFile({ path: path.join(root, "escape"), content: "never" }),
    /symlink/,
  );
  assert.equal(await fs.readFile(outside, "utf8"), "outside fixture");

  review = async () => {
    await replace("developer changed this during review\n");
    return true;
  };
  await assert.rejects(
    files.writeTextFile({ path: target, content: "stale proposal" }),
    /changed during/,
  );
  assert.equal(document.getText(), "developer changed this during review\n");

  review = async () => {
    active = false;
    return true;
  };
  await assert.rejects(
    files.writeTextFile({ path: target, content: "cancelled proposal" }),
    /cancelled/,
  );
  assert.equal(document.getText(), "developer changed this during review\n");

  active = true;
  review = async () => true;
  const changed = vscode.workspace.onDidChangeTextDocument((event) => {
    if (
      event.document === document &&
      document.getText() === "submitted before cancellation\n"
    )
      active = false;
  });
  try {
    await assert.rejects(
      files.writeTextFile({
        path: target,
        content: "submitted before cancellation\n",
      }),
      /may already be present/,
    );
    assert.equal(
      document.getText(),
      "submitted before cancellation\n",
      "cancellation must not claim rollback or undo developer state",
    );
    assert.equal(await fs.readFile(target, "utf8"), "disk baseline\n");
  } finally {
    changed.dispose();
  }

  console.log(
    "PASS native ACP filesystem: unsaved read/write, real create, workspace confinement, review race, cancellation before and after apply; no silent save or false rollback.",
  );
};
