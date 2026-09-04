import { Application } from "@thorapi/model/Application";
import { resolveThorapiFolderPath } from "@utils/thorapi";
import { getValkyrLabsRtkApiClient } from "./valkyrai/ValkyrLabsRtkApi";

const BASE_URL = "https://api-0.valkyrlabs.com";

function normalizeApplicationsResponse(response: unknown): Application[] {
  if (Array.isArray(response)) {
    return response as Application[];
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  const payload = response as Record<string, unknown>;
  const embedded = payload._embedded;
  const embeddedList =
    embedded && typeof embedded === "object" && !Array.isArray(embedded)
      ? Object.values(embedded as Record<string, unknown>).find(Array.isArray)
      : undefined;
  const list = [
    payload.applications,
    payload.content,
    payload.data,
    payload.items,
    payload.records,
    payload.results,
    embeddedList,
  ].find(Array.isArray);

  return Array.isArray(list) ? (list as Application[]) : [];
}

export async function getApps(jwt: string): Promise<Application[]> {
  const response = await getValkyrLabsRtkApiClient().request<unknown>({
    url: `${BASE_URL}/api/apps`,
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
  });
  return normalizeApplicationsResponse(response.data);
}

export async function generateApp(jwt: string, appId: string): Promise<void> {
  await getValkyrLabsRtkApiClient().request({
    url: `${BASE_URL}/api/apps/${appId}/generate`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
  });
}

export async function pollAppStatus(
  jwt: string,
  appId: string,
): Promise<"pending" | "completed" | "failed"> {
  const response = await getValkyrLabsRtkApiClient().request<any>({
    url: `${BASE_URL}/api/apps/${appId}/status`,
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
  });
  return response.data.status;
}

export async function getAppDownloadUrl(
  jwt: string,
  appId: string,
): Promise<string> {
  const response = await getValkyrLabsRtkApiClient().request<any>({
    url: `${BASE_URL}/api/apps/${appId}/download`,
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
  });
  // If the API returns a signed URL as JSON: { url: "..." }
  return response.data.url;
}

// --- ValorIDE: ThorAPI output folder config utility ---

export async function getThorapiOutputFolder(cwd: string): Promise<string> {
  return resolveThorapiFolderPath(cwd);
}
