import { beforeEach, expect, it } from "@jest/globals";
import { getValkyrLabsRtkApiClient } from "../valkyrai/ValkyrLabsRtkApi";
import { ValorideAuthCodeExchangeService } from "./ValorideAuthCodeExchangeService";

jest.mock("../valkyrai/ValkyrLabsRtkApi", () => ({ getValkyrLabsRtkApiClient: jest.fn() }));
jest.mock("@utils/serverValkyraiHost", () => ({ getValkyraiBasePath: () => "https://api-0.valkyrlabs.com/v1" }));
const request = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getValkyrLabsRtkApiClient).mockReturnValue({ request } as any);
});

it("exchanges only one-time code and state through the current transport and binds token origin", async () => {
  request.mockResolvedValue({ data: { jwtToken: "fixture-jwt", apiKey: "fixture-key" }, headers: {}, setCookies: [] });
  const result = await new ValorideAuthCodeExchangeService().exchangeCode("fixture-code", "fixture-state");
  expect(request).toHaveBeenCalledWith({ url: "https://api-0.valkyrlabs.com/v1/auth/valoride/code-exchange", method: "POST", json: { code: "fixture-code", state: "fixture-state" } });
  expect(result.tokens).toMatchObject({ jwtToken: "fixture-jwt", apiKey: "fixture-key", issuanceOrigin: "https://api-0.valkyrlabs.com" });
});

it("rejects exchange responses without a JWT instead of reporting login success", async () => {
  request.mockResolvedValue({ data: {}, headers: {}, setCookies: [] });
  await expect(new ValorideAuthCodeExchangeService().exchangeCode("fixture-code", "fixture-state")).rejects.toThrow("did not include a JWT");
});
