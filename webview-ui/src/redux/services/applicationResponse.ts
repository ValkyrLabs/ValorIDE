import { Application } from "@thorapi/model";

type ApplicationEnvelope = {
  applications?: unknown;
  content?: unknown;
  data?: unknown;
  items?: unknown;
  records?: unknown;
  results?: unknown;
  _embedded?: Record<string, unknown>;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const firstArrayValue = (value: unknown): unknown[] | undefined => {
  if (!isObject(value)) {
    return undefined;
  }

  return Object.values(value).find(Array.isArray) as unknown[] | undefined;
};

export const extractApplicationCollection = (
  response: unknown,
): unknown[] | undefined => {
  if (Array.isArray(response)) {
    return response;
  }

  if (!isObject(response)) {
    return undefined;
  }

  const envelope = response as ApplicationEnvelope;
  const candidates = [
    envelope.applications,
    envelope.content,
    envelope.data,
    envelope.items,
    envelope.records,
    envelope.results,
    firstArrayValue(envelope._embedded),
  ];

  const applicationList = candidates.find(Array.isArray);
  return Array.isArray(applicationList) ? applicationList : undefined;
};

export const normalizeApplicationResponse = (
  response: unknown,
): Application[] =>
  (extractApplicationCollection(response) ?? []) as Application[];

export const applicationTagsFor = (applications: unknown) =>
  normalizeApplicationResponse(applications)
    .filter((application) => Boolean(application?.id))
    .map(({ id }) => ({ type: "Application" as const, id }));
