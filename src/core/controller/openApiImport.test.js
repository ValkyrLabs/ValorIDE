import { describe, it } from "mocha";
import "should";
import { buildOpenApiHeaders, getOpenApiContentType } from "./openApiImport";
describe("openApiImport helpers", () => {
    describe("getOpenApiContentType", () => {
        it("returns application/json for .json files", () => {
            getOpenApiContentType("spec.json").should.equal("application/json");
        });
        it("returns application/yaml for .yaml files", () => {
            getOpenApiContentType("spec.yaml").should.equal("application/yaml");
        });
        it("returns application/yaml for .yml files", () => {
            getOpenApiContentType("spec.yml").should.equal("application/yaml");
        });
    });
    describe("buildOpenApiHeaders", () => {
        it("includes the derived content type and authorization when provided", () => {
            const headers = buildOpenApiHeaders("spec.yaml", "token-123");
            headers.should.have.property("Content-Type", "application/yaml");
            headers.should.have.property("Authorization", "Bearer token-123");
        });
    });
});
//# sourceMappingURL=openApiImport.test.js.map