jest.mock("@core/controller/index", () => ({
  Controller: jest.fn().mockImplementation(() => ({
    dispose: jest.fn(),
    postMessageToWebview: jest.fn(),
    postStateToWebview: jest.fn(),
    clearTask: jest.fn(),
    handleWebviewMessage: jest.fn(),
  })),
}));

jest.mock("@services/usage-tracking/UsageTrackingService", () => ({
  UsageTrackingService: { getInstance: () => ({ setWebview: jest.fn(), dispose: jest.fn() }) },
}));

jest.mock("@services/P2P/TelecomHub", () => ({
  TelecomHub: { getInstance: () => ({ registerProvider: jest.fn() }) },
}));

jest.mock("./getUri", () => ({
  getUri: jest.fn(
    (_webview: any, _extUri: any, segments: string[]) =>
      `webview://${segments.join("/")}`,
  ),
}));

jest.mock("./getNonce", () => ({
  getNonce: () => "test-nonce",
}));

import * as vscodeApi from "vscode";
import { WebviewProvider } from "./index";

describe("WebviewProvider CSP", () => {
  const originalGetConfiguration = vscodeApi.workspace.getConfiguration;

  afterEach(() => {
    (vscodeApi.workspace as any).getConfiguration = originalGetConfiguration;
    jest.clearAllMocks();
  });

  test("includes the webview origin in connect-src so source maps can load", () => {
    (vscodeApi.workspace as any).getConfiguration = jest
      .fn()
      .mockImplementation((section: string) => ({
        get: (key: string, defaultValue?: any) => {
          if (section === "valoride.valkyrai" && key === "host") {
            return "https://api-0.valkyrlabs.com";
          }
          if (section === "valoride" && key === "P2P.turnServers") {
            return [];
          }
          if (section === "valoride" && key === "P2P.discovery.bonjour") {
            return false;
          }
          if (section === "valoride" && key === "P2P.p2pEnabled") {
            return true;
          }
          return defaultValue;
        },
      }));

    const provider = Object.create(WebviewProvider.prototype) as any;
    provider.context = {
      extensionUri: "fake-extension-uri",
    };

    const webview = {
      cspSource: "vscode-resource://test-webview",
    };

    const html = provider["getHtmlContent"](webview as any);

    expect(html).toContain(`connect-src ${webview.cspSource}`);
  });
});
