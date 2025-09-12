import store from "../store";
import * as ThorServices from "../../thor/redux/services";

type AnyApiSlice = {
  reducerPath: string;
  util: { invalidateTags: (tags: Array<{ type: string; id?: string }>) => any };
};

// Build a registry of API slices from generated thor services
function getApiSlices(): AnyApiSlice[] {
  const slices: AnyApiSlice[] = [];
  for (const v of Object.values(ThorServices)) {
    if (v && typeof v === "object" && "reducerPath" in v && "util" in v) {
      const s = v as AnyApiSlice;
      if (typeof s.reducerPath === "string") slices.push(s);
    }
  }
  return slices;
}

function simpleNameFromObjectType(objectTypeOrName: string): string {
  if (!objectTypeOrName) return objectTypeOrName;
  const idx = objectTypeOrName.lastIndexOf(".");
  return idx >= 0 ? objectTypeOrName.substring(idx + 1) : objectTypeOrName;
}

export function invalidateEntityById(
  objectTypeOrName: string,
  objectId: string,
) {
  const simple = simpleNameFromObjectType(objectTypeOrName);
  const apis = getApiSlices();
  const api = apis.find((a) => a.reducerPath === simple);
  if (!api) return;
  const dispatch = store.dispatch as any;
  // Invalidate specific object and list; pages will re-fetch due to per-item tags
  dispatch(
    api.util.invalidateTags([
      { type: simple, id: objectId },
      { type: simple, id: "LIST" },
    ]),
  );
}

export function invalidateListsFor(objectTypeOrName: string) {
  const simple = simpleNameFromObjectType(objectTypeOrName);
  const apis = getApiSlices();
  const api = apis.find((a) => a.reducerPath === simple);
  if (!api) return;
  const dispatch = store.dispatch as any;
  dispatch(api.util.invalidateTags([{ type: simple, id: "LIST" }]));
}

// Generic: try to resolve a UUID across all entity endpoints (first 200 OK wins)
// Use cautiously; best to call with a specific entity when known.
export async function globalUuidLookup(
  uuid: string,
): Promise<{ entity: string; data: any } | null> {
  const apis = getApiSlices();
  // Fire a few at a time to avoid a burst
  const chunks: AnyApiSlice[][] = [];
  const size = 8;
  for (let i = 0; i < apis.length; i += size)
    chunks.push(apis.slice(i, i + size));
  for (const group of chunks) {
    const results = await Promise.all(
      group.map(async (api) => {
        try {
          const base = (await import("../customBaseQuery")).default as any;
          // We can’t call baseQuery directly here; fallback to fetch
          const { BASE_PATH } = await import("../../thor/src");
          const token = sessionStorage.getItem("jwtToken") || "";
          const res = await fetch(`${BASE_PATH}/${api.reducerPath}/${uuid}`, {
            headers: token ? { authorization: `Bearer ${token}` } : undefined,
          });
          if (res.ok)
            return { entity: api.reducerPath, data: await res.json() };
        } catch {}
        return null;
      }),
    );
    const hit = results.find(Boolean);
    if (hit) return hit as any;
  }
  return null;
}
