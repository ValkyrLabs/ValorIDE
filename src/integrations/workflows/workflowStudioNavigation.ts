import * as vscode from "vscode";
import {
  assertWorkflowStudioBackend,
  parseWorkflowStudioTarget,
} from "../../shared/WorkflowStudioTarget";
import { getValkyraiBasePath } from "../../utils/serverValkyraiHost";

/** Reuse the existing authenticated Studio command; never navigate to a caller URL. */
export async function openWorkflowStudioTarget(value: unknown): Promise<void> {
  const target = parseWorkflowStudioTarget(value);
  if (!target)
    throw new Error(
      "This workflow reference is unavailable. Check the procedure's progress again.",
    );
  assertWorkflowStudioBackend(target.backend, getValkyraiBasePath());
  await vscode.commands.executeCommand("valoride.workflows.openStudio", {
    id: target.workflowId,
    backend: target.backend,
  });
}
