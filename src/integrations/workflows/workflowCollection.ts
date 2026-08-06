export type WorkflowRecord = Record<string, any>;

export const workflowCollection = (value: unknown): WorkflowRecord[] => {
  if (Array.isArray(value)) return value as WorkflowRecord[];
  if (!value || typeof value !== "object") return [];
  const record = value as WorkflowRecord;
  const embedded =
    record._embedded && typeof record._embedded === "object"
      ? Object.values(record._embedded).find(Array.isArray)
      : undefined;
  const found = [
    record.content,
    record.items,
    record.results,
    record.workflows,
    embedded,
  ].find(Array.isArray);
  return Array.isArray(found) ? found : [];
};

export async function collectWorkflowPages(
  fetchPage: (page: number, size: number) => Promise<unknown>,
  pageSize = 100,
  maxPages = 100,
): Promise<WorkflowRecord[]> {
  const collected: WorkflowRecord[] = [];
  const ids = new Set<string>();

  for (let page = 0; page < maxPages; page += 1) {
    const rows = workflowCollection(await fetchPage(page, pageSize));
    let added = 0;
    for (const row of rows) {
      if (!row?.id) continue;
      const id = String(row.id);
      if (ids.has(id)) continue;
      ids.add(id);
      collected.push(row);
      added += 1;
    }
    if (rows.length < pageSize || added === 0) break;
  }

  return collected;
}
