/**
 * ACCESS CONTROL UTILITIES
 *
 * CRITICAL FIX: Symbol Serialization Prevention
 * ============================================
 * Generated Thor model objects (Principal, Role, Authority) contain Symbol fields
 * that cannot be JSON serialized. When attempted, causes RTK Query to crash during
 * subscription cleanup with "Cannot convert a symbol to a string".
 *
 * SOLUTION: Two-layer sanitization
 * 1. WRITE (writeStoredPrincipal): Extract ONLY primitive fields + string arrays before stringify
 *    - roleList[] → roleNames[] (extract name/id only)
 *    - authorityList[] → authorityStrings[] (extract string representation)
 * 2. READ (coercePrincipalFromString): Rebuild Principal from stored primitives only
 *    - Never re-serialize complex objects back to storage
 *
 * Result: sessionStorage contains only safe, serializable data.
 * All code reading Principal from storage gets properly reconstructed objects.
 */

import { useMemo, useSyncExternalStore } from "react";
import { Principal, Role, Authority } from "@thor/model";

const STORAGE_KEY = "authenticatedPrincipal";
const PRINCIPAL_STORAGE_EVENT = "principal-storage-changed";
const ROLE_PREFIX = "ROLE_";
const JWT_STORAGE_KEY = "jwtToken";
const AUTH_TOKEN_KEY = "authToken";
const AUTH_USER_STORAGE_KEY = "authenticatedUser";
const JWT_PERSIST_FLAG_KEY = "valoride.persistJwt";

type PrincipalLike = Principal | Record<string, any>;

/**
 * CRITICAL: Global JSON.stringify replacer to filter out Symbol fields
 * RTK Query may try to serialize Principal objects; this ensures Symbols are skipped
 */
const safeReplacer = (key: string, value: any): any => {
  // Skip Symbol properties completely
  if (typeof value === "symbol") {
    return undefined;
  }
  // Skip Symbol-keyed properties (if they somehow slip through)
  if (key === "" && typeof value === "object" && value !== null) {
    const cleaned: any = {};
    for (const k in value) {
      if (typeof k === "string" && typeof value[k] !== "symbol") {
        cleaned[k] = value[k];
      }
    }
    return cleaned;
  }
  return value;
};

const normalizeRoleName = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const normalized = value.toUpperCase();
  return normalized.startsWith(ROLE_PREFIX)
    ? normalized
    : `${ROLE_PREFIX}${normalized}`;
};

const normalizePrincipalShape = (
  principal?: PrincipalLike | null,
): Principal | null => {
  if (!principal) {
    return null;
  }
  try {
    const existing: Record<string, unknown> = { ...(principal as any) };
    const derivedId =
      existing.id ??
      existing.principalId ??
      existing.ownerId ??
      existing.username ??
      existing.email ??
      null;
    if (!derivedId) {
      console.warn(
        "accessControl: principal has no stable identifier; downstream lookups may fail",
        principal,
      );
    }
    const resolvedId = derivedId ? String(derivedId) : undefined;
    const normalized: Principal = {
      username: typeof existing.username === "string" ? existing.username : "",
      password: typeof existing.password === "string" ? existing.password : "",
      email: typeof existing.email === "string" ? existing.email : "",
      roleList: Array.isArray(existing.roleList)
        ? (existing.roleList as Role[])
        : [],
      authorityList: Array.isArray(existing.authorityList)
        ? (existing.authorityList as Authority[])
        : [],
      ...(principal as any),
      id: (principal as any).id ?? resolvedId,
      ownerId: (principal as any).ownerId ?? resolvedId,
    };
    return normalized;
  } catch (error) {
    console.warn("Unable to normalize principal shape", error);
    return null;
  }
};

/**
 * Principal is now stored and retrieved with REAL field names (roleList, authorityList).
 * No conversion functions needed - we use the actual model everywhere.
 */

/**
 * WRAPPER: Parse Principal from storage, sanitizing Symbol fields.
 * When JSON.stringify + parse happens on Principal objects, Symbols get corrupted.
 * This wrapper reads back the REAL Principal model with REAL field names.
 */
const coercePrincipalFromString = (
  raw: string | null | undefined,
): Principal | null => {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);

    // STANDARDIZE ON REAL MODEL: Use exact same field names as Principal.tsx
    // Support both 'roleList' (correct) and 'roles' (legacy fallback from server error)
    if (parsed && typeof parsed === "object") {
      const safe: any = {
        id: parsed.id,
        username: parsed.username,
        email: parsed.email,
        principalId: parsed.principalId,
        ownerId: parsed.ownerId,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        middleName: parsed.middleName,
        phone: parsed.phone,
        bio: parsed.bio,
        avatarUrl: parsed.avatarUrl,
        // Support both 'roleList' (correct) and 'roles' (legacy fallback)
        roleList: parsed.roleList || parsed.roles || [],
        authorityList: parsed.authorityList || [],
      };
      // Filter out undefined values
      Object.keys(safe).forEach((k) => safe[k] === undefined && delete safe[k]);
      return normalizePrincipalShape(safe as Principal);
    }

    return normalizePrincipalShape(parsed ?? null);
  } catch (error) {
    console.warn("Failed to parse stored authenticated principal", error);
    return null;
  }
};

export const resolvePrincipal = (
  candidate?: PrincipalLike | string | null,
): Principal | null => {
  if (candidate === null || candidate === undefined) {
    return null;
  }
  if (typeof candidate === "string") {
    return coercePrincipalFromString(candidate);
  }
  return normalizePrincipalShape(candidate ?? null);
};

let cachedPrincipalRaw: string | null | undefined;
let cachedPrincipalValue: Principal | null = null;

const syncPrincipalCache = (
  raw: string | null | undefined,
): Principal | null => {
  if (raw === cachedPrincipalRaw) {
    return cachedPrincipalValue;
  }
  cachedPrincipalRaw = raw;
  cachedPrincipalValue = coercePrincipalFromString(raw);
  return cachedPrincipalValue;
};

export const readStoredPrincipal = (): Principal | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const value = syncPrincipalCache(raw);
    if (value && raw) {
      try {
        const parsedRaw = JSON.parse(raw);
        if (
          parsedRaw &&
          (parsedRaw.id === undefined || parsedRaw.id === null) &&
          value.id
        ) {
          // CRITICAL: Sanitize before re-stringify to remove any Symbol corruption
          const sanitized = sanitizePrincipalForStorage(value);
          const normalizedString = JSON.stringify(sanitized ?? {});
          sessionStorage.setItem(STORAGE_KEY, normalizedString);
          cachedPrincipalRaw = normalizedString;
        }
      } catch {
        /* noop */
      }
    }
    return value;
  } catch (error) {
    console.warn("Unable to read stored principal", error);
    cachedPrincipalRaw = undefined;
    cachedPrincipalValue = null;
    return null;
  }
};

const dispatchPrincipalChange = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(PRINCIPAL_STORAGE_EVENT));
};

/**
 * Sanitize Principal to safe serializable object before stringify.
 * Removes Symbol fields and complex objects that cannot be JSON serialized.
 * CRITICAL: Keeps the REAL model structure - roleList stays roleList, authorityList stays authorityList
 */
const sanitizePrincipalForStorage = (
  principal: Principal | PrincipalLike | null,
): Record<string, any> | null => {
  if (!principal) return null;

  try {
    const p = principal as any;

    // Convert roleList items to strings (they might be objects with Symbols)
    const roleList = Array.isArray(p.roleList)
      ? p.roleList.map((r: any) => {
          if (typeof r === "string") return r;
          if (r && typeof r === "object") {
            // If it's an object, try to get the string representation
            return (
              r.roleName ||
              r.role ||
              r.name ||
              r.authority ||
              String(r).replace(/\[object Object\]/g, "")
            );
          }
          return String(r);
        })
      : undefined;

    // Convert authorityList items to strings (they might be objects with Symbols)
    const authorityList = Array.isArray(p.authorityList)
      ? p.authorityList.map((a: any) => {
          if (typeof a === "string") return a;
          if (a && typeof a === "object") {
            return (
              a.authority ||
              a.name ||
              a.id ||
              String(a).replace(/\[object Object\]/g, "")
            );
          }
          return String(a);
        })
      : undefined;

    // STANDARDIZE ON REAL MODEL: Use exact same field names as Principal.tsx
    const sanitized: Record<string, any> = {
      id: p.id,
      username: p.username,
      email: p.email,
      principalId: p.principalId,
      ownerId: p.ownerId,
      firstName: p.firstName,
      lastName: p.lastName,
      middleName: p.middleName,
      phone: p.phone,
      bio: p.bio,
      avatarUrl: p.avatarUrl,
      // Omit complex nested objects that might have Symbols
    };

    if (roleList !== undefined) {
      sanitized.roleList = roleList;
    }
    if (authorityList !== undefined) {
      sanitized.authorityList = authorityList;
    }

    return sanitized;
  } catch (error) {
    console.warn(
      "sanitizePrincipalForStorage: failed to sanitize principal",
      error,
    );
    return null;
  }
};

export const writeStoredPrincipal = (
  value?: PrincipalLike | string | null,
): void => {
  if (typeof window === "undefined") {
    return;
  }

  const shallowEqualPrincipal = (
    a: Principal | null,
    b: Principal | null,
  ): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    const fields: Array<keyof Principal | string> = [
      "id",
      "username",
      "email",
      "ownerId",
      "principalId",
      "firstName",
      "lastName",
      "middleName",
      "avatarUrl",
    ];
    for (const f of fields) {
      if ((a as any)[f] !== (b as any)[f]) return false;
    }
    const normalizeRoles = (list?: any[]) =>
      Array.isArray(list)
        ? list
            .map((r) => {
              if (!r) return null;
              if (typeof r === "string") return r;
              return r.roleName || r.name || r.authority || r.role || null;
            })
            .filter(Boolean)
            .join("|")
        : "";
    if (
      normalizeRoles((a as any).roleList) !==
      normalizeRoles((b as any).roleList)
    ) {
      return false;
    }
    if (
      normalizeRoles((a as any).authorityList) !==
      normalizeRoles((b as any).authorityList)
    ) {
      return false;
    }
    return true;
  };

  try {
    if (value === null || value === undefined) {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
      try {
        window.localStorage?.removeItem(STORAGE_KEY);
        window.localStorage?.removeItem(AUTH_USER_STORAGE_KEY);
      } catch {
        /* ignore localStorage issues */
      }
      syncPrincipalCache(null);
    } else {
      let normalizedValue: Principal | null = null;
      let sanitized: Record<string, any> | null = null;
      let serialized: string;
      if (typeof value === "string") {
        normalizedValue = coercePrincipalFromString(value);
        // Sanitize before stringify to remove Symbols
        sanitized = sanitizePrincipalForStorage(normalizedValue);
        serialized = sanitized ? JSON.stringify(sanitized) : value;
      } else {
        normalizedValue = normalizePrincipalShape(value ?? null);
        // CRITICAL: Sanitize before stringify to remove Symbol corruption
        sanitized = sanitizePrincipalForStorage(normalizedValue);
        serialized = JSON.stringify(sanitized ?? {});
      }
      const existing = sessionStorage.getItem(STORAGE_KEY);
      const resolvedExisting = resolvePrincipal(existing || null);
      // Short-circuit if nothing meaningful changed to avoid storage events/re-renders
      if (
        existing === serialized ||
        shallowEqualPrincipal(resolvedExisting, normalizedValue)
      ) {
        cachedPrincipalRaw = existing || serialized;
        cachedPrincipalValue = resolvedExisting ?? normalizedValue;
        return;
      }
      sessionStorage.setItem(STORAGE_KEY, serialized);
      sessionStorage.setItem(AUTH_USER_STORAGE_KEY, serialized);
      try {
        window.localStorage?.setItem(STORAGE_KEY, serialized);
        window.localStorage?.setItem(AUTH_USER_STORAGE_KEY, serialized);
      } catch {
        /* ignore localStorage issues */
      }
      cachedPrincipalRaw = serialized;
      const resolved = resolvePrincipal(serialized);
      cachedPrincipalValue = resolved ?? syncPrincipalCache(serialized);
    }
  } catch (error) {
    console.warn("Unable to persist authenticated principal", error);
    cachedPrincipalRaw = undefined;
    cachedPrincipalValue = null;
  } finally {
    dispatchPrincipalChange();
  }
};

export const clearStoredPrincipal = (_reason?: string) =>
  writeStoredPrincipal(null);

export const storeJwtToken = (token?: string | null, source?: string): void => {
  if (typeof window === "undefined") {
    return;
  }
  if (token === null || token === undefined) {
    clearStoredJwtToken(source);
    return;
  }

  try {
    sessionStorage.setItem(JWT_STORAGE_KEY, token);

    const persistFlag =
      window.localStorage?.getItem(JWT_PERSIST_FLAG_KEY)?.toLowerCase() ??
      "true";
    const shouldPersist = persistFlag !== "false" && persistFlag !== "0";

    if (shouldPersist) {
      window.localStorage?.setItem(JWT_STORAGE_KEY, token);
      window.localStorage?.setItem(AUTH_TOKEN_KEY, token);
    } else {
      window.localStorage?.removeItem(JWT_STORAGE_KEY);
      window.localStorage?.removeItem(AUTH_TOKEN_KEY);
    }

    window.dispatchEvent?.(
      new CustomEvent("jwtTokenChanged", {
        detail: { token, source },
      }),
    );
  } catch (error) {
    console.warn("Unable to persist JWT token", error);
  }
};

export const clearStoredJwtToken = (source?: string): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(JWT_STORAGE_KEY);
    window.localStorage?.removeItem(JWT_STORAGE_KEY);
    window.localStorage?.removeItem(AUTH_TOKEN_KEY);
    window.dispatchEvent?.(
      new CustomEvent("jwtTokenChanged", {
        detail: { token: null, source },
      }),
    );
  } catch (error) {
    console.warn("Unable to clear JWT token", error);
  }
};

export const hydrateStoredCredentials = (source?: string) => {
  let token: string | undefined;
  let principal: Principal | null = null;

  if (typeof window === "undefined") {
    return { token, principal };
  }

  try {
    const persistedToken =
      window.localStorage?.getItem(JWT_STORAGE_KEY) ||
      window.localStorage?.getItem(AUTH_TOKEN_KEY);

    if (persistedToken) {
      token = persistedToken;
      sessionStorage.setItem(JWT_STORAGE_KEY, persistedToken);
    }

    const persistedPrincipalRaw =
      window.localStorage?.getItem(STORAGE_KEY) ||
      window.localStorage?.getItem(AUTH_USER_STORAGE_KEY);

    if (persistedPrincipalRaw) {
      principal = resolvePrincipal(persistedPrincipalRaw);
      writeStoredPrincipal(principal ?? null);
    }

    if (token || principal) {
      window.dispatchEvent?.(
        new CustomEvent("credentialsHydrated", {
          detail: { token, principal, source },
        }),
      );
    }
  } catch (error) {
    console.warn("Unable to hydrate stored credentials", error);
  }

  return { token, principal };
};

const subscribeToPrincipalStore = (listener: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleCustomEvent = () => listener();
  const handleStorageEvent = (event: StorageEvent) => {
    if (
      event.storageArea === window.sessionStorage &&
      event.key === STORAGE_KEY
    ) {
      listener();
    }
  };

  window.addEventListener(PRINCIPAL_STORAGE_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(PRINCIPAL_STORAGE_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
};

const getStoredPrincipalSnapshot = () => readStoredPrincipal();

export const useStoredPrincipal = () =>
  useSyncExternalStore(
    subscribeToPrincipalStore,
    getStoredPrincipalSnapshot,
    getStoredPrincipalSnapshot,
  );

const extractRolesFromRoleList = (
  roleList?: Array<Role | null | undefined>,
): string[] => {
  if (!roleList || !Array.isArray(roleList)) {
    return [];
  }
  return roleList
    .map((role) => {
      if (!role) {
        return null;
      }
      if (typeof role === "string") {
        return normalizeRoleName(role);
      }
      const name =
        role.roleName ??
        (role as any).role ??
        (role as any).name ??
        (role as any).authority;
      return normalizeRoleName(typeof name === "string" ? name : null);
    })
    .filter((roleName): roleName is string => Boolean(roleName));
};

const extractRolesFromAuthorities = (
  authorityList?: Array<Authority | null | undefined>,
): string[] => {
  if (!authorityList || !Array.isArray(authorityList)) {
    return [];
  }
  return authorityList
    .map((authority) => {
      if (!authority) return null;
      // Handle string authorities (after sanitization, they are strings)
      if (typeof authority === "string") {
        return normalizeRoleName(authority);
      }
      // Handle object authorities
      return normalizeRoleName(authority?.authority ?? null);
    })
    .filter((roleName): roleName is string => Boolean(roleName));
};

export const getPrincipalRoles = (
  principal: Principal | null | undefined,
): string[] => {
  if (!principal) {
    return [];
  }

  try {
    const roleList = (principal as any).roleList;
    const authorityList = (principal as any).authorityList;

    const deduped = new Set<string>();
    const rolesFromRoleList = extractRolesFromRoleList(roleList);
    const rolesFromAuthorities = extractRolesFromAuthorities(authorityList);

    rolesFromRoleList?.forEach((role) => deduped.add(role));
    rolesFromAuthorities?.forEach((role) => deduped.add(role));

    return Array.from(deduped);
  } catch (error) {
    console.warn("getPrincipalRoles: failed to read roles", error);
    return [];
  }
};

export const principalHasRole = (
  principal: Principal | null | undefined,
  role: string,
): boolean => {
  if (!principal || !role) {
    return false;
  }
  const target = normalizeRoleName(role);
  if (!target) {
    return false;
  }
  return getPrincipalRoles(principal).some((current) => current === target);
};

export const principalIsAdmin = (
  principal: Principal | null | undefined,
): boolean => principalHasRole(principal, "ADMIN");

export const principalOwns = (
  principal: Principal | null | undefined,
  ...ownerIds: Array<string | number | null | undefined>
): boolean => {
  if (!principal?.id) {
    return false;
  }
  const principalId = String(principal.id).toLowerCase();
  const normalizeOwnerId = (
    candidate: string | number | null | undefined,
  ): string | null => {
    if (candidate === null || candidate === undefined) {
      return null;
    }
    try {
      return String(candidate).toLowerCase();
    } catch (error) {
      console.warn("Unable to normalize owner identifier", candidate, error);
      return null;
    }
  };

  return ownerIds
    .map((candidate) => normalizeOwnerId(candidate))
    .filter((candidate): candidate is string => Boolean(candidate))
    .some((candidate) => candidate === principalId);
};

export const useAccessControl = (
  principalSource?: Principal | string | null,
) => {
  const storedPrincipal = useStoredPrincipal();
  return useMemo(() => {
    const principal =
      principalSource === undefined
        ? storedPrincipal
        : resolvePrincipal(principalSource);

    const roles = getPrincipalRoles(principal);
    const hasRole = (role: string) => principalHasRole(principal, role);
    const isAdmin = principalIsAdmin(principal);
    const isOwner = (...ownerIds: Array<string | number | null | undefined>) =>
      principalOwns(principal, ...ownerIds);

    return {
      principal,
      roles,
      hasRole,
      isAdmin,
      isOwner,
    };
  }, [principalSource, storedPrincipal]);
};

export const accessControl = {
  readStoredPrincipal,
  writeStoredPrincipal,
  clearStoredPrincipal,
  storeJwtToken,
  clearStoredJwtToken,
  hydrateStoredCredentials,
  resolvePrincipal,
  getPrincipalRoles,
  principalHasRole,
  principalIsAdmin,
  principalOwns,
};

export type AccessControlHelpers = ReturnType<typeof useAccessControl>;
