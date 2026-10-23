import { StartupAuthService } from "./StartupAuthService";
import { TokenStorageService } from "./TokenStorageService";
import { Logger } from "../logging/Logger";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

describe("StartupAuthService authentication ordering", () => {
  afterEach(() => {
    (StartupAuthService as any).instance = undefined;
    (TokenStorageService as any).instance = undefined;
    jest.restoreAllMocks();
  });

  it("does not let delayed startup validation erase a newer login", async () => {
    Logger.initialize({ appendLine: jest.fn() } as any);
    const secretValues = new Map<string, string>();
    const globalValues = new Map<string, unknown>();
    const context = {
      secrets: {
        delete: jest.fn(async (key: string) => secretValues.delete(key)),
        get: jest.fn(async (key: string) => secretValues.get(key)),
        store: jest.fn(async (key: string, value: string) => {
          secretValues.set(key, value);
        }),
      },
      globalState: {
        get: jest.fn((key: string) => globalValues.get(key)),
        update: jest.fn(async (key: string, value: unknown) => {
          globalValues.set(key, value);
        }),
      },
    } as any;
    const validation = deferred<{
      definitive: boolean;
      valid: boolean;
    }>();
    const tokenStorage = TokenStorageService.getInstance(context);
    jest
      .spyOn(tokenStorage, "isAuthPersistenceEnabled")
      .mockResolvedValue(true);
    jest.spyOn(tokenStorage, "getStoredAuthTokens").mockResolvedValue({
      timestamp: Date.now(),
      tokens: { jwtToken: "old-jwt" },
      user: { id: "principal-old" },
    });
    jest
      .spyOn(tokenStorage, "validateTokens")
      .mockReturnValue(validation.promise);
    const clearStoredTokens = jest
      .spyOn(tokenStorage, "clearStoredTokens")
      .mockResolvedValue();
    jest
      .spyOn(tokenStorage, "storeAuthTokens")
      .mockImplementation(async (tokens, user) => {
        secretValues.set("jwtToken", tokens.jwtToken);
        secretValues.set(
          "authState",
          JSON.stringify({ timestamp: Date.now(), tokens, user }),
        );
      });

    const service = StartupAuthService.getInstance(context);
    const restoration = service.restoreAuthentication();
    await Promise.resolve();
    await service.handleSuccessfulLogin(
      { jwtToken: "new-jwt" },
      { id: "principal-new" },
    );
    validation.resolve({ definitive: true, valid: false });

    await expect(restoration).resolves.toEqual({
      error: "Superseded by newer login",
      success: false,
    });
    expect(clearStoredTokens).not.toHaveBeenCalled();
    expect(secretValues.get("jwtToken")).toBe("new-jwt");
    expect(globalValues.get("isLoggedIn")).toBe(true);
    expect(globalValues.get("authenticatedPrincipal")).toEqual({
      id: "principal-new",
    });
  });

  it("preserves stored authentication when the validation service is unavailable", async () => {
    Logger.initialize({ appendLine: jest.fn() } as any);
    const context = {
      secrets: { delete: jest.fn(), get: jest.fn(), store: jest.fn() },
      globalState: { get: jest.fn(), update: jest.fn() },
    } as any;
    const tokenStorage = TokenStorageService.getInstance(context);
    jest
      .spyOn(tokenStorage, "isAuthPersistenceEnabled")
      .mockResolvedValue(true);
    jest.spyOn(tokenStorage, "getStoredAuthTokens").mockResolvedValue({
      timestamp: Date.now(),
      tokens: { jwtToken: "stored-jwt" },
      user: { id: "principal-1" },
    });
    jest.spyOn(tokenStorage, "validateTokens").mockResolvedValue({
      definitive: false,
      error: "Service unavailable",
      valid: false,
    });
    const clearStoredTokens = jest
      .spyOn(tokenStorage, "clearStoredTokens")
      .mockResolvedValue();

    await expect(
      StartupAuthService.getInstance(context).restoreAuthentication(),
    ).resolves.toEqual({ error: "Service unavailable", success: false });
    expect(clearStoredTokens).not.toHaveBeenCalled();
  });
});
