import fetch from "node-fetch";
import { Application } from "../../webview-ui/src/thor/model/Application";
import { resolveThorapiFolderPath } from "@utils/thorapi";

const BASE_URL = "https://api-0.valkyrlabs.com";

export async function getApps(jwt: string): Promise<Application[]> {
  const res = await fetch(`${BASE_URL}/api/apps`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch apps: ${res.statusText}`);
  return res.json();
}

export async function generateApp(jwt: string, appId: string): Promise<void> {
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

export async function pollAppStatus(
  jwt: string,
  appId: string,
): Promise<"pending" | "completed" | "failed"> {
  const res = await fetch(`${BASE_URL}/api/apps/${appId}/status`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch app status: ${res.statusText}`);
  const data = await res.json();
  return data.status;
}

export async function getAppDownloadUrl(
  jwt: string,
  appId: string,
): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/apps/${appId}/download`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Failed to get download URL: ${res.statusText}`);
  // If the API returns a signed URL as JSON: { url: "..." }
  const data = await res.json();
  return data.url;
}

// --- ValorIDE: ThorAPI output folder config utility ---

export async function getThorapiOutputFolder(cwd: string): Promise<string> {
  return resolveThorapiFolderPath(cwd);
}
