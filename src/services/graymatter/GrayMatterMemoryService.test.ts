import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
  GrayMatterClientError,
  GrayMatterMemoryClient,
  GrayMatterMemoryService,
  GrayMatterMemoryWrite,
} from "./GrayMatterMemoryService";

class FakeGrayMatterClient implements GrayMatterMemoryClient {
  public calls: Array<{ write: GrayMatterMemoryWrite; idempotencyKey: string }> = [];
  public failures: Error[] = [];

  async writeMemory(write: GrayMatterMemoryWrite, idempotencyKey: string): Promise<void> {
    this.calls.push({ write, idempotencyKey });
    const failure = this.failures.shift();
    if (failure) {
      throw failure;
    }
  }
}

const createTempDir = async () => fs.mkdtemp(path.join(os.tmpdir(), "valoride-graymatter-"));

describe("GrayMatterMemoryService", () => {
  it("persists unavailable writes and reloads them after restart", async () => {
    const tempDir = await createTempDir();
    const client = new FakeGrayMatterClient();
    client.failures.push(new GrayMatterClientError("unavailable"));

    const service = new GrayMatterMemoryService(tempDir, client, () => 1000);
    await service.initialize();

    await expect(
      service.write({
        text: "remember the pricing insight",
        type: "CONTEXT",
        metadata: { apiKey: "sk-test-secret-value" },
      }),
    ).resolves.toBe("queued");

    const restarted = new GrayMatterMemoryService(tempDir, new FakeGrayMatterClient(), () => 2000);
    await restarted.initialize();

    expect(restarted.getTranscriptSummary().queued).toBe(1);
    expect(restarted.getPendingWrites()[0].write.metadata?.apiKey).toBe("[redacted]");
  });

  it("replays queued writes once and removes successful entries", async () => {
    const tempDir = await createTempDir();
    const client = new FakeGrayMatterClient();
    client.failures.push(new GrayMatterClientError("unavailable"));

    const service = new GrayMatterMemoryService(tempDir, client, () => 1000);
    await service.initialize();
    await service.write({ text: "memory survives reload", type: "CONTEXT" });

    const replayClient = new FakeGrayMatterClient();
    const restarted = new GrayMatterMemoryService(tempDir, replayClient, () => 2000);
    await restarted.initialize();

    await expect(restarted.replayDueWrites()).resolves.toEqual({ succeeded: 1, failed: 0 });
    expect(restarted.getPendingWrites()).toHaveLength(0);
    expect(replayClient.calls).toHaveLength(1);

    await restarted.replayDueWrites();
    expect(replayClient.calls).toHaveLength(1);
  });

  it("classifies auth and credit replay failures as blocked", async () => {
    const tempDir = await createTempDir();
    const client = new FakeGrayMatterClient();
    client.failures.push(new GrayMatterClientError("unavailable"));

    const service = new GrayMatterMemoryService(tempDir, client, () => 1000);
    await service.initialize();
    await service.write({ text: "blocked auth memory" });

    const replayClient = new FakeGrayMatterClient();
    replayClient.failures.push(new GrayMatterClientError("auth"));
    const restarted = new GrayMatterMemoryService(tempDir, replayClient, () => 2000);
    await restarted.initialize();

    await restarted.replayDueWrites();

    expect(restarted.getTranscriptSummary().blockedByAuth).toBe(1);
    expect(restarted.getPendingWrites()[0].status).toBe("blocked");
  });

  it("discards queued memory by id", async () => {
    const tempDir = await createTempDir();
    const client = new FakeGrayMatterClient();
    client.failures.push(new GrayMatterClientError("unavailable"));

    const service = new GrayMatterMemoryService(tempDir, client, () => 1000);
    await service.initialize();
    await service.write({ text: "discardable memory" });
    const queued = service.getPendingWrites()[0];

    await expect(service.discard(queued.id)).resolves.toBe(true);
    expect(service.getPendingWrites()).toHaveLength(0);
  });
});
