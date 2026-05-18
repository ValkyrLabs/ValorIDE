import { normalizeValkyraiHost } from "@utils/serverValkyraiHost";

export type GrayMatterMemoryType =
  | "artifact"
  | "context"
  | "decision"
  | "preference"
  | "todo";

export type GrayMatterErrorKind =
  | "forbidden"
  | "quota"
  | "unauthenticated"
  | "unavailable";

export interface GrayMatterCapabilities {
  agent: boolean;
  grayMatter: boolean;
  memoryEntry: boolean;
  memoryQuery: boolean;
  memoryRead: boolean;
  memoryWrite: boolean;
  swarmOps: boolean;
  swarmGraph: boolean;
}

export interface GrayMatterClientOptions {
  baseUrl: string;
  fetch?: FetchLike;
  getAuthToken: () => Promise<string | undefined> | string | undefined;
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

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
type HeaderRecord = Record<string, string>;

interface OpenApiLike {
  paths?: Record<string, unknown>;
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

  async loadCapabilities(): Promise<GrayMatterCapabilities> {
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

  private async request<T = unknown>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const token = await this.options.getAuthToken();
    const headers = toHeaderRecord(init.headers);

    headers.accept = "application/json";
    if (init.body && !headers["content-type"]) {
      headers["content-type"] = "application/json";
    }
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

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
          message || "GrayMatter access was denied by RBAC.",
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

const getHeaderValue = (headers: Response["headers"], name: string) => {
  const anyHeaders = headers as unknown as {
    get?: (headerName: string) => string | null;
  } & HeaderRecord;

  if (typeof anyHeaders.get === "function") {
    return anyHeaders.get(name);
  }

  return anyHeaders[name.toLowerCase()] ?? anyHeaders[name];
};

const normalizeOpenApiPath = (value: string) => {
  const withoutQuery = value.split("?")[0] || "";
  const normalized = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  return normalized.replace(/^\/v\d+(?=\/)/iu, "").toLowerCase();
};
