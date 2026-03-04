import { expect } from "chai";
import { OPENAPI_IMPORT_TIMEOUT_MS, buildOpenApiImportConfig, } from "../../core/controller/openApiImport";
describe("openApiImport", () => {
    it("uses a 60s timeout for OpenAPI imports", () => {
        const config = buildOpenApiImportConfig("spec.yaml", "token-123");
        expect(OPENAPI_IMPORT_TIMEOUT_MS).to.equal(60000);
        expect(config.timeout).to.equal(OPENAPI_IMPORT_TIMEOUT_MS);
        expect(config.headers).to.include({
            "Content-Type": "application/yaml",
            Authorization: "Bearer token-123",
        });
    });
});
//# sourceMappingURL=openApiImport.test.js.map