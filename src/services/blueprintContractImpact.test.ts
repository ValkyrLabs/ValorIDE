import {
  compareBlueprintOperations,
  readBlueprintConsumers,
} from "./blueprintContractImpact";
const workflowId = "2b4f7310-dc54-4bba-93de-4f9d78281d35";
const op = {
  operationId: "listInvoices",
  responses: { "200": { schema: { $ref: "#/components/schemas/Invoice" } } },
};
const schema = (shape: string) => ({
  paths: {
    "/invoice": { get: op },
    "/health": { get: { operationId: "health" } },
  },
  components: {
    schemas: {
      Invoice: {
        type: "object",
        properties: { owner: { $ref: "#/components/schemas/Owner" } },
      },
      Owner: { type: shape },
    },
  },
});
it("follows transitive local schema dependencies and attaches only the exact prior operation", () => {
  const result = compareBlueprintOperations(
    schema("number"),
    schema("string"),
    [
      { operationId: "listInvoices", workflowId },
      { operationId: "health", workflowId },
    ],
  );
  expect(result.rows).toEqual([
    {
      route: "GET /invoice",
      kind: "Changed",
      before: "listInvoices",
      after: "listInvoices",
      consumers: [{ operationId: "listInvoices", workflowId }],
    },
  ]);
});
it("detects removed and added methods and marks unresolved reference coverage", () => {
  const result = compareBlueprintOperations(
    schema("number"),
    {
      paths: {
        "/invoice": { post: op },
        "/remote": { $ref: "https://private.invalid/api.yaml" },
      },
    },
    [],
  );
  expect(result.rows.map((r) => [r.route, r.kind])).toEqual([
    ["GET /health", "Removed"],
    ["GET /invoice", "Removed"],
    ["POST /invoice", "Added"],
  ]);
  expect(result.unresolved).toBe(true);
});
it("withholds consumers when several baseline operations share the same ID", () => {
  const baseline = { paths: { "/a": { get: op }, "/b": { get: op } } };
  const draft = { paths: { "/a": { get: op } } };
  const value = compareBlueprintOperations(baseline, draft, [
    { operationId: "listInvoices", workflowId },
  ]);
  expect(value.rows[0].consumers).toEqual([]);
  expect(value.unresolved).toBe(true);
});
it("rejects foreign revision or malformed navigation target", () => {
  const expected = {
    applicationId: workflowId,
    specId: workflowId,
    etag: "a".repeat(64),
  };
  expect(() =>
    readBlueprintConsumers(
      { ...expected, etag: "other", bindings: [], truncated: false },
      expected,
    ),
  ).toThrow();
  expect(() =>
    readBlueprintConsumers(
      {
        ...expected,
        bindings: [
          { operationId: "listInvoices", workflowId: "https://elsewhere" },
        ],
        truncated: false,
      },
      expected,
    ),
  ).toThrow();
});
