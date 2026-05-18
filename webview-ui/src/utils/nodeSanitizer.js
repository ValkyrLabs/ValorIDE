/**
 * Sanitize a node for Redux storage by removing React elements and Symbols
 * Recursively cleans all non-serializable data
 */
export function sanitizeNodeForRedux(node) {
  if (!node) {
    return node;
  }
  return {
    ...node,
    data: sanitizeNodeData(node.data),
  };
}
/**
 * Sanitize node data, removing React elements and Symbols
 */
export function sanitizeNodeData(data, depth = 0, maxDepth = 50) {
  if (depth > maxDepth) {
    return data;
  }
  // Null/undefined/primitives
  if (data === null || data === undefined) {
    return data;
  }
  const t = typeof data;
  if (t !== "object") {
    return data;
  }
  // Filter out React elements (detected by $$typeof Symbol)
  if (
    data.$$typeof !== undefined ||
    data._owner !== undefined ||
    data._store !== undefined
  ) {
    // This is a React element, remove it
    return undefined;
  }
  // Arrays - filter out React elements
  if (Array.isArray(data)) {
    return data
      .map((item) => sanitizeNodeData(item, depth + 1, maxDepth))
      .filter((item) => item !== undefined);
  }
  // Dates
  if (data instanceof Date) {
    return data.toISOString();
  }
  // Maps/Sets - convert to plain objects/arrays
  if (data instanceof Map) {
    const result = {};
    data.forEach((val, key) => {
      const cleaned = sanitizeNodeData(val, depth + 1, maxDepth);
      if (cleaned !== undefined) {
        result[String(key)] = cleaned;
      }
    });
    return result;
  }
  if (data instanceof Set) {
    return Array.from(data)
      .map((item) => sanitizeNodeData(item, depth + 1, maxDepth))
      .filter((item) => item !== undefined);
  }
  // Plain objects - filter out non-serializable properties
  const cleaned = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      // Skip Symbol keys
      if (typeof key === "symbol") {
        continue;
      }
      // Skip common React-internal properties
      if (
        key === "$$typeof" ||
        key === "_owner" ||
        key === "_store" ||
        key === "_self" ||
        key === "ref" ||
        key.startsWith("__")
      ) {
        continue;
      }
      const sanitized = sanitizeNodeData(value, depth + 1, maxDepth);
      if (sanitized !== undefined) {
        cleaned[key] = sanitized;
      }
    }
  }
  return cleaned;
}
/**
 * Sanitize all nodes in an array
 */
export function sanitizeNodesForRedux(nodes) {
  return nodes.map((node) => sanitizeNodeForRedux(node));
}
//# sourceMappingURL=nodeSanitizer.js.map
