const vscode = require("vscode"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  assert = require("node:assert/strict");
exports.run = async function () {
  await vscode.extensions
    .getExtension("valoride-tests.binding-fixture")
    .activate();
  const root = vscode.workspace.workspaceFolders[0].uri.fsPath,
    file = path.join(root, "src", "Page.tsx");
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
  const editor = await vscode.window.showTextDocument(doc);
  const atForm = () => {
    const pos = doc.positionAt(doc.getText().indexOf("<form") + 2);
    editor.selection = new vscode.Selection(pos, pos);
  };
  const cmd = () =>
    vscode.commands.executeCommand("valoride.workflows.bindAction", {
      workflow: {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Invite",
        backend: "https://api.example.test/v1",
      },
    });
  atForm();
  await cmd();
  assert.match(
    doc.getText(),
    /\.WorkflowFields/,
    "command should edit the actual TypeScript editor",
  );
  assert.match(
    doc.getText(),
    /name="recipient"/,
    "existing form should be preserved",
  );
  const action = path.join(
    root,
    "src",
    "valkyr-workflows",
    "22222222-2222-4222-8222-222222222222",
    "action.ts",
  );
  await vscode.workspace.saveAll(false);
  assert.match(
    await fs.readFile(action, "utf8"),
    /"workflowVersionId": "33333333/,
  );
  assert.match(
    await fs.readFile(path.join(path.dirname(action), "Form.tsx"), "utf8"),
    /export function WorkflowForm/,
  );
  const bound = doc.getText();
  atForm();
  await cmd();
  assert.equal(
    doc.getText(),
    bound,
    "rebinding should not duplicate handler or imports",
  );
  await fs.appendFile(action, "\n// developer override\n");
  atForm();
  await cmd();
  assert.match(
    await fs.readFile(action, "utf8"),
    /developer override/,
    "developer edits should never be overwritten",
  );
  console.log(
    "PASS native workflow assignment: editor, generated action/form, repeat bind, and preserved developer files.",
  );
};
