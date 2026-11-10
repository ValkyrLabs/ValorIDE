# ACP agents in ValorIDE

ValorIDE supports **Agent Client Protocol v1 in both directions**: connect a local, installed coding agent inside ValorIDE, or expose ValorIDE's own agent engine to another ACP editor. External-agent conversations have their own panel and session lifecycle: their messages are never interpreted as ValorIDE model-tool XML.

## Connect an agent

1. Install and authenticate an ACP-capable agent using its own instructions. ValorIDE does not install packages or share its login token with it.
2. Run **ValorIDE: Configure ACP Agents** and add an entry in **User settings**. Workspace settings are deliberately ignored for executable configuration.
3. Open a trusted local workspace. Run **ValorIDE: Open ACP Agents** (also in the ValorIDE sidebar's more-actions menu), click **Connect**, choose the agent/workspace, and review the exact launch command.
4. Send a message. **Stop** cancels the current turn; **Disconnect** closes the session process. **New session** starts a fresh conversation. **Resume** accepts a session ID when the agent supports loading sessions.

```json
"valoride.acp.agents": [
  {
    "id": "my-agent",
    "name": "My ACP agent",
    "command": "/absolute/path/to/installed-acp-agent",
    "args": [],
    "env": {},
    "secretEnv": []
  }
]
```

Replace the example executable and arguments with the agent's documented ACP invocation. `command` is a single executable, not a shell expression; `args` are passed literally. Bare command names can resolve on PATH, excluding relative entries and executables resolved from this workspace. Prefer an absolute executable. On Windows, use a native executable or `node.exe` with the installed agent script; `.cmd` and `.bat` shell shims are not launched.

For environment-based credentials, list only the variable name in `secretEnv`, then run **ValorIDE: Set ACP Agent Secret**. Values are held in VS Code SecretStorage and injected only into that agent. Do not put credentials in `args` or checked-in files. Other provider tokens, the ValorIDE JWT, and arbitrary parent-process environment variables are not automatically forwarded. The agent can still use its own normal credential store under its user home directory.

If `session/new` requires authentication, use **Authenticate** to choose a method advertised by the agent. Agent-managed authentication is supported. Terminal-authentication methods are not advertised; complete those with the agent's own CLI and reconnect. **Mode** selects an advertised session mode.

## Approvals, files, and security

ACP is not an operating-system sandbox. The chosen executable runs with the current user's process permissions, including its own filesystem and network access. Only launch agents you trust. An agent's permission requests rely on that agent honoring the response.

ValorIDE's own ACP filesystem callbacks have a separate boundary:

- They operate within the selected workspace and reject symlink escapes, credential paths, and protected execution/approval-file edits.
- Reads include the current unsaved editor buffer; line numbers are one-based.
- Writes open a read-only diff and require explicit native confirmation. Existing documents are changed as **unsaved editor edits**, not silently saved; new files are created without overwriting a concurrent file. Missing parent directories must be created by the developer or agent's own approved tools first.
- The current document, path, and session are checked again after approval. An intervening edit or cancellation prevents stale work from being applied. This is not a claim of OS-level isolation against another local process racing filesystem changes.
- ACP permission choices default to rejection. Stop/disconnect cancels pending requests; remembered agent decisions never become ValorIDE-wide auto-approval.

The panel renders text, provider-supplied thought messages, plans, and tool updates without executing HTML, fetching images/URIs, or dispatching agent-supplied commands. Output retention is bounded with an explicit notice when older text is omitted. It is a live view, not a local transcript archive; use agent-managed session resume for persistence.

## Supported scope

The client uses the official `@agentclientprotocol/sdk` stable-v1 entrypoint: initialize, agent-managed authentication, new/load session, text prompts, streaming session updates, permission requests, filesystem callbacks, modes, cancellation and process cleanup. Optional terminal execution callbacks, elicitation, rich-media prompts, remote transports, and draft v2 are not advertised. MCP servers and credentials are not automatically forwarded.

## Use ValorIDE from another ACP editor

1. On **macOS or Linux**, open the ValorIDE sidebar in a trusted local workspace and clear any active chat task. The first workspace folder is the agent's working directory.
2. Run **ValorIDE: Start ACP Agent Server** and confirm the workspace/model access. ValorIDE opens a JSON configuration containing the installed, bundled stdio adapter command; copy that command configuration into your ACP editor's agent settings. Configuration formats differ by editor.
3. Keep this ValorIDE window running and select the **same workspace directory** in the other editor. Approve the new conversation in ValorIDE when prompted.
4. Chat in the other editor. It receives streaming updates and tool approval requests from ValorIDE's real agent engine, using the model/account already configured in ValorIDE. Each action is approved for that invocation only; these sessions do not change your global auto-approval settings.
5. Run **ValorIDE: Stop ACP Agent Server** to end access. Restarting creates a new private connection file; update the editor configuration accordingly.

The stdio adapter connects to an owner-only local Unix socket using a private connection file. It does not listen on TCP or put provider credentials in the displayed configuration. Treat that file as sensitive; do not commit it or share it. The adapter is bundled as `dist/acp-agent.cjs`; it is not a standalone hosted service and does not install or wrap another coding agent.

The exported agent creates detached ValorIDE tasks. It never replaces your regular chat task or enables global auto-approval. Workspace hooks are disabled for these tasks. If you start a regular ValorIDE task, the external task stops at its next state/approval check. Already-running tools are not retroactively undone. Workspace identity and trust are rechecked throughout the session; if the first folder changed since startup, reload the window before serving ACP. As with native ValorIDE, approved commands run with your operating-system permissions; this is not a sandbox.

Native ACP consent is also pinned to the host's local authentication revision and backend destination, including when the host starts signed out. Signing in/out, replacing or refreshing extension credentials, or changing the backend invalidates that consent and stops the bridge and its detached task. A new server/session approval is required. Monitoring starts before the enable dialog, so an account change while consent is pending cannot inherit the old approval. This conservative revocation reads no credential values, adds no network probe, and does not require a Valkyr login for local/offline providers. It is **not** a server-verified identity or remote execution grant.

This guard does not pin model/provider selection when changing that selection leaves credentials and authentication revisions unchanged. Select the intended provider before approving a session; governed remote admission must bind its own execution authority separately.

File reads/searches require approval before returning data. Edits use reviewed, guarded workspace edits instead of the native streaming preview path. Existing-file edits remain **unsaved in ValorIDE**; save them there before building/running or expecting another editor to see them on disk. Dirty targets are rejected to avoid overwriting developer work. `replace_in_file` obtains separate read and write approvals. The legacy precision-search-and-replace path is unavailable through ACP; use the supported read/replace/write tools instead.

The initial agent-side scope is one new session per connection, multi-turn text conversations, streamed messages/tools, per-action permissions, and cancellation. Reconnect to create a fresh session, including after cancelling the current task. It does not advertise persisted session loading, modes, rich-media prompting, or remote transport. Client-supplied MCP servers, system prompts, and additional workspace directories are rejected. Windows can connect to external ACP agents but cannot yet expose ValorIDE through the Unix-socket adapter. No new paid model call is made simply by enabling the server; submitted prompts use the configured provider normally.

Protocol references: [ACP v1 overview](https://agentclientprotocol.com/protocol/v1/overview), [security model](https://agentclientprotocol.com/protocol/v1/security), [filesystem contract](https://agentclientprotocol.com/protocol/v1/file-system).

## Development verification

Run `npm run test:acp` for configuration, UI, permissions, task integration, filesystem, package-completeness, SDK-peer, process, and private-socket regression tests. These use fixtures, not paid model calls. Unix-socket tests run on macOS/Linux; the client transport remains cross-platform. `node esbuild.js --production` builds both extension and stdio adapter. This test suite is not a claim of certification against every external agent/editor.

For release qualification, set `VALORIDE_ACP_TEST_ENTRYPOINT` to the absolute path of `extension/dist/acp-agent.cjs` extracted from the candidate VSIX, then run `npm run test:acp`. The stdio tests exercise that exact artifact instead of rebuilding the adapter. The other tests still exercise current source; preserve and compare source, bundle, and archive hashes separately.

## Governed Sage / SWARM admission is not yet available

The local ACP server's OS-user socket ownership and native consent do **not** establish the identity of an authenticated Sage caller. The current server uses the host's selected model/account; it does not bind the session to a server-verified dispatching principal, tenant, command, or authorized target agent. Do not enable a production Sage-to-ACP route on the strength of the local connection, a random connection identifier, prompt text, or caller-supplied identity fields.

The minimum trusted admission contract must be owned by the authenticated backend. It must derive the caller's principal and tenant from the server's security context, authorize the exact command and target agent, and bind that authority to a fresh host challenge/session and workspace with an expiry and replay protection. ValorIDE must independently validate its own origin-bound session with the same authority and consume/verify the admission before starting a task. Do not expose host bearer credentials to SWARM or accept a tenant override from ACP. The existing host `/auth/me` check alone is insufficient: it proves only the host login, and its current principal summary is not an authoritative tenant-attestation contract. Do not substitute an organization ID for a tenant ID.

This requires coordinated producer/consumer support; no such backend endpoint or signed-grant verifier is advertised by this implementation. Until it exists, missing/mismatched/expired identity or agent authorization must keep the governed route closed. Native host/session consent and per-tool approvals remain additional requirements, not substitutes for identity binding.

A server-authenticated SWARM `swarm-transport-binding/v1` registration ACK can identify its exact principal/organization/instance/socket session. It does not by itself authorize that identity to operate this ACP host or workspace. No unsigned host account labels are emitted as a substitute for an admission receipt. Consumers must retain their fail-closed host-verification gate before transmitting prompts or hydrated memory.

Similarly, `stopReason: end_turn` can represent a question or plan response, and displayed tool `completed` states are not verified process exit codes. Governed success needs a separately verified machine-evidence contract. Neither a transcript hash nor model-authored success text supplies that proof. Existing-file edits remain unsaved and must not be reported as disk/commit effects.
