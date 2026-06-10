export interface TenantContext {
  tenantId?: string;
}

const asRecord = (value: unknown): Record<string, any> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : undefined;

const asString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  try {
    const text = String(value).trim();
    return text.length && text.toLowerCase() !== "null" ? text : undefined;
  } catch {
    return undefined;
  }
};

const parseJsonRecord = (value: unknown): Record<string, any> | undefined => {
  if (typeof value !== "string") {
    return asRecord(value);
  }
  if (!value.trim()) {
    return undefined;
  }
  try {
    return asRecord(JSON.parse(value));
  } catch {
    return undefined;
  }
};

const nested = (record: Record<string, any> | undefined, ...path: string[]) => {
  let current: any = record;
  for (const key of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = current[key];
  }
  return current;
};

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const text = asString(value);
    if (text) {
      return text;
    }
  }
  return undefined;
};

export const extractTenantContext = (...payloads: unknown[]): TenantContext => {
  for (const payload of payloads) {
    const record = parseJsonRecord(payload);
    if (!record) {
      continue;
    }

    const principal = parseJsonRecord(
      record.authenticatedPrincipalObject ??
        record.authenticatedPrincipal ??
        record.principal ??
        record.user,
    );

    const tenantId = firstString(
      record.tenantId,
      nested(record, "tenant", "id"),
      principal?.tenantId,
      nested(principal, "tenant", "id"),
    );

    if (tenantId) {
      return { tenantId };
    }
  }

  return {};
};

export const mergeTenantContext = (
  ...contexts: Array<TenantContext | undefined>
): TenantContext => {
  for (const context of contexts) {
    if (context?.tenantId) {
      return { tenantId: context.tenantId };
    }
  }
  return {};
};

export const buildTenantHeaders = (
  context?: TenantContext,
): Record<string, string> => {
  const headers: Record<string, string> = {};

  if (context?.tenantId) {
    headers["X-Tenant-Id"] = context.tenantId;
  }

  return headers;
};
