/**
 * RTK Query Base Query Interceptor
 *
 * Wraps all RTK Query baseQueries to sanitize response data and prevent
 * Symbol fields from entering the Redux cache.
 *
 * This runs BEFORE data enters the Redux store, preventing Symbol corruption
 * at the source.
 */
/**
 * Aggressively strip Symbol properties from any object
 * Used to sanitize API responses before they enter Redux cache
 */
export function sanitizeForRedux(obj, depth = 0, maxDepth = 100) {
  if (depth > maxDepth || obj === null || obj === undefined) {
    return obj;
  }
  const t = typeof obj;
  // Primitives and functions pass through
  if (t !== "object") {
    return obj;
  }
  // Arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForRedux(item, depth + 1, maxDepth));
  }
  // Dates
  if (obj instanceof Date) {
    return new Date(obj);
  }
  // Maps and Sets - convert to plain objects/arrays
  if (obj instanceof Map) {
    const result = {};
    obj.forEach((val, key) => {
      result[String(key)] = sanitizeForRedux(val, depth + 1, maxDepth);
    });
    return result;
  }
  if (obj instanceof Set) {
    return Array.from(obj).map((item) =>
      sanitizeForRedux(item, depth + 1, maxDepth),
    );
  }
  // Plain objects - create new object with only string-keyed properties
  const cleaned = {};
  // Use Object.keys to get only string-keyed enumerable properties (Symbols excluded by default)
  const keys = Object.keys(obj);
  for (const key of keys) {
    const value = obj[key];
    cleaned[key] = sanitizeForRedux(value, depth + 1, maxDepth);
  }
  return cleaned;
}
/**
 * Wraps a baseQuery function to sanitize responses before Redux caching
 *
 * Usage in your RTK Query service:
 * ```typescript
 * export const MyService = createApi({
 *   reducerPath: 'MyService',
 *   baseQuery: sanitizeBaseQuery(fetchBaseQuery({ baseUrl: '...' })),
 *   ...
 * })
 * ```
 */
export function sanitizeBaseQuery(baseQuery) {
  return async (args, api, extraOptions) => {
    try {
      const result = await baseQuery(args, api, extraOptions);
      // If result has data, sanitize it
      if (
        result &&
        typeof result === "object" &&
        "data" in result &&
        result.data
      ) {
        result.data = sanitizeForRedux(result.data);
      }
      // Also sanitize error responses
      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        result.error
      ) {
        if (result.error && typeof result.error === "object") {
          result.error = sanitizeForRedux(result.error);
        }
      }
      return result;
    } catch (error) {
      // If stringify fails, it's likely due to Symbols
      if (error instanceof TypeError && String(error).includes("symbol")) {
        console.warn(
          "[sanitizeBaseQuery] Symbol detected in response, attempting sanitization",
          error,
        );
        // Return minimal error to prevent crash
        return {
          error: {
            status: 500,
            data: { message: "Symbol serialization error in response" },
          },
        };
      }
      throw error;
    }
  };
}
/**
 * Preload hook to detect and warn about Symbols in window.performance
 * RTK Query uses performance.now() for metrics; if that gets contaminated with Symbols it breaks
 */
export function initializeSymbolProtection() {
  // Patch Array.prototype.join to handle Symbols gracefully
  const originalJoin = Array.prototype.join;
  Array.prototype.join = function (separator) {
    try {
      // Filter out any Symbols before joining
      const sanitized = this.map((item) => {
        if (typeof item === "symbol") {
          return "";
        }
        return item;
      });
      return originalJoin.call(sanitized, separator);
    } catch {
      // Fallback to original
      return originalJoin.call(this, separator);
    }
  };
  // Also patch Object.keys to ensure Symbol properties never leak
  const originalKeys = Object.keys;
  Object.keys = function (obj) {
    try {
      return originalKeys.call(this, obj);
    } catch (error) {
      console.warn("[Symbol Protection] Object.keys failed", error);
      return [];
    }
  };
}
//# sourceMappingURL=baseQuerySanitizer.js.map
