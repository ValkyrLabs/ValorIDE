import fetch from "node-fetch";
import { resolveThorapiFolderPath } from "@utils/thorapi";
const BASE_URL = "https://api-0.valkyrlabs.com";
export async function getApps(jwt) {
    const res = await fetch(`${BASE_URL}/api/apps`, {
        headers: {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/json",
        },
    });
    if (!res.ok)
        throw new Error(`Failed to fetch apps: ${res.statusText}`);
    return res.json();
}
export async function generateApp(jwt, appId) {
    const res = await fetch(`${BASE_URL}/api/apps/${appId}/generate`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/json",
        },
    });
    if (!res.ok)
        throw new Error(`Failed to trigger code generation: ${res.statusText}`);
}
export async function pollAppStatus(jwt, appId) {
    const res = await fetch(`${BASE_URL}/api/apps/${appId}/status`, {
        headers: {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/json",
        },
    });
    if (!res.ok)
        throw new Error(`Failed to fetch app status: ${res.statusText}`);
    const data = await res.json();
    return data.status;
}
export async function getAppDownloadUrl(jwt, appId) {
    const res = await fetch(`${BASE_URL}/api/apps/${appId}/download`, {
        headers: {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/json",
        },
    });
    if (!res.ok)
        throw new Error(`Failed to get download URL: ${res.statusText}`);
    // If the API returns a signed URL as JSON: { url: "..." }
    const data = await res.json();
    return data.url;
}
// --- ValorIDE: ThorAPI output folder config utility ---
export async function getThorapiOutputFolder(cwd) {
    return resolveThorapiFolderPath(cwd);
}
//# sourceMappingURL=appService.js.map