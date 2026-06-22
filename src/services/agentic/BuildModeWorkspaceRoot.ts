export interface BuildModeWorkspaceRootRequest {
  activeWorkspaceRoot?: string;
  requestWorkspaceRoot?: string;
  scopeWorkspaceRoot?: string;
}

export const resolveBuildModeExecutionWorkspaceRoot = ({
  activeWorkspaceRoot,
  requestWorkspaceRoot,
  scopeWorkspaceRoot,
}: BuildModeWorkspaceRootRequest): string | undefined =>
  requestWorkspaceRoot ?? activeWorkspaceRoot ?? scopeWorkspaceRoot;
