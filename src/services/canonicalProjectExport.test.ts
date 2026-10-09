import { it } from "@jest/globals";
import { downloadCanonicalProjectExport } from "./canonicalProjectExport";
import { getValkyrLabsRtkApiClient, ValkyrLabsApiError } from "./valkyrai/ValkyrLabsRtkApi";

jest.mock("./valkyrai/ValkyrLabsRtkApi", () => ({ ...jest.requireActual("./valkyrai/ValkyrLabsRtkApi"), getValkyrLabsRtkApiClient: jest.fn() }));
const applicationId = "11111111-1111-4111-8111-111111111111";
const options = { backend: "https://api.example.test/v1", applicationId, receiptRef: "receipt-1", jwtToken: "synthetic-host-session", assertCurrent: jest.fn(async () => {}) };
const request = jest.fn();
beforeEach(() => {
  jest.clearAllMocks(); (getValkyrLabsRtkApiClient as jest.Mock).mockReturnValue({ request });
  request.mockResolvedValue({ data: Uint8Array.from([80, 75, 3, 4]).buffer });
});
it("downloads only the requested receipt through the bounded origin client with no redirects", async () => {
  expect(await downloadCanonicalProjectExport(options)).toEqual(Buffer.from([80, 75, 3, 4]));
  expect(request).toHaveBeenCalledWith(expect.objectContaining({ method: "GET", url: `${options.backend}/thorapi/applications/${applicationId}/developer-project/export`, params: { receiptRef: "receipt-1" }, responseType: "arrayBuffer", redirect: "error", maxResponseBytes: 95 * 1024 * 1024 }));
  expect(options.assertCurrent).toHaveBeenCalledTimes(2);
});
it.each([401, 403, 409, 500])("turns export %s into a same-receipt recovery instruction", async (status) => {
  request.mockRejectedValue(new ValkyrLabsApiError("server detail", status));
  await expect(downloadCanonicalProjectExport(options)).rejects.toThrow(/same.*receipt/);
});
it("does not send a request after an account switch or for invalid receipt input", async () => {
  await expect(downloadCanonicalProjectExport({ ...options, assertCurrent: async () => { throw new Error("Account changed"); } })).rejects.toThrow(/Account changed/);
  await expect(downloadCanonicalProjectExport({ ...options, receiptRef: "../foreign" })).rejects.toThrow(/successful generation receipt/);
  expect(request).not.toHaveBeenCalled();
});
