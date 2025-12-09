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
  OAS_IGNORED_FIELDS,
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
            id: "schema-id",
            User: {
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
      expect(filtered.components.schemas.id).toBeUndefined();
      expect(filtered.components.schemas.User.type).toBe("object");
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
      ];

      expect(OAS_IGNORED_FIELDS).toEqual(expect.arrayContaining(expected));
      expect(OAS_IGNORED_FIELDS).toHaveLength(expected.length);
    });
  });
});
