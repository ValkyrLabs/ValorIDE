# ValorIDE CLI — Completion PRD

**Objective:** Complete the Valor Command Line utility from 60% to production-ready 100%

**Current Status:** Foundation built (orchestrator, session management, CLI framework) with stub implementations for key features.

---

## 1. Current State Analysis

### ✅ What's Built (60%)

| Component | Status | Notes |
|-----------|--------|-------|
| CLI Entry Point | ✅ Complete | Commander.js setup, 4 commands |
| Session Management | ✅ Complete | UUID-based, JSON persistence |
| Orchestrator Engine | ✅ Complete | Multi-agent, baton-passing, JSONL ledger |
| Agent Ledger | ✅ Complete | Audit trail, token/cost tracking |
| Role Definitions | ✅ Complete | 5 roles (planner, coder, tester, docs, integrator) |
| Workspace Manifest | ✅ Complete | YAML parser for multi-repo |
| Type Definitions | ✅ Complete | 11 interfaces |

### ❌ What's Stubbed/Missing (40%)

| Component | Status | Gap |
|-----------|--------|-----|
| CheckpointDriver | 🚧 Stub | Git commands not implemented |
| LLM Integration | 🚧 Stub | No actual API calls |
| Task Execution | 🚧 Stub | Plan mode is dry-run only |
| Config System | 🚧 Stub | Only print works, no edit |
| Agent.execute() | 🚧 Stub | Returns mock data |
| Cost Meter | ❌ Missing | No real-time cost tracking |
| Interactive Mode | ❌ Missing | No REPL or watch mode |
| ThorAPI Integration | ❌ Missing | No backend connectivity |

---

## 2. Completion Roadmap

### Phase 1: Core Execution (Week 1)
**Goal:** Make `valor task` actually execute code

#### 1.1 LLM Provider Integration
```typescript
// src/llm/LLMProvider.ts
interface LLMProvider {
  generate(prompt: string, context: any): Promise<LLMResponse>;
  countTokens(text: string): number;
  getCost(tokens: number): number;
}

// Implementations:
// - OpenAIProvider (gpt-4, gpt-4o, o3-mini)
// - AnthropicProvider (claude-3.5-sonnet, claude-3-opus)
// - LocalProvider (ollama, lmstudio)
```

#### 1.2 Real Agent Execution
- Replace stub `Agent.execute()` with actual LLM calls
- Implement streaming responses
- Add tool calling support (file read, write, command execute)

#### 1.3 TaskCommand Completion
- Implement actual plan generation (not dry-run)
- Implement act mode with file modifications
- Add `--auto-approve` flag for CI/CD

**Deliverable:** `valor task "Add logging to auth.ts"` actually modifies files

---

### Phase 2: Checkpoint System (Week 1-2)
**Goal:** Make checkpoints functional for rollback

#### 2.1 Git Integration
```typescript
// src/checkpoint/GitCheckpointDriver.ts
class GitCheckpointDriver {
  async create(taskId: string, step: number, message: string): Promise<void>
  async restore(taskId: string, step: number): Promise<void>
  async list(taskId: string): Promise<CheckpointInfo[]>
  async diff(taskId: string, step1: number, step2: number): Promise<string>
}
```

#### 2.2 Checkpoint Commands
- `valor checkpoint create --task <id> --step <n> --message "..."`
- `valor checkpoint restore --task <id> --step <n>`
- `valor checkpoint diff --task <id> --from 1 --to 3`

#### 2.3 Multi-Repo Support
- Cross-repo atomic checkpoints
- Workspace manifest integration
- Rollback transaction safety

**Deliverable:** Full checkpoint CRUD with git tags + bundles

---

### Phase 3: Configuration System (Week 2)
**Goal:** Complete config management

#### 3.1 Config Schema
```json
{
  "defaultModel": "gpt-4o",
  "providers": {
    "openai": { "apiKey": "env:OPENAI_API_KEY" },
    "anthropic": { "apiKey": "env:ANTHROPIC_API_KEY" }
  },
  "autoApprove": false,
  "maxTurns": 20,
  "checkpointEnabled": true,
  "telemetry": true
}
```

#### 3.2 Config Commands
- `valor config init` — Interactive setup wizard
- `valor config set <key> <value>` — Update single value
- `valor config get <key>` — Read single value
- `valor config edit` — Open in $EDITOR

#### 3.3 Provider Management
- `valor config provider add <name>` — Add new LLM provider
- `valor config provider list` — Show configured providers
- `valor config provider test <name>` — Validate API key

**Deliverable:** Full configuration management with validation

---

### Phase 4: Cost & Telemetry (Week 2-3)
**Goal:** Production observability

#### 4.1 Real-Time Cost Tracking
```typescript
// src/telemetry/CostMeter.ts
class CostMeter {
  track(tokens: number, provider: string, model: string): void
  getSessionCost(): number
  getTaskCost(taskId: string): number
  getDailyCost(): number
  predict(task: string): number // Cost estimation
}
```

#### 4.2 Cost Commands
- `valor cost` — Show current session costs
- `valor cost --task <id>` — Show task costs
- `valor cost --daily` — Daily breakdown
- `valor cost budget --set 50` — Set daily budget limit

#### 4.3 Telemetry Dashboard
- JSON export: `valor cost export --format json`
- CSV export: `valor cost export --format csv --output report.csv`
- Integration with ThorAPI UsageTransactionService

**Deliverable:** Cost tracking with budget alerts

---

### Phase 5: Advanced Features (Week 3-4)
**Goal:** CLI parity with IDE features

#### 5.1 Interactive Mode
```bash
valor interactive                    # REPL mode
> @thor-api get-user --id 123       # Tool calls
> /plan "Add feature"               # Plan mode
> /act                              # Execute plan
> /checkpoint                       # Save state
> /restore 1                        # Rollback
> /exit                             # Save & quit
```

#### 5.2 Watch Mode
```bash
valor watch --glob "*.ts" --command "valor task 'Fix types'"
```

#### 5.3 Batch Execution
```bash
valor batch --file tasks.json       # Execute multiple tasks
```

#### 5.4 ThorAPI Integration
```typescript
// Connect to ValkyrAI backend
- Session sync with IDE
- Workflow execution via ThorAPI
- ContentData storage for specs
- RatingService integration
```

---

## 3. Technical Specifications

### 3.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      CLI Entry (cli.ts)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────┐
│TaskCommand   │ │Instance  │ │Checkpoint    │ │Config    │
└──────┬───────┘ └────┬─────┘ └──────┬───────┘ └────┬─────┘
       │              │              │              │
       ▼              │              │              │
┌──────────────┐      │              │              │
│Orchestrator  │      │              │              │
│├── Agent     │      │              │              │
│├── Agent     │      │              │              │
│└── Agent     │      │              │              │
└──────┬───────┘      │              │              │
       │              │              │              │
       ▼              │              │              │
┌──────────────┐      │              │              │
│LLM Providers │      │              │              │
│├── OpenAI    │      │              │              │
│├── Anthropic │      │              │              │
│└── Local     │      │              │              │
└──────────────┘      │              │              │
                      │              │              │
                      ▼              ▼              ▼
              ┌──────────────┐ ┌──────────┐ ┌──────────┐
              │SessionManager│ │GitDriver │ │ConfigMgr │
              └──────────────┘ └──────────┘ └──────────┘
```

### 3.2 File Structure (Target)

```
packages/valor-cli/
├── src/
│   ├── cli.ts
│   ├── types.ts
│   ├── SessionManager.ts
│   ├── commands/
│   │   ├── TaskCommand.ts
│   │   ├── InstanceCommand.ts
│   │   ├── CheckpointCommand.ts
│   │   ├── ConfigCommand.ts
│   │   └── CostCommand.ts           # NEW
│   ├── orchestrator/
│   │   ├── Orchestrator.ts
│   │   ├── Agent.ts
│   │   ├── AgentLedger.ts
│   │   └── RoleDefinitions.ts
│   ├── llm/                          # NEW
│   │   ├── LLMProvider.ts
│   │   ├── OpenAIProvider.ts
│   │   ├── AnthropicProvider.ts
│   │   └── LocalProvider.ts
│   ├── checkpoint/
│   │   ├── CheckpointDriver.ts       # IMPLEMENT
│   │   └── GitCheckpointDriver.ts    # NEW
│   ├── config/                       # NEW
│   │   ├── ConfigManager.ts
│   │   └── ConfigSchema.ts
│   ├── telemetry/                    # NEW
│   │   ├── CostMeter.ts
│   │   └── UsageTracker.ts
│   ├── tools/                        # NEW
│   │   ├── FileTool.ts
│   │   ├── CommandTool.ts
│   │   └── SearchTool.ts
│   └── workspace/
│       └── WorkspaceManifest.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
└── README.md
```

### 3.3 Dependencies to Add

```json
{
  "dependencies": {
    "openai": "^4.28.0",
    "@anthropic-ai/sdk": "^0.17.0",
    "simple-git": "^3.22.0",
    "inquirer": "^9.2.0",
    "chokidar": "^3.5.0",
    "node-fetch": "^3.3.0"
  }
}
```

---

## 4. API Specifications

### 4.1 CLI Commands (Complete)

```bash
# Task execution
valor task <description> [options]
  --plan                    # Generate plan only
  --act                     # Execute without planning
  --session <id>            # Attach to session
  --model <name>            # Override default model
  --auto-approve            # Skip confirmations
  --output <json|text>      # Output format

# Session management
valor instance ls
valor instance start
valor instance stop --session <id>
valor instance attach --session <id>

# Checkpoints
valor checkpoint create --task <id> --step <n> [--message <msg>]
valor checkpoint list --task <id>
valor checkpoint restore --task <id> --step <n>
valor checkpoint diff --task <id> --from <n> --to <n>
valor checkpoint delete --task <id> --step <n>

# Configuration
valor config init
valor config print
valor config edit
valor config get <key>
valor config set <key> <value>
valor config provider add|list|test|remove

# Cost tracking
valor cost [--session <id>] [--task <id>] [--daily]
valor cost export --format <json|csv> [--output <file>]
valor cost budget --set <amount>
valor cost budget --get

# Interactive
valor interactive
valor watch --glob <pattern> --command <cmd>
valor batch --file <tasks.json>
```

### 4.2 Configuration Schema

```typescript
interface CLIConfig {
  version: "1.0";
  defaultProvider: "openai" | "anthropic" | "local";
  providers: {
    openai?: {
      apiKey: string;           // or "env:VAR_NAME"
      defaultModel: string;     // "gpt-4o"
      baseURL?: string;         // For custom endpoints
    };
    anthropic?: {
      apiKey: string;
      defaultModel: string;     // "claude-3-5-sonnet-20241022"
    };
    local?: {
      baseURL: string;          // "http://localhost:11434"
      defaultModel: string;     // "llama3.2"
    };
  };
  execution: {
    autoApprove: boolean;
    maxTurns: number;
    checkpointEnabled: boolean;
    allowDestructive: boolean;  // rm -rf protection
  };
  telemetry: {
    enabled: boolean;
    endpoint?: string;          // ThorAPI endpoint
  };
  ui: {
    theme: "dark" | "light" | "auto";
    progressStyle: "spinner" | "bar";
  };
}
```

---

## 5. Testing Strategy

### 5.1 Unit Tests (Jest)
- LLMProvider implementations (mocked APIs)
- ConfigManager (temp directories)
- CostMeter (mock time)
- GitCheckpointDriver (temp git repos)

### 5.2 Integration Tests
- Full task execution with mocked LLM
- Checkpoint create/restore cycles
- Multi-repo workspace operations

### 5.3 E2E Tests
- CLI commands with real git repos
- Cost tracking accuracy
- Config persistence

**Target: 90%+ coverage**

---

## 6. Success Criteria

### Definition of Done

- [ ] `valor task` executes real code changes
- [ ] Checkpoints fully functional (create, restore, diff)
- [ ] Config system complete (init, edit, validate)
- [ ] Cost tracking with budget alerts
- [ ] 90%+ test coverage
- [ ] Documentation complete
- [ ] Published to npm
- [ ] README with examples

### Quality Gates

- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] ESLint clean
- [ ] No `any` types in public APIs
- [ ] JSDoc for all public methods
- [ ] Error handling for all async operations

---

## 7. Implementation Order

### Sprint 1: Foundation
1. LLM Provider interface + OpenAI implementation
2. Real Agent.execute() with streaming
3. Tool implementations (file, command, search)
4. TaskCommand act mode completion

### Sprint 2: Persistence
5. GitCheckpointDriver implementation
6. CheckpointCommand completion
7. ConfigManager + ConfigCommand completion
8. CostMeter + CostCommand

### Sprint 3: Polish
9. Interactive mode (REPL)
10. Watch mode
11. ThorAPI integration
12. Documentation + examples

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM API changes | High | Abstract provider interface, version pinning |
| Git edge cases | Medium | Extensive testing, temp repo fixtures |
| Cost overruns | High | Budget limits, token estimation |
| Large repo performance | Medium | Streaming, incremental processing |
| Cross-platform issues | Low | CI matrix (Linux, macOS, Windows) |

---

## 9. Resources

### Files to Read
- `packages/valor-cli/src/orchestrator/Orchestrator.ts`
- `packages/valor-cli/src/checkpoint/CheckpointDriver.ts`
- `packages/valor-cli/src/commands/TaskCommand.ts`
- `docs/VALOR_CLI_FINAL_DELIVERY.md`

### External References
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [Commander.js](https://github.com/tj/commander.js)
- [simple-git](https://github.com/steveukx/git-js)

---

## 10. Appendix: Sample Implementation

### Agent.execute() with LLM

```typescript
// src/orchestrator/Agent.ts
export class Agent {
  constructor(
    private role: AgentRole,
    private provider: LLMProvider,
    private tools: Tool[]
  ) {}

  async execute(context: any): Promise<ExecutionResult> {
    const systemPrompt = this.role.systemPrompt;
    const userPrompt = this.buildPrompt(context);
    
    // Stream response for real-time feedback
    const response = await this.provider.generate(systemPrompt, userPrompt, {
      stream: true,
      onChunk: (chunk) => process.stdout.write(chunk)
    });

    // Parse tool calls from response
    const toolCalls = this.parseToolCalls(response);
    const results = await this.executeTools(toolCalls);
    
    return {
      result: response,
      artifacts: results,
      tokensUsed: response.tokensUsed,
      cost: this.provider.getCost(response.tokensUsed)
    };
  }
}
```

---

**Status:** PRD Complete  
**Next Step:** Begin Sprint 1 implementation  
**Owner:** Valor CLI Team  
**Date:** 2026-02-20