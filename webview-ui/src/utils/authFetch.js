import { BASE_PATH } from "..//src";
const apiBasePath = BASE_PATH.replace(/\/+$/, "");
const rootBasePath = apiBasePath.replace(/\/v1$/, "");
const toHeaders = (input) => {
    if (input instanceof Headers) {
        return new Headers(input);
    }
    return new Headers(input ?? {});
};
const resolveUrl = (input) => {
    if (/^https?:\/\//i.test(input)) {
        return input;
    }
    if (!input.startsWith("/")) {
        return `${apiBasePath}/${input}`;
    }
    return `${apiBasePath}${input}`;
};
const attachAuthHeader = (headers) => {
    if (!headers.has("Authorization")) {
        const token = typeof window !== "undefined" ? sessionStorage.getItem("jwtToken") : null;
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }
    }
};
const attachOrgHeader = (headers) => {
    if (headers.has("X-Org-Id") || headers.has("X-Organization-Id"))
        return;
    if (typeof window === "undefined")
        return;
    const pickOrg = () => {
        const direct = sessionStorage.getItem("orgId") ||
            sessionStorage.getItem("organizationId") ||
            sessionStorage.getItem("ownerId");
        if (direct)
            return direct;
        const principalRaw = sessionStorage.getItem("authenticatedPrincipal");
        if (principalRaw) {
            try {
                const parsed = JSON.parse(principalRaw);
                return (parsed?.organizationId || parsed?.orgId || parsed?.ownerId || null);
            }
            catch {
                return null;
            }
        }
        return null;
    };
    const org = pickOrg();
    if (org) {
        headers.set("X-Org-Id", org);
    }
};
const buildError = async (response, url) => {
    let detail;
    try {
        detail = await response.text();
    }
    catch {
        detail = undefined;
    }
    const bodyPreview = detail ? detail.slice(0, 800) : "";
    throw new Error(`Request to ${url} failed with ${response.status} ${response.statusText}${bodyPreview ? ` – ${bodyPreview}` : ""}`);
};
export const authFetch = async (input, init = {}) => {
    const headers = toHeaders(init.headers);
    attachAuthHeader(headers);
    attachOrgHeader(headers);
    const url = resolveUrl(input);
    return fetch(url, {
        ...init,
        headers,
    });
};
export const authJsonFetch = async (input, init = {}) => {
    const headers = toHeaders(init.headers);
    if (!(init.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }
    if (!headers.has("Accept")) {
        headers.set("Accept", "application/json");
    }
    const response = await authFetch(input, {
        ...init,
        headers,
    });
    if (!response.ok) {
        await buildError(response, resolveUrl(input));
    }
    if (response.status === 204) {
        return undefined;
    }
    return (await response.json());
};
export const resolveApiPath = (path) => resolveUrl(path);
export const resolveRootApiPath = (path) => {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${rootBasePath}${normalized}`;
};
export const ApiEndpoints = {
    basePath: apiBasePath,
    rootPath: rootBasePath,
};
//# sourceMappingURL=authFetch.js.map