# ValorIDE CLI

Autonomous coding agent for the command line. Run agentic tasks, manage sessions, and create workspace checkpoints.

## Installation

```bash
npm install -g valor-cli
```

## Quick Start

```bash
# Create and run a new task
valor task "Add dark mode support to the app" --act

# List active sessions
valor instance ls

# Create a checkpoint
valor checkpoint create --task my-task --step 1

# Restore a checkpoint
valor checkpoint restore --task my-task --step 1
```

## Commands

### task

Manage agentic coding tasks

```bash
valor task "your task here" --plan       # Plan mode (read-only)
valor task "your task here" --act        # Act mode (execute)
valor task "your task here" --session <id>
valor task-list                          # List all tasks
```

### instance

Manage CLI instances/sessions

```bash
valor instance ls                        # List active instances
valor instance start                     # Start new instance
valor instance stop --session <id>       # Stop an instance
```

### config

Manage configuration

```bash
valor config print                       # Show current config
valor config edit                        # Edit config
```

### checkpoint

Manage workspace checkpoints

```bash
valor checkpoint create --task <id> --step <n>
valor checkpoint list --task <id>
valor checkpoint restore --task <id> --step <n>
valor checkpoint compare --task <id> --step <n>
```

## Session Persistence

Sessions are stored in `~/.valoride/sessions/` and can be resumed across CLI invocations and IDE instances.

## Headless Runtime

The CLI runs tasks through an installed Codex runtime and streams its JSON event lifecycle to stdout so supervisors such as Valkyr SWARM can emit realtime progress and terminal receipts. On macOS it prefers the self-contained Codex binary shipped with ChatGPT; elsewhere it discovers `codex` on `PATH`. Set `VALOR_RUNTIME_EXECUTABLE` only when the product runtime is installed at a nonstandard path.

Plan mode uses a read-only sandbox. Act mode uses a workspace-write sandbox. Outbound sends, production deployments, and merges remain separately human-approved.

## Multi-Project Workspaces

Define a workspace manifest to work across multiple repos:

```yaml
# .valoride/workspace.yml
version: "1.0"
repos:
  - name: backend
    path: ./services/api
    remote: origin
    branch: main
  - name: frontend
    path: ./apps/web
    remote: origin
    branch: main
```

## Development

```bash
npm run dev              # Watch mode
npm run build            # Build TypeScript
npm test                 # Run tests
npm run format           # Format code
npm run lint             # Lint
```

## License

Apache-2.0
