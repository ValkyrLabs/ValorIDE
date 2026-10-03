import { setValkyraiHost } from "@thorapi/utils/valkyraiHost";
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
    setValkyraiHost("https://api-0.valkyrlabs.com/v1");
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
          credentialOrigin: "https://api-0.valkyrlabs.com",
          authenticatedPrincipal: JSON.stringify({ id: "principal-1" }),
        },
      }),
    );

    await expect(promise).resolves.toEqual({
      token: "jwt-token",
      credentialOrigin: "https://api-0.valkyrlabs.com",
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

  it("coalesces duplicate in-flight submits for the same username", async () => {
    const first = loginThroughExtensionHost({
      username: "super",
      password: "stale-password",
    });
    const second = loginThroughExtensionHost({
      username: " Super ",
      password: "stale-password",
    });

    expect(second).toBe(first);
    expect(vscode.postMessage).toHaveBeenCalledTimes(1);

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

    await expect(first).rejects.toThrow("access denied");
    await expect(second).rejects.toThrow("access denied");
  });
  it("rejects a delayed login response after selecting another origin", async () => {
    const promise = loginThroughExtensionHost({
      username: "fixture",
      password: "dummy",
    });
    const posted = vi.mocked(vscode.postMessage).mock.calls[0][0] as any;
    setValkyraiHost("https://other.invalid/v1");
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "accountLoginResult",
          requestId: posted.requestId,
          success: true,
          token: "SYNTHETIC-A",
          credentialOrigin: "https://api-0.valkyrlabs.com",
        },
      }),
    );
    await expect(promise).rejects.toThrow("backend changed");
  });
});
