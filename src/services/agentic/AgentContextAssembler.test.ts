import { GrayMatterClientError } from "@services/graymatter/GrayMatterClient";
import {
  AgentContextAssembler,
  createAgentContextSectionForTask,
} from "./AgentContextAssembler";

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? "application/json" : null,
    },
    json: jest.fn(async () => body),
    text: jest.fn(async () => JSON.stringify(body)),
  }) as unknown as Response;

const readySession = {
  baseUrl: "https://api-0.valkyrlabs.com/v1",
  capabilities: {
    agent: true,
    grayMatter: true,
    memoryEntry: true,
    memoryQuery: true,
    memoryRead: true,
    memoryWrite: true,
    project: true,
    projectObjectLink: true,
    swarmGraph: false,
    swarmOps: true,
  },
  checkedAt: "2026-05-13T12:00:00.000Z",
  status: "ready",
} as const;

describe("AgentContextAssembler", () => {
  it("formats RBAC-scoped GrayMatter memories as compact cited prompt context", async () => {
    const queryMemory = jest.fn(async () => ({
      results: [
        {
          content:
            "Prefer generated ThorAPI services before custom REST wrappers for ValkyrAI resources.",
          id: "memory-1",
          metadata: { title: "ThorAPI standard" },
          tags: ["thorapi", "standards"],
          type: "decision",
        },
        {
          content:
            "Never leak bearer token abc.def.ghi or Authorization: Bearer secret-token in prompt context.",
          id: "memory-2",
          tags: ["security"],
          type: "context",
        },
      ],
    }));
    const assembler = new AgentContextAssembler({
      grayMatter: { queryMemory },
      now: () => new Date("2026-05-13T12:00:00.000Z"),
    });

    const context = await assembler.assemble({
      cwd: "/repo",
      maxEntryChars: 120,
      task: "Implement a ThorAPI-backed settings panel",
    });

    expect(queryMemory).toHaveBeenCalledWith({
      limit: 5,
      query:
        "ValorIDE task context: Implement a ThorAPI-backed settings panel\nWorkspace: /repo",
    });
    expect(context.grayMatter.status).toBe("ready");
    expect(context.grayMatter.reads).toEqual([
      {
        at: "2026-05-13T12:00:00.000Z",
        citations: ["gm:memory-1", "gm:memory-2"],
        query:
          "ValorIDE task context: Implement a ThorAPI-backed settings panel\nWorkspace: /repo",
        status: "ready",
      },
    ]);
    expect(context.promptSection).toContain("RBAC-scoped GrayMatter context");
    expect(context.promptSection).toContain("[gm:memory-1] decision");
    expect(context.promptSection).toContain("ThorAPI standard");
    expect(context.promptSection).toContain(
      "Prefer generated ThorAPI services",
    );
    expect(context.promptSection).toContain("Bearer [REDACTED]");
    expect(context.promptSection).not.toContain("secret-token");
  });

  it("surfaces RBAC denials without throwing or inventing memory context", async () => {
    const assembler = new AgentContextAssembler({
      grayMatter: {
        queryMemory: async () => {
          throw new GrayMatterClientError(
            "Forbidden by RBAC",
            "forbidden",
            403,
          );
        },
      },
      now: () => new Date("2026-05-13T12:00:00.000Z"),
    });

    const context = await assembler.assemble({
      task: "Read private project standards",
    });

    expect(context.grayMatter.status).toBe("forbidden");
    expect(context.grayMatter.error).toBe("Forbidden by RBAC");
    expect(context.grayMatter.citations).toEqual([]);
    expect(context.promptSection).toContain(
      "GrayMatter status: forbidden. Continue with local project context only.",
    );
  });

  it("returns disabled context when no GrayMatter client is available", async () => {
    const assembler = new AgentContextAssembler({
      now: () => new Date("2026-05-13T12:00:00.000Z"),
    });

    const context = await assembler.assemble({ task: "Implement UI" });

    expect(context.grayMatter.status).toBe("disabled");
    expect(context.promptSection).toBe("");
  });

  it("creates a task prompt section only when the session can query GrayMatter", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () =>
        jsonResponse(200, {
          results: [
            {
              content: "Use server-side RBAC for GrayMatter access.",
              id: "memory-1",
              tags: ["security"],
              type: "decision",
            },
          ],
        }),
    );

    const section = await createAgentContextSectionForTask({
      baseUrl: "https://api-0.valkyrlabs.com",
      cwd: "/repo",
      fetch: fetchMock,
      grayMatterSession: readySession,
      task: "Implement GrayMatter prompt injection",
      token: "session-token",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-0.valkyrlabs.com/v1/MemoryEntry/query",
      expect.objectContaining({
        body: JSON.stringify({
          limit: 5,
          query:
            "ValorIDE task context: Implement GrayMatter prompt injection\nWorkspace: /repo",
        }),
        method: "POST",
      }),
    );
    expect(section).toContain("[gm:memory-1] decision");
    expect(section).toContain("Use server-side RBAC");
  });

  it("skips task prompt context when the session lacks memory query permission", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

    const section = await createAgentContextSectionForTask({
      baseUrl: "https://api-0.valkyrlabs.com/v1",
      fetch: fetchMock,
      grayMatterSession: {
        ...readySession,
        capabilities: {
          ...readySession.capabilities,
          memoryQuery: false,
        },
      },
      task: "Implement GrayMatter prompt injection",
      token: "session-token",
    });

    expect(section).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
