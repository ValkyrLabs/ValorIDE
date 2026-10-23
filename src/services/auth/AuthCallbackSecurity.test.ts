import { expect } from "chai";
import {
  containsForbiddenAuthLogField,
  parseAuthCallbackQuery,
} from "./AuthCallbackSecurity";

describe("AuthCallbackSecurity", () => {
  it("redacts auth callback diagnostics to non-secret booleans", () => {
    const callback = parseAuthCallbackQuery({
      path: "/auth",
      scheme: "vscode",
      query:
        "code=one-time-code&state=expected-state&token=jwt-value&apiKey=key-value&authenticatedPrincipal=%7B%7D",
    });

    expect(callback.code).to.equal("one-time-code");
    expect(callback.state).to.equal("expected-state");
    expect(callback.hasLegacySecretParams).to.equal(true);
    expect(callback.diagnostics).to.deep.equal({
      path: "/auth",
      scheme: "vscode",
      hasQuery: true,
      hasCode: true,
      hasState: true,
      hasLegacySecretParams: true,
      hasUserPayload: true,
    });
    expect(JSON.stringify(callback.diagnostics)).not.to.contain("jwt-value");
    expect(JSON.stringify(callback.diagnostics)).not.to.contain("key-value");
    expect(containsForbiddenAuthLogField(callback.diagnostics)).to.equal(false);
  });

  it("keeps direct credential query callbacks out of the accepted path", () => {
    const callback = parseAuthCallbackQuery({
      path: "/auth",
      scheme: "vscode",
      query: "token=jwt-value&apiKey=key-value&state=expected-state",
    });

    expect(callback.code).to.equal(null);
    expect(callback.hasLegacySecretParams).to.equal(true);
    expect(callback.diagnostics.hasLegacySecretParams).to.equal(true);
    expect(containsForbiddenAuthLogField(callback.diagnostics)).to.equal(false);
  });
});
