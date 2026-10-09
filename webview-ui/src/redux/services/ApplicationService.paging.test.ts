import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationService } from "./ApplicationService";

const { read, auth } = vi.hoisted(() => ({
  read: vi.fn(),
  auth: {
    host: "https://api-0.valkyrlabs.com/v1",
    token: "fake-token",
    tenant: "tenant-a",
    revision: 0,
  },
}));
vi.mock("../customBaseQuery", () => ({
  default: (...args: unknown[]) => read(...args),
}));
vi.mock("../../utils/valkyraiHost", () => ({
  getValkyraiHost: () => auth.host,
}));
vi.mock("../../utils/authTokenStorage", () => ({
  getStoredJwtToken: () => auth.token,
}));
vi.mock("../../utils/tenantContext", () => ({
  readStoredTenantContext: () => ({ tenantId: auth.tenant }),
}));
vi.mock("@shared/CredentialOrigin", () => ({
  getCredentialRevision: () => auth.revision,
}));
const firstPage = () =>
  Array.from({ length: 20 }, (_, i) => ({ id: `app-${i}` }));
const clipping = {
  id: "4b2a4dc5-e9f6-45c4-aaaa-0bb187ee386c",
  name: "John Social Video Clipping",
  ownerId: "super-owner",
  status: "disabled",
};

describe("Applications catalog endpoint", () => {
  let store: ReturnType<typeof makeStore>;
  const makeStore = () =>
    configureStore({
      reducer: { [ApplicationService.reducerPath]: ApplicationService.reducer },
      middleware: (getDefault) =>
        getDefault().concat(ApplicationService.middleware),
    });
  beforeEach(() => {
    read.mockReset();
    Object.assign(auth, {
      host: "https://api-0.valkyrlabs.com/v1",
      token: "fake-token",
      tenant: "tenant-a",
      revision: 0,
    });
    store = makeStore();
  });
  afterEach(() => store.dispatch(ApplicationService.util.resetApiState()));

  it("caches the complete two-page catalog and refreshes from page zero", async () => {
    read
      .mockResolvedValueOnce({ data: firstPage() })
      .mockResolvedValueOnce({ data: [clipping] });
    const request = store.dispatch(
      ApplicationService.endpoints.getApplications.initiate("super:tenant-a"),
    );
    expect((await request).data).toEqual([...firstPage(), clipping]);
    const next = { id: "new-app" };
    read.mockResolvedValueOnce({ data: [clipping, next] });
    expect((await request.refetch()).data).toEqual([clipping, next]);
    expect(read.mock.calls.map((call) => call[0].url)).toEqual([
      "Application?page=0&size=20&sort=id,asc",
      "Application?page=1&size=20&sort=id,asc",
      "Application?page=0&size=20&sort=id,asc",
    ]);
    request.unsubscribe();
  });

  it("keeps account and tenant cache entries separate", async () => {
    read
      .mockResolvedValueOnce({ data: [clipping] })
      .mockResolvedValueOnce({ data: [{ id: "other-account" }] });
    const first = store.dispatch(
      ApplicationService.endpoints.getApplications.initiate("super:tenant-a"),
    );
    expect((await first).data).toEqual([clipping]);
    auth.tenant = "tenant-b";
    const second = store.dispatch(
      ApplicationService.endpoints.getApplications.initiate("other:tenant-b"),
    );
    expect((await second).data).toEqual([{ id: "other-account" }]);
    expect(
      ApplicationService.endpoints.getApplications.select("super:tenant-a")(
        store.getState(),
      ).data,
    ).toEqual([clipping]);
    first.unsubscribe();
    second.unsubscribe();
  });

  it("propagates a later-page HTTP failure without a successful truncated cache", async () => {
    const error = { status: 503, data: { message: "Service unavailable" } };
    read
      .mockResolvedValueOnce({ data: firstPage() })
      .mockResolvedValueOnce({ error });
    const request = store.dispatch(
      ApplicationService.endpoints.getApplications.initiate("super:tenant-a"),
    );
    const result = await request;
    expect(result.error).toEqual(error);
    expect(result.data).toBeUndefined();
    request.unsubscribe();
  });

  it.each(["token", "tenant", "host", "revision"] as const)(
    "stops before merging pages after %s changes",
    async (field) => {
      read.mockImplementationOnce(async () => {
        if (field === "revision") auth.revision++;
        else auth[field] += "-changed";
        return { data: firstPage() };
      });
      const request = store.dispatch(
        ApplicationService.endpoints.getApplications.initiate("super:tenant-a"),
      );
      const result = await request;
      expect(result.error).toMatchObject({
        status: "CUSTOM_ERROR",
        error: expect.stringContaining("changed while loading"),
      });
      expect(result.data).toBeUndefined();
      expect(read).toHaveBeenCalledTimes(1);
      request.unsubscribe();
    },
  );
});
