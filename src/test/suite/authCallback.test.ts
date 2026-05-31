import { expect } from "chai";
import { buildAuthCallbackDiagnostics } from "../../utils/authCallback";

describe("auth callback diagnostics", () => {
  it("returns only booleans and never raw secret values", () => {
    const query = new URLSearchParams(
      "state=s1&token=jwt-secret&apiKey=api-secret&authenticatedPrincipal=%7B%22email%22%3A%22u%40x.com%22%7D",
    );
    const diagnostics = buildAuthCallbackDiagnostics("/auth", query);

    expect(diagnostics.path).to.equal("/auth");
    expect(diagnostics.hasState).to.equal(true);
    expect(diagnostics.hasToken).to.equal(true);
    expect(diagnostics.hasApiKey).to.equal(true);
    expect(diagnostics.hasAuthenticatedPrincipal).to.equal(true);
    expect(JSON.stringify(diagnostics)).to.not.include("jwt-secret");
    expect(JSON.stringify(diagnostics)).to.not.include("api-secret");
    expect(JSON.stringify(diagnostics)).to.not.include("u@x.com");
  });
});
