import { AutoApprovalSettings } from "@shared/AutoApprovalSettings";
import { ToolUseName } from "@core/assistant-message";
import * as path from "path";
import { PathAccess } from "@services/access/PathAccess";

export class AutoApprovalService {
  constructor(
    private autoApprovalSettings: AutoApprovalSettings,
    private cwd: string,
  ) {}

  /**
   * Check if the tool should be auto-approved based on the settings
   * Returns bool for most tools, and tuple for tools with nested settings
   */
  shouldAutoApproveTool(toolName: ToolUseName): boolean | [boolean, boolean] {
    if (this.autoApprovalSettings.enabled) {
      switch (toolName) {
        case "read_file":
        case "list_files":
        case "list_code_definition_names":
        case "search_files":
          return [
            this.autoApprovalSettings.actions.readFiles,
            this.autoApprovalSettings.actions.readFilesExternally ?? false,
          ];
        case "write_to_file":
        case "replace_in_file":
        case "precision_search_and_replace":
          return [
            this.autoApprovalSettings.actions.editFiles,
            this.autoApprovalSettings.actions.editFilesExternally ?? false,
          ];
        case "execute_command":
          return [
            this.autoApprovalSettings.actions.executeSafeCommands ?? false,
            this.autoApprovalSettings.actions.executeAllCommands ?? false,
          ];
        case "browser_action":
          return this.autoApprovalSettings.actions.useBrowser;
        case "access_mcp_resource":
        case "use_mcp_tool":
          return this.autoApprovalSettings.actions.useMcp;
        case "use_procedure":
          return this.autoApprovalSettings.actions.useProcedures ?? false;
      }
    }
    return false;
  }

  /**
   * Check if the tool should be auto-approved based on the settings
   * and the path of the action. Returns true if the tool should be auto-approved
   * based on the user's settings and the path of the action.
   */
  shouldAutoApproveToolWithPath(
    blockname: ToolUseName,
    autoApproveActionpath: string | undefined,
  ): boolean {
    return AutoApprovalService.canAutoApprovePath(
      this.cwd,
      autoApproveActionpath,
      this.shouldAutoApproveTool(blockname),
    );
  }

  /** Apply path restrictions after the caller's current permission decision. */
  static canAutoApprovePath(
    cwd: string,
    actionPath: string | undefined,
    approval: boolean | [boolean, boolean],
  ): boolean {
    if (!actionPath) return false;
    const [allowLocal, allowExternal] = Array.isArray(approval)
      ? approval
      : [approval, false];
    if (!allowLocal) return false;

    const workspaceRoot = path.resolve(cwd);
    const absolutePath = path.resolve(workspaceRoot, actionPath);
    const relativePath = path.relative(workspaceRoot, absolutePath);
    const isLocal =
      relativePath === "" ||
      (!path.isAbsolute(relativePath) &&
        relativePath !== ".." &&
        !relativePath.startsWith(`..${path.sep}`));
    if (!isLocal && !allowExternal) return false;

    // Re-read ignore rules for each decision so a changed rule revokes approval.
    // Explicit external flags remain a policy decision; dispatch still enforces
    // its independent workspace and delegated-authority restrictions.
    return new PathAccess({
      workspaceRoot,
      allowOutsideWorkspace: !isLocal && allowExternal,
    }).validateAccess(absolutePath);
  }
}
