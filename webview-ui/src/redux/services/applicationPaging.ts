import type { Application } from "@thorapi/model";
import { extractApplicationCollection } from "./applicationResponse";

export const APPLICATION_PAGE_SIZE = 20;
const MAX_APPLICATION_PAGES = 100;

type PageResult = { data?: unknown; error?: unknown };
type ApplicationsResult =
  | { data: Application[] }
  | { error: unknown };

const failure = (message: string): ApplicationsResult => ({
  error: { status: "CUSTOM_ERROR", error: message },
});
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasNextPage = (
  payload: unknown,
  page: number,
  count: number,
): boolean => {
  const root = isRecord(payload) ? payload : {};
  const metadata = isRecord(root.page) ? root.page : root;
  if (typeof metadata.totalPages === "number") {
    if (!Number.isInteger(metadata.totalPages) || metadata.totalPages < 0)
      throw new Error(
        "Application paging metadata is invalid. Refresh the list.",
      );
    return page + 1 < metadata.totalPages;
  }
  if (typeof metadata.last === "boolean") return !metadata.last;
  // The native controller also returns bare arrays without paging headers.
  return count >= APPLICATION_PAGE_SIZE;
};

/** Read the complete authorized collection; never cache a successful partial list. */
export async function loadApplicationPages(
  readPage: (url: string) => PageResult | PromiseLike<PageResult>,
  options: { isCurrent?: () => boolean; signal?: AbortSignal } = {},
): Promise<ApplicationsResult> {
  const applications = new Map<string, Application>();
  const seenPages = new Set<string>();
  for (let page = 0; page < MAX_APPLICATION_PAGES; page++) {
    if (options.signal?.aborted)
      return failure("Application loading was cancelled. Refresh the list.");
    if (options.isCurrent && !options.isCurrent())
      return failure(
        "Account, tenant or backend changed while loading applications. Refresh the list.",
      );
    let result: PageResult;
    try {
      result = await readPage(
        `Application?page=${page}&size=${APPLICATION_PAGE_SIZE}&sort=id,asc`,
      );
    } catch {
      return failure(
        "Application loading failed before all pages were received. Check the backend connection and refresh.",
      );
    }
    if (options.signal?.aborted)
      return failure("Application loading was cancelled. Refresh the list.");
    if (result.error) return { error: result.error };
    if (options.isCurrent && !options.isCurrent())
      return failure(
        "Account, tenant or backend changed while loading applications. Refresh the list.",
      );
    const collection = extractApplicationCollection(result.data);
    if (
      !collection ||
      collection.some(
        (app) => !isRecord(app) || typeof app.id !== "string" || !app.id,
      )
    ) {
      return failure(
        "The server returned an invalid application list. Refresh; check the selected backend if this continues.",
      );
    }
    const records = collection as Application[];
    const fingerprint = JSON.stringify(records.map((app) => app.id).sort());
    let more: boolean;
    try {
      more = hasNextPage(result.data, page, records.length);
    } catch (error) {
      return failure((error as Error).message);
    }
    if (more && records.length && seenPages.has(fingerprint)) {
      return failure(
        "The backend repeated an application page. Refresh; check server paging if this continues.",
      );
    }
    seenPages.add(fingerprint);
    records.forEach((app) => applications.set(app.id!, app));
    if (!more) return { data: Array.from(applications.values()) };
  }
  return failure(
    "The application list exceeded its paging limit. Narrow the server list or check server paging before retrying.",
  );
}
