# Cline → ValorIDE Parity Analysis

## Cline Architecture Summary

**Cline's Key Components:**
1. **`src/standalone/cline-core.ts`** — Core orchestrator; manages process lifecycle, graceful shutdown, lock management, signal handling
2. **`src/core/task/`** — Task state management, message state, tool executor, focus chains
3. **`src/core/assistant-message/`** — Structured messaging for agent turns
4. **`src/core/storage/`** — Persistent context storage (checkpoints, state)
5. **`src/core/controller/`** — Main agent loop controller
6. **`src/core/commands/`** — Slash commands, task management
7. **Package structure:** Multiple providers (OpenAI, Anthropic, etc.), unified API layer

**CLI Capabilities (inferred from scripts & code):**
- `dev:cli:watch` — Local CLI development mode
- `compile-cli` — Standalone CLI binary build
- `compile-standalone-npm` — NPM-installable CLI tool
- Likely supports: `cline task run`, `cline instance ls/start/stop`, config management

**Plan/Act UX:**
- Message-based architecture with explicit "planning" vs "acting" modes
- Checkpoint system: snapshots at each step, compare/restore capabilities
- "Proceed While Running" for background processes

**Checkpoints Implementation:**
- Git-based (implied from `TaskLockUtils.ts`)
- Per-step snapshots with compare UI
- Workspace isolation per task

## ValorIDE Current State

**Existing:**
- VS Code extension framework ✓
- Multi-model provider support (Anthropic, OpenAI, etc.) ✓
- MCP integration + custom tool creation ✓
- Browser automation ✓
- File editing with PSR tool ✓
- Terminal command execution ✓
- Checkpoints (basic) ✓
- P2P WebSocket communication ✓
- ThorAPI integration ✓

**Gaps (vs Cline):**
- ❌ CLI agent mode (run tasks from command line)
- ❌ Multi-agent orchestration (role-scoped agents: planner, coder, tester, docs)
- ❌ Persistent agent ledger (JSONL audit log)
- ❌ Multi-project workspace support (multi-root + checkpoints across repos)
- ❌ Cross-repo checkpoint sync (git worktrees, bundles)
- ❌ Plan/Act UX in webview (plan → compare → act cycle)
- ❌ Agent handoff protocol (baton-passing, bounded context)

## Parity Matrix

| Feature | Cline | ValorIDE Current | ValorIDE Target | Priority | Effort |
|---------|-------|-----------------|-----------------|----------|--------|
| **CLI Agent** | ✓ Task run, instance mgmt | ❌ | ✓ | P0 | 40h |
| **Multi-Agent** | Partial (executor focus) | ❌ | ✓ (planner→coder→tester→docs) | P1 | 60h |
| **Plan/Act UX** | ✓ In editor | ❌ | ✓ In webview | P1 | 30h |
| **Checkpoints** | ✓ Single-repo | ✓ Single-repo | ✓ Multi-repo + worktrees | P1 | 35h |
| **Persistent Ledger** | Implicit in storage | ❌ | ✓ JSONL audit | P2 | 15h |
| **Context Persistence** | ✓ Via VSCode state | ✓ (partial) | ✓ CLI-IDE parity | P0 | 25h |
| **MCP Auto-Binding** | ✓ (server registry) | ✓ (partial) | ✓ (CLI + IDE sync) | P1 | 20h |
| **Workspace Manifest** | ❌ | ❌ | ✓ .code-workspace + YAML | P1 | 20h |

**Total Effort:** ~245h (3 weeks at full capacity)

## Implementation Phases

### Phase 1: CLI Foundation (70h)
- `packages/valor-cli` scaffolding (commander.js)
- Commands: `task run`, `instance`, `config`, `checkpoint`
- Session persistence (UUID-based context sharing)
- Integration with MCP registry

### Phase 2: Multi-Agent Orchestrator (75h)
- Role definitions (planner, coder, tester, docs, integrator)
- Agent ledger (JSONL) with turn tracking
- Orchestrator contract & baton-passing
- Bounded artifacts per turn (file limits, token budgets)

### Phase 3: Multi-Project Checkpoints (50h)
- Workspace manifest (YAML/JSON)
- git worktree per agent + task
- Lightweight tags (`valor/ckpt/<task>/<step>`)
- Bundle snapshots (`.valor/checkpoints/`)
- Cross-repo restore logic

### Phase 4: Plan/Act Webview UX (30h)
- Webview plan display (Mermaid-style DAG)
- Diff preview before execution
- "Proceed While Running" equivalent
- Cost/token accounting inline

### Phase 5: Docs & PRs (20h)
- CLI Quickstart, Multi-Agent guide, Multi-Project patterns
- Cline Parity Matrix (public)
- Migration notes + feature flags

## Recommended Execution Order

1. **Read ValorIDE source** (core structure, task loop, MCP integration)
2. **Scaffold packages/valor-cli** with TDD (test each command)
3. **Implement session persistence** (context sharing between CLI + IDE)
4. **Build agent orchestrator** with mock agents first
5. **Multi-project workspace** (manifest parser, git worktree driver)
6. **Checkpoint driver** (tags, bundles, restore)
7. **Webview enhancements** (plan/act display)
8. **Integration tests** across CLI, IDE, multi-repo scenarios
9. **Docs + examples**
10. **Open PRs** with feature flags
