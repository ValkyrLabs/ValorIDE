import { expect } from "chai";
import { buildOpenApiHeaders } from "../../core/controller/openApiImport";

describe("openApiImport", () => {
  it("builds OpenAPI import headers for the shared RTK transport", () => {
    const headers = buildOpenApiHeaders("spec.yaml", "token-123");

    expect(headers).to.include({
      "Content-Type": "application/yaml",
      Authorization: "Bearer token-123",
    });
  });
});
