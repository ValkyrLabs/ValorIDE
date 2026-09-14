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
  return require(process.env.VALORIDE_NATIVE_BUNDLE).activate(context);
};
exports.deactivate = () =>
  require(process.env.VALORIDE_NATIVE_BUNDLE).deactivate();
