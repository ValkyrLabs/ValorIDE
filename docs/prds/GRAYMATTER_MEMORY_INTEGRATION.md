# PRD: GrayMatter Deep Memory Integration for ValorIDE

**Status**: Draft  
**Version**: 1.0  
**Date**: 2026-05-22  
**Owner**: Product Engineering  
**Milestone Target**: v3.22.x

---

## 1. Problem Statement

ValorIDE operates today with a **three-tier memory architecture**:

| Tier                     | Storage                                | Scope              | Durability        |
| ------------------------ | -------------------------------------- | ------------------ | ----------------- |
| 1 — MemoryBank           | `.valoride/memorybank/` markdown files | Per-project        | Lives in repo     |
| 2 — VS Code Global State | Extension storage API                  | Per-machine        | Survives sessions |
| 3 — GrayMatter Cloud     | HTTP REST API                          | Intended as global | **Incomplete**    |

The problem is Tier 3. GrayMatter services (`GrayMatterClient`, `GrayMatterSessionService`, `GrayMatterMemoryService`) exist in the codebase but are **not wired into the LLM context injection pipeline**. Memory is written but never read back. Organizational and user-level context is never captured. Every new conversation starts cold.

This creates a compounding productivity deficit:

- Agents re-ask for project conventions that were already explained
- Architectural decisions made in one session are forgotten in the next
- User preferences (verbosity, language, test style) are re-configured repeatedly
- Swarm workers have no shared understanding of org-level standards
- Team members cannot share institutional knowledge through their IDE

**The agent is perpetually amnesiac.** GrayMatter was designed to fix this. This PRD defines how.

---

## 2. Goals

1. **Read before prompt** — Query GrayMatter at conversation start and inject relevant memories into the LLM context pipeline alongside the existing MemoryBank layer.
2. **Write after decisions** — Automatically capture architectural decisions, project conventions, and user preferences as typed memory entries.
3. **Org and user scoping** — Support three memory scopes: `user`, `organization`, and `project`, each with distinct retrieval and write rules.
4. **MCP-native integration** — Register GrayMatter as an MCP server inside ValorIDE so swarm workers can use `mcp_graymatter_*` tools natively.
5. **Memory governance UI** — Surface a lightweight memory management panel for browsing, editing, and deleting memory entries.
6. **Graceful degradation** — All GrayMatter reads are non-blocking; a timeout or auth failure silently falls back to the existing MemoryBank-only context.

### Non-Goals

- Replacing the local MemoryBank (`.valoride/memorybank/`) — it stays as Tier 1 for offline, air-gapped, and repo-committed context.
- Real-time collaborative editing of memory entries.
- Fine-grained per-file memory (handled by checkpoints/diff views).

---

## 3. User Stories

### Primary

| ID    | As a...      | I want to...                                                                           | So that...                                                     |
| ----- | ------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| US-01 | Developer    | Have ValorIDE remember that this project uses Zod for validation and never Yup         | I don't keep correcting the agent                              |
| US-02 | Developer    | Have my preferred response style (terse, no markdown, TypeScript-first) persist        | Every session feels consistent                                 |
| US-03 | Tech Lead    | Store team-wide architecture decisions (e.g., no class components, DI via constructor) | All devs on the team get consistent agent behavior             |
| US-04 | Developer    | Ask ValorIDE "what do you know about this project?"                                    | I can audit what the agent is working from                     |
| US-05 | Developer    | Delete or correct a memory entry that's wrong                                          | The agent doesn't keep repeating bad advice                    |
| US-06 | Swarm Worker | Access shared org memory when picking up a task                                        | I don't violate conventions the supervisor already established |
| US-07 | Developer    | Have major decisions auto-captured during a session                                    | I don't have to remember to save them manually                 |

### Secondary

| ID    | As a...    | I want to...                                                        | So that...                                                   |
| ----- | ---------- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| US-08 | Developer  | Configure which memory scope a write goes to (user / org / project) | Sensitive project decisions don't bleed into my user profile |
| US-09 | Team Admin | Revoke GrayMatter access for ValorIDE without touching API keys     | Offboarding is clean                                         |
| US-10 | Developer  | Use GrayMatter memory tools in custom MCP configurations            | GrayMatter works with external agents too                    |

---

## 4. Functional Requirements

### 4.1 — GrayMatter MCP Server Registration

ValorIDE must register GrayMatter as a **built-in MCP server** via `McpHub` using the GrayMatter MCP package.

**Activation**:

- Run `scripts/gm-activate --mode mcp --workspace auto` on first sign-in.
- Store the resulting scoped token in VS Code Secret Storage (existing `storeSecret()`).
- Register the MCP server in `McpHub` as `graymatter-memory` with auto-approval for read operations.

**Exposed tools** (via `mcp_graymatter_*`):

- `mcp_graymatter_memory_write` — write a memory entry
- `mcp_graymatter_memory_read` — fetch a specific entry by ID
- `mcp_graymatter_memory_query` — semantic query against all scoped memories
- `mcp_graymatter_entity_create` / `entity_get` / `entity_list` — structured entity graph
- `mcp_graymatter_schema_summary` — introspect available types
- `mcp_graymatter_show_graymatter_overview` — surface the full memory context to the agent

**Config key**: `valoride.graymatter.mcpEnabled` (default: `true`)

---

### 4.2 — Memory Scopes

All memory operations carry an explicit scope. The scope is embedded in tags and enforced server-side via GrayMatter RBAC.

```
user/          → Personal preferences, working style, tool choices
organization/  → Team standards, architecture decisions, shared conventions
project/       → Repo-specific decisions, tech stack, current sprint context
```

**Scope resolution precedence** at query time (highest to lowest):

```
project → organization → user
```

All three scopes are queried at conversation start; results are merged with project-scope entries ranked first.

**New VS Code setting**: `valoride.graymatter.defaultWriteScope` — `"project"` | `"organization"` | `"user"` (default: `"project"`)

---

### 4.3 — LLM Context Injection (Layer 3.5)

The existing `LLMContextInjector` has a 5-layer pipeline. GrayMatter inserts a **Layer 3.5** between MemoryBank (Layer 4) and ThorAPI catalog (Layer 2):

```
Layer 0:   Base system prompt          (system.json)
Layer 1:   ThorAPI catalog             (services, models, RBAC)
Layer 2:   Swarm rules                 (Supervisor + Workers)
Layer 3:   MemoryBank                  (.valoride/memorybank/ markdown)
Layer 3.5: [NEW] GrayMatter memories  (project + org + user scope)
Layer 4:   LLMDetails override         (manual UI selection)
```

**Injection contract**:

- Query is fired at conversation start using a context-aware seed query derived from:
  - Current file path / language
  - Active task description (if a task is in progress)
  - Recent tool call results
- Max 2000 tokens allocated to GrayMatter memories in the system prompt.
- Memories are formatted as a fenced `## Remembered Context` block, grouped by scope.
- Query timeout: 3 seconds. On timeout → skip layer, log warning, continue with MemoryBank only.

**New interface addition to `InjectionConfig`**:

```typescript
grayMatter?: {
  enabled: boolean;
  maxTokens: number;
  scopes: Array<"user" | "organization" | "project">;
  seedQuery?: string;
};
```

---

### 4.4 — Automatic Memory Capture

ValorIDE must detect and auto-save memory-worthy events during agent operation.

**Capture triggers**:

| Trigger                                                               | Memory Type   | Scope                |
| --------------------------------------------------------------------- | ------------- | -------------------- |
| User confirms an architecture decision ("use Zod for all validation") | `decision`    | project              |
| Agent completes a task marked `done`                                  | `artifact`    | project              |
| User sets a preference ("always use arrow functions")                 | `preference`  | user                 |
| Swarm Supervisor logs a coordination convention                       | `context`     | organization         |
| ThorAPI generation completes a service catalog entry                  | `artifact`    | project              |
| User explicitly says "remember this"                                  | user-prompted | user-specified scope |

**Memory deduplication**: Before writing, query for semantically similar entries (cosine similarity > 0.9). If a near-duplicate exists, update the existing entry rather than creating a new one.

**New setting**: `valoride.graymatter.autoCapture` — `"all"` | `"decisions"` | `"off"` (default: `"decisions"`)

---

### 4.5 — Memory Management Panel

A new webview panel: **GrayMatter Memory Browser** (`valoride.graymatter.openMemoryPanel` command).

**Sections**:

1. **Project Memories** — list of `project/`-scoped entries, sortable by date / type
2. **Org Memories** — list of `organization/`-scoped entries (read-only for non-admins)
3. **My Memories** — list of `user/`-scoped entries
4. **Session Log** — all GrayMatter reads and writes in the current session (from existing `GrayMatterMemoryService` transcript)

**Actions per entry**:

- Edit content inline
- Delete (with confirmation)
- Promote scope (project → org, or user → project)
- Copy memory ID

**Status bar indicator**: Extend existing `StatusBarService` to show GrayMatter session status (ready / unauthenticated / quota) as a small icon.

---

### 4.6 — Authentication & Sign-In Flow

**First-run UX**:

1. On extension activation, check `getSecret("graymatter-token")`.
2. If missing: show a notification: _"GrayMatter memory is available. Sign in to enable persistent context."_ with a [Sign In] button.
3. Sign-in opens `https://valkyrlabs.com/login?redirect=/graymatter/install/mcp` in the system browser.
4. After auth, the GrayMatter activation script writes a scoped token that ValorIDE polls for (or the user pastes into a secure input).
5. Token is stored via `storeSecret("graymatter-token", token)`.
6. `createGrayMatterSessionState()` is called to validate capabilities.

**Token rotation**: Expose `ValorIDE: Rotate GrayMatter Token` command (`valoride.graymatter.rotateToken`).

---

### 4.7 — Offline / Degraded Mode

| GrayMatter State                  | Behavior                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| `ready`                           | Full read + write. Layer 3.5 active.                                                         |
| `unauthenticated`                 | Skip Layer 3.5. Show sign-in prompt once per session.                                        |
| `quota`                           | Skip Layer 3.5. Show "Credits needed" notification. Pending writes queue.                    |
| `unavailable` (timeout / network) | Skip Layer 3.5. Writes go to pending queue (existing behavior in `GrayMatterMemoryService`). |
| `forbidden`                       | Skip Layer 3.5. Log RBAC error. Do not retry this session.                                   |

Pending write queue drains on next successful `ready` state check.

---

## 5. Non-Functional Requirements

| Category         | Requirement                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Latency**      | GrayMatter query must complete in < 3s or be abandoned. It must never delay the first LLM token.                                               |
| **Security**     | Token stored in VS Code Secret Storage only. Never logged. Never included in MemoryBank markdown. Token is workspace-scoped (least privilege). |
| **Privacy**      | User-scope memories never sent to org-scope endpoints. Project memories are only accessible by holders of the workspace token.                 |
| **Resilience**   | All GrayMatter calls wrapped in try/catch. Failures surface as warnings, never errors that break the extension.                                |
| **Token budget** | GrayMatter layer capped at 2000 tokens. Overflow truncates oldest / lowest-relevance entries first.                                            |
| **Testability**  | `GrayMatterClient` accepts `fetch` injection (already implemented). All new services follow this pattern for unit testing.                     |
| **Telemetry**    | Track: memory query latency, cache hit rate, write success/queue/fail ratio. No memory content in telemetry.                                   |

---

## 6. Technical Design

### 6.1 — New Files

```
src/services/graymatter/
  GrayMatterContextProvider.ts    ← queries + formats memories for LLM injection
  GrayMatterCaptureService.ts     ← detects + auto-saves memory-worthy events
  GrayMatterMcpBridge.ts          ← registers GrayMatter as MCP server in McpHub

src/views/graymatter/
  GrayMatterMemoryPanel.ts        ← webview panel controller
  GrayMatterMemoryPanel.html      ← panel UI template

src/commands/graymatter/
  graymatterCommands.ts           ← openMemoryPanel, rotateToken, signIn commands
```

### 6.2 — Modified Files

| File                                 | Change                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `src/services/llmContextInjector.ts` | Add Layer 3.5 call to `GrayMatterContextProvider`                               |
| `src/extension.ts`                   | Initialize `GrayMatterMcpBridge`, `GrayMatterCaptureService`, register commands |
| `src/services/StatusBarService.ts`   | Add GrayMatter session status indicator                                         |
| `src/core/storage/state.ts`          | No changes — existing `storeSecret`/`getSecret` used as-is                      |
| `package.json`                       | Register new commands, settings, and keybindings                                |

### 6.3 — Context Provider Interface

```typescript
// GrayMatterContextProvider.ts

export interface GrayMatterContextResult {
  formattedBlock: string; // Markdown block for LLM injection
  entriesUsed: number; // Count of memories included
  tokensEstimated: number; // Estimated token count
  durationMs: number; // Query round-trip time
  fromScopes: string[]; // Which scopes contributed
}

export class GrayMatterContextProvider {
  async getContextForPrompt(
    seedQuery: string,
    config: GrayMatterContextConfig,
  ): Promise<GrayMatterContextResult | null>;
}
```

### 6.4 — Capture Service Interface

```typescript
// GrayMatterCaptureService.ts

export type CaptureEvent =
  | { kind: "decision"; content: string; scope?: MemoryScope }
  | { kind: "preference"; content: string; scope?: MemoryScope }
  | { kind: "artifact"; content: string; scope?: MemoryScope }
  | { kind: "user_explicit"; content: string; scope: MemoryScope };

export class GrayMatterCaptureService {
  async capture(event: CaptureEvent): Promise<void>;
  async maybeCapture(agentMessage: string): Promise<void>;
}
```

`maybeCapture` runs a lightweight classifier (regex + keyword heuristics, no extra LLM call) to decide if an agent message contains a capturable convention.

### 6.5 — MCP Bridge

```typescript
// GrayMatterMcpBridge.ts

export class GrayMatterMcpBridge {
  async register(hub: McpHub): Promise<void>;
  async unregister(hub: McpHub): Promise<void>;
  isRegistered(): boolean;
}
```

The bridge runs `gm-activate --mode mcp --workspace auto` as a child process on first call, stores the resulting server config, then calls `hub.addServer("graymatter-memory", config)`.

---

## 7. Data Model

### Memory Entry (GrayMatter wire format, extended)

```typescript
interface ValorIDEMemoryEntry extends GrayMatterMemoryInput {
  tags: string[]; // must include scope tag: "scope:project" | "scope:org" | "scope:user"
  metadata: {
    valorIdeVersion: string;
    captureSource: "auto" | "explicit" | "swarm";
    projectRoot?: string; // SHA of workspace root path for project-scoped entries
    orgId?: string; // org identifier for org-scoped entries
  };
}
```

### Memory scope tags

- `scope:project` + `project:${workspaceRootHash}`
- `scope:organization` + `org:${orgId}`
- `scope:user`

---

## 8. Settings Reference

```jsonc
// package.json contributes.configuration additions
{
  "valoride.graymatter.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable GrayMatter cloud memory integration.",
  },
  "valoride.graymatter.mcpEnabled": {
    "type": "boolean",
    "default": true,
    "description": "Register GrayMatter as an MCP server inside ValorIDE.",
  },
  "valoride.graymatter.autoCapture": {
    "type": "string",
    "enum": ["all", "decisions", "off"],
    "default": "decisions",
    "description": "Controls which events are automatically saved to GrayMatter.",
  },
  "valoride.graymatter.defaultWriteScope": {
    "type": "string",
    "enum": ["project", "organization", "user"],
    "default": "project",
    "description": "Default scope for automatic memory writes.",
  },
  "valoride.graymatter.contextMaxTokens": {
    "type": "number",
    "default": 2000,
    "description": "Maximum tokens allocated to GrayMatter context in the system prompt.",
  },
  "valoride.graymatter.queryTimeoutMs": {
    "type": "number",
    "default": 3000,
    "description": "Timeout in ms for GrayMatter context queries. Exceeded queries are skipped silently.",
  },
}
```

---

## 9. Acceptance Criteria

### AC-01: Memory Read → LLM Injection

- Given a GrayMatter session in `ready` state
- When a new conversation is started
- Then a query is fired using a seed derived from the current file context
- And the results appear in the system prompt under `## Remembered Context`
- And no GrayMatter error breaks the conversation start

### AC-02: Auto-Capture — Decision

- Given `valoride.graymatter.autoCapture = "decisions"`
- When the agent outputs text containing a clear architectural decision
- Then `GrayMatterCaptureService.maybeCapture()` writes a `decision`-type memory
- And the memory is retrievable in the next session

### AC-03: Explicit Memory Save

- Given any conversation state
- When the user says "remember this: always use named exports"
- Then a `preference`-type memory with `scope:user` is written
- And confirmation is shown in the chat view

### AC-04: MCP Tool Availability

- Given `valoride.graymatter.mcpEnabled = true`
- When a swarm worker lists available MCP tools
- Then `mcp_graymatter_memory_query` and `mcp_graymatter_memory_write` appear
- And calling `mcp_graymatter_memory_query` returns results from the registered session

### AC-05: Graceful Degradation

- Given GrayMatter is unreachable (network error)
- When a conversation is started
- Then the system prompt loads within the normal timeout using MemoryBank only
- And a single warning is logged (not shown as an error to the user)
- And pending writes are queued for retry

### AC-06: Memory Panel

- Given the user runs `ValorIDE: Open Memory Panel`
- Then a webview opens showing project, org, and user memory sections
- And the user can delete a memory entry with a confirmation dialog
- And the session log shows all reads and writes from the current session

### AC-07: Token Rotation

- Given the user runs `ValorIDE: Rotate GrayMatter Token`
- Then the old token is deleted from Secret Storage
- And the sign-in flow is re-triggered
- And the new token is validated before the command completes

### AC-08: Scope Isolation

- Given a memory written with `scope:project` and a specific `project:${hash}`
- When a different workspace queries GrayMatter
- Then that memory is NOT returned in the query results

---

## 10. Phased Delivery

### Phase 1 — Foundation (Sprint 1–2)

- [ ] Wire `GrayMatterContextProvider` into `LLMContextInjector` as Layer 3.5
- [ ] Implement first-run sign-in flow and token storage
- [ ] Add GrayMatter status indicator to status bar
- [ ] All reads are non-blocking with 3s timeout

### Phase 2 — Capture & Write (Sprint 3)

- [ ] Implement `GrayMatterCaptureService` with decision/preference detection
- [ ] Add explicit "remember this" trigger in chat parsing
- [ ] Scope tagging on all writes (`project`, `org`, `user`)
- [ ] Memory deduplication check before write

### Phase 3 — MCP Integration (Sprint 4)

- [ ] `GrayMatterMcpBridge` registers GrayMatter as a named MCP server
- [ ] Swarm workers can call `mcp_graymatter_*` tools
- [ ] Auto-approval enabled for read operations

### Phase 4 — Memory Panel & Governance (Sprint 5)

- [ ] Memory Browser webview panel
- [ ] Edit / delete / promote scope actions
- [ ] Session log in panel
- [ ] Token rotation command

---

## 11. Risks & Mitigations

| Risk                                                           | Likelihood | Impact | Mitigation                                                                                                              |
| -------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| GrayMatter query latency adds to TTFT (time-to-first-token)    | Medium     | High   | Query fires in parallel with context assembly; hard cap at 3s; never blocks prompt construction                         |
| Token over-spend from large memory result sets                 | Medium     | Medium | 2000-token hard cap; truncate by recency and relevance score                                                            |
| User writes sensitive data (PII, secrets) into memory          | Low        | High   | Warning in UI: "Memory is stored in GrayMatter cloud. Do not save credentials."; memory content excluded from telemetry |
| Auth token compromise                                          | Low        | High   | Workspace-scoped tokens (least privilege); stored in Secret Storage; rotation command available                         |
| Auto-capture produces noisy / incorrect memories               | Medium     | Medium | Default is `"decisions"` not `"all"`; user can review and delete in Memory Panel; deduplication reduces clutter         |
| MCP server registration conflicts with user-configured servers | Low        | Low    | Use reserved server name `graymatter-memory`; log conflict and skip if name taken                                       |

---

## 12. Dependencies

| Dependency                                                 | Owner               | Status          |
| ---------------------------------------------------------- | ------------------- | --------------- |
| GrayMatter MCP package (`gm-activate` CLI)                 | ValkyrLabs Platform | Available       |
| GrayMatter REST API (`/MemoryEntry`, `/MemoryEntry/query`) | ValkyrLabs Platform | Available       |
| `GrayMatterClient.ts` HTTP layer                           | ValorIDE (done)     | Exists — extend |
| `GrayMatterSessionService.ts` auth                         | ValorIDE (done)     | Exists — extend |
| `GrayMatterMemoryService.ts` write queue                   | ValorIDE (done)     | Exists — extend |
| `McpHub.ts` server registration API                        | ValorIDE (done)     | Exists — use    |
| `LLMContextInjector.ts` injection pipeline                 | ValorIDE (done)     | Exists — modify |
| Valkyr Labs account with GrayMatter access                 | End user            | Required        |

---

## 13. Out of Scope (Future Considerations)

- **GrayMatter Light mode** (local-first notebooks with optional cloud promotion) — separate PRD
- **Team admin console** for managing org-scope memory governance
- **Memory versioning / history** (diff between memory states over time)
- **Cross-IDE memory** (VS Code ↔ JetBrains sharing the same GrayMatter workspace)
- **AI-assisted memory hygiene** (auto-archiving stale memories)

---

_This PRD is the source of truth for the GrayMatter Deep Memory Integration milestone. Implementation tickets should be cut from the phased delivery section. All AC items are the definition of done for their respective features._
