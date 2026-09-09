export interface WorkflowStudioTarget {
  workflowId: string;
  backend: string;
  executionId?: string;
}

export const isWorkflowStudioId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function canonicalBackend(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 2048 ||
    /[\s\\]/.test(value)
  )
    return null;
  try {
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/** Navigation data is untrusted and never supplies a handoff URL or credentials. */
export function parseWorkflowStudioTarget(
  value: unknown,
): WorkflowStudioTarget | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const target = value as Record<string, unknown>;
  if (
    Object.keys(target).some(
      (key) => !["workflowId", "backend", "executionId"].includes(key),
    ) ||
    !isWorkflowStudioId(target.workflowId)
  )
    return null;
  if (
    Object.prototype.hasOwnProperty.call(target, "executionId") &&
    !isWorkflowStudioId(target.executionId)
  )
    return null;
  const backend = canonicalBackend(target.backend);
  return backend
    ? {
        workflowId: target.workflowId,
        backend,
        ...(isWorkflowStudioId(target.executionId)
          ? { executionId: target.executionId }
          : {}),
      }
    : null;
}

export function assertWorkflowStudioBackend(
  expected: unknown,
  current: unknown,
): string {
  const backend = canonicalBackend(expected);
  if (!backend || backend !== canonicalBackend(current)) {
    throw new Error(
      "The ValkyrAI backend changed. Check this workflow on its original backend before opening it.",
    );
  }
  return backend;
}
