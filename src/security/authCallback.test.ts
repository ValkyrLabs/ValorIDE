import {
  hasDirectCallbackCredentials,
  parseAuthCallbackQuery,
  parseLegacyAuthCallbackCredentials,
  redactAuthCallbackLogPayload,
  summarizeAuthCallback,
} from "./authCallback";

describe("auth callback security helpers", () => {
  it("summarizes callback query state without exposing credential values", () => {
    const params = parseAuthCallbackQuery(
      "state=nonce&token=jwt.secret.value&apiKey=sk_live_secret&authenticatedPrincipal=%7B%22email%22%3A%22a%40b.com%22%7D",
    );

    const summary = summarizeAuthCallback(params, "/auth", "valoride");

    expect(summary).toMatchObject({
      path: "/auth",
      scheme: "valoride",
      hasState: true,
      hasDirectCredential: true,
      hasApiCredential: true,
      hasPrincipalPayload: true,
    });
    expect(JSON.stringify(summary)).not.toContain("jwt.secret.value");
    expect(JSON.stringify(summary)).not.toContain("sk_live_secret");
    expect(JSON.stringify(summary)).not.toContain("a@b.com");
    expect(JSON.stringify(summary)).not.toMatch(
      /token|apiKey|jwt|Authorization|authenticatedPrincipal/i,
    );
  });

  it("detects direct token delivery so production callbacks can reject it", () => {
    expect(
      hasDirectCallbackCredentials(
        parseAuthCallbackQuery("state=nonce&code=one-time-code"),
      ),
    ).toBe(false);
    expect(
      hasDirectCallbackCredentials(
        parseAuthCallbackQuery("state=nonce&token=jwt&apiKey=key"),
      ),
    ).toBe(true);
  });

  it("keeps legacy parsing isolated from log payloads", () => {
    const params = parseAuthCallbackQuery(
      "state=nonce&token=jwt.secret.value&apiKey=sk_live_secret&authenticatedPrincipal=%7B%22id%22%3A%22u1%22%7D",
    );

    expect(parseLegacyAuthCallbackCredentials(params)).toEqual({
      token: "jwt.secret.value",
      apiKey: "sk_live_secret",
      authenticatedPrincipal: { id: "u1" },
    });
    expect(
      redactAuthCallbackLogPayload({
        token: "jwt",
        apiKey: "key",
        state: "nonce",
      }),
    ).toEqual({
      token: "[redacted]",
      apiKey: "[redacted]",
      state: "nonce",
    });
  });
});
