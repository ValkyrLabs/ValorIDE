#!/usr/bin/env node
import { Readable, Writable } from "node:stream";
import * as acp from "@agentclientprotocol/sdk";
import { createValorideAgent } from "./AgentServer";
import { HostConnection } from "./HostConnection";
import { version } from "../../../../package.json";

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--connection")
    throw new Error(
      "Usage: node acp-agent.cjs --connection /absolute/private/connection.json",
    );
  const backend = await HostConnection.connect(args[1]);
  const server = createValorideAgent(backend, version);
  const stop = () => server.close();
  if (backend.signal.aborted) {
    server.close();
    throw new Error("The ACP host closed.");
  }
  backend.signal.addEventListener("abort", stop, { once: true });
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  const connection = server.connect(
    acp.ndJsonStream(
      Writable.toWeb(process.stdout) as WritableStream<Uint8Array>,
      Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>,
      { maxMessageBytes: 4 * 1024 * 1024 },
    ),
  );
  await connection.closed;
  server.close();
}

void main().catch(() => {
  // Never copy a connection token, prompt, environment or host exception to logs.
  process.stderr.write(
    "ValorIDE ACP could not connect. Enable ACP agent access in the running trusted ValorIDE workspace and check the exported connection-file path.\n",
  );
  process.exitCode = 1;
});
