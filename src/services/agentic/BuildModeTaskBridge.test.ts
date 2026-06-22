import { coerceBuildModeTaskLaunchPayload } from "./BuildModeTaskBridge";

const fixedNow = () => new Date("2026-06-22T12:00:00.000Z");

const basePayload = {
  taskId: "valor-task-sagechat-001",
  appBundle: {
    id: "app-bundle-sagechat-001",
    name: "SageChat Generated App",
  },
  grayMatterContextPack: {
    id: "gm-context-sagechat-001",
    invariantPreflightStatus: "passed",
    retrievalReceiptIds: ["retrieval-receipt-sagechat-001"],
    retrievalStatus: "ready",
  },
  providerCredentials: [
    {
      apiKey: "sk-test-secret",
      displayName: "Use my API key",
      id: "credential-ref-user-key",
      route: "bring-your-own-key",
      secret: "sk-test-secret",
      secretAvailable: true,
      tenantScoped: true,
      token: "jwt-secret",
    },
  ],
  scope: {
    principalId: "principal-valhalla-operator",
    roles: ["Owner"],
    tenantId: "tenant-valkyr-demo",
    workspaceRoot: "/workspace/valor/apps/generated",
  },
};

describe("BuildModeTaskBridge", () => {
  it("normalizes SageChat/App Gallery launch payloads for Build Mode", () => {
    const result = coerceBuildModeTaskLaunchPayload(basePayload, {
      now: fixedNow,
      workspaceRoot: "/workspace/valor",
    });

    expect(result.issues).toEqual([]);
    expect(result.payload).toMatchObject({
      appBundle: {
        createdAt: "2026-06-22T12:00:00.000Z",
        id: "app-bundle-sagechat-001",
        name: "SageChat Generated App",
        productLine: "ValkyrAI",
        sourceSessionId: "valor-task-sagechat-001",
        version: "0.0.0",
      },
      grayMatterContextPack: {
        answerPolicy: "answer-confidently",
        id: "gm-context-sagechat-001",
        invariantPreflightStatus: "passed",
        retrievalReceiptIds: ["retrieval-receipt-sagechat-001"],
        retrievalStatus: "ready",
      },
      source: "SageChat",
      taskId: "valor-task-sagechat-001",
    });
  });

  it("strips credential secret material from launch payloads", () => {
    const result = coerceBuildModeTaskLaunchPayload(basePayload, {
      now: fixedNow,
      workspaceRoot: "/workspace/valor",
    });

    expect(result.payload?.providerCredentials).toEqual([
      {
        displayName: "Use my API key",
        id: "credential-ref-user-key",
        route: "bring-your-own-key",
        secretAvailable: true,
        tenantScoped: true,
      },
    ]);
    expect(JSON.stringify(result.payload)).not.toContain("sk-test-secret");
    expect(JSON.stringify(result.payload)).not.toContain("jwt-secret");
  });

  it("rejects non-credential launch payload secret material without echoing it", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        grayMatterContextPack: {
          ...basePayload.grayMatterContextPack,
          summary:
            "Use retrieved context only. Authorization: Bearer launch-secret-token",
        },
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual([
      "Build Mode task payload contains inline secret material at payload.grayMatterContextPack.summary.",
    ]);
    expect(JSON.stringify(result.issues)).not.toContain("launch-secret-token");
  });

  it("rejects launch payloads without GrayMatter receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        grayMatterContextPack: {
          id: "gm-context-sagechat-001",
          invariantPreflightStatus: "missing",
          retrievalReceiptIds: [],
          retrievalStatus: "blocked",
        },
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "GrayMatter context pack requires retrieval receipt ids.",
        "GrayMatter invariant preflight must be passed.",
        "GrayMatter context retrieval status must be ready.",
      ]),
    );
  });

  it("rejects launch payloads outside the active workspace root", () => {
    const result = coerceBuildModeTaskLaunchPayload(basePayload, {
      now: fixedNow,
      workspaceRoot: "/other/workspace",
    });

    expect(result.payload).toBeUndefined();
    expect(result.issues).toContain(
      "Build Mode task workspaceRoot is outside the active workspace: /workspace/valor/apps/generated.",
    );
  });
});
