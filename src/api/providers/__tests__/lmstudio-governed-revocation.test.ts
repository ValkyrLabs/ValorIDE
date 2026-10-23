import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { LmStudioHandler } from "../lmstudio";
import {
  GOVERNED_CODING_VERSION,
  materializeGovernedCodingTask,
  type GovernedCodingDescriptor,
} from "@services/swarm/SwarmCodingInference";

/** Explicit local HTTP protocol fixture; real adapter/OpenAI transport, no task or reasoning. */
describe("governed LM Studio request revocation", () => {
  it("stops the next real completion request after Core revokes admission, using the current secure-token accessor", async () => {
    let revoked = false, modelRequests = 0, coreRequests = 0;
    let currentToken = "unit-only-initial-token";
    let binding: GovernedCodingDescriptor;
    const seenTokens: Array<string | undefined> = [];
    const postedModels: unknown[] = [];
    const actionDigest = "sha256:" + "b".repeat(64), scopeDigest = "sha256:" + "c".repeat(64);
    const server: Server = createServer(async (request, response) => {
      if (request.url?.startsWith("/v1/swarm-ops/commands/one-command/coding-inference")) {
        coreRequests++; seenTokens.push(request.headers.authorization);
        if (revoked) { response.writeHead(403, { "Content-Type": "application/json" }); response.end("{}"); return; }
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ ...binding, commandId: "one-command", actionDigest, scopeDigest })); return;
      }
      if (request.url === "/v1/models") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ data: [{ id: "google/gemma-unit-fixture" }] })); return;
      }
      if (request.url === "/v1/chat/completions" && request.method === "POST") {
        modelRequests++;
        const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk));
        const posted = JSON.parse(Buffer.concat(chunks).toString());
        postedModels.push({ model: posted.model, max_tokens: posted.max_tokens, temperature: posted.temperature });
        response.writeHead(200, { "Content-Type": "text/event-stream" });
        response.end(`data: ${JSON.stringify({ id: "unit-completion", object: "chat.completion.chunk", model: "google/gemma-unit-fixture",
          choices: [{ index: 0, delta: { content: "Unit protocol response" }, finish_reason: null }] })}\n\ndata: [DONE]\n\n`); return;
      }
      response.writeHead(404); response.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      binding = {
        schemaVersion: GOVERNED_CODING_VERSION, toolCallId: "one-reviewed-call",
        workflowExecutionId: "10000000-0000-4000-8000-000000000001", workflowVersionId: "10000000-0000-4000-8000-000000000002",
        runnerInstanceId: "unit-node", runnerPrincipalId: "10000000-0000-4000-8000-000000000003",
        llmDetailsId: "10000000-0000-4000-8000-000000000004", integrationAccountId: "10000000-0000-4000-8000-000000000005",
        providerKind: "lm-studio", endpoint: `${origin}/v1/chat/completions`, model: "google/gemma-unit-fixture",
        maxTokens: 512, temperature: 0.1, connectionHash: "a".repeat(64),
      };
      // This mirrors TokenStorageService.getJwtToken: read current secure state at each retrieval.
      const credentials = jest.fn(async () => currentToken);
      const configuration = await materializeGovernedCodingTask(origin, credentials, binding,
        "one-command", actionDigest, scopeDigest, "v1.unit-only-existing-proof");
      const handler = new LmStudioHandler(configuration);
      // Later ambient settings cannot replace the exact model on the approved adapter.
      configuration.lmStudioModelId = "unit-ambient-model-replacement";
      const first = [];
      for await (const chunk of handler.createMessage("Unit system fixture", [{ role: "user", content: "Unit request fixture" }])) first.push(chunk);
      expect(first).toEqual([{ type: "text", text: "Unit protocol response" }]);
      expect(modelRequests).toBe(1);
      expect(postedModels).toEqual([{ model: binding.model, max_tokens: 512, temperature: 0.1 }]);
      expect(configuration.governedCodingInference!.requests).toHaveLength(1);
      expect(configuration.governedCodingInference!.requests[0].status).toBe("RECEIVED");

      const early = handler.createMessage("Unit system fixture", [{ role: "user", content: "Early-close unit request fixture" }])[Symbol.asyncIterator]();
      await expect(early.next()).resolves.toEqual({ done: false, value: { type: "text", text: "Unit protocol response" } });
      expect(configuration.governedCodingInference!.requests).toHaveLength(2);
      expect(configuration.governedCodingInference!.requests[1].status).toBe("RECEIVED");
      expect(configuration.governedCodingInference!.requests[1].completedAt).toEqual(expect.any(String));
      await early.return?.(undefined);

      revoked = true; currentToken = "unit-only-refreshed-token";
      const next = async () => {
        for await (const chunk of handler.createMessage("Unit system fixture", [{ role: "user", content: "Second unit request fixture" }])) {
          void chunk;
        }
      };
      await expect(next()).rejects.toThrow("Canonical coding admission was rejected (403)");
      expect(modelRequests).toBe(2); expect(coreRequests).toBe(4);
      expect(credentials).toHaveBeenCalledTimes(4);
      expect(seenTokens).toEqual(["Bearer unit-only-initial-token", "Bearer unit-only-initial-token",
        "Bearer unit-only-initial-token", "Bearer unit-only-refreshed-token"]);
      expect(configuration.governedCodingInference!.requests).toHaveLength(2);
      expect(JSON.stringify(configuration.governedCodingInference)).not.toContain("unit-only-initial-token");
      expect(JSON.stringify(configuration.governedCodingInference)).not.toContain("unit-only-refreshed-token");
    } finally {
      server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  }, 20000);

  it("makes one admitted POST for a received 500 and revalidates before an explicit product retry", async () => {
    let posts = 0, admissions = 0;
    let binding: GovernedCodingDescriptor;
    const events: string[] = [];
    const actionDigest = "sha256:" + "b".repeat(64), scopeDigest = "sha256:" + "c".repeat(64);
    const server = createServer(async (request, response) => {
      if (request.url?.startsWith("/v1/swarm-ops/commands/retry-command/coding-inference")) {
        admissions++; events.push(`admission:${admissions}`);
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ ...binding, commandId: "retry-command", actionDigest, scopeDigest })); return;
      }
      if (request.url === "/v1/models") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ data: [{ id: "google/gemma-unit-fixture" }] })); return;
      }
      if (request.url === "/v1/chat/completions" && request.method === "POST") {
        posts++; events.push(`post:${posts}`);
        // Consume the real SDK request before returning the explicit protocol outcome.
        for await (const chunk of request) {
          void chunk;
        }
        if (posts === 1) {
          response.writeHead(500, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ error: { message: "explicit received-500 unit protocol fixture" } })); return;
        }
        response.writeHead(200, { "Content-Type": "text/event-stream" });
        response.end(`data: ${JSON.stringify({ id: "unit-retried-completion", object: "chat.completion.chunk", model: "google/gemma-unit-fixture",
          choices: [{ index: 0, delta: { content: "Explicit retry protocol response" }, finish_reason: null }] })}\n\ndata: [DONE]\n\n`); return;
      }
      response.writeHead(404); response.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      binding = {
        schemaVersion: GOVERNED_CODING_VERSION, toolCallId: "retry-reviewed-call",
        workflowExecutionId: "10000000-0000-4000-8000-000000000001", workflowVersionId: "10000000-0000-4000-8000-000000000002",
        runnerInstanceId: "unit-node", runnerPrincipalId: "10000000-0000-4000-8000-000000000003",
        llmDetailsId: "10000000-0000-4000-8000-000000000004", integrationAccountId: "10000000-0000-4000-8000-000000000005",
        providerKind: "lm-studio", endpoint: `${origin}/v1/chat/completions`, model: "google/gemma-unit-fixture",
        maxTokens: 512, temperature: 0.1, connectionHash: "a".repeat(64),
      };
      const credentials = jest.fn(async () => "unit-only-current-token");
      const configuration = await materializeGovernedCodingTask(origin, credentials, binding,
        "retry-command", actionDigest, scopeDigest, "v1.unit-only-existing-proof");
      const handler = new LmStudioHandler(configuration);
      const run = async () => {
        const chunks = [];
        for await (const chunk of handler.createMessage("Unit system fixture", [{ role: "user", content: "Unit retry fixture" }])) chunks.push(chunk);
        return chunks;
      };
      await expect(run()).rejects.toThrow("Please check the LM Studio developer logs");
      expect(posts).toBe(1); expect(admissions).toBe(2);
      expect(configuration.governedCodingInference!.requests.map((receipt) => receipt.status)).toEqual(["FAILED"]);

      // This is a second explicit adapter invocation, matching a product-owned retry.
      await expect(run()).resolves.toEqual([{ type: "text", text: "Explicit retry protocol response" }]);
      expect(events).toEqual(["admission:1", "admission:2", "post:1", "admission:3", "post:2"]);
      expect(posts).toBe(2); expect(credentials).toHaveBeenCalledTimes(3);
      expect(configuration.governedCodingInference!.requests.map((receipt) => receipt.status)).toEqual(["FAILED", "RECEIVED"]);
      expect(configuration.governedCodingInference!.requests[0].requestId).not.toBe(configuration.governedCodingInference!.requests[1].requestId);
    } finally {
      server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  }, 20000);
});
import { it } from "@jest/globals";
