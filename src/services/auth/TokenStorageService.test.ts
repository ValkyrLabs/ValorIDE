import { TokenStorageService } from "./TokenStorageService";
import { Logger } from "../logging/Logger";

describe("TokenStorageService JWT recovery", () => {
  afterEach(() => {
    (TokenStorageService as any).instance = undefined;
  });

  it("recovers and repairs the JWT slot from canonical authState", async () => {
    Logger.initialize({ appendLine: jest.fn() } as any);
    const values = new Map<string, string>([
      [
        "authState",
        JSON.stringify({
          tokens: { jwtToken: "account-webview-jwt" },
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

    const service = TokenStorageService.getInstance(context);

    await expect(service.getJwtToken()).resolves.toBe("account-webview-jwt");
    expect(context.secrets.store).toHaveBeenCalledWith(
      "jwtToken",
      "account-webview-jwt",
    );
  });
});
