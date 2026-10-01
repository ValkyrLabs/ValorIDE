import {
  GOVERNED_CODING_VERSION,
  assertGovernedCodingDescriptor,
  beginGovernedCodingRequest,
  governedCodingTaskApprovalSettings,
  governedCodingEvidenceRefs,
  materializeGovernedCodingTask,
  type GovernedCodingDescriptor,
} from "./SwarmCodingInference";

/** Explicit unit protocol fixture. No product/backend/native task is completed by this file. */
const descriptor = (): GovernedCodingDescriptor => ({
  schemaVersion: GOVERNED_CODING_VERSION, toolCallId: "reviewed-tool-call",
  workflowExecutionId: "10000000-0000-4000-8000-000000000001",
  workflowVersionId: "10000000-0000-4000-8000-000000000002",
  runnerInstanceId: "exact-coding-node", runnerPrincipalId: "10000000-0000-4000-8000-000000000003",
  llmDetailsId: "10000000-0000-4000-8000-000000000004",
  integrationAccountId: "10000000-0000-4000-8000-000000000005",
  providerKind: "lm-studio", endpoint: "http://127.0.0.1:1234/v1/chat/completions",
  model: "google/gemma-canonical", maxTokens: 4096, temperature: 0.1, connectionHash: "a".repeat(64),
});
const actionDigest = "sha256:" + "b".repeat(64), scopeDigest = "sha256:" + "c".repeat(64);
const signed = (binding = descriptor()) => ({ ...binding, commandId: "exact-issued-command", actionDigest, scopeDigest });
const fixtureResponse = (value: unknown, status = 200) => ({ ok: status === 200, status,
  json: async () => value }) as Response;
const materialize = (request: jest.Mock, binding = descriptor()) => materializeGovernedCodingTask(
  "https://core.example/v1", "test-only-jwt", binding, "exact-issued-command", actionDigest,
  scopeDigest, "v1.test-only-existing-proof", request as typeof fetch);

describe("governed native coding configuration", () => {
  it("keeps native tool decisions interactive despite broader ambient preferences", () => {
    const ambient = {
      version: 14,
      enabled: true,
      actions: {
        readFiles: true,
        readFilesExternally: true,
        editFiles: true,
        editFilesExternally: true,
        executeSafeCommands: true,
        executeAllCommands: true,
        useBrowser: true,
        useMcp: true,
        useProcedures: true,
      },
      maxRequests: 200,
      enableNotifications: true,
    };

    const governed = governedCodingTaskApprovalSettings(ambient);

    expect(governed).toMatchObject({
      version: 14,
      enabled: false,
      maxRequests: 200,
      enableNotifications: false,
    });
    expect(Object.values(governed.actions)).toEqual(
      expect.arrayContaining([false]),
    );
    expect(Object.values(governed.actions).every((value) => value === false)).toBe(
      true,
    );
    expect(ambient.enabled).toBe(true);
    expect(Object.values(ambient.actions).every((value) => value === true)).toBe(
      true,
    );
  });

  it("retrieves through configured Core and verifies the provider on this node", async () => {
    const request = jest.fn().mockResolvedValueOnce(fixtureResponse(signed()))
      .mockResolvedValueOnce(fixtureResponse({ data: [{ id: "google/gemma-canonical" }] }));
    const configuration = await materialize(request);
    expect(request.mock.calls[0][0].toString()).toBe(
      "https://core.example/v1/swarm-ops/commands/exact-issued-command/coding-inference?instanceId=exact-coding-node");
    expect(request.mock.calls[0][1].headers).toEqual({ Authorization: "Bearer test-only-jwt",
      "X-Valkyr-Approval-Signature": "v1.test-only-existing-proof" });
    expect(request.mock.calls[1][0]).toBe("http://127.0.0.1:1234/v1/models");
    expect(configuration).toMatchObject({ apiProvider: "lmstudio", lmStudioBaseUrl: "http://127.0.0.1:1234",
      lmStudioModelId: "google/gemma-canonical" });
    expect(JSON.stringify(configuration)).not.toContain("test-only-jwt");
    expect(configuration).not.toHaveProperty("apiKey"); expect(configuration).not.toHaveProperty("valkyraiJwt");
  });

  it.each(["model", "runnerPrincipalId", "workflowVersionId", "integrationAccountId", "connectionHash"])(
    "rejects a served %s drift before a provider request", async (key) => {
      const changed: any = signed(); changed[key] = key === "model" ? "ambient-other-model"
        : key === "connectionHash" ? "d".repeat(64) : "20000000-0000-4000-8000-000000000001";
      const request = jest.fn().mockResolvedValue(fixtureResponse(changed));
      await expect(materialize(request)).rejects.toThrow("differs from the exact approved command");
      expect(request).toHaveBeenCalledTimes(1);
    });

  it("rejects current Core authorization failure without ambient fallback", async () => {
    const request = jest.fn().mockResolvedValue(fixtureResponse({}, 403));
    await expect(materialize(request)).rejects.toThrow("rejected (403)"); expect(request).toHaveBeenCalledTimes(1);
  });

  it("rejects unavailable approved model and unexpected credential material", async () => {
    const unavailable = jest.fn().mockResolvedValueOnce(fixtureResponse(signed()))
      .mockResolvedValueOnce(fixtureResponse({ data: [{ id: "ambient-model" }] }));
    await expect(materialize(unavailable)).rejects.toThrow("approved provider model is unavailable");
    const credential = jest.fn().mockResolvedValue(fixtureResponse({ ...signed(), credentialReference: "credential:unsupported" }));
    await expect(materialize(credential)).rejects.toThrow("differs from the exact approved command"); expect(credential).toHaveBeenCalledTimes(1);
  });

  it("rejects nonloopback or credential-bearing canonical endpoints", () => {
    for (const endpoint of ["http://remote.example:1234/v1/chat/completions", "http://token@localhost:1234/v1", "http://localhost:1234/v1?key=secret"]) {
      expect(() => assertGovernedCodingDescriptor({ ...descriptor(), endpoint })).toThrow("credential-free loopback");
    }
  });

  it("records only actual requested/received identifiers without prompt or reasoning content", async () => {
    const request = jest.fn().mockResolvedValueOnce(fixtureResponse(signed()))
      .mockResolvedValueOnce(fixtureResponse({ data: [{ id: "google/gemma-canonical" }] }));
    const configuration = await materialize(request), binding = configuration.governedCodingInference!;
    const receipt = beginGovernedCodingRequest(binding);
    expect(governedCodingEvidenceRefs(binding)).toHaveLength(0);
    receipt.status = "RECEIVED"; receipt.completedAt = new Date().toISOString();
    expect(governedCodingEvidenceRefs(binding)[0]).toContain(`${binding.commandId}:${binding.workflowExecutionId}`);
    expect(governedCodingEvidenceRefs(binding)[0]).toContain(`${binding.llmDetailsId}:${binding.integrationAccountId}:${binding.connectionHash}`);
    expect(JSON.stringify(binding.requests)).not.toMatch(/prompt|reasoning|test-only-jwt|approvalSignature/);
  });
});
import { it } from "@jest/globals";
