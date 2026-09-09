import * as vscode from "vscode";
import { getTheme } from "@integrations/theme/getTheme";
import { getNonce } from "@core/webview/getNonce";
import { getUri } from "@core/webview/getUri";
import { getSecret } from "@core/storage/state";
import { downloadApplicationArtifact } from "@services/applicationArtifactDownload";
import {
  getValkyrLabsRtkApiClient,
  ValkyrLabsApiError,
} from "@services/valkyrai/ValkyrLabsRtkApi";
import { openUrlWithSimpleBrowser } from "@utils/openUrl";
import {
  getValkyraiBasePath,
  normalizeValkyraiHost,
} from "@utils/serverValkyraiHost";

const FALLBACK_VALKYRAI_BASE =
  (process.env.VITE_basePath && process.env.VITE_basePath.trim()) ||
  "https://api-0.valkyrlabs.com/v1";

const resolveValkyraiBasePath = () => {
  const configured = vscode.workspace
    .getConfiguration("valoride.valkyrai")
    .get<string>("host");
  return (
    normalizeValkyraiHost(configured) ||
    getValkyraiBasePath() ||
    normalizeValkyraiHost(FALLBACK_VALKYRAI_BASE)
  );
};

const deriveValkyraiOrigins = (basePath: string) => {
  try {
    const parsed = new URL(basePath);
    const httpOrigin = `${parsed.protocol}//${parsed.host}`;
    const wsOrigin = `${parsed.protocol === "https:" ? "wss" : "ws"}://${parsed.host}`;
    return { httpOrigin, wsOrigin };
  } catch {
    return { httpOrigin: basePath.replace(/\/v1$/, ""), wsOrigin: undefined };
  }
};

export class OpenAPIEditorPanel {
  static readonly viewType = "valoride.openapi.editor";
  private static currentPanel: vscode.WebviewPanel | undefined;
  private static currentApplicationId: string | undefined;

  static open(
    context: vscode.ExtensionContext,
    options: OpenAPIEditorOptions = {},
  ): void {
    if (
      OpenAPIEditorPanel.currentPanel &&
      OpenAPIEditorPanel.currentApplicationId === options.applicationId
    ) {
      OpenAPIEditorPanel.currentPanel.reveal(vscode.ViewColumn.Active);
      return;
    }
    OpenAPIEditorPanel.currentPanel?.dispose();

    const panel = vscode.window.createWebviewPanel(
      OpenAPIEditorPanel.viewType,
      options.applicationName
        ? `Blueprint - ${options.applicationName}`
        : "Blueprint",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri],
      },
    );

    OpenAPIEditorPanel.currentPanel = panel;
    OpenAPIEditorPanel.currentApplicationId = options.applicationId;
    panel.webview.html = renderOpenAPIEditorPanel(
      context,
      panel.webview,
      options,
    );

    panel.webview.onDidReceiveMessage(async (message) => {
      if (message?.type === "requestTheme") {
        await panel.webview.postMessage({
          type: "theme",
          text: JSON.stringify(getTheme()),
        });
        return;
      }
      if (message?.type === "blueprintLoad") {
        await handleBlueprintLoad(context, panel, options);
        return;
      }
      if (message?.type === "blueprintSave") {
        await handleBlueprintSave(context, panel, options, message);
        return;
      }
      if (message?.type === "blueprintOpenDeployment") {
        if (!options.deploymentUrl) {
          await panel.webview.postMessage({
            type: "blueprintError",
            error: "This Application does not have a deployment route.",
          });
          return;
        }
        await openUrlWithSimpleBrowser(
          options.deploymentUrl,
          `${options.applicationName || "Application"} deployment`,
        );
        return;
      }
      if (message?.type === "webviewError") {
        console.error("OpenAPI editor webview error:", message);
      }
    });

    panel.onDidDispose(() => {
      OpenAPIEditorPanel.currentPanel = undefined;
      OpenAPIEditorPanel.currentApplicationId = undefined;
    });
  }
}

export interface OpenAPIEditorOptions {
  applicationId?: string;
  applicationName?: string;
  deploymentUrl?: string;
}

interface BlueprintDocument {
  applicationId: string;
  applicationName?: string;
  specId: string;
  filename: string;
  etag: string;
  specification: Record<string, unknown>;
  lastModifiedDate?: string;
}

const blueprintEndpoint = (applicationId: string) =>
  `${getValkyraiBasePath()}/thorapi/applications/${encodeURIComponent(applicationId)}/openapi`;

const requireJwt = async (context: vscode.ExtensionContext) => {
  const jwtToken = await getSecret(context, "jwtToken");
  if (!jwtToken) {
    throw new Error(
      "Sign in to ValorIDE before opening an Application Blueprint.",
    );
  }
  return jwtToken;
};

const authHeaders = (jwtToken: string) => ({
  Authorization: `Bearer ${jwtToken}`,
  jwtSession: jwtToken,
});

const errorMessage = (error: unknown): string => {
  if (error instanceof ValkyrLabsApiError) {
    const body = error.data as
      | { message?: string; error?: string }
      | string
      | undefined;
    if (typeof body === "string" && body.trim()) return body;
    if (body && typeof body !== "string") {
      return body.message || body.error || error.message;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
};

const handleBlueprintLoad = async (
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  options: OpenAPIEditorOptions,
) => {
  if (!options.applicationId) {
    await panel.webview.postMessage({
      type: "blueprintError",
      error:
        "Open Blueprint from a ValkyrAI Application to load its canonical spec.",
    });
    return;
  }
  try {
    const jwtToken = await requireJwt(context);
    const response =
      await getValkyrLabsRtkApiClient().request<BlueprintDocument>({
        url: blueprintEndpoint(options.applicationId),
        headers: authHeaders(jwtToken),
      });
    await panel.webview.postMessage({
      type: "blueprintLoaded",
      document: response.data,
    });
  } catch (error) {
    await panel.webview.postMessage({
      type: "blueprintError",
      error: errorMessage(error),
    });
  }
};

const handleBlueprintSave = async (
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  options: OpenAPIEditorOptions,
  message: {
    specification?: Record<string, unknown>;
    filename?: string;
    expectedEtag?: string;
    regenerate?: boolean;
  },
) => {
  if (!options.applicationId || !message.specification) {
    await panel.webview.postMessage({
      type: "blueprintError",
      error: "Application id and OpenAPI specification are required.",
    });
    return;
  }
  try {
    const jwtToken = await requireJwt(context);
    const response =
      await getValkyrLabsRtkApiClient().request<BlueprintDocument>({
        url: blueprintEndpoint(options.applicationId),
        method: "PUT",
        json: {
          specification: message.specification,
          filename: message.filename,
          expectedEtag: message.expectedEtag,
        },
        headers: authHeaders(jwtToken),
      });
    await panel.webview.postMessage({
      type: "blueprintSaved",
      document: response.data,
      regenerating: Boolean(message.regenerate),
    });

    if (message.regenerate) {
      const artifact = await downloadApplicationArtifact({
        applicationId: options.applicationId,
        applicationName: options.applicationName,
        jwtToken,
        assertCurrent: async () => {
          if ((await requireJwt(context)) !== jwtToken) {
            throw new Error(
              "Your session changed during generation. Sign in and retry from the Blueprint editor.",
            );
          }
        },
        onProgress: async (status) => {
          await panel.webview.postMessage({
            type: "blueprintProgress",
            status,
          });
        },
      });
      await panel.webview.postMessage({
        type: "blueprintGenerated",
        artifact,
      });
    }
  } catch (error) {
    await panel.webview.postMessage({
      type: "blueprintError",
      error: errorMessage(error),
    });
  }
};

const renderOpenAPIEditorPanel = (
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  options: OpenAPIEditorOptions,
): string => {
  const stylesUri = getUri(webview, context.extensionUri, [
    "dist",
    "webview",
    "assets",
    "index.css",
  ]);
  const scriptUri = getUri(webview, context.extensionUri, [
    "dist",
    "webview",
    "assets",
    "index.js",
  ]);
  const nonce = getNonce();
  const valkyraiBasePath = resolveValkyraiBasePath();
  const { httpOrigin: valkyraiOrigin, wsOrigin: valkyraiWsOrigin } =
    deriveValkyraiOrigins(valkyraiBasePath);
  const connectSrcEntries = new Set<string>([
    webview.cspSource,
    valkyraiOrigin || "http://localhost:8080",
    "https://*.valkyrlabs.com",
    "wss://*.valkyrlabs.com",
    "ws://localhost:*",
    "https://*.posthog.com",
    "https://*.googleapis.com",
  ]);
  if (valkyraiWsOrigin) {
    connectSrcEntries.add(valkyraiWsOrigin);
  }
  const connectSrc = Array.from(connectSrcEntries).filter(Boolean).join(" ");

  return /* html */ `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
    <link rel="stylesheet" type="text/css" href="${stylesUri}">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src ${connectSrc}; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:; script-src ${webview.cspSource} 'nonce-${nonce}' 'unsafe-eval' 'wasm-unsafe-eval';">
    <title>OpenAPI Editor</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}">
      try {
        window.__valorideWebviewMode = "openapi-editor";
        window.__valorideValkyraiBasePath = ${JSON.stringify(valkyraiBasePath)};
        window.__valorideBlueprint = ${JSON.stringify(options)};
      } catch {}
    </script>
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
};
