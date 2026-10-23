// Test-only seed for a real isolated VS Code SecretStorage. The existing built
// extension, command registration, HTTP client and webview run without mocks.
exports.activate = async (context) => {
  const vscode = require("vscode");
  const base = process.env.VALORIDE_NATIVE_BASE_URL;
  const response = await fetch(`${base}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "super",
      password: process.env.VALKYR_ACCEPTANCE_PASSWORD,
    }),
  });
  const session = await response.json();
  if (!response.ok || !session.token)
    throw new Error(`Native acceptance login failed: HTTP ${response.status}`);
  await vscode.workspace
    .getConfiguration("valoride.valkyrai")
    .update("host", `${base}/v1`, vscode.ConfigurationTarget.Global);
  await context.secrets.store("jwtToken", session.token);
  await context.secrets.store(
    "authState",
    JSON.stringify({
      tokens: { jwtToken: session.token },
      user: session.authenticatedPrincipalObject || {},
      timestamp: Date.now(),
    }),
  );
  if (process.env.VALORIDE_NATIVE_ENGINEERING_WORKSPACE) {
    await context.globalState.update("apiProvider", "lmstudio");
    await context.globalState.update("lmStudioBaseUrl", process.env.VALORIDE_ACCEPTANCE_ENGINEERING_URL);
    await context.globalState.update("lmStudioModelId", process.env.VALORIDE_ACCEPTANCE_ENGINEERING_MODEL);
    await context.globalState.update("chatSettings", { mode: "act", llmSource: "local" });
    await context.globalState.update("autoApprovalSettings", {
      version: 1, enabled: true, maxRequests: 20, enableNotifications: false,
      actions: { readFiles: true, readFilesExternally: false, editFiles: false,
        editFilesExternally: false, executeSafeCommands: false, executeAllCommands: false,
        useBrowser: false, useMcp: false, useProcedures: false },
    });
  }
  const api = await require(process.env.VALORIDE_NATIVE_BUNDLE).activate(context);
  // Read-only acceptance introspection of actual persisted runtime state. Tasks,
  // command delivery, approvals, execution and outcomes still use product APIs.
  return { ...api, acceptanceSnapshot: () => ({
    instanceId: context.globalState.get("valorideSwarmInstanceId"),
    handoffs: context.globalState.get("valorideSwarmOutcomeHandoffs"),
    taskHistory: context.globalState.get("taskHistory"),
    globalStoragePath: context.globalStorageUri.fsPath,
  }) };
};
exports.deactivate = () =>
  require(process.env.VALORIDE_NATIVE_BUNDLE).deactivate();
