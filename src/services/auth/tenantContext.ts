export interface TenantContext {
  tenantId?: string;
  organizationId?: string;
  orgId?: string;
  tenantSchema?: string;
  customerSchema?: string;
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
  const context: TenantContext = {};

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
      record.organizationId,
      record.orgId,
      nested(record, "tenant", "id"),
      nested(record, "organization", "id"),
      principal?.tenantId,
      principal?.organizationId,
      principal?.orgId,
      nested(principal, "tenant", "id"),
      nested(principal, "organization", "id"),
    );

    const tenantSchema = firstString(
      record.tenantSchema,
      record.customerSchema,
      record.schemaName,
      nested(record, "tenant", "schema"),
      nested(record, "organization", "schemaName"),
      principal?.tenantSchema,
      principal?.customerSchema,
      principal?.schemaName,
      nested(principal, "tenant", "schema"),
      nested(principal, "organization", "schemaName"),
    );

    if (tenantId && !context.tenantId) {
      context.tenantId = tenantId;
      context.organizationId = context.organizationId ?? tenantId;
      context.orgId = context.orgId ?? tenantId;
    }
    if (tenantSchema && !context.tenantSchema) {
      context.tenantSchema = tenantSchema;
      context.customerSchema = context.customerSchema ?? tenantSchema;
    }
  }

  return context;
};

export const mergeTenantContext = (
  ...contexts: Array<TenantContext | undefined>
): TenantContext => {
  const merged: TenantContext = {};
  for (const context of contexts) {
    if (!context) {
      continue;
    }
    const tenantId = context.tenantId ?? context.organizationId ?? context.orgId;
    const tenantSchema = context.tenantSchema ?? context.customerSchema;
    if (tenantId && !merged.tenantId) {
      merged.tenantId = tenantId;
      merged.organizationId = merged.organizationId ?? tenantId;
      merged.orgId = merged.orgId ?? tenantId;
    }
    if (tenantSchema && !merged.tenantSchema) {
      merged.tenantSchema = tenantSchema;
      merged.customerSchema = merged.customerSchema ?? tenantSchema;
    }
  }
  return merged;
};

export const buildTenantHeaders = (
  context?: TenantContext,
): Record<string, string> => {
  const tenantId = context?.tenantId ?? context?.organizationId ?? context?.orgId;
  const tenantSchema = context?.tenantSchema ?? context?.customerSchema;
  const headers: Record<string, string> = {};

  if (tenantId) {
    headers["X-Tenant-Id"] = tenantId;
    headers["X-Org-Id"] = tenantId;
    headers["X-OrganizationId"] = tenantId;
    headers["X-OrgId"] = tenantId;
  }

  if (tenantSchema) {
    headers["X-Tenant-Schema"] = tenantSchema;
    headers["X-Customer-Schema"] = tenantSchema;
  }

  return headers;
};
