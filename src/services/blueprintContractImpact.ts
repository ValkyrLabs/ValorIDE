import { PROJECT_UUID, specificationHash } from "./projectBlueprintSync";

type Document = Record<string, unknown>;
const object = (value: unknown): value is Document =>
  !!value && typeof value === "object" && !Array.isArray(value);
const own = (o: object, k: string) =>
  Object.prototype.hasOwnProperty.call(o, k);
const methods = [
  "get",
  "put",
  "post",
  "delete",
  "patch",
  "options",
  "head",
  "trace",
];
const maxChanges = 128;

export interface Consumer {
  operationId: string;
  workflowId: string;
  workflowVersionId?: string;
  executionId?: string;
}

function catalog(doc: Document) {
  const endpoints = new Map<string, { operationId: string; hash: string }>();
  const definitions = new Map<string, { hash: string; refs: string[] }>();
  let incomplete = false,
    inspected = 0;
  function references(value: unknown): string[] {
    const refs = new Set<string>();
    const visit = (node: unknown) => {
      if (++inspected > 500000)
        throw new Error(
          "The Blueprint exceeds the local contract comparison limit.",
        );
      if (!object(node) && !Array.isArray(node)) return;
      if (object(node) && typeof node.$ref === "string") refs.add(node.$ref);
      Object.values(node).forEach(visit);
    };
    visit(value);
    return [...refs];
  }
  function resolve(ref: string) {
    if (definitions.has(ref)) return definitions.get(ref)!;
    let value: unknown = doc;
    if (ref.startsWith("#/")) {
      for (const encoded of ref.slice(2).split("/")) {
        const key = decodeURIComponent(encoded)
          .replace(/~1/g, "/")
          .replace(/~0/g, "~");
        if ((!object(value) && !Array.isArray(value)) || !own(value, key)) {
          value = undefined;
          break;
        }
        value = (value as Document)[key];
      }
    } else value = undefined;
    if (value === undefined) incomplete = true;
    const entry =
      value === undefined
        ? { hash: "unresolved", refs: [] }
        : { hash: specificationHash(value), refs: references(value) };
    definitions.set(ref, entry);
    return entry;
  }
  if (!object(doc.paths))
    throw new Error(
      "A Blueprint must have a paths object to compare operations.",
    );
  const components = object(doc.components) ? doc.components : {};
  const schemes = components.securitySchemes ?? doc.securityDefinitions;
  for (const [path, item] of Object.entries(doc.paths)) {
    if (!path.startsWith("/") || !object(item)) continue;
    if (item.$ref) incomplete = true;
    for (const method of methods) {
      const op = item[method];
      if (!object(op)) continue;
      const security = op.security ?? doc.security;
      const schemeNames = Array.isArray(security)
        ? security.flatMap((s) => (object(s) ? Object.keys(s) : []))
        : [];
      const effectiveSchemes = object(schemes)
        ? Object.fromEntries(
            schemeNames
              .filter((s) => own(schemes, s))
              .map((s) => [s, schemes[s]]),
          )
        : {};
      const surface = {
        op,
        parameters: item.parameters ?? [],
        servers: op.servers ?? item.servers ?? doc.servers ?? [],
        security: security ?? [],
        schemes: effectiveSchemes,
        basePath: doc.basePath ?? null,
        host: doc.host ?? null,
        protocols: op.schemes ?? doc.schemes ?? [],
        consumes: op.consumes ?? doc.consumes ?? [],
        produces: op.produces ?? doc.produces ?? [],
      };
      const deps = new Map<string, string>(),
        queue = references(surface);
      let ref: string | undefined;
      while ((ref = queue.pop()) !== undefined) {
        if (++inspected > 500000)
          throw new Error(
            "The Blueprint exceeds the local contract comparison limit.",
          );
        if (deps.has(ref)) continue;
        const dep = resolve(ref);
        deps.set(ref, dep.hash);
        for (const dependency of dep.refs) queue.push(dependency);
      }
      endpoints.set(method.toUpperCase() + " " + path, {
        operationId: typeof op.operationId === "string" ? op.operationId : "",
        hash: specificationHash([surface, Object.fromEntries(deps)]),
      });
    }
  }
  return { endpoints, incomplete };
}

export function compareBlueprintOperations(
  baseline: Document,
  draft: Document,
  consumers: Consumer[],
) {
  const before = catalog(baseline),
    after = catalog(draft);
  const routes = [
    ...new Set([...before.endpoints.keys(), ...after.endpoints.keys()]),
  ].sort();
  const counts = new Map<string, number>();
  for (const { operationId } of before.endpoints.values()) {
    if (operationId)
      counts.set(operationId, (counts.get(operationId) ?? 0) + 1);
  }
  let ambiguous = false;
  const rows = [];
  let total = 0;
  for (const route of routes) {
    const old = before.endpoints.get(route),
      next = after.endpoints.get(route);
    if (old?.hash === next?.hash) continue;
    total++;
    if (rows.length === maxChanges) continue;
    const verifiedId = old?.operationId && counts.get(old.operationId) === 1;
    if (old?.operationId && !verifiedId) ambiguous = true;
    rows.push({
      route,
      kind: !old ? "Added" : !next ? "Removed" : "Changed",
      before: old?.operationId || null,
      after: next?.operationId || null,
      consumers: verifiedId
        ? consumers.filter((c) => c.operationId === old.operationId)
        : [],
    });
  }
  return {
    rows,
    total,
    truncated: rows.length < total,
    unresolved: before.incomplete || after.incomplete || ambiguous,
  };
}

export function readBlueprintConsumers(
  value: unknown,
  expected: { applicationId: string; specId: string; etag: string },
) {
  if (
    !object(value) ||
    value.applicationId !== expected.applicationId ||
    value.specId !== expected.specId ||
    value.etag !== expected.etag ||
    typeof value.truncated !== "boolean" ||
    !Array.isArray(value.bindings) ||
    value.bindings.length > 256
  )
    throw new Error(
      "Workflow bindings for this exact Blueprint revision could not be verified.",
    );
  const bindings: Consumer[] = value.bindings.map((b: unknown) => {
    if (
      !object(b) ||
      typeof b.operationId !== "string" ||
      !b.operationId ||
      b.operationId.length > 512 ||
      typeof b.workflowId !== "string" ||
      !PROJECT_UUID.test(b.workflowId) ||
      (b.workflowVersionId != null &&
        (typeof b.workflowVersionId !== "string" ||
          !PROJECT_UUID.test(b.workflowVersionId))) ||
      (b.executionId != null &&
        (typeof b.executionId !== "string" ||
          !PROJECT_UUID.test(b.executionId)))
    )
      throw new Error("Invalid workflow binding.");
    return {
      operationId: b.operationId,
      workflowId: b.workflowId,
      ...(typeof b.workflowVersionId === "string"
        ? { workflowVersionId: b.workflowVersionId }
        : {}),
      ...(typeof b.executionId === "string"
        ? { executionId: b.executionId }
        : {}),
    };
  });
  return { bindings, truncated: value.truncated };
}
