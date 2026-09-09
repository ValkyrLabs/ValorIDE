import * as vscode from "vscode";
import { it } from "@jest/globals";
import { OpenAPIEditorPanel } from "./OpenAPIEditorPanel";
import { getSecret } from "@core/storage/state";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { getValkyrLabsRtkApiClient } from "@services/valkyrai/ValkyrLabsRtkApi";
import { downloadApplicationArtifact } from "@services/applicationArtifactDownload";

jest.mock("vscode", () => ({
  ...jest.requireActual("vscode"),
  ViewColumn: { Active: -1 },
  window: {
    ...jest.requireActual("vscode").window,
    createWebviewPanel: jest.fn(),
  },
}));
jest.mock("@core/storage/state", () => ({ getSecret: jest.fn() }));
jest.mock("@core/webview/getNonce", () => ({ getNonce: () => "fixture" }));
jest.mock("@core/webview/getUri", () => ({ getUri: () => "fixture-asset" }));
jest.mock("@integrations/theme/getTheme", () => ({ getTheme: jest.fn() }));
jest.mock("@utils/openUrl", () => ({ openUrlWithSimpleBrowser: jest.fn() }));
jest.mock("@utils/serverValkyraiHost", () => ({
  getValkyraiBasePath: jest.fn(),
  normalizeValkyraiHost: (value: unknown) => value,
}));
jest.mock("@services/applicationArtifactDownload", () => ({
  downloadApplicationArtifact: jest.fn(),
}));
jest.mock("@services/valkyrai/ValkyrLabsRtkApi", () => ({
  getValkyrLabsRtkApiClient: jest.fn(),
  ValkyrLabsApiError: class extends Error {},
}));

const applicationId = "11111111-1111-4111-8111-111111111111";
const backend = "https://original.example/v1";
const context = { extensionUri: {} } as vscode.ExtensionContext;
let receive: (message: unknown) => Promise<void>;
let dispose: () => void;
let post: jest.Mock;
let transport: jest.Mock;
let panel: any;
const save = {
  type: "blueprintSave",
  specification: { openapi: "3.0.3" },
  expectedEtag: "original",
  regenerate: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  (getValkyraiBasePath as jest.Mock).mockReturnValue(backend);
  (getSecret as jest.Mock).mockResolvedValue("original-session");
  transport = jest.fn().mockResolvedValue({
    data: { specification: { private: "original specification" } },
  });
  (getValkyrLabsRtkApiClient as jest.Mock).mockReturnValue({
    request: transport,
  });
  (downloadApplicationArtifact as jest.Mock).mockResolvedValue({
    extractedPath: "/fixture/project",
    filename: "project.zip",
  });
  post = jest.fn().mockResolvedValue(true);
  panel = {
    webview: {
      cspSource: "fixture-source",
      postMessage: post,
      onDidReceiveMessage: (handler: typeof receive) => {
        receive = handler;
      },
    },
    onDidDispose: (handler: () => void) => {
      dispose = handler;
    },
    dispose: () => dispose(),
    reveal: jest.fn(),
  };
  (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(panel);
  OpenAPIEditorPanel.open(context, { applicationId });
});
afterEach(() => panel.dispose());

it("loads, saves and regenerates the same Application on its original backend", async () => {
  await receive({ type: "blueprintLoad" });
  await receive(save);
  expect(transport).toHaveBeenCalledTimes(2);
  expect(transport.mock.calls[1][0]).toMatchObject({
    url: `${backend}/thorapi/applications/${applicationId}/openapi`,
    method: "PUT",
    headers: { Authorization: "Bearer original-session" },
    json: { expectedEtag: "original" },
  });
  expect(post).toHaveBeenCalledWith(
    expect.objectContaining({ type: "blueprintGenerated" }),
  );
});

it.each([{ type: "blueprintLoad" }, save])(
  "rejects an existing editor after the configured backend changes: %j",
  async (message) => {
    (getValkyraiBasePath as jest.Mock).mockReturnValue(
      "https://other.example/v1",
    );
    await receive(message);
    expect(transport).not.toHaveBeenCalled();
    expect(downloadApplicationArtifact).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "blueprintError",
        error: expect.stringMatching(/backend changed/i),
      }),
    );
  },
);

it("rejects a backend change during secure credential lookup before saving", async () => {
  (getSecret as jest.Mock).mockImplementation(async () => {
    (getValkyraiBasePath as jest.Mock).mockReturnValue(
      "https://other.example/v1",
    );
    return "original-session";
  });
  await receive(save);
  expect(transport).not.toHaveBeenCalled();
});

it.each(["backend", "session"])(
  "does not reveal an old specification after the %s changes during its read",
  async (change) => {
    transport.mockImplementation(async () => {
      if (change === "backend")
        (getValkyraiBasePath as jest.Mock).mockReturnValue(
          "https://other.example/v1",
        );
      else (getSecret as jest.Mock).mockResolvedValue("replacement-session");
      return { data: { specification: { private: "original specification" } } };
    });
    await receive({ type: "blueprintLoad" });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(post).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "blueprintLoaded" }),
    );
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({ type: "blueprintError" }),
    );
  },
);
