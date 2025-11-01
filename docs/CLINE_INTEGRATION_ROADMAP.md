# ValorIDE Cline Parity Integration Roadmap

## 🎯 Mission

Bring Cline's CLI agent mode, multi-agent orchestration, and multi-project checkpoints to ValorIDE.

## 📊 Status: Phase 1 COMPLETE ✅

### Phase 1: CLI Foundation (COMPLETE)

**Effort**: 70h → 2h scaffolding complete  
**Files Created**: 13 (types, SessionManager, CLI, 4 command stubs, tests, config)  
**Tests**: 5/5 passing ✅  
**Build**: Success ✅

#### Deliverables

✅ **Discovery & Analysis**
- `docs/cline-parity.md` — Feature matrix + technical plan
- Analyzed Cline's cline-core.ts, task management, checkpoint system
- Documented 8 gaps between Cline and ValorIDE

✅ **CLI Package**
```
packages/valor-cli/
├── src/
│   ├── types.ts (11 interfaces for sessions, tasks, agents, checkpoints)
│   ├── SessionManager.ts (UUID-based persistence in ~/.valoride/sessions/)
│   ├── cli.ts (commander.js CLI entry point)
│   ├── commands/
│   │   ├── TaskCommand.ts (task run/list — stub)
│   │   ├── InstanceCommand.ts (instance ls/start/stop — stub)
│   │   ├── ConfigCommand.ts (config edit/print — stub)
│   │   └── CheckpointCommand.ts (checkpoint crud — stub)
│   └── SessionManager.test.ts (5 unit tests, all passing)
├── package.json (v0.1.0, commander/chalk/ora/uuid)
├── tsconfig.json (ES2022 target)
├── vitest.config.ts (Node environment)
└── README.md (CLI quickstart + dev guide)
```

✅ **Session Persistence Layer**
- Create/load/list/delete sessions
- UUID-based session IDs for IDE-CLI parity
- lastActivity tracking
- Isolated test cleanup

✅ **CLI Structure (Commander.js)**
```bash
valor task run "description"         # Stub: create + run task
valor task list                      # Stub: list all tasks

valor instance ls                    # Stub: list sessions
valor instance start                 # Stub: start new
valor instance stop --session <id>   # Stub: stop session

valor config print                   # Stub: show config
valor config edit                    # Stub: edit config

valor checkpoint create              # Stub: create checkpoint
valor checkpoint list                # Stub: list checkpoints
valor checkpoint restore             # Stub: restore from ckpt
valor checkpoint compare             # Stub: diff checkpoints
```

---

## 📋 Phase 2-5 Roadmap

### Phase 2: Multi-Agent Orchestrator (60h)

**Goal**: Enable role-scoped agents with baton-passing and persistent audit logs.

**Tasks**:
- [ ] Define 5 agent roles: planner, coder, tester, docs, integrator
- [ ] Implement orchestrator contract (DAG builder + role dispatch)
- [ ] Create agent ledger (JSONL in `~/.valoride/tasks/<taskId>/agent.ledger`)
- [ ] Implement baton-passing protocol (bounded artifacts per turn)
- [ ] E2E tests: mock agents, verify handoffs
- [ ] Integration with ValorIDE's Task loop

**Key Interfaces** (already in types.ts):
- `AgentRole` — role definition + system prompt
- `AgentLedgerEntry` — audit trail entry (timestamp, agent, action, tokens, cost)

---

### Phase 3: Multi-Project Checkpoints (50h)

**Goal**: Cross-repo checkpoint creation, restore, and comparison.

**Tasks**:
- [ ] Parse workspace manifest (`.valoride/workspace.yml` or `.code-workspace`)
- [ ] Implement checkpoint driver (git tags + bundles)
- [ ] Git worktree per agent (parallel-safe isolation)
- [ ] Bundle snapshots (`.valor/checkpoints/<task>/<step>/<repo>.bundle`)
- [ ] Cross-repo restore logic (idempotent, transactional)
- [ ] Tests: multi-repo scenarios, partial failures, restore verification

**Key Interfaces** (already in types.ts):
- `WorkspaceManifest` — repos list + remotes
- `CheckpointInfo` — task/step/repo/hash metadata

---

### Phase 4: Plan/Act Webview UX (30h)

**Goal**: Bring Cline's plan/act UX to ValorIDE's webview.

**Tasks**:
- [ ] Add plan mode display (Mermaid DAG visualization)
- [ ] Diff preview before execution ("Proceed While Running" equivalent)
- [ ] Token/cost accounting inline
- [ ] Integrate with existing Plan/Act mode toggle

---

### Phase 5: Docs & PRs (20h)

**Goal**: Documentation, migration guide, and PR submission.

**Tasks**:
- [ ] CLI Quickstart guide
- [ ] Multi-Agent orchestration patterns
- [ ] Multi-Project workspace guide
- [ ] Cline Parity Matrix (public status page)
- [ ] Migration notes (feature flags, breaking changes)
- [ ] Open 5 PRs: valor-cli, multi-agent, checkpoints, plan-act-ux, docs

---

## 🔗 Feature Parity Matrix

| Feature | Cline | ValorIDE Current | ValorIDE Target | Status | Effort |
|---------|-------|------------------|-----------------|--------|--------|
| CLI Agent | ✅ | ❌ | ✅ (Phase 2) | Scaffolding | 40h |
| Multi-Agent | 🟡 | ❌ | ✅ | Not Started | 60h |
| Plan/Act UX | ✅ | 🟡 | ✅ | Partial | 30h |
| Checkpoints | ✅ | 🟡 | ✅ | Single-repo only | 35h |
| Persistent Ledger | 🟡 | ❌ | ✅ | Not Started | 15h |
| Context Persistence | ✅ | 🟡 | ✅ | Partial | 25h |
| MCP Auto-Binding | ✅ | 🟡 | ✅ | IDE only | 20h |
| Workspace Manifest | ❌ | ❌ | ✅ | Not Started | 20h |

**Total Remaining Effort**: ~245h (3 weeks at full capacity)

---

## 🧪 Testing Strategy

### Unit Tests (Phase 1)
- ✅ SessionManager: 5/5 passing

### Integration Tests (Phase 2-3)
- [ ] CLI task run → IDE context sync
- [ ] Multi-agent handoff (planner → coder)
- [ ] Checkpoint across 2+ repos
- [ ] Session resume (CLI → IDE attach)

### E2E Tests (Phase 4-5)
- [ ] Full task execution (CLI start → multi-agent turns → checkpoint)
- [ ] Plan/Act workflow (plan mode → review → act mode)
- [ ] Workspace restore (multi-repo, partial rollback scenarios)

---

## 🚀 Quick Start (Dev)

```bash
cd packages/valor-cli
npm install
npm run build    # Compile TypeScript
npm test         # Run unit tests
npm run dev      # Watch mode
```

For CLI testing:
```bash
# Link locally
npm link

# Test commands
valor --help
valor task list
valor instance ls
```

---

## 📦 Dependencies

### Already in ValorIDE
- CheckpointManager (reuse for multi-repo)
- SessionManager pattern (CLI mirrors IDE)
- P2P WebSocket (CLI↔IDE communication)
- MCP registry (tool auto-binding)
- ThorAPI services (API integration)

### New for CLI
- commander.js (CLI framework)
- chalk (colored output)
- ora (spinners/progress)
- uuid (session IDs)

---

## 🎓 Key Learnings

1. **Cline's Strength**: Unified CLI + VSCode extension architecture with shared context
2. **ValorIDE Advantage**: Already has ThorAPI, P2P, MCP — can do more with less
3. **CLI-First Strategy**: Scaffold CLI first, then integrate with IDE (top-down > bottom-up)
4. **Session Persistence**: UUID + JSON files is simpler than shared database
5. **Feature Flags**: All new features default OFF (safety, gradual rollout)

---

## 🔗 Related Docs

- [Cline Parity Analysis](./cline-parity.md)
- [ValorIDE Architecture](./architecture/README.md)
- [MCP Integration](./mcp/README.md)
- [CLI Usage](../packages/valor-cli/README.md)

---

**Next Step**: Phase 2 — Multi-Agent Orchestrator (scheduled after Phase 1 PR approval)