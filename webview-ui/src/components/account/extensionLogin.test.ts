import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginThroughExtensionHost } from "./extensionLogin";
import { vscode } from "@thorapi/utils/vscode";

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

describe("loginThroughExtensionHost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts a login request and resolves the matching extension response", async () => {
    const promise = loginThroughExtensionHost({
      username: "super",
      password: "secret",
    });

    const posted = vi.mocked(vscode.postMessage).mock.calls[0]?.[0] as any;
    expect(posted).toMatchObject({
      type: "accountLoginRequest",
      username: "super",
      password: "secret",
    });
    expect(posted.requestId).toEqual(expect.any(String));

    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "accountLoginResult",
          requestId: posted.requestId,
          success: true,
          token: "jwt-token",
          authenticatedPrincipal: JSON.stringify({ id: "principal-1" }),
        },
      }),
    );

    await expect(promise).resolves.toEqual({
      token: "jwt-token",
      user: { id: "principal-1" },
    });
  });

  it("rejects a failed extension response", async () => {
    const promise = loginThroughExtensionHost({
      username: "super",
      password: "wrong",
    });
    const posted = vi.mocked(vscode.postMessage).mock.calls[0]?.[0] as any;

    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "accountLoginResult",
          requestId: posted.requestId,
          success: false,
          error: "access denied",
        },
      }),
    );

    await expect(promise).rejects.toThrow("access denied");
  });
});
