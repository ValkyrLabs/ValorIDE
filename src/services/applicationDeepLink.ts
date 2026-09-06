/** A desktop handoff can select a Blueprint. It cannot supply credentials or executable work. */
export function applicationDeepLinkOptions(
  thor_query: URLSearchParams,
): { applicationId: string } | null {
  const thor_ids = thor_query.getAll("applicationId");
  if (
    thor_ids.length !== 1 ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      thor_ids[0],
    )
  )
    return null;
  return { applicationId: thor_ids[0] };
}
