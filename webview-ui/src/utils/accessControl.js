"use strict";
/**
 * ACCESS CONTROL UTILITIES
 *
 * CRITICAL FIX: Symbol Serialization Prevention
 * ============================================
 * Generated ThorAPI model objects (Principal, Role, Authority) contain Symbol fields
 * that cannot be JSON serialized. When attempted, causes RTK Query to crash during
 * subscription cleanup with "Cannot convert a symbol to a string".
 *
 * SOLUTION: Two-layer sanitization
 * 1. WRITE (writeStoredPrincipal): Extract ONLY primitive fields + string arrays before stringify
 *    - roles[] → roleNames[] (extract name/id only)
 *    - grantedAuthorities[] → authorityStrings[] (extract string representation)
 * 2. READ (coercePrincipalFromString): Rebuild Principal from stored primitives only
 *    - Never re-serialize complex objects back to storage
 *
 * Result: sessionStorage contains only safe, serializable data.
 * All code reading Principal from storage gets properly reconstructed objects.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessControl = exports.useAccessControl = exports.principalOwns = exports.principalIsAdmin = exports.principalHasRole = exports.getPrincipalRoles = exports.useStoredPrincipal = exports.hydrateStoredCredentials = exports.clearStoredAuthSession = exports.clearReadableAuthCookies = exports.clearStoredJwtToken = exports.storeJwtToken = exports.clearStoredPrincipal = exports.writeStoredPrincipal = exports.readStoredPrincipal = exports.resolvePrincipal = void 0;
const react_1 = require("react");
const STORAGE_KEY = "authenticatedPrincipal";
const PRINCIPAL_STORAGE_EVENT = "principal-storage-changed";
const ROLE_PREFIX = "ROLE_";
const JWT_STORAGE_KEY = "jwtToken";
const AUTH_TOKEN_KEY = "authToken";
const AUTH_USER_STORAGE_KEY = "authenticatedUser";
const JWT_PERSIST_FLAG_KEY = "valoride.persistJwt";
const AUTH_SESSION_INVALIDATED_EVENT = "authSessionInvalidated";
const AUTH_STORAGE_KEYS = [
    STORAGE_KEY,
    AUTH_USER_STORAGE_KEY,
    JWT_STORAGE_KEY,
    AUTH_TOKEN_KEY,
    "jwtSession",
    "auth_token",
    "valoride_jwt",
    "temp_auth_token",
    "VALKYR_AUTH",
    "2fa_methods",
    "oauth_post_login_redirect",
    "oauth_last_event",
    "remember_me",
];
const AUTH_COOKIE_NAMES = [
    "jwtSession",
    "jwtToken",
    "auth_token",
    "valoride_jwt",
    "temp_auth_token",
    "VALKYR_AUTH",
    "JSESSIONID",
    "SESSION",
    "XSRF-TOKEN",
];
/**
 * CRITICAL: Global JSON.stringify replacer to filter out Symbol fields
 * RTK Query may try to serialize Principal objects; this ensures Symbols are skipped
 */
const safeReplacer = (key, value) => {
    // Skip Symbol properties completely
    if (typeof value === "symbol") {
        return undefined;
    }
    // Skip Symbol-keyed properties (if they somehow slip through)
    if (key === "" && typeof value === "object" && value !== null) {
        const cleaned = {};
        for (const k in value) {
            if (typeof k === "string" && typeof value[k] !== "symbol") {
                cleaned[k] = value[k];
            }
        }
        return cleaned;
    }
    return value;
};
const normalizeRoleName = (value) => {
    if (!value) {
        return null;
    }
    const normalized = value.toUpperCase();
    return normalized.startsWith(ROLE_PREFIX)
        ? normalized
        : `${ROLE_PREFIX}${normalized}`;
};
const normalizePrincipalShape = (principal) => {
    if (!principal) {
        return null;
    }
    try {
        const existing = { ...principal };
        const derivedId = existing.id ??
            existing.principalId ??
            existing.ownerId ??
            existing.username ??
            existing.email ??
            null;
        if (!derivedId) {
            console.warn("accessControl: principal has no stable identifier; downstream lookups may fail", principal);
        }
        const resolvedId = derivedId ? String(derivedId) : undefined;
        const normalized = {
            username: typeof existing.username === "string" ? existing.username : "",
            password: typeof existing.password === "string" ? existing.password : "",
            email: typeof existing.email === "string" ? existing.email : "",
            ...principal,
            roles: Array.isArray(existing.roles)
                ? existing.roles
                : Array.isArray(existing.roleList)
                    ? existing.roleList
                    : [],
            grantedAuthorities: Array.isArray(existing.grantedAuthorities)
                ? existing.grantedAuthorities
                : Array.isArray(existing.authorityList)
                    ? existing.authorityList
                    : [],
            id: principal.id ?? resolvedId,
            ownerId: principal.ownerId ?? resolvedId,
        };
        return normalized;
    }
    catch (error) {
        console.warn("Unable to normalize principal shape", error);
        return null;
    }
};
/**
 * Principal is stored with current ThorAPI field names, while reads still accept legacy
 * roleList/authorityList payloads that may already exist in a user's webview storage.
 */
/**
 * WRAPPER: Parse Principal from storage, sanitizing Symbol fields.
 * When JSON.stringify + parse happens on Principal objects, Symbols get corrupted.
 * This wrapper reads back the REAL Principal model with REAL field names.
 */
const coercePrincipalFromString = (raw) => {
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw);
        // Support both current and legacy role/authority names while normalizing storage.
        if (parsed && typeof parsed === "object") {
            const safe = {
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
                roles: parsed.roles || parsed.roleList || [],
                grantedAuthorities: parsed.grantedAuthorities || parsed.authorityList || [],
            };
            // Filter out undefined values
            Object.keys(safe).forEach((k) => safe[k] === undefined && delete safe[k]);
            return normalizePrincipalShape(safe);
        }
        return normalizePrincipalShape(parsed ?? null);
    }
    catch (error) {
        console.warn("Failed to parse stored authenticated principal", error);
        return null;
    }
};
const resolvePrincipal = (candidate) => {
    if (candidate === null || candidate === undefined) {
        return null;
    }
    if (typeof candidate === "string") {
        return coercePrincipalFromString(candidate);
    }
    return normalizePrincipalShape(candidate ?? null);
};
exports.resolvePrincipal = resolvePrincipal;
let cachedPrincipalRaw;
let cachedPrincipalValue = null;
const syncPrincipalCache = (raw) => {
    if (raw === cachedPrincipalRaw) {
        return cachedPrincipalValue;
    }
    cachedPrincipalRaw = raw;
    cachedPrincipalValue = coercePrincipalFromString(raw);
    return cachedPrincipalValue;
};
const readStoredPrincipal = () => {
    if (typeof window === "undefined") {
        return null;
    }
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        const value = syncPrincipalCache(raw);
        if (value && raw) {
            try {
                const parsedRaw = JSON.parse(raw);
                if (parsedRaw &&
                    (parsedRaw.id === undefined || parsedRaw.id === null) &&
                    value.id) {
                    // CRITICAL: Sanitize before re-stringify to remove any Symbol corruption
                    const sanitized = sanitizePrincipalForStorage(value);
                    const normalizedString = JSON.stringify(sanitized ?? {});
                    sessionStorage.setItem(STORAGE_KEY, normalizedString);
                    cachedPrincipalRaw = normalizedString;
                }
            }
            catch {
                /* noop */
            }
        }
        return value;
    }
    catch (error) {
        console.warn("Unable to read stored principal", error);
        cachedPrincipalRaw = undefined;
        cachedPrincipalValue = null;
        return null;
    }
};
exports.readStoredPrincipal = readStoredPrincipal;
const dispatchPrincipalChange = () => {
    if (typeof window === "undefined") {
        return;
    }
    window.dispatchEvent(new Event(PRINCIPAL_STORAGE_EVENT));
};
/**
 * Sanitize Principal to safe serializable object before stringify.
 * Removes Symbol fields and complex objects that cannot be JSON serialized.
 * CRITICAL: Keeps the current model structure while accepting legacy roleList/authorityList input.
 */
const sanitizePrincipalForStorage = (principal) => {
    if (!principal)
        return null;
    try {
        const p = principal;
        // Convert role items to strings (they might be objects with Symbols)
        const rawRoles = Array.isArray(p.roles)
            ? p.roles
            : Array.isArray(p.roleList)
                ? p.roleList
                : undefined;
        const roles = rawRoles
            ? rawRoles.map((r) => {
                if (typeof r === "string")
                    return r;
                if (r && typeof r === "object") {
                    // If it's an object, try to get the string representation
                    return (r.roleName ||
                        r.role ||
                        r.name ||
                        r.authority ||
                        String(r).replace(/\[object Object\]/g, ""));
                }
                return String(r);
            })
            : undefined;
        // Convert authority items to strings (they might be objects with Symbols)
        const rawAuthorities = Array.isArray(p.grantedAuthorities)
            ? p.grantedAuthorities
            : Array.isArray(p.authorityList)
                ? p.authorityList
                : undefined;
        const grantedAuthorities = rawAuthorities
            ? rawAuthorities.map((a) => {
                if (typeof a === "string")
                    return a;
                if (a && typeof a === "object") {
                    return (a.authority ||
                        a.name ||
                        a.id ||
                        String(a).replace(/\[object Object\]/g, ""));
                }
                return String(a);
            })
            : undefined;
        const sanitized = {
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
        if (roles !== undefined) {
            sanitized.roles = roles;
        }
        if (grantedAuthorities !== undefined) {
            sanitized.grantedAuthorities = grantedAuthorities;
        }
        return sanitized;
    }
    catch (error) {
        console.warn("sanitizePrincipalForStorage: failed to sanitize principal", error);
        return null;
    }
};
const writeStoredPrincipal = (value) => {
    if (typeof window === "undefined") {
        return;
    }
    const shallowEqualPrincipal = (a, b) => {
        if (a === b)
            return true;
        if (!a || !b)
            return false;
        const fields = [
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
            if (a[f] !== b[f])
                return false;
        }
        const normalizeRoles = (list) => Array.isArray(list)
            ? list
                .map((r) => {
                if (!r)
                    return null;
                if (typeof r === "string")
                    return r;
                return r.roleName || r.name || r.authority || r.role || null;
            })
                .filter(Boolean)
                .join("|")
            : "";
        if (normalizeRoles(a.roles ?? a.roleList) !==
            normalizeRoles(b.roles ?? b.roleList)) {
            return false;
        }
        if (normalizeRoles(a.grantedAuthorities ?? a.authorityList) !==
            normalizeRoles(b.grantedAuthorities ?? b.authorityList)) {
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
            }
            catch {
                /* ignore localStorage issues */
            }
            syncPrincipalCache(null);
        }
        else {
            let normalizedValue = null;
            let sanitized = null;
            let serialized;
            if (typeof value === "string") {
                normalizedValue = coercePrincipalFromString(value);
                // Sanitize before stringify to remove Symbols
                sanitized = sanitizePrincipalForStorage(normalizedValue);
                serialized = sanitized ? JSON.stringify(sanitized) : value;
            }
            else {
                normalizedValue = normalizePrincipalShape(value ?? null);
                // CRITICAL: Sanitize before stringify to remove Symbol corruption
                sanitized = sanitizePrincipalForStorage(normalizedValue);
                serialized = JSON.stringify(sanitized ?? {});
            }
            const existing = sessionStorage.getItem(STORAGE_KEY);
            const resolvedExisting = (0, exports.resolvePrincipal)(existing || null);
            // Short-circuit if nothing meaningful changed to avoid storage events/re-renders
            if (existing === serialized ||
                shallowEqualPrincipal(resolvedExisting, normalizedValue)) {
                cachedPrincipalRaw = existing || serialized;
                cachedPrincipalValue = resolvedExisting ?? normalizedValue;
                return;
            }
            sessionStorage.setItem(STORAGE_KEY, serialized);
            sessionStorage.setItem(AUTH_USER_STORAGE_KEY, serialized);
            try {
                window.localStorage?.setItem(STORAGE_KEY, serialized);
                window.localStorage?.setItem(AUTH_USER_STORAGE_KEY, serialized);
            }
            catch {
                /* ignore localStorage issues */
            }
            cachedPrincipalRaw = serialized;
            const resolved = (0, exports.resolvePrincipal)(serialized);
            cachedPrincipalValue = resolved ?? syncPrincipalCache(serialized);
        }
    }
    catch (error) {
        console.warn("Unable to persist authenticated principal", error);
        cachedPrincipalRaw = undefined;
        cachedPrincipalValue = null;
    }
    finally {
        dispatchPrincipalChange();
    }
};
exports.writeStoredPrincipal = writeStoredPrincipal;
const clearStoredPrincipal = (_reason) => (0, exports.writeStoredPrincipal)(null);
exports.clearStoredPrincipal = clearStoredPrincipal;
const storeJwtToken = (token, source) => {
    if (typeof window === "undefined") {
        return;
    }
    if (token === null || token === undefined) {
        (0, exports.clearStoredJwtToken)(source);
        return;
    }
    try {
        sessionStorage.setItem(JWT_STORAGE_KEY, token);
        const persistFlag = window.localStorage?.getItem(JWT_PERSIST_FLAG_KEY)?.toLowerCase() ??
            "true";
        const shouldPersist = persistFlag !== "false" && persistFlag !== "0";
        if (shouldPersist) {
            window.localStorage?.setItem(JWT_STORAGE_KEY, token);
            window.localStorage?.setItem(AUTH_TOKEN_KEY, token);
        }
        else {
            window.localStorage?.removeItem(JWT_STORAGE_KEY);
            window.localStorage?.removeItem(AUTH_TOKEN_KEY);
        }
        window.dispatchEvent?.(new CustomEvent("jwtTokenChanged", {
            detail: { token, source },
        }));
    }
    catch (error) {
        console.warn("Unable to persist JWT token", error);
    }
};
exports.storeJwtToken = storeJwtToken;
const clearStoredJwtToken = (source) => {
    if (typeof window === "undefined") {
        return;
    }
    try {
        sessionStorage.removeItem(JWT_STORAGE_KEY);
        window.localStorage?.removeItem(JWT_STORAGE_KEY);
        window.localStorage?.removeItem(AUTH_TOKEN_KEY);
        window.dispatchEvent?.(new CustomEvent("jwtTokenChanged", {
            detail: { token: null, source },
        }));
    }
    catch (error) {
        console.warn("Unable to clear JWT token", error);
    }
};
exports.clearStoredJwtToken = clearStoredJwtToken;
const removeAuthStorageKeys = (storage) => {
    if (!storage) {
        return;
    }
    for (const key of AUTH_STORAGE_KEYS) {
        try {
            storage.removeItem(key);
        }
        catch {
            // ignore storage sandbox failures
        }
    }
};
const getCookieDomains = () => {
    if (typeof window === "undefined") {
        return [undefined];
    }
    const hostname = window.location.hostname;
    if (!hostname ||
        hostname === "localhost" ||
        /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
        return [undefined];
    }
    const parts = hostname.split(".");
    const rootDomain = parts.length > 2
        ? `.${parts.slice(parts.length - 2).join(".")}`
        : undefined;
    return Array.from(new Set([undefined, hostname, `.${hostname}`, rootDomain]));
};
const getReadableCookieNames = () => {
    if (typeof document === "undefined") {
        return [...AUTH_COOKIE_NAMES];
    }
    const visibleNames = document.cookie
        .split(";")
        .map((cookie) => cookie.split("=")[0]?.trim())
        .filter((name) => Boolean(name));
    return Array.from(new Set([...visibleNames, ...AUTH_COOKIE_NAMES]));
};
const clearReadableAuthCookies = () => {
    if (typeof document === "undefined") {
        return;
    }
    const paths = new Set(["/", "/v1"]);
    if (typeof window !== "undefined" && window.location.pathname) {
        paths.add(window.location.pathname);
    }
    for (const name of getReadableCookieNames()) {
        for (const path of Array.from(paths)) {
            for (const domain of getCookieDomains()) {
                const domainPart = domain ? `; domain=${domain}` : "";
                document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domainPart}; SameSite=Lax`;
            }
        }
    }
};
exports.clearReadableAuthCookies = clearReadableAuthCookies;
const clearStoredAuthSession = (source) => {
    (0, exports.clearStoredJwtToken)(source);
    (0, exports.clearStoredPrincipal)(source);
    if (typeof window !== "undefined") {
        removeAuthStorageKeys(window.sessionStorage);
        removeAuthStorageKeys(window.localStorage);
        (0, exports.clearReadableAuthCookies)();
        window.dispatchEvent?.(new CustomEvent(AUTH_SESSION_INVALIDATED_EVENT, {
            detail: { source },
        }));
    }
};
exports.clearStoredAuthSession = clearStoredAuthSession;
const hydrateStoredCredentials = (source) => {
    let token;
    let principal = null;
    if (typeof window === "undefined") {
        return { token, principal };
    }
    try {
        const persistedToken = window.localStorage?.getItem(JWT_STORAGE_KEY) ||
            window.localStorage?.getItem(AUTH_TOKEN_KEY);
        if (persistedToken) {
            token = persistedToken;
            sessionStorage.setItem(JWT_STORAGE_KEY, persistedToken);
        }
        const persistedPrincipalRaw = window.localStorage?.getItem(STORAGE_KEY) ||
            window.localStorage?.getItem(AUTH_USER_STORAGE_KEY);
        if (persistedPrincipalRaw) {
            principal = (0, exports.resolvePrincipal)(persistedPrincipalRaw);
            (0, exports.writeStoredPrincipal)(principal ?? null);
        }
        if (token || principal) {
            window.dispatchEvent?.(new CustomEvent("credentialsHydrated", {
                detail: { token, principal, source },
            }));
        }
    }
    catch (error) {
        console.warn("Unable to hydrate stored credentials", error);
    }
    return { token, principal };
};
exports.hydrateStoredCredentials = hydrateStoredCredentials;
const subscribeToPrincipalStore = (listener) => {
    if (typeof window === "undefined") {
        return () => undefined;
    }
    const handleCustomEvent = () => listener();
    const handleStorageEvent = (event) => {
        if (event.storageArea === window.sessionStorage &&
            event.key === STORAGE_KEY) {
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
const getStoredPrincipalSnapshot = () => (0, exports.readStoredPrincipal)();
const useStoredPrincipal = () => (0, react_1.useSyncExternalStore)(subscribeToPrincipalStore, getStoredPrincipalSnapshot, getStoredPrincipalSnapshot);
exports.useStoredPrincipal = useStoredPrincipal;
const extractRolesFromRoleCollection = (roleList) => {
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
        const name = role.roleName ??
            role.role ??
            role.name ??
            role.authority;
        return normalizeRoleName(typeof name === "string" ? name : null);
    })
        .filter((roleName) => Boolean(roleName));
};
const extractRolesFromAuthorities = (authorityList) => {
    if (!authorityList || !Array.isArray(authorityList)) {
        return [];
    }
    return authorityList
        .map((authority) => {
        if (!authority)
            return null;
        // Handle string authorities (after sanitization, they are strings)
        if (typeof authority === "string") {
            return normalizeRoleName(authority);
        }
        // Handle object authorities
        return normalizeRoleName(authority?.authority ?? null);
    })
        .filter((roleName) => Boolean(roleName));
};
const getPrincipalRoles = (principal) => {
    if (!principal) {
        return [];
    }
    try {
        const roleList = principal.roles ?? principal.roleList;
        const authorityList = principal.grantedAuthorities ?? principal.authorityList;
        const deduped = new Set();
        const rolesFromRoleList = extractRolesFromRoleCollection(roleList);
        const rolesFromAuthorities = extractRolesFromAuthorities(authorityList);
        rolesFromRoleList?.forEach((role) => deduped.add(role));
        rolesFromAuthorities?.forEach((role) => deduped.add(role));
        return Array.from(deduped);
    }
    catch (error) {
        console.warn("getPrincipalRoles: failed to read roles", error);
        return [];
    }
};
exports.getPrincipalRoles = getPrincipalRoles;
const principalHasRole = (principal, role) => {
    if (!principal || !role) {
        return false;
    }
    const target = normalizeRoleName(role);
    if (!target) {
        return false;
    }
    return (0, exports.getPrincipalRoles)(principal).some((current) => current === target);
};
exports.principalHasRole = principalHasRole;
const principalIsAdmin = (principal) => (0, exports.principalHasRole)(principal, "ADMIN");
exports.principalIsAdmin = principalIsAdmin;
const principalOwns = (principal, ...ownerIds) => {
    if (!principal?.id) {
        return false;
    }
    const principalId = String(principal.id).toLowerCase();
    const normalizeOwnerId = (candidate) => {
        if (candidate === null || candidate === undefined) {
            return null;
        }
        try {
            return String(candidate).toLowerCase();
        }
        catch (error) {
            console.warn("Unable to normalize owner identifier", candidate, error);
            return null;
        }
    };
    return ownerIds
        .map((candidate) => normalizeOwnerId(candidate))
        .filter((candidate) => Boolean(candidate))
        .some((candidate) => candidate === principalId);
};
exports.principalOwns = principalOwns;
const useAccessControl = (principalSource) => {
    const storedPrincipal = (0, exports.useStoredPrincipal)();
    return (0, react_1.useMemo)(() => {
        const principal = principalSource === undefined
            ? storedPrincipal
            : (0, exports.resolvePrincipal)(principalSource);
        const roles = (0, exports.getPrincipalRoles)(principal);
        const hasRole = (role) => (0, exports.principalHasRole)(principal, role);
        const isAdmin = (0, exports.principalIsAdmin)(principal);
        const isOwner = (...ownerIds) => (0, exports.principalOwns)(principal, ...ownerIds);
        return {
            principal,
            roles,
            hasRole,
            isAdmin,
            isOwner,
        };
    }, [principalSource, storedPrincipal]);
};
exports.useAccessControl = useAccessControl;
exports.accessControl = {
    readStoredPrincipal: exports.readStoredPrincipal,
    writeStoredPrincipal: exports.writeStoredPrincipal,
    clearStoredPrincipal: exports.clearStoredPrincipal,
    storeJwtToken: exports.storeJwtToken,
    clearStoredJwtToken: exports.clearStoredJwtToken,
    clearStoredAuthSession: exports.clearStoredAuthSession,
    clearReadableAuthCookies: exports.clearReadableAuthCookies,
    hydrateStoredCredentials: exports.hydrateStoredCredentials,
    resolvePrincipal: exports.resolvePrincipal,
    getPrincipalRoles: exports.getPrincipalRoles,
    principalHasRole: exports.principalHasRole,
    principalIsAdmin: exports.principalIsAdmin,
    principalOwns: exports.principalOwns,
};
//# sourceMappingURL=accessControl.js.map