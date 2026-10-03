import { ValoridePasswordLoginService } from "./ValoridePasswordLoginService";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { getValkyrLabsRtkApiClient } from "../valkyrai/ValkyrLabsRtkApi";

jest.mock("@utils/serverValkyraiHost", () => ({
  getValkyraiBasePath: jest.fn(),
}));
jest.mock("../valkyrai/ValkyrLabsRtkApi", () => ({
  getValkyrLabsRtkApiClient: jest.fn(),
  ValkyrLabsApiError: class extends Error {},
}));
describe("password login issuance origin", () => {
  let host: string;
  beforeEach(() => {
    host = "https://issuer.invalid/v1";
    jest.clearAllMocks();
    (getValkyraiBasePath as jest.Mock).mockImplementation(() => host);
  });
  it("binds newly issued auth to the captured request origin", async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce({
        data: { token: "SYNTHETIC-CSRF" },
        headers: {},
        status: 200,
      })
      .mockResolvedValueOnce({
        data: {
          token: "SYNTHETIC-A",
          authenticatedPrincipal: { id: "dummy-principal" },
        },
        headers: {},
        status: 200,
      });
    (getValkyrLabsRtkApiClient as jest.Mock).mockReturnValue({ request });
    expect(
      (
        await new ValoridePasswordLoginService().login({
          username: "dummy",
          password: "dummy",
        })
      ).tokens,
    ).toMatchObject({
      jwtToken: "SYNTHETIC-A",
      issuanceOrigin: "https://issuer.invalid",
    });
    expect(request.mock.calls[1][0].url).toBe(
      "https://issuer.invalid/v1/auth/login",
    );
  });
  it("never sends a password after a host switch during CSRF setup", async () => {
    const request = jest.fn(async (_input: any) => {
      host = "https://other.invalid/v1";
      return { data: {}, headers: {}, status: 200 };
    });
    (getValkyrLabsRtkApiClient as jest.Mock).mockReturnValue({ request });
    await expect(
      new ValoridePasswordLoginService().login({
        username: "dummy",
        password: "dummy",
      }),
    ).rejects.toThrow("backend changed");
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0].json).toBeUndefined();
  });
  it("rejects a direct insecure remote configuration before any auth dispatch", async () => {
    host = "http://issuer.invalid/v1";
    const request = jest.fn();
    (getValkyrLabsRtkApiClient as jest.Mock).mockReturnValue({ request });
    await expect(
      new ValoridePasswordLoginService().login({
        username: "dummy",
        password: "dummy",
      }),
    ).rejects.toThrow("HTTPS");
    expect(request).not.toHaveBeenCalled();
  });
});
