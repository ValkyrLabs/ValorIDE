/**
 * RTK Query Serialization Patch
 *
 * RTK Query creates cache keys by serializing query arguments.
 * If Principal objects with Symbol fields are passed as arguments,
 * the serialization fails during cleanup.
 *
 * This patches RTK Query's internal serialization to handle Symbols gracefully.
 */

/**
 * Create a safe serialization function for RTK Query cache keys
 * Handles objects with Symbol properties by excluding them
 */
export function initializeRTKQuerySymbolPatch(): void {
  // Patch Array.prototype.join specifically for RTK Query's cache key generation
  const originalJoin = Array.prototype.join;

  Array.prototype.join = function (separator: string = ","): string {
    try {
      // Map all array elements to strings, filtering Symbols
      const stringified = this.map((element: any) => {
        // If it's a Symbol, return empty string (won't break the join)
        if (typeof element === "symbol") {
          return "";
        }

        // If it's an object, try to convert safely
        if (element !== null && typeof element === "object") {
          try {
            return JSON.stringify(element, (key, val) => {
              // Skip Symbol properties in stringify
              if (typeof val === "symbol") {
                return undefined;
              }
              return val;
            });
          } catch {
            return String(element);
          }
        }

        // For primitives, use standard string conversion
        return String(element);
      });

      // Now call original join on the safe string array
      return originalJoin.call(stringified, separator);
    } catch (error) {
      // Absolute fallback
      try {
        return originalJoin.call(this, separator);
      } catch {
        // Last resort: return empty string
        return "";
      }
    }
  };

  // Also patch String() conversion for objects
  const originalToString = Object.prototype.toString;
  Object.prototype.toString = function (): string {
    try {
      // If this object has Symbol properties, convert to [object Object] safely
      if (this !== null && typeof this === "object") {
        // Check if we can stringify it safely
        try {
          JSON.stringify(this, (key, val) => {
            if (typeof val === "symbol") {
              return undefined;
            }
            return val;
          });
          // If stringify succeeded, use original toString
          return originalToString.call(this);
        } catch {
          // Stringify failed (likely due to Symbols), return safe representation
          return "[object Object]";
        }
      }
      return originalToString.call(this);
    } catch {
      return "[object Object]";
    }
  }; // Patch Object.keys to ensure it never includes Symbols (it shouldn't by spec, but be safe)
  const originalKeys = Object.keys;
  Object.keys = function (obj: any): string[] {
    try {
      const keys = originalKeys.call(this, obj);
      // Filter out any accidental Symbol-like keys
      return keys.filter((key) => typeof key === "string");
    } catch (error) {
      console.warn("[RTK Query Symbol Patch] Object.keys failed:", error);
      return [];
    }
  };

  // Patch Object.entries similarly
  const originalEntries = Object.entries;
  Object.entries = function (obj: any): [string, any][] {
    try {
      const entries = originalEntries.call(this, obj);
      // Filter out any Symbol entries and convert values safely
      return entries
        .filter(([key]) => typeof key === "string")
        .map(([key, val]) => [
          key,
          val && typeof val === "object"
            ? (() => {
                try {
                  JSON.stringify(val, (k, v) =>
                    typeof v === "symbol" ? undefined : v,
                  );
                  return val;
                } catch {
                  return String(val);
                }
              })()
            : val,
        ]);
    } catch (error) {
      console.warn("[RTK Query Symbol Patch] Object.entries failed:", error);
      return [];
    }
  };

  console.debug(
    "[RTK Query Symbol Patch] Initialized - Array.join and Object methods patched",
  );
}
