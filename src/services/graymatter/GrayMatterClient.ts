import { normalizeValkyraiHost } from "@utils/serverValkyraiHost";
import type {
  GrayMatterCapabilities,
  GrayMatterControlSurface,
} from "@shared/GrayMatterSession";
import { buildTenantHeaders } from "../auth/tenantContext";
import type { TenantContext } from "../auth/tenantContext";

export type { GrayMatterCapabilities, GrayMatterControlSurface };

export type GrayMatterMemoryType =
  | "artifact"
  | "configuration"
  | "context"
  | "decision"
  | "preference"
  | "todo";

export type GrayMatterErrorKind =
  | "forbidden"
  | "quota"
  | "unauthenticated"
  | "unavailable";

export interface GrayMatterClientOptions {
  baseUrl: string;
  fetch?: FetchLike;
  getAuthToken: () => Promise<string | undefined> | string | undefined;
  getTenantContext?: () =>
    | Promise<TenantContext | undefined>
    | TenantContext
    | undefined;
}

export interface GrayMatterMemoryInput {
  content: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  type: GrayMatterMemoryType;
}

export interface GrayMatterMemoryQuery {
  limit?: number;
  query: string;
}

export interface GrayMatterProjectInput {
  currentStage?: string;
  description?: string;
  name?: string;
  notes?: string;
  progressPercent?: number;
  projectType?: string;
  repositoryUrl?: string;
  sourceSurface?: string;
  status?: string;
  workspacePath?: string;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
type HeaderRecord = Record<string, string>;

interface OpenApiLike {
  paths?: Record<string, unknown>;
}

export interface GrayMatterDiscovery {
  capabilities: GrayMatterCapabilities;
  controlSurface?: GrayMatterControlSurface;
}

export class GrayMatterClientError extends Error {
  constructor(
    message: string,
    readonly kind: GrayMatterErrorKind,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GrayMatterClientError";
  }
}

export class GrayMatterClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(private readonly options: GrayMatterClientOptions) {
    this.baseUrl = normalizeValkyraiHost(options.baseUrl);
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async loadDiscovery(): Promise<GrayMatterDiscovery> {
    try {
      const controlSurface = await this.loadControlSurface();
      return {
        capabilities: capabilitiesFromControlSurface(controlSurface),
        controlSurface,
      };
    } catch (error) {
      if (!(error instanceof GrayMatterClientError) || error.status !== 404) {
        throw error;
      }
    }

    return {
      capabilities: await this.loadCapabilitiesFromOpenApi(),
    };
  }

  async loadCapabilities(): Promise<GrayMatterCapabilities> {
    const discovery = await this.loadDiscovery();
    return discovery.capabilities;
  }

  async loadControlSurface(): Promise<GrayMatterControlSurface> {
    return this.request<GrayMatterControlSurface>("/graymatter/control");
  }

  private async loadCapabilitiesFromOpenApi(): Promise<GrayMatterCapabilities> {
    const openApi = await this.request<OpenApiLike>("/api-docs");
    const paths = Object.keys(openApi.paths ?? {}).map(normalizeOpenApiPath);
    const hasResource = (resource: string) => {
      const basePath = `/${resource.toLowerCase()}`;
      return paths.some(
        (path) => path === basePath || path.startsWith(`${basePath}/`),
      );
    };
    const hasResourceRoot = (resource: string) =>
      paths.includes(`/${resource.toLowerCase()}`);
    const hasOperation = (resource: string, operation: string) => {
      const operationPath = `/${resource.toLowerCase()}/${operation.toLowerCase()}`;
      return paths.some(
        (path) =>
          path === operationPath || path.startsWith(`${operationPath}/`),
      );
    };

    return {
      agent: hasResource("Agent"),
      grayMatter: hasResource("GrayMatter"),
      memoryEntry: hasResource("MemoryEntry"),
      memoryQuery: hasOperation("MemoryEntry", "query"),
      memoryRead:
        hasResource("MemoryEntry") || hasOperation("MemoryEntry", "read"),
      memoryWrite:
        hasResourceRoot("MemoryEntry") || hasOperation("MemoryEntry", "write"),
      project: hasResource("Project"),
      projectObjectLink: hasResource("ProjectObjectLink"),
      swarmGraph: hasOperation("SwarmOps", "graph"),
      swarmOps: hasResource("SwarmOps"),
    };
  }

  async queryMemory(query: string | GrayMatterMemoryQuery): Promise<unknown> {
    const payload =
      typeof query === "string"
        ? {
            limit: 10,
            query,
          }
        : {
            limit: query.limit ?? 10,
            query: query.query,
          };

    return this.request("/MemoryEntry/query", {
      body: JSON.stringify(payload),
      method: "POST",
    });
  }

  async writeMemory(input: GrayMatterMemoryInput): Promise<unknown> {
    return this.request("/MemoryEntry", {
      body: JSON.stringify(input),
      method: "POST",
    });
  }

  async listProjects(): Promise<unknown> {
    return this.request("/Project");
  }

  async createProject(input: GrayMatterProjectInput): Promise<unknown> {
    return this.request("/Project", {
      body: JSON.stringify({
        sourceSurface: "valoride",
        ...input,
      }),
      method: "POST",
    });
  }

  async updateProject(
    id: string,
    input: GrayMatterProjectInput,
  ): Promise<unknown> {
    return this.request(`/Project/${encodeURIComponent(id)}`, {
      body: JSON.stringify({
        sourceSurface: "valoride",
        ...input,
      }),
      method: "PUT",
    });
  }

  private async request<T = unknown>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const token = await this.options.getAuthToken();
    const tenantContext = await this.options.getTenantContext?.();
    const headers = toHeaderRecord(init.headers);

    headers.accept = "application/json";
    if (init.body && !headers["content-type"]) {
      headers["content-type"] = "application/json";
    }
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
    applyHeaderRecord(headers, buildTenantHeaders(tenantContext));

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      throw await this.toClientError(response);
    }

    const contentType = getHeaderValue(response.headers, "content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    return (await response.text()) as T;
  }

  private async toClientError(
    response: Response,
  ): Promise<GrayMatterClientError> {
    const message = await this.readErrorMessage(response);

    switch (response.status) {
      case 401:
        return new GrayMatterClientError(
          message || "GrayMatter authentication is required.",
          "unauthenticated",
          response.status,
        );
      case 402:
        return new GrayMatterClientError(
          message || "GrayMatter account credits are required.",
          "quota",
          response.status,
        );
      case 403:
        return new GrayMatterClientError(
          message || "GrayMatter access was denied by RBAC or tenant context.",
          "forbidden",
          response.status,
        );
      default:
        return new GrayMatterClientError(
          message || "GrayMatter is unavailable.",
          "unavailable",
          response.status,
        );
    }
  }

  private async readErrorMessage(response: Response): Promise<string> {
    try {
      const contentType =
        getHeaderValue(response.headers, "content-type") ?? "";
      if (contentType.includes("application/json")) {
        const body = await response.json();
        if (typeof body?.message === "string") {
          return body.message;
        }
        if (typeof body?.error === "string") {
          return body.error;
        }
      }

      return await response.text();
    } catch {
      return "";
    }
  }
}

const toHeaderRecord = (headers?: HeadersInit): HeaderRecord => {
  const record: HeaderRecord = {};

  if (!headers) {
    return record;
  }

  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      record[key.toLowerCase()] = value;
    }
    return record;
  }

  const forEach = (headers as { forEach?: (callback: unknown) => void })
    .forEach;
  if (typeof forEach === "function") {
    (
      headers as {
        forEach: (callback: (value: string, key: string) => void) => void;
      }
    ).forEach((value, key) => {
      record[key.toLowerCase()] = value;
    });
    return record;
  }

  for (const [key, value] of Object.entries(headers)) {
    record[key.toLowerCase()] = String(value);
  }

  return record;
};

const applyHeaderRecord = (
  headers: HeaderRecord,
  additions: HeaderRecord,
): HeaderRecord => {
  for (const [key, value] of Object.entries(additions)) {
    const normalized = key.toLowerCase();
    if (value && !headers[normalized]) {
      headers[normalized] = value;
    }
  }
  return headers;
};

const getHeaderValue = (headers: Response["headers"], name: string) => {
  const anyHeaders = headers as unknown as {
    get?: (headerName: string) => string | null;
  } & HeaderRecord;

  if (typeof anyHeaders.get === "function") {
    return anyHeaders.get(name);
  }

  return anyHeaders[name.toLowerCase()] ?? anyHeaders[name];
};

const capabilitiesFromControlSurface = (
  controlSurface: GrayMatterControlSurface,
): GrayMatterCapabilities => {
  const memoryEndpoints = controlSurface.endpoints?.memory ?? {};
  const swarmEndpoints = controlSurface.endpoints?.swarm ?? {};
  const agentEndpoints = controlSurface.endpoints?.agent ?? {};
  const memoryPrimitives = new Set(
    controlSurface.memory?.primitives?.map((value) => value.toLowerCase()) ??
      [],
  );
  const graphPrimitives = new Set(
    [
      ...(controlSurface.objectGraph?.memoryPrimitives ?? []),
      ...(controlSurface.objectGraph?.coordinationPrimitives ?? []),
      ...(controlSurface.objectGraph?.businessDomains ?? []),
    ].map((value) => value.toLowerCase()),
  );
  const valorideProfile = controlSurface.clients?.valoride;

  return {
    agent:
      Boolean(agentEndpoints.list || agentEndpoints.activate) ||
      graphPrimitives.has("agent"),
    grayMatter:
      controlSurface.suite?.memoryLayer?.toLowerCase() === "graymatter" ||
      memoryPrimitives.has("graymatter"),
    memoryEntry: memoryPrimitives.has("memoryentry"),
    memoryQuery: Boolean(memoryEndpoints.query),
    memoryRead: Boolean(memoryEndpoints.read || memoryEndpoints.query),
    memoryWrite: Boolean(memoryEndpoints.write),
    project:
      graphPrimitives.has("project") ||
      Boolean(controlSurface.endpoints?.projects?.list),
    projectObjectLink:
      graphPrimitives.has("projectobjectlink") ||
      Boolean(controlSurface.endpoints?.projects?.objectLinks),
    swarmGraph: Boolean(
      swarmEndpoints.graph ||
        controlSurface.swarm?.graphEndpoint ||
        valorideProfile?.endpoints?.swarmGraph,
    ),
    swarmOps: Boolean(
      swarmEndpoints.register ||
        controlSurface.swarm?.registrationEndpoint ||
        valorideProfile?.swarmAgent,
    ),
  };
};

const normalizeOpenApiPath = (value: string) => {
  const withoutQuery = value.split("?")[0] || "";
  const normalized = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  return normalized.replace(/^\/v\d+(?=\/)/iu, "").toLowerCase();
};
