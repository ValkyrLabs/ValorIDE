import * as vscode from "vscode";
import { applyLegacyProjectMigration, planLegacyProjectMigration, undoLegacyProjectMigration } from "../services/legacyProjectMigration";

export async function previewLegacyProjectMigration(source?: vscode.Uri): Promise<void> {
  try {
    source ||= (await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, title: "Choose the legacy generated project to preview", openLabel: "Preview migration" }))?.[0];
    if (!source) return;
    const plan = await planLegacyProjectMigration(source.fsPath);
    const document = await vscode.workspace.openTextDocument({ language: "json", content: JSON.stringify(plan, null, 2) + "\n" });
    await vscode.window.showTextDocument(document, { preview: false });
    const approval = await vscode.window.showInformationMessage(`Review the plan. Create a copy at ${plan.destination}? The original stays in ${plan.source}. Caches and private files stay in the original.`, { modal: true }, "Create canonical copy");
    if (approval !== "Create canonical copy") return;
    if (document.getText() !== JSON.stringify(plan, null, 2) + "\n") throw new Error("The preview was edited. Run Preview Legacy Project Migration again to review a fresh plan.");
    const receipt = await applyLegacyProjectMigration(plan);
    await vscode.commands.executeCommand("valoride.projects.refresh");
    const action = await vscode.window.showInformationMessage(`Created ${plan.destination}. Legacy source files remain protected during regeneration.`, "Open copy", "Undo copy");
    if (action === "Open copy") await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(plan.destination), true);
    if (action === "Undo copy") {
      const recovery = await undoLegacyProjectMigration(receipt);
      await vscode.commands.executeCommand("valoride.projects.refresh");
      void vscode.window.showInformationMessage(`Migration undone. The copy is retained for recovery at ${recovery}.`);
    }
  } catch (error) {
    void vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}
