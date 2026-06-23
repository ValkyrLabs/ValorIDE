import type {
  BuildModeValkyraiCronScheduleRequest,
  BuildModeValkyraiCronScheduleStatus,
} from "./BuildModeAutomationScheduler";
import { authFetch } from "@utils/authFetch";
import {
  getValkyraiBasePath,
  normalizeValkyraiHost,
} from "@utils/serverValkyraiHost";

export const launchValkyraiCronWorkflowSchedule = async (
  request: BuildModeValkyraiCronScheduleRequest,
): Promise<BuildModeValkyraiCronScheduleStatus> => {
  const endpoint = `${normalizeValkyraiHost(getValkyraiBasePath())}/vaiworkflow/${encodeURIComponent(
    request.workflowId,
  )}/schedule`;
  const response = await authFetch(endpoint, {
    body: JSON.stringify({
      activate: request.activate,
      cronExpression: request.cronExpression,
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `ValkyrAI cron workflow schedule failed for ${request.workflowRef}: ${response.status}${body ? ` ${body}` : ""}`,
    );
  }
  return (await response.json()) as BuildModeValkyraiCronScheduleStatus;
};
