import { describe, expect, it, jest } from "@jest/globals";
import { testValkyraiHostConnection } from "./ValkyraiHostConnection";
import { getValkyrLabsRtkApiClient } from "./ValkyrLabsRtkApi";

describe("ValkyrAI host connection test", () => {
  it("probes the normalized API schema through the shared client without credentials", async () => {
    const fetchImpl = jest.fn(
      async () =>
        new Response(JSON.stringify({ openapi: "3.0.1", paths: {} }), {
          headers: { "content-type": "application/json" },
        }),
    );
    const result = await testValkyraiHostConnection(
      "https://new.example/",
      getValkyrLabsRtkApiClient(fetchImpl),
    );
    expect(result).toEqual({ host: "https://new.example/v1", success: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://new.example/v1/api-docs",
      expect.objectContaining({ method: "GET", headers: {} }),
    );
  });

  it.each([404, 500, 503])(
    "does not treat HTTP %s as a successful test",
    async (status) => {
      const client = getValkyrLabsRtkApiClient(
        async () =>
          new Response(JSON.stringify({ error: "Unavailable" }), {
            status,
            headers: { "content-type": "application/json" },
          }),
      );
      expect(
        await testValkyraiHostConnection("http://localhost:8080", client),
      ).toMatchObject({ host: "http://localhost:8080/v1", success: false });
    },
  );

  it.each([{}, { openapi: "3.0.1" }, { openapi: "3.0.1", paths: [] }])(
    "rejects a non-schema response %j",
    async (body) => {
      const client = getValkyrLabsRtkApiClient(
        async () =>
          new Response(JSON.stringify(body), {
            headers: { "content-type": "application/json" },
          }),
      );
      expect(
        await testValkyraiHostConnection("https://new.example/v1", client),
      ).toMatchObject({
        success: false,
        error: expect.stringContaining("valid ValkyrAI API schema"),
      });
    },
  );

  it("reports unreachable hosts", async () => {
    const client = getValkyrLabsRtkApiClient(async () => {
      throw new Error("Connection refused");
    });
    expect(
      await testValkyraiHostConnection("https://new.example/v1", client),
    ).toMatchObject({ success: false, error: "Connection refused" });
  });

  it("does not dispatch for insecure or credential-bearing URLs", async () => {
    const request = jest.fn(async () => {
      throw new Error("Unexpected request");
    });
    for (const host of [
      "http://remote.example",
      "ftp://localhost",
      "https://user:secret@new.example",
    ]) {
      expect(await testValkyraiHostConnection(host, { request })).toMatchObject(
        { success: false },
      );
    }
    expect(request).not.toHaveBeenCalled();
  });

  it.each([401, 403])(
    "reports HTTP %s as reachable with sign-in required",
    async (status) => {
      const client = getValkyrLabsRtkApiClient(
        async () => new Response("Sign in required", { status }),
      );
      expect(
        await testValkyraiHostConnection("https://new.example/v1", client),
      ).toEqual({
        host: "https://new.example/v1",
        success: true,
        requiresAuth: true,
      });
    },
  );

  it("uses a supplied current-backend token for its schema test", async () => {
    const fetchImpl = jest.fn(
      async () =>
        new Response(JSON.stringify({ openapi: "3.0.1", paths: {} }), {
          headers: { "content-type": "application/json" },
        }),
    );
    await testValkyraiHostConnection(
      "https://current.example/v1",
      getValkyrLabsRtkApiClient(fetchImpl),
      "current-backend-token",
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://current.example/v1/api-docs",
      expect.objectContaining({
        headers: { Authorization: "Bearer current-backend-token" },
      }),
    );
  });
});
