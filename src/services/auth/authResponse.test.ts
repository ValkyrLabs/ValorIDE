import {
  buildAuthTokensFromResponse,
  extractAuthenticatedUser,
  extractAuthToken,
  extractExpiresAt,
} from "./authResponse";

describe("authResponse", () => {
  it("extracts the generated LoginResponse token field", () => {
    expect(extractAuthToken({ token: "jwt-token" })).toBe("jwt-token");
  });

  it("extracts alternate token field names returned by auth gateways", () => {
    expect(extractAuthToken({ access_token: "access-token" })).toBe(
      "access-token",
    );
    expect(extractAuthToken({ data: { jwtSession: "session-token" } })).toBe(
      "session-token",
    );
  });

  it("extracts bearer tokens from response headers", () => {
    expect(extractAuthToken({}, { Authorization: "Bearer header-token" })).toBe(
      "header-token",
    );
  });

  it("extracts JWT tokens from auth cookies", () => {
    expect(
      extractAuthToken(
        { status: "SUCCESS" },
        {
          "set-cookie": [
            "XSRF-TOKEN=csrf-token; Path=/",
            "jwtSession=cookie-token; Path=/; HttpOnly; Secure",
          ],
        },
      ),
    ).toBe("cookie-token");
  });

  it("extracts JWT tokens from the Valkyr auth cookie", () => {
    expect(
      extractAuthToken(
        {
          authenticatedPrincipal: { username: "super" },
          tenantId: "tenant-1",
        },
        {
          "set-cookie": [
            "VALKYR_AUTH=valkyr-cookie-token; Path=/; HttpOnly; Secure; SameSite=None",
          ],
        },
      ),
    ).toBe("valkyr-cookie-token");
  });

  it("extracts JWT tokens from combined auth cookie headers", () => {
    expect(
      extractAuthToken(
        { status: "SUCCESS" },
        {
          "set-cookie":
            "XSRF-TOKEN=csrf-token; Path=/, jwtSession=combined-cookie-token; Path=/; HttpOnly; Secure",
        },
      ),
    ).toBe("combined-cookie-token");
  });

  it("builds persisted auth tokens from nested response bodies", () => {
    expect(
      buildAuthTokensFromResponse({
        tokens: {
          jwtToken: "jwt-token",
          refresh_token: "refresh-token",
          api_key: "api-key",
          expires_at: "1893456000000",
        },
      }),
    ).toEqual({
      jwtToken: "jwt-token",
      refreshToken: "refresh-token",
      apiKey: "api-key",
      expiresAt: 1893456000000,
    });
  });

  it("normalizes authenticatedPrincipal JSON strings", () => {
    expect(
      extractAuthenticatedUser({
        authenticatedPrincipal: JSON.stringify({
          id: "user-1",
          username: "super",
        }),
      }),
    ).toEqual({
      id: "user-1",
      username: "super",
    });
  });

  it("preserves top-level tenant context on extracted users", () => {
    expect(
      extractAuthenticatedUser({
        authenticatedPrincipal: {
          id: "user-1",
          username: "super",
        },
        tenantId: "tenant-1",
      }),
    ).toEqual({
      id: "user-1",
      username: "super",
      tenantId: "tenant-1",
    });
  });

  it("parses ISO expiry strings", () => {
    expect(extractExpiresAt({ expiresAt: "2030-01-01T00:00:00.000Z" })).toBe(
      Date.parse("2030-01-01T00:00:00.000Z"),
    );
  });
});
