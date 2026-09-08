import {
  parseWorkflowStudioTarget,
  assertWorkflowStudioBackend,
} from "./WorkflowStudioTarget";

const workflowId = "4d7b1763-71e6-4e8e-a1ee-b3cc39d6c671";
const backend = "https://api-0.valkyrlabs.com/v1";
describe("Workflow Studio navigation boundary", () => {
  it("accepts only workflow references and a canonical backend, never a caller launch URL", () => {
    expect(
      parseWorkflowStudioTarget({ workflowId, backend: backend + "/" }),
    ).toEqual({ workflowId, backend });
    for (const value of [
      null,
      [],
      {},
      { workflowId, backend, url: "https://other.example" },
      { workflowId: "../secret", backend },
      { workflowId, backend: "javascript:alert(1)" },
      { workflowId, backend: backend + "?ticket=secret" },
      { workflowId, backend: "https://u:p@api-0.valkyrlabs.com/v1" },
    ]) {
      expect(parseWorkflowStudioTarget(value)).toBeNull();
    }
  });
  it("rejects another backend, path, scheme, or invalid configuration", () => {
    expect(() =>
      assertWorkflowStudioBackend(backend + "/", backend),
    ).not.toThrow();
    for (const current of [
      "https://other.example/v1",
      "https://api-0.valkyrlabs.com/v2",
      "http://api-0.valkyrlabs.com/v1",
      "",
      backend + "#section",
    ]) {
      expect(() => assertWorkflowStudioBackend(backend, current)).toThrow(
        /backend/i,
      );
    }
  });
});
