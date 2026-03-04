/**
 * OpenAPI Specification Utilities
 *
 * Provides filtering and serialization utilities for OAS specs to ensure
 * system-generated audit fields are never exposed in I/O operations.
 *
 * Ignored Fields (excluded from all spec I/O):
 * - id: Database UUID
 * - ownerId: Owner reference
 * - createdDate: Creation timestamp
 * - keyHash: Encryption key hash
 * - lastAccessedById: Last accessor reference
 * - lastAccessedDate: Last access timestamp
 * - lastModifiedById: Last modifier reference
 * - lastModifiedDate: Last modification timestamp
 * - trashed: Soft delete flag
 */

/**
 * System-generated audit fields that must be excluded from OpenAPI spec
 * serialization/deserialization operations
 */
export const OAS_IGNORED_FIELDS: readonly string[] = Object.freeze([
  "id",
  "ownerId",
  "createdDate",
  "keyHash",
  "lastAccessedById",
  "lastAccessedDate",
  "lastModifiedById",
  "lastModifiedDate",
  "trashed",
]);

/**
 * Remove system-generated audit fields from an OAS spec object or any nested object
 *
 * @param obj - Object to filter (can be spec, nested object, or array)
 * @param ignoredFields - List of field names to remove (defaults to OAS_IGNORED_FIELDS)
 * @returns New object with ignored fields removed (deep copy)
 *
 * @example
 * const spec = { openapi: '3.0.3', id: 'uuid', createdDate: '2025-12-06' };
 * const clean = filterIgnoredFields(spec);
 * // Result: { openapi: '3.0.3' }
 */
export function filterIgnoredFields<T = any>(
  obj: T | null | undefined,
  ignoredFields: readonly string[] = OAS_IGNORED_FIELDS,
): any {
  if (obj == null) return null;

  // Handle arrays recursively
  if (Array.isArray(obj)) {
    return obj.map((item) => filterIgnoredFields(item, ignoredFields));
  }

  // Handle objects
  if (typeof obj === "object" && obj !== null) {
    const filtered = Object.keys(obj).reduce((acc, key) => {
      // Skip ignored fields
      if (ignoredFields.includes(key)) {
        return acc;
      }

      const value = (obj as Record<string, any>)[key];

      // Recursively filter nested objects and arrays
      if (typeof value === "object" && value !== null) {
        const cleaned = filterIgnoredFields(value, ignoredFields) as any;
        if (
          cleaned != null &&
          (Array.isArray(cleaned) || Object.keys(cleaned).length > 0)
        ) {
          acc[key as keyof T] = cleaned;
        }
      } else {
        acc[key as keyof T] = value;
      }

      return acc;
    }, {} as Partial<T>);

    return filtered;
  }

  // Return primitives as-is
  return obj;
}

/**
 * Check if an object contains any ignored fields with non-null values
 *
 * @param obj - Object to check
 * @returns true if any ignored fields are present and non-null
 *
 * @example
 * const spec = { openapi: '3.0.3', id: 'uuid' };
 * if (hasIgnoredFields(spec)) {
 *   console.warn('Spec contains system fields');
 * }
 */
export function hasIgnoredFields(
  obj: any,
  ignoredFields: readonly string[] = OAS_IGNORED_FIELDS,
): boolean {
  if (!obj || typeof obj !== "object") return false;

  return ignoredFields.some((field) => field in obj && obj[field] != null);
}

/**
 * Ensure clean round-trip serialization of OpenAPI specs
 *
 * Removes audit fields to guarantee that:
 * YAML → parse → filter → stringify ≈ YAML (functionally equivalent)
 *
 * @param spec - OAS spec object to clean
 * @returns Cleaned spec with no audit fields
 */
export function cleanSpecForRoundTrip(spec: any): any {
  return filterIgnoredFields(spec, OAS_IGNORED_FIELDS);
}

/**
 * Validate that a spec object only contains standard OpenAPI fields
 * (no system audit fields)
 *
 * @param spec - Spec to validate
 * @returns true if spec is clean (no audit fields present)
 *
 * @example
 * if (!isCleanSpec(importedSpec)) {
 *   throw new Error('Spec contains non-standard fields');
 * }
 */
export function isCleanSpec(spec: any): boolean {
  return !hasIgnoredFields(spec);
}

/**
 * Get metadata about which ignored fields are present in an object
 * (useful for debugging/logging)
 *
 * @param obj - Object to analyze
 * @returns Array of ignored field names that are present and non-null
 *
 * @example
 * const presentFields = getIgnoredFieldsPresent(spec);
 * if (presentFields.length > 0) {
 *   console.warn(`Found unexpected fields: ${presentFields.join(', ')}`);
 * }
 */
export function getIgnoredFieldsPresent(
  obj: any,
  ignoredFields: readonly string[] = OAS_IGNORED_FIELDS,
): string[] {
  if (!obj || typeof obj !== "object") return [];

  return ignoredFields.filter((field) => field in obj && obj[field] != null);
}

/**
 * Deep clone an object with ignored fields filtered out
 *
 * @param obj - Object to clone
 * @returns Deep clone with ignored fields removed
 */
export function cloneWithoutIgnoredFields<T extends Record<string, any>>(
  obj: T,
  ignoredFields: readonly string[] = OAS_IGNORED_FIELDS,
): Partial<T> {
  return JSON.parse(JSON.stringify(filterIgnoredFields(obj, ignoredFields)));
} /**
 * Convert object to JSON string, excluding ignored fields
 *
 * @param obj - Object to stringify
 * @param space - Indentation for formatting (default: 2)
 * @returns JSON string without ignored fields
 */
export function toCleanJSON(
  obj: any,
  space: number = 2,
  ignoredFields: readonly string[] = OAS_IGNORED_FIELDS,
): string {
  const cleaned = filterIgnoredFields(obj, ignoredFields);
  return JSON.stringify(cleaned, null, space);
} /**
 * Merge two spec objects, ensuring no ignored fields are introduced
 *
 * @param base - Base spec
 * @param override - Override spec (takes precedence)
 * @returns Merged spec with ignored fields filtered
 */
export function mergeSpecsClean(base: any, override: any): any {
  const merged = { ...base, ...override };
  return filterIgnoredFields(merged);
}

/**
 * Strip ignored fields from a plain JavaScript object (in-place mutation)
 *
 * WARNING: This mutates the original object. Use `filterIgnoredFields` for immutable version.
 *
 * @param obj - Object to strip fields from (will be modified)
 */
export function stripIgnoredFieldsInPlace(
  obj: any,
  ignoredFields: readonly string[] = OAS_IGNORED_FIELDS,
): void {
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    obj.forEach((item) => stripIgnoredFieldsInPlace(item, ignoredFields));
    return;
  }

  // Delete ignored fields from object
  ignoredFields.forEach((field) => {
    delete obj[field];
  });

  // Recursively strip nested objects
  Object.values(obj).forEach((value) => {
    if (typeof value === "object" && value !== null) {
      stripIgnoredFieldsInPlace(value, ignoredFields);
    }
  });
}
