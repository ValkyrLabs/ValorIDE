/**
 * Access control utilities for storing and managing user authentication state
 */
const PERSIST_FLAG_KEY = "valoride.persistJwt";
const JWT_TOKEN_KEY = "jwtToken";
const LEGACY_JWT_KEYS = ["jwtToken", "authToken"];
const PRINCIPAL_PRIMARY_KEY = "authenticatedPrincipal";
const PRINCIPAL_FALLBACK_KEY = "authenticatedUser";
const inBrowser = typeof window !== "undefined";
function dispatchJwtTokenUpdated(token, source) {
    if (!inBrowser)
        return;
    try {
        window.dispatchEvent(new CustomEvent("jwt-token-updated", {
            detail: { token, timestamp: Date.now(), source },
        }));
    }
    catch {
        // ignore
    }
}
function safeSet(storage, key, value) {
    if (!storage)
        return;
    try {
        storage.setItem(key, value);
    }
    catch {
        // ignore quota/sandbox issues
    }
}
function safeRemove(storage, key) {
    if (!storage)
        return;
    try {
        storage.removeItem(key);
    }
    catch {
        // ignore
    }
}
function safeGet(storage, key) {
    if (!storage)
        return null;
    try {
        return storage.getItem(key);
    }
    catch {
        return null;
    }
}
export function shouldPersistJwt() {
    if (!inBrowser)
        return true;
    try {
        const value = window.localStorage.getItem(PERSIST_FLAG_KEY);
        return value === null ? true : value === "true";
    }
    catch {
        return true;
    }
}
function storePrincipalInStorage(storage, principalData) {
    safeSet(storage, PRINCIPAL_PRIMARY_KEY, principalData);
    safeSet(storage, PRINCIPAL_FALLBACK_KEY, principalData);
}
/**
 * Writes the authenticated principal to storage
 * @param principal The principal object to store
 */
export function writeStoredPrincipal(principal) {
    if (!inBrowser)
        return;
    try {
        if (!principal) {
            console.warn("Cannot store null or undefined principal");
            return;
        }
        const principalData = JSON.stringify(principal);
        storePrincipalInStorage(window.sessionStorage, principalData);
        if (shouldPersistJwt()) {
            storePrincipalInStorage(window.localStorage, principalData);
        }
        else {
            safeRemove(window.localStorage, PRINCIPAL_PRIMARY_KEY);
            safeRemove(window.localStorage, PRINCIPAL_FALLBACK_KEY);
        }
    }
    catch (error) {
        console.error("Failed to store principal:", error);
    }
}
/**
 * Reads the stored principal from storage
 * @returns The stored principal or null if not found
 */
export function readStoredPrincipal() {
    if (!inBrowser)
        return null;
    try {
        let principalData = safeGet(window.sessionStorage, PRINCIPAL_PRIMARY_KEY) ??
            safeGet(window.sessionStorage, PRINCIPAL_FALLBACK_KEY);
        if (!principalData) {
            principalData =
                safeGet(window.localStorage, PRINCIPAL_PRIMARY_KEY) ??
                    safeGet(window.localStorage, PRINCIPAL_FALLBACK_KEY);
        }
        if (principalData) {
            return JSON.parse(principalData);
        }
        return null;
    }
    catch (error) {
        console.error("Failed to read stored principal:", error);
        return null;
    }
}
/**
 * Clears the stored principal from all storage locations
 */
export function clearStoredPrincipal(source = "manual") {
    if (!inBrowser)
        return;
    try {
        safeRemove(window.sessionStorage, PRINCIPAL_PRIMARY_KEY);
        safeRemove(window.sessionStorage, PRINCIPAL_FALLBACK_KEY);
        safeRemove(window.localStorage, PRINCIPAL_PRIMARY_KEY);
        safeRemove(window.localStorage, PRINCIPAL_FALLBACK_KEY);
    }
    catch (error) {
        console.error("Failed to clear stored principal:", error);
    }
}
/**
 * Persist a JWT token according to user preference.
 * Mirrors into sessionStorage, optionally localStorage, and notifies listeners.
 */
export function storeJwtToken(token, source = "manual") {
    if (!inBrowser)
        return;
    if (!token) {
        clearStoredJwtToken(source);
        return;
    }
    safeSet(window.sessionStorage, JWT_TOKEN_KEY, token);
    if (shouldPersistJwt()) {
        safeSet(window.localStorage, JWT_TOKEN_KEY, token);
        // legacy key support
        safeSet(window.localStorage, LEGACY_JWT_KEYS[1], token);
    }
    else {
        safeRemove(window.localStorage, JWT_TOKEN_KEY);
        safeRemove(window.localStorage, LEGACY_JWT_KEYS[1]);
    }
    dispatchJwtTokenUpdated(token, source);
}
/**
 * Hydrate JWT + principal from persistent storage into sessionStorage so the
 * app can treat them as active credentials.
 */
export function hydrateStoredCredentials(source = "hydrate") {
    if (!inBrowser)
        return {};
    let token = safeGet(window.sessionStorage, JWT_TOKEN_KEY) ?? undefined;
    if (!token) {
        for (const key of LEGACY_JWT_KEYS) {
            const value = safeGet(window.localStorage, key);
            if (value) {
                token = value;
                safeSet(window.sessionStorage, JWT_TOKEN_KEY, value);
                break;
            }
        }
        if (token) {
            dispatchJwtTokenUpdated(token, source);
        }
    }
    let principal;
    let principalRaw = safeGet(window.sessionStorage, PRINCIPAL_PRIMARY_KEY) ??
        safeGet(window.sessionStorage, PRINCIPAL_FALLBACK_KEY);
    if (!principalRaw) {
        principalRaw =
            safeGet(window.localStorage, PRINCIPAL_PRIMARY_KEY) ??
                safeGet(window.localStorage, PRINCIPAL_FALLBACK_KEY);
        if (principalRaw) {
            storePrincipalInStorage(window.sessionStorage, principalRaw);
        }
    }
    if (principalRaw) {
        try {
            principal = JSON.parse(principalRaw);
        }
        catch (error) {
            console.error("Failed to parse stored principal:", error);
        }
    }
    return { token, principal };
}
/**
 * Clears JWT tokens from all storage locations.
 */
export function clearStoredJwtToken(source = "manual") {
    if (!inBrowser)
        return;
    safeRemove(window.sessionStorage, JWT_TOKEN_KEY);
    safeRemove(window.localStorage, JWT_TOKEN_KEY);
    safeRemove(window.localStorage, LEGACY_JWT_KEYS[1]);
    dispatchJwtTokenUpdated(null, source);
}
/**
 * Checks if the current user has a specific role
 * @param role The role to check for
 * @returns True if the user has the role, false otherwise
 */
export function hasRole(role) {
    const principal = readStoredPrincipal();
    return principal?.roles?.includes(role) ?? false;
}
/**
 * Checks if the current user has a specific permission
 * @param permission The permission to check for
 * @returns True if the user has the permission, false otherwise
 */
export function hasPermission(permission) {
    const principal = readStoredPrincipal();
    return principal?.permissions?.includes(permission) ?? false;
}
//# sourceMappingURL=accessControl.js.map