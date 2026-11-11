import { beforeEach, expect, it } from "@jest/globals";
import { getGlobalState, getSecret, updateGlobalState } from "@core/storage/state";
import { createGrayMatterSessionState } from "@services/graymatter/GrayMatterSessionService";
import { getStatusBarService } from "@services/StatusBarService";
import { refreshGrayMatterStatus } from "./graymatterCommands";

jest.mock("@core/storage/state", () => ({ getGlobalState: jest.fn(), getSecret: jest.fn(), updateGlobalState: jest.fn(), storeSecret: jest.fn() }));
jest.mock("@services/graymatter/GrayMatterSessionService", () => ({
  createGrayMatterSessionState: jest.fn(),
  reconcileGrayMatterSessionRefresh: (_previous: unknown, next: unknown) => next,
  buildGrayMatterRecovery: jest.fn(),
}));
jest.mock("@services/StatusBarService", () => ({ getStatusBarService: jest.fn() }));
jest.mock("../../views/graymatter/GrayMatterMemoryPanel", () => ({ GrayMatterMemoryPanel: {} }));
jest.mock("./localGrayMatterCommand", () => ({ connectLocalGrayMatterCommand: jest.fn() }));
jest.mock("@utils/serverValkyraiHost", () => ({ getValkyraiBasePath: () => "https://api-0.valkyrlabs.com/v1" }));

const statusBar = { updateGrayMatterStatus: jest.fn() };
const session = { status: "ready", baseUrl: "https://api-0.valkyrlabs.com/v1" };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getStatusBarService).mockReturnValue(statusBar as any);
  jest.mocked(createGrayMatterSessionState).mockResolvedValue(session as any);
  jest.mocked(getSecret).mockImplementation(async (_context, key) => key === "jwtToken" ? "fixture-current-jwt" : "fixture-legacy-token");
});

it("propagates stored principal tenant context through status discovery using the unified JWT", async () => {
  jest.mocked(getGlobalState).mockImplementation(async (_context, key) => key === "authenticatedPrincipal" ? { tenantId: "principal-tenant" } as any : undefined);
  const context = { secrets: { get: jest.fn(async () => JSON.stringify({ tenantId: "secret-tenant" })) } } as any;
  await refreshGrayMatterStatus(context);
  expect(createGrayMatterSessionState).toHaveBeenCalledWith({
    baseUrl: "https://api-0.valkyrlabs.com/v1", token: "fixture-current-jwt", tenantContext: { tenantId: "principal-tenant" },
  });
  expect(getSecret).toHaveBeenCalledWith(context, "jwtToken");
  expect(getSecret).not.toHaveBeenCalledWith(context, "graymatter-token");
  expect(updateGlobalState).toHaveBeenCalledWith(context, "grayMatterSession", session);
  expect(statusBar.updateGrayMatterStatus).toHaveBeenCalledWith("ready", undefined);
});

it("retains secret tenant fallback and tolerates malformed stored tenant JSON", async () => {
  jest.mocked(getGlobalState).mockResolvedValue(undefined);
  const get = jest.fn(async () => JSON.stringify({ tenantId: "secret-tenant" }));
  const context = { secrets: { get } } as any;
  await refreshGrayMatterStatus(context);
  expect(createGrayMatterSessionState).toHaveBeenLastCalledWith(expect.objectContaining({ tenantContext: { tenantId: "secret-tenant" } }));
  get.mockResolvedValue("invalid JSON");
  await refreshGrayMatterStatus(context);
  expect(createGrayMatterSessionState).toHaveBeenLastCalledWith(expect.objectContaining({ tenantContext: {} }));
});
