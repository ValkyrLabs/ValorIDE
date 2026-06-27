export interface TenantContext {
  tenantId?: string;
}

const TENANT_ID_KEY = "tenantId";
const AUTH_PRINCIPAL_KEY = "authenticatedPrincipal";

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
  if (typeof value !== "string" || !value.trim()) {
    return asRecord(value);
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
    const resolved = asString(value);
    if (resolved) {
      return resolved;
    }
  }
  return undefined;
};

export const extractTenantContextFromPayload = (
  ...payloads: unknown[]
): TenantContext => {
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

const readStorageValue = (storage: Storage, key: string): string | undefined => {
  try {
    return asString(storage.getItem(key));
  } catch {
    return undefined;
  }
};

const writeStorageValue = (
  storage: Storage,
  key: string,
  value: string | undefined,
): void => {
  try {
    if (value) {
      storage.setItem(key, value);
    } else {
      storage.removeItem(key);
    }
  } catch {
    // noop
  }
};

export const readStoredTenantContext = (): TenantContext => {
  if (typeof window === "undefined") {
    return {};
  }

  const tenantId = firstString(
    readStorageValue(window.sessionStorage, TENANT_ID_KEY),
    readStorageValue(window.localStorage, TENANT_ID_KEY),
  );
  if (tenantId) {
    return { tenantId };
  }

  const rawPrincipal = firstString(
    readStorageValue(window.localStorage, AUTH_PRINCIPAL_KEY),
    readStorageValue(window.sessionStorage, AUTH_PRINCIPAL_KEY),
  );
  return extractTenantContextFromPayload(rawPrincipal);
};

export const rememberTenantContextFromPayload = (
  ...payloads: unknown[]
): TenantContext => {
  const resolved = extractTenantContextFromPayload(...payloads);
  if (typeof window === "undefined") {
    return resolved;
  }

  for (const storage of [window.sessionStorage, window.localStorage]) {
    writeStorageValue(storage, TENANT_ID_KEY, resolved.tenantId);
  }

  return resolved;
};

export const applyTenantHeaders = (headers: Headers): Headers => {
  const tenantId = readStoredTenantContext().tenantId;

  if (tenantId && !headers.has("X-Tenant-Id")) {
    headers.set("X-Tenant-Id", tenantId);
  }

  return headers;
};
