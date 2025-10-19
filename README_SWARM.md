# ValorIDE SWARM (Mothership) Integration

## Overview

ValorIDE provides a "mothership" websocket connection to the ValkyrAI backend. This enables multiple ValorIDE instances to form a coordinated agentic swarm: broadcasting presence, receiving remote commands, and participating in peer-to-peer WebRTC for resilience. The webview includes a SwarmPanel UI to manage and command agents.

## Key client pieces

- `MothershipService` — connects to the ValkyrAI websocket/mothership, registers instance, handles roll-call and remote commands.
- `CommunicationService` — normalizes messages between STOMP/VSCode hub and local P2P overlays.
- `SwarmPanel` — UI component (webview) which lists agents and allows sending commands.

## How it works

1. On connect, `MothershipService` sends a registration message and presence topics (`presence:join`, `presence:rollcall`).
2. The ValkyrAI server's `SwarmRegistryService` records the agent and broadcasts the `/topic/agents` list.
3. The `SwarmPanel` listens to normalized `websocket-message` events and the VSCode postMessage channel to display agents.
4. Commands are sent as `command` envelopes; the server will forward them to `/queue/agents/{instanceId}/commands` (private) or `/topic/agent-commands` (broadcast).

## Quick dev steps

- In ValorIDE webview, open the "Valor" tab (or embed `SwarmPanel`) and click "Roll Call" to ask agents to announce themselves.
- Use the command box to send a simple JSON command like: ping or { "cmd": "runTask", "taskId": "abc" }.

## Notes

- The current implementation is intentionally non-blocking and optimistic: messages are best-effort. For production-grade orchestration add server-side persistence, auth checks, and command delivery guarantees (acks/retries).
