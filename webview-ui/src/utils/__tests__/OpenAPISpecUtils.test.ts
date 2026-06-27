/**
 * Unit tests for OpenAPISpecUtils
 *
 * Tests filtering, serialization, and round-trip preservation of OpenAPI specs
 */

import {
  filterIgnoredFields,
  hasIgnoredFields,
  isCleanSpec,
  getIgnoredFieldsPresent,
  cloneWithoutIgnoredFields,
  toCleanJSON,
  mergeSpecsClean,
  cleanSpecForRoundTrip,
  countOpenAPIComponents,
  countOpenAPIOperations,
  createEmptyOpenAPISpec,
  createSharedSchemaReference,
  linkSharedSchemaComponent,
  listOpenAPISchemaComponents,
  OAS_IGNORED_FIELDS,
  OAS_INTERNAL_FIELDS,
  THORAPI_COMPONENT_EXTENSION,
  toPlainOpenAPISpec,
} from "../OpenAPISpecUtils";

describe("OpenAPISpecUtils", () => {
  describe("filterIgnoredFields", () => {
    it("should remove all ignored fields from object", () => {
      const spec = {
        openapi: "3.0.3",
        info: { title: "Test API", version: "1.0.0" },
        id: "uuid-123",
        createdDate: "2025-12-06T00:00:00Z",
        keyHash: "HASH123",
        ownerId: "owner-uuid",
        lastModifiedDate: "2025-12-06T12:00:00Z",
        lastModifiedById: "modifier-uuid",
        lastAccessedDate: "2025-12-06T12:30:00Z",
        lastAccessedById: "accessor-uuid",
        trashed: true,
      };

      const filtered = filterIgnoredFields(spec);

      expect(filtered.openapi).toBe("3.0.3");
      expect(filtered.info).toEqual({ title: "Test API", version: "1.0.0" });
      expect(filtered.id).toBeUndefined();
      expect(filtered.createdDate).toBeUndefined();
      expect(filtered.keyHash).toBeUndefined();
      expect(filtered.ownerId).toBeUndefined();
      expect(filtered.lastModifiedDate).toBeUndefined();
      expect(filtered.lastModifiedById).toBeUndefined();
      expect(filtered.lastAccessedDate).toBeUndefined();
      expect(filtered.lastAccessedById).toBeUndefined();
      expect(filtered.trashed).toBeUndefined();
    });

    it("should handle nested objects recursively", () => {
      const spec = {
        openapi: "3.0.3",
        info: {
          title: "Test",
          id: "nested-id",
          keyHash: "NESTED_HASH",
        },
        components: {
          schemas: {
            id: {
              type: "string",
              description: "A legitimate schema key, not a generated record id.",
            },
            User: {
              id: "user-schema-record-id",
              type: "object",
              createdDate: "should-be-removed",
            },
          },
        },
      };

      const filtered = filterIgnoredFields(spec);

      expect(filtered.info.title).toBe("Test");
      expect(filtered.info.id).toBeUndefined();
      expect(filtered.info.keyHash).toBeUndefined();
      expect(filtered.components.schemas.id.type).toBe("string");
      expect(filtered.components.schemas.User.type).toBe("object");
      expect(filtered.components.schemas.User.id).toBeUndefined();
      expect(filtered.components.schemas.User.createdDate).toBeUndefined();
    });

    it("should handle arrays of objects", () => {
      const specs = [
        { openapi: "3.0.3", id: "uuid1", createdDate: "2025-12-06" },
        { openapi: "3.0.3", id: "uuid2", createdDate: "2025-12-07" },
      ];

      const filtered = filterIgnoredFields(specs);

      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered).toHaveLength(2);
      expect((filtered as any)[0].openapi).toBe("3.0.3");
      expect((filtered as any)[0].id).toBeUndefined();
      expect((filtered as any)[1].id).toBeUndefined();
    });

    it("should return null for null input", () => {
      expect(filterIgnoredFields(null)).toBeNull();
      expect(filterIgnoredFields(undefined)).toBeNull();
    });

    it("should preserve primitives", () => {
      expect(filterIgnoredFields("string")).toBe("string");
      expect(filterIgnoredFields(123)).toBe(123);
      expect(filterIgnoredFields(true)).toBe(true);
    });

    it("should accept custom ignored fields list", () => {
      const spec = {
        openapi: "3.0.3",
        customField: "should-remove",
        keepField: "should-keep",
      };

      const filtered = filterIgnoredFields(spec, ["customField"]);

      expect(filtered.keepField).toBe("should-keep");
      expect(filtered.customField).toBeUndefined();
    });
  });

  describe("hasIgnoredFields", () => {
    it("should return true if any ignored field is present", () => {
      expect(hasIgnoredFields({ id: "uuid", openapi: "3.0.3" })).toBe(true);
      expect(hasIgnoredFields({ createdDate: "2025-12-06", info: {} })).toBe(
        true,
      );
      expect(hasIgnoredFields({ keyHash: "HASH", paths: {} })).toBe(true);
    });

    it("should return false if no ignored fields present", () => {
      expect(
        hasIgnoredFields({ openapi: "3.0.3", info: { title: "Test" } }),
      ).toBe(false);
    });

    it("should return false if ignored fields are null", () => {
      expect(hasIgnoredFields({ id: null, openapi: "3.0.3" })).toBe(false);
      expect(hasIgnoredFields({ createdDate: undefined, info: {} })).toBe(
        false,
      );
    });

    it("should return false for non-object input", () => {
      expect(hasIgnoredFields(null)).toBe(false);
      expect(hasIgnoredFields(undefined)).toBe(false);
      expect(hasIgnoredFields("string")).toBe(false);
      expect(hasIgnoredFields(123)).toBe(false);
    });
  });

  describe("isCleanSpec", () => {
    it("should return true for clean specs", () => {
      const spec = {
        openapi: "3.0.3",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
      };
      expect(isCleanSpec(spec)).toBe(true);
    });

    it("should return false for specs with audit fields", () => {
      const spec = {
        openapi: "3.0.3",
        id: "uuid",
        createdDate: "2025-12-06",
      };
      expect(isCleanSpec(spec)).toBe(false);
    });
  });

  describe("getIgnoredFieldsPresent", () => {
    it("should return list of present ignored fields", () => {
      const spec = {
        openapi: "3.0.3",
        id: "uuid",
        createdDate: "2025-12-06",
        keyHash: "HASH",
      };

      const present = getIgnoredFieldsPresent(spec);

      expect(present).toContain("id");
      expect(present).toContain("createdDate");
      expect(present).toContain("keyHash");
      expect(present).not.toContain("openapi");
    });

    it("should return empty array for clean specs", () => {
      const spec = {
        openapi: "3.0.3",
        info: { title: "Test" },
      };

      const present = getIgnoredFieldsPresent(spec);
      expect(present).toEqual([]);
    });
  });

  describe("cloneWithoutIgnoredFields", () => {
    it("should create deep copy without ignored fields", () => {
      const original = {
        openapi: "3.0.3",
        info: { title: "Test", nested: { id: "nested-id" } },
        id: "uuid",
      };

      const cloned = cloneWithoutIgnoredFields(original);

      expect(cloned).not.toBe(original);
      expect(cloned.openapi).toBe("3.0.3");
      expect((cloned.info as any).nested).toBeUndefined();
      expect(cloned.id).toBeUndefined();
    });
  });

  describe("toCleanJSON", () => {
    it("should serialize to JSON without ignored fields", () => {
      const spec = {
        openapi: "3.0.3",
        info: { title: "Test" },
        id: "uuid",
        createdDate: "2025-12-06",
      };

      const json = toCleanJSON(spec, 0); // No indentation for easier comparison

      expect(JSON.parse(json).openapi).toBe("3.0.3");
      expect(JSON.parse(json).id).toBeUndefined();
      expect(JSON.parse(json).createdDate).toBeUndefined();
    });

    it("should respect space parameter", () => {
      const spec = { openapi: "3.0.3" };
      const json = toCleanJSON(spec, 4);

      // Should have 4-space indentation
      expect(json).toContain("    ");
    });
  });

  describe("mergeSpecsClean", () => {
    it("should merge specs with override taking precedence", () => {
      const base = {
        openapi: "3.0.3",
        info: { title: "Base" },
        id: "base-id",
      };

      const override = {
        info: { title: "Override" },
        createdDate: "2025-12-06",
      };

      const merged = mergeSpecsClean(base, override);

      expect(merged.openapi).toBe("3.0.3");
      expect((merged.info as any).title).toBe("Override");
      expect(merged.id).toBeUndefined();
      expect((merged as any).createdDate).toBeUndefined();
    });
  });

  describe("cleanSpecForRoundTrip", () => {
    it("should preserve OpenAPI structure through round-trip", () => {
      const original = {
        openapi: "3.0.3",
        info: { title: "API", version: "1.0.0" },
        paths: { "/users": {} },
        id: "should-be-removed",
        createdDate: "2025-12-06",
      };

      const cleaned = cleanSpecForRoundTrip(original);

      const json1 = JSON.stringify(original);
      const json2 = JSON.stringify(cleaned);

      // Both should serialize, but cleaned should be shorter
      expect(json2.length).toBeLessThan(json1.length);

      // Cleaned should not have audit fields
      expect(JSON.parse(JSON.stringify(cleaned)).id).toBeUndefined();
    });
  });

  describe("toPlainOpenAPISpec", () => {
    it("converts normalized ThorAPI OAS records into a plain OpenAPI document", () => {
      const normalized = {
        workflowStateId: "state-123",
        id: "spec-123",
        openapi: "3.0.0",
        info: {
          id: "info-123",
          oasOpenAPISpecId: "spec-123",
          title: "Payments",
          version: "1.2.0",
        },
        servers: [
          {
            id: "server-123",
            oasOpenAPISpecId: "spec-123",
            url: "https://api.example.com",
          },
        ],
        paths: [
          {
            id: "path-123",
            oasOpenAPISpecId: "spec-123",
            path: "/charges",
            get: {
              id: "operation-123",
              operationId: "listCharges",
              summary: "List charges",
              responses: [
                {
                  id: "response-123",
                  statusCode: "200",
                  description: "OK",
                  content: [
                    {
                      title: "ChargeList",
                      type: "object",
                      createdDate: "2026-06-17T00:00:00Z",
                    },
                  ],
                },
              ],
            },
          },
        ],
        components: {
          id: "component-123",
          schemas: [
            {
              name: "Charge",
              type: "object",
              description: "A payment charge",
              ownerId: "owner-123",
            },
          ],
        },
      };

      const plain = toPlainOpenAPISpec(normalized);

      expect(plain).toEqual({
        openapi: "3.0.0",
        info: {
          title: "Payments",
          version: "1.2.0",
        },
        servers: [
          {
            url: "https://api.example.com",
          },
        ],
        paths: {
          "/charges": {
            get: {
              summary: "List charges",
              operationId: "listCharges",
              responses: {
                "200": {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: {
                        title: "ChargeList",
                        type: "object",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Charge: {
              type: "object",
              description: "A payment charge",
            },
          },
        },
      });
    });

    it("preserves an already plain OpenAPI document", () => {
      const plainInput = {
        openapi: "3.1.0",
        info: { title: "Catalog", version: "2.0.0" },
        paths: {
          "/products": {
            post: {
              operationId: "createProduct",
              responses: { "201": { description: "Created" } },
            },
          },
        },
        components: {
          schemas: {
            Product: { type: "object" },
          },
        },
      };

      expect(toPlainOpenAPISpec(plainInput)).toEqual(plainInput);
    });

    it("creates empty specs with stable OpenAPI defaults", () => {
      expect(createEmptyOpenAPISpec("Inventory", "0.1.0")).toEqual({
        openapi: "3.0.3",
        info: { title: "Inventory", version: "0.1.0" },
        paths: {},
        components: { schemas: {} },
      });
    });

    it("counts operations and components from normalized or plain shapes", () => {
      const spec = {
        openapi: "3.0.3",
        info: { title: "Metrics", version: "1.0.0" },
        paths: [
          {
            path: "/metrics",
            get: { responses: [{ description: "OK" }] },
            post: { responses: [{ description: "Created" }] },
          },
        ],
        components: {
          schemas: [{ title: "Metric", type: "object" }],
          securitySchemes: [{ name: "BearerAuth", type: "http" }],
        },
      };

      expect(countOpenAPIOperations(spec)).toBe(2);
      expect(countOpenAPIComponents(spec)).toBe(2);
    });
  });

  describe("shared schema components", () => {
    it("creates file refs with ThorAPI hydration metadata", () => {
      const reference = createSharedSchemaReference({
        id: "principal-shared",
        name: "Principal",
        version: "2026-06-17",
        sourceFile: "./components/principal.yaml",
        scope: "shared",
      });

      expect(reference).toEqual({
        $ref: "./components/principal.yaml#/components/schemas/Principal",
        [THORAPI_COMPONENT_EXTENSION]: {
          componentId: "principal-shared",
          componentName: "Principal",
          scope: "shared",
          version: "2026-06-17",
          hydratedBy: "thorapi-application-builder",
        },
      });
    });

    it("links a shared component without changing local components", () => {
      const base = createEmptyOpenAPISpec("CRM", "1.0.0");
      base.components = {
        schemas: {
          Principal: {
            type: "object",
            description: "A local tenant-specific principal shape",
          },
        },
      };

      const next = linkSharedSchemaComponent(
        base,
        {
          id: "principal-core",
          name: "Principal",
          sourceFile: "./components/principal-core.yaml",
          scope: "shared",
        },
        "CorePrincipal",
      );

      expect(next.components?.schemas?.Principal).toEqual({
        type: "object",
        description: "A local tenant-specific principal shape",
      });
      expect(next.components?.schemas?.CorePrincipal.$ref).toBe(
        "./components/principal-core.yaml#/components/schemas/Principal",
      );
    });

    it("summarizes local and shared schema choices for the designer", () => {
      const spec = linkSharedSchemaComponent(
        createEmptyOpenAPISpec("Users", "1.0.0"),
        {
          id: "principal-shared",
          name: "Principal",
          ref: "./components/principal.yaml#/components/schemas/Principal",
          scope: "shared",
        },
      );
      const withLocal = {
        ...spec,
        components: {
          schemas: {
            ...spec.components?.schemas,
            TenantPrincipal: { type: "object" },
          },
        },
      };

      expect(listOpenAPISchemaComponents(withLocal)).toEqual([
        {
          name: "Principal",
          schema: expect.objectContaining({
            $ref: "./components/principal.yaml#/components/schemas/Principal",
          }),
          ref: "./components/principal.yaml#/components/schemas/Principal",
          thorapiComponentId: "principal-shared",
          scope: "shared",
        },
        {
          name: "TenantPrincipal",
          schema: { type: "object" },
          ref: undefined,
          thorapiComponentId: undefined,
          scope: "local",
        },
      ]);
    });
  });

  describe("Integration: YAML round-trip simulation", () => {
    it("should preserve spec through multiple serialization cycles", () => {
      const originalSpec = {
        openapi: "3.0.3",
        info: {
          title: "Petstore",
          version: "1.0.0",
          description: "A sample API",
        },
        paths: {
          "/pets": {
            get: {
              description: "List pets",
              responses: {
                "200": {
                  description: "Success",
                },
              },
            },
          },
        },
      };

      // Simulate: YAML parse → filter → object manipulation → stringify → parse
      let spec: any = { ...originalSpec };
      spec.id = "uuid-123"; // System adds this
      spec.createdDate = "2025-12-06T00:00:00Z";

      // Cycle 1: Filter
      spec = filterIgnoredFields(spec);
      expect(spec.id).toBeUndefined();

      // Cycle 2: Stringify & Parse
      const json = JSON.stringify(spec);
      spec = JSON.parse(json);

      // Cycle 3: Merge with metadata
      const merged = mergeSpecsClean(originalSpec, spec);
      expect(merged.openapi).toBe("3.0.3");
      expect(merged.info.title).toBe("Petstore");
    });
  });

  describe("Constants", () => {
    it("should have all expected ignored fields", () => {
      const expected = [
        "id",
        "ownerId",
        "createdDate",
        "keyHash",
        "lastAccessedById",
        "lastAccessedDate",
        "lastModifiedById",
        "lastModifiedDate",
        "trashed",
        "x-id",
      ];

      expect(OAS_IGNORED_FIELDS).toEqual(expect.arrayContaining(expected));
      expect(OAS_IGNORED_FIELDS).toHaveLength(expected.length);
      expect(OAS_INTERNAL_FIELDS).toEqual(expect.arrayContaining(expected));
    });
  });
});
