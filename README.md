Absolutely. Paste this in as README.md.

![ValorIDE Logo](https://valkyrlabs.com/assets/valorIde-horizontal-DyPXHpke.png)

# ValorIDE

## Agentic coding inside VS Code — with tools, terminal access, browser debugging, MCP, checkpoints, and ThorAPI code generation.

ValorIDE is an agentic coding assistant for VS Code that can inspect your project, edit files, run terminal commands, use browser automation, call MCP tools, and generate full-stack application code through ThorAPI.
Unlike autocomplete-only assistants, ValorIDE works through task loops: it gathers context, plans changes, executes approved actions, observes results, and iterates — while keeping you in control with diffs, approvals, checkpoints, rollback, and token/cost visibility.
ValorIDE is built for real software projects: debugging, refactoring, code generation, workflow automation, and developer productivity without losing control of your codebase.

---

| [**Download on VS Marketplace**](https://marketplace.visualstudio.com/items?itemName=ValkyrLabsInc.valoride-dev) | [**Getting Started**](https://valkyrlabs.com/v1/docs/Products/ValorIDE/getting-started-new-coders/getting-started-with-valoride) | [**Feature Requests**](https://github.com/valkyrlabs/valoride/discussions/categories/feature-requests?discussions_q=is%3Aopen+category%3A%22Feature+Requests%22+sort%3Atop) |
| :--------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |

---

> ⚡ **Latest:** SWARM Protocol, GrayMatter integration, MCP enhancements, ThorAPI project generation, improved browser automation, and expanded model/provider support.

---

## Why ValorIDE?

ValorIDE helps developers move from prompt-based coding to controlled agentic development.

- Build, debug, and refactor with an agent that can use your actual workspace
- Generate full-stack Spring Boot + TypeScript/React applications from OpenAPI specs
- Extend the assistant with MCP tools for Jira, AWS, PagerDuty, documentation, internal APIs, and more
- Use hosted or local models across Anthropic, OpenAI, Google, Bedrock, Azure, Vertex, Ollama, LM Studio, and ValkyrAI
- Keep control with human-in-the-loop approvals, checkpoints, rollback, and explicit project rules
- Reduce AI coding chaos with deterministic generation, traceable actions, safer editing workflows, and token/cost visibility

---

## Core Workflow

1. **Describe the task**
   Ask ValorIDE to fix a bug, explain an error, refactor a module, generate a feature, wire an API, or convert a mockup into a working application.
2. **ValorIDE gathers project context**
   ValorIDE scans your workspace, reads relevant files, analyzes source structure, uses AST parsing and regex search, and builds a focused task context without flooding the model.
3. **ValorIDE plans the work**
   In Plan Mode, ValorIDE can reason through implementation options, architecture, files to change, tools to use, and validation steps before touching your workspace.
4. **You approve actions**
   ValorIDE uses human-in-the-loop controls for edits, commands, MCP tools, and risky operations. You stay in charge.
5. **ValorIDE executes and observes**
   ValorIDE edits files, runs commands, captures terminal output, launches browser sessions, reads errors, and iterates based on real feedback from your environment.
6. **You review diffs and checkpoints**
   Every change is reviewable. You can inspect diffs, compare checkpoints, revert safely, and continue from a known-good state.

---

## What ValorIDE Can Do

### Understand Your Workspace

ValorIDE can inspect your project like a real coding agent:

- Source tree exploration
- AST parsing with Tree-sitter
- Regex-based file search
- File and folder mentions
- Terminal output references
- Git diff and commit context
- URL/document ingestion
- Workspace warnings and errors
- Project-specific rules through `.valoriderules`

---

### Create and Edit Files

ValorIDE can generate and modify code directly inside VS Code:

- Creates new files and folders
- Applies edits through reviewable diffs
- Fixes syntax, lint, compiler, and test failures
- Tracks changes through VS Code timeline and checkpoints
- Supports rollback and restoration when an approach does not work
  ValorIDE is designed around explicit, reviewable edits — not invisible magic.

---

### Run Terminal Commands

Using VS Code terminal integration, ValorIDE can:

- Install dependencies
- Run builds and tests
- Start local dev servers
- Execute scripts
- Monitor long-running commands
- React to compile errors and runtime output
- Help diagnose environment issues
  You approve command execution, and ValorIDE can use the output as feedback for the next step.

---

### Debug Web Apps with Browser Automation

ValorIDE can use browser automation to help debug UI and runtime problems:

- Launch browser sessions
- Navigate pages
- Click, type, scroll, and inspect behavior
- Capture screenshots
- Read console logs
- Detect runtime errors
- Connect to local Chrome sessions for authenticated debugging
  This makes ValorIDE especially useful for fixing UI bugs that only appear when the app is actually running.

---

### Extend with MCP Tools

ValorIDE supports the Model Context Protocol, allowing you to connect new tools and services to your agentic coding workflow.
Example prompts:

- `Add a tool that fetches Jira tickets`
- `Add a tool that manages AWS EC2 instances`
- `Add a tool that pulls PagerDuty incidents`
- `Add a tool that searches internal docs`
- `Add a tool that queries my project API`
  Advanced MCP support includes:
- MCP marketplace discovery
- Remote MCP servers over SSE
- Rich responses with previews and visualizations
- Auto-approval settings for trusted tools
- Project-specific toolchains
  MCP lets ValorIDE grow with your stack instead of staying trapped inside a fixed assistant feature set.

---

## ThorAPI Full-Stack Generation

ValorIDE integrates with ThorAPI, Valkyr Labs' OpenAPI-first generation engine.
ThorAPI helps generate production-oriented application foundations from API specifications:

- Java Spring Boot servers
- TypeScript client libraries
- TypeScript component libraries
- React application scaffolding
- CRUD controllers
- API contracts
- Generated models
- Service templates
- Auth, validation, and standard model fields
- Custom codegen targets
  ValorIDE can request generated projects, poll generation status, download completed stacks, and continue implementation inside your workspace.

---

## How ThorAPI Generation Works

```text
                             ┌─────────────────────────────────────────────┐
                             │               ThorAPI.java                  │
                             │  service app / OpenAPI enhancement engine   │
                             └─────────────────────────────────────────────┘
                                               ▲
                                               │ orchestrates + enhances
                                               │
        ┌──────────────────────────────┐       │        ┌──────────────────────────────────────────┐
        │           INPUTS             │       │        │             SPEC FRAGMENTS                │
        ├──────────────────────────────┤       │        ├──────────────────────────────────────────┤
        │ api.yaml                     │       │        │ valkyrai/src/main/resources/openapi/     │
        │  • Bare-bones OpenAPI        │       │        │   api_inc.hbs.yaml                       │
        │  • Lists component names     │       │        │  • Injected after human edits            │
        │    to expose as CRUD APIs    │       │        └──────────────────────────────────────────┘
        │  • No properties, no paths   │       │
        ├──────────────────────────────┤       │
        │ api.hbs.yaml                 │       │
        │  • Full component schemas    │       │
        │  • No CRUD paths             │       │
        │  • Master truth for models   │       │
        └──────────────────────────────┘       │
                                               │
                                               ▼
                              ┌─────────────────────────────────────────────┐
                              │         SPEC ASSEMBLY & MERGE               │
                              │  1. Start with api.hbs.yaml                 │
                              │  2. Merge api.yaml to decide CRUD exposure  │
                              │  3. Append api_inc.hbs.yaml                 │
                              └─────────────────────────────────────────────┘
                                               │
                                               │ writes
                                               ▼
                         ┌────────────────────────────────────────────────────┐
                         │ assembled.api.yaml.hbs                              │
                         │  • Single master spec with template blocks          │
                         │  • Human-editable YAML remains valid                │
                         └────────────────────────────────────────────────────┘
                                               │
                                               │ enhance
                                               ▼
                   ┌──────────────────────────────────────────────────────────────┐
                   │            THORAPI ENHANCEMENT PHASE                        │
                   │ Adds standard model surface:                                │
                   │   id, createdDate, lastModifiedDate, lastModifiedById, etc. │
                   │ Applies custom annotations and x-thorapi metadata           │
                   └──────────────────────────────────────────────────────────────┘
                                               │
                                               │ outputs
                                               ▼
                 ┌───────────────────────────────────────────────────────────────┐
                 │ api-out.yaml                                                  │
                 │  • Final enhanced OpenAPI spec                                │
                 │  • Ready for codegen                                          │
                 └───────────────────────────────────────────────────────────────┘
                                               │
                                               │ build / generate
                                               ▼
     ┌──────────────────────────────┬──────────────────────────────┬───────────────────────────────┬──────────────────────────────┐
     │  Java Spring Boot server     │  TypeScript client libs      │  TypeScript component libs    │  Custom generation targets   │
     │  • CRUD controllers          │  • API-bound clients         │  • UI components wired to     │  • Project-specific output   │
     │  • Generated models          │  • Shared API contracts      │    ThorAPI data sources       │  • Templates and extensions  │
     │  • Validation/auth patterns  │                              │                                │                              │
     └──────────────────────────────┴──────────────────────────────┴───────────────────────────────┴──────────────────────────────┘
                                               │
                                               │ used by
                                               ▼
                         ┌─────────────────────────────────────────────────┐
                         │ ValorIDE project                                │
                         │  • Agent completes implementation               │
                         │  • Uses generated artifacts + live services     │
                         │  • Developer reviews diffs and checkpoints      │
                         └─────────────────────────────────────────────────┘

ThorAPI gives ValorIDE a deterministic foundation for application generation, while ValorIDE handles agentic implementation, debugging, refinement, and last-mile development.

⸻

GrayMatter Integration

ValorIDE integrates with GrayMatter, Valkyr Labs’ durable agent memory and retrieval layer.

GrayMatter provides:

* Durable project memory
* Context-grounded retrieval
* Shared object graphs
* Workspace-aware knowledge
* OpenAPI schema discovery
* Agent memory entries
* Retrieval receipts
* RBAC-scoped access
* Hosted and local workflow support

This allows agents to work with persistent project understanding instead of starting from scratch every session.

⸻

Plan / Act Mode

ValorIDE separates thinking from doing.

Plan Mode

Use Plan Mode to:

* Analyze requirements
* Brainstorm architecture
* Compare implementation options
* Generate Mermaid diagrams
* Identify affected files
* Plan tests and validation
* Prepare a safe execution strategy

Act Mode

Use Act Mode to:

* Edit files
* Run terminal commands
* Use tools
* Generate code
* Debug runtime issues
* Apply fixes
* Validate the result

This separation helps keep agentic development structured and reviewable.

⸻

Checkpoints, Compare, and Restore

ValorIDE snapshots your workspace as it works.

With checkpoints, you can:

* Compare changes across steps
* Restore previous versions
* Try multiple approaches safely
* Roll back failed changes
* Keep a clear trail of agent activity

Checkpoints help make AI-assisted coding less risky, especially on larger tasks.

⸻

Context and Mentions

ValorIDE supports rich context references in chat:

* @file — include a file
* @folder — include a folder
* @url — fetch a URL and convert docs to markdown
* @terminal — reference terminal output
* @git — include commits and working changes
* @problems — include workspace warnings and errors

Smart context management includes:

* Context window progress
* Token usage visibility
* File metadata tracking
* Large-file handling
* Binary detection
* Sliding-window context support for long tasks

⸻

Models and Providers

ValorIDE can connect to hosted, cloud, and local models.

Supported provider families include:

* Anthropic
* OpenAI
* Google Gemini
* AWS Bedrock
* Azure OpenAI
* Google Vertex AI
* Ollama
* LM Studio
* ValkyrAI-hosted models

ValorIDE can also support different models for different phases of work, such as one model for planning and another for execution.

⸻

Valor P2P and SWARM Protocol

Valor P2P allows multiple ValorIDE instances to communicate and coordinate tasks.

This enables experiments with:

* Multi-agent workflows
* Manager/worker model patterns
* Parallel implementation and validation
* Peer discovery
* WebSocket coordination
* Shared task state
* Supervised execution models

SWARM Protocol is designed to help multiple agents cooperate while still preserving developer oversight and control.

⸻

Account Management and Usage Tracking

For ValorIDE account users, the extension includes billing and usage visibility:

* Credit balance monitoring
* Transaction history
* Token usage tracking
* Cost breakdowns per task loop
* Payment history
* Usage analytics
* ContentData integration

The goal is simple: you should know what the agent is doing and what it costs.

⸻

Developer Controls

ValorIDE includes project-level controls for safer agentic development.

.valoriderules

Use .valoriderules to define project-specific instructions, coding standards, architecture preferences, model behavior, and task rules.

.valorideignore

Use .valorideignore to exclude files and folders from ValorIDE context and tool access.

Supported patterns include:

* Ignored folders
* Ignored files
* Binary and generated assets
* Include overrides
* Project-specific context boundaries

These files help keep your agent aligned with your project instead of treating every repo the same.

⸻

Precision Search and Replace

ValorIDE includes a Precision Search and Replace editing pipeline designed to make file edits safer and more reliable.

The editing strategy can use:

* AST-aware matching
* Contextual matching
* Byte-level fallback
* Verification checks
* Backup creation
* Rollback support
* Delta tracking

This helps ValorIDE apply targeted edits without casually mangling your files like an overcaffeinated intern with regex privileges.

⸻

Enhanced UI and UX

ValorIDE includes a developer-focused interface inside VS Code:

* Drag and drop files or folders into chat
* Favorite models
* Rich Markdown rendering
* Code blocks and diagrams
* Task history search
* Fuzzy filtering
* Advanced auto-approval settings
* Visual checkpoint markers
* Connection and peer status indicators
* Login and account status
* Real-time usage information

Use CMD/CTRL + Shift + P, then run:

ValorIDE: Open In New Tab

This opens ValorIDE as a full editor tab so you can work side-by-side with your file explorer and source code.

⸻

Example Tasks

Try asking ValorIDE:

Fix the failing tests and explain what changed.
Refactor this service to separate persistence, validation, and API concerns.
Generate a Spring Boot backend and React frontend from this OpenAPI spec.
Use the browser to reproduce the UI bug, capture the console error, and fix it.
Add an MCP tool that fetches Jira tickets for this project.
Review this PR diff and identify likely regressions.
Create a plan for adding RBAC to this API before making any edits.

⸻

Local Development

# Clone the repo
git clone https://github.com/valkyrlabs/valoride.git
# Open in VS Code
code valoride
# Install dependencies
npm run install:all
# Launch extension
# Press F5 or use Run → Start Debugging

You may need the esbuild problem matchers⁠￼ extension if build issues occur.

⸻

Creating a Pull Request

# Create a changeset entry
npm run changeset

Follow the prompts for release type:

* major
* minor
* patch

Commit both your code changes and the generated .changeset file.

Then push your branch and open a pull request. CI will run, and Changesetbot will handle versioning and release metadata.

⸻

Contributing

We welcome feedback, bug reports, and feature requests.

* Read the Contributing Guide⁠￼
* Submit feature ideas in Feature Requests⁠￼
* Visit the ValorIDE GitHub Repository⁠￼
* Check open roles on the Valkyr Labs Careers Page⁠￼

⸻

Additional Resources

* ValorIDE GitHub Repository⁠￼
* ValorIDE Getting Started⁠￼
* ThorAPI Documentation⁠￼
* Model Context Protocol Documentation⁠￼

⸻

Changelog Highlights

Recent

* SWARM Protocol support
* GrayMatter integration
* Expanded MCP support
* Improved ThorAPI generation workflows
* Enhanced browser automation
* Better token and cost visibility
* Improved checkpoint and rollback workflows
* Precision Search and Replace editing pipeline
* WebSocket coordination and peer discovery
* Expanded model/provider support

Previous

* Added language and behavior-specific directives for Java, TypeScript, ThorAPI usage, and task-completion workflows
* Added Gemini provider support improvements
* Improved .valorideignore handling
* Improved terminal output processing
* Improved command execution reliability
* Enhanced MCP server integration
* Added richer login and account management UX

For full release details, see the repository changelog and release notes.

⸻

License

Apache 2.0 © 2026 Valkyr Labs Inc.⁠￼
```
