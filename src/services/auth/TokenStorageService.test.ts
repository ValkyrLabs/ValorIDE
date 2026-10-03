import { createHash } from "node:crypto";
import {
  clearCredentialOrigins,
  registerCredentialOrigin,
} from "@shared/CredentialOrigin";
import { writeBoundCredential } from "./OriginBoundCredentials";
const origin = "https://api-0.valkyrlabs.com";
import {
  TokenStorageService,
  validateAuthSession,
} from "./TokenStorageService";
import { Logger } from "../logging/Logger";
import { ValkyrLabsApiError } from "../valkyrai/ValkyrLabsRtkApi";

const createContext = () => {
  const values = new Map<string, string>();
  const globalValues = new Map<string, unknown>();
  const context = {
    secrets: {
      get: jest.fn(async (key: string) => values.get(key)),
      store: jest.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
      delete: jest.fn(async (key: string) => {
        values.delete(key);
      }),
    },
    globalState: {
      get: jest.fn((key: string) => globalValues.get(key)),
      update: jest.fn(async (key: string, value: unknown) => {
        globalValues.set(key, value);
      }),
    },
  } as any;
  return { context, globalValues, values };
};

describe("TokenStorageService JWT recovery", () => {
  afterEach(() => {
    clearCredentialOrigins();
    jest.restoreAllMocks();
    (TokenStorageService as any).instance = undefined;
  });

  it("recovers and repairs the JWT slot from canonical authState", async () => {
    Logger.initialize({ appendLine: jest.fn() } as any);
    const values = new Map<string, string>([
      [
        "authState",
        JSON.stringify({
          tokens: { jwtToken: "account-webview-jwt", issuanceOrigin: origin },
          user: { id: "principal-1" },
          timestamp: Date.now(),
        }),
      ],
    ]);
    const context = {
      secrets: {
        get: jest.fn(async (key: string) => values.get(key)),
        store: jest.fn(async (key: string, value: string) => {
          values.set(key, value);
        }),
        delete: jest.fn(),
      },
      globalState: { update: jest.fn() },
    } as any;

    values.set(
      "credentialOrigin:jwtToken",
      JSON.stringify({
        version: 1,
        origin,
        sha256: createHash("sha256")
          .update("account-webview-jwt")
          .digest("hex"),
      }),
    );
    const service = TokenStorageService.getInstance(context);

    await expect(service.getJwtToken()).resolves.toBe("account-webview-jwt");
    expect(context.secrets.store).toHaveBeenCalledWith(
      "jwtToken",
      "account-webview-jwt",
    );
  });

  it("validates persisted JWTs through the canonical auth/me session probe", async () => {
    Logger.initialize({ appendLine: jest.fn() } as any);
    const request = jest.fn(async () => ({
      data: {
        authenticated: true,
        authenticatedPrincipalObject: {
          id: "principal-1",
          username: "super",
        },
      },
      headers: {},
      status: 200,
      statusText: "OK",
    }));
    registerCredentialOrigin("stored-jwt", origin);
    await expect(
      validateAuthSession(
        { request } as any,
        "https://api-0.valkyrlabs.com/v1",
        { jwtToken: "stored-jwt", issuanceOrigin: origin },
      ),
    ).resolves.toEqual({
      definitive: true,
      user: { id: "principal-1", username: "super" },
      valid: true,
    });
    expect(request).toHaveBeenCalledWith({
      headers: {
        Authorization: "Bearer stored-jwt",
        jwtSession: "stored-jwt",
      },
      url: expect.stringMatching(/\/auth\/me$/),
    });
  });

  it("only treats explicit authentication denials as definitive invalidation", async () => {
    Logger.initialize({ appendLine: jest.fn() } as any);
    const request = jest
      .fn()
      .mockRejectedValueOnce(new ValkyrLabsApiError("Unauthorized", 401))
      .mockRejectedValueOnce(new ValkyrLabsApiError("Unavailable", 503));

    registerCredentialOrigin("expired-jwt", origin);
    registerCredentialOrigin("retryable-jwt", origin);
    await expect(
      validateAuthSession(
        { request } as any,
        "https://api-0.valkyrlabs.com/v1",
        { jwtToken: "expired-jwt", issuanceOrigin: origin },
      ),
    ).resolves.toMatchObject({ definitive: true, valid: false });
    await expect(
      validateAuthSession(
        { request } as any,
        "https://api-0.valkyrlabs.com/v1",
        { jwtToken: "retryable-jwt", issuanceOrigin: origin },
      ),
    ).resolves.toMatchObject({ definitive: false, valid: false });
  });

  it("migrates a bound standalone JWT into canonical authState", async () => {
    Logger.initialize({ appendLine: jest.fn() } as any);
    const { context, globalValues, values } = createContext();
    await writeBoundCredential(context, "jwtToken", "legacy-jwt", origin);
    globalValues.set("authenticatedPrincipal", {
      id: "principal-legacy",
      username: "legacy",
    });

    await expect(
      TokenStorageService.getInstance(context).getStoredAuthTokens(),
    ).resolves.toMatchObject({
      tokens: { jwtToken: "legacy-jwt" },
      user: { id: "principal-legacy", username: "legacy" },
    });
    expect(JSON.parse(values.get("authState") || "{}")).toMatchObject({
      tokens: { jwtToken: "legacy-jwt" },
    });
  });

  it("finishes logout after an interrupted sign-in write without restoring the session", async () => {
    Logger.initialize({ appendLine: jest.fn() } as any);
    const { context, values } = createContext();
    let continueWrite!: () => void;
    let writeStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      writeStarted = resolve;
    });
    const interrupted = new Promise<void>((resolve) => {
      continueWrite = resolve;
    });
    context.secrets.store.mockImplementation(
      async (key: string, value: string) => {
        if (key === "credentialOrigin:jwtToken") {
          writeStarted();
          await interrupted;
        }
        values.set(key, value);
      },
    );
    const service = TokenStorageService.getInstance(context);
    const signingIn = service.storeAuthTokens({
      jwtToken: "synthetic-interrupted-sign-in",
      issuanceOrigin: origin,
    });
    const rejectedSignIn = expect(signingIn).rejects.toThrow(
      /changed during sign-in/,
    );
    await started;
    const loggingOut = service.clearStoredTokens();
    continueWrite();
    await rejectedSignIn;
    await loggingOut;
    expect(values.size).toBe(0);
    await expect(service.getJwtToken()).resolves.toBeUndefined();
    await expect(service.getStoredAuthTokens()).resolves.toBeNull();
  });
});
