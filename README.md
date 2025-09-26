![ValorIDE Logo](https://valkyrlabs.com/assets/valorIde-horizontal-DyPXHpke.png)

## Agentic Coder, Powered by ThorAPI ⚡ (Precision PSR Verified)

[English Documentation](https://valkyrlabs.com/v1/docs/Products/ValorIDE/valoride-documentation)

---

| [**Download on VS Marketplace**](https://marketplace.visualstudio.com/items?itemName=ValkyrLabsInc.valoride-dev) | [**Feature Requests**](https://github.com/valkyrlabs/valoride/discussions/categories/feature-requests?discussions_q=is%3Aopen+category%3A%22Feature+Requests%22+sort%3Atop) | [**Getting Started**](https://valkyrlabs.com/v1/docs/Products/ValorIDE/getting-started-new-coders/getting-started-with-valoride) |
| :--------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------: |

## What is Valor IDE?

Valor IDE is your **agentic coding companion** inside VS Code.\
Unlike traditional "autocomplete" assistants, Valor IDE can actually **use your CLI and Editor** — giving it hands-on power to build, debug, and ship your code alongside you.

Built on **ThorAPI's secure generation engine** and **Claude Opus agentic capabilities**, Valor IDE is more than code completion:

- It analyzes your project with **AST parsing, regex search, and source tree exploration**.
- It edits files, fixes errors, installs dependencies, and runs commands.
- It can **launch a browser**, click around, capture console logs/screenshots, and fix UI bugs.
- It extends itself with the **Model Context Protocol (MCP)** to add brand-new tools.
- Every action is **human-in-the-loop**: you approve edits and commands, keeping safety + control in your hands.

**In short: Valor IDE is the future of coding—accessible, agentic, and always under your command.**

---

## How It Works

1. **Define a Task**
   - Example: "Fix this bug" or "Convert this mockup into a working app."
   - You can even add screenshots or errors from your workspace.

2. **Valor IDE Gathers Context**
   - Scans your project structure.
   - Reads files and ASTs.
   - Decides what's relevant without overwhelming the context window.

3. **Agentic Execution**
   - Creates/edits files with diffs.
   - Runs commands in your terminal and adapts to live output.
   - For web projects, launches a headless browser to test/debug.

4. **Review & Approve**
   - You see the diffs. You approve or revert.
   - Valor IDE learns and continues until the task is complete.

> [!TIP]
> Use the `CMD/CTRL + Shift + P` shortcut to open the command palette and type "ValorIDE: Open In New Tab" to open the extension as a tab in your editor. This lets you use ValorIDE side-by-side with your file explorer, and see how he changes your workspace more clearly.

---

## Core Features

### 🔗 Use Any API & Model

Valor IDE connects to model apis to perform AI-powered code generation and other tasks.

Valor integrates with almost any LLM model api including Anthropic, OpenAI, Google Gemini, AWS Bedrock, Azure, GCP Vertex, or local models (Ollama / LM Studio).\

Valor also can connect to ValkyrAI models that you can customize and train to your specific environment, project, and business needs.

It also tracks **token usage and costs** across entire task loops, so you always know your spend.

---

### 🔗 Use Customized Models for Projects

Valor IDE integrates with ValkyrAI models that you can customize and configure for your specific needs.

Adjust the initial prompt with technical details specific to your project(s) and business(es) to save time and maximize efficiency and effectiveness.

Using Valor P2P you can configure a management Model and a work execution Model and run a supervised project right within your IDE.

---

### 🛠️ Valhalla Suite / ThorAPI

Valor IDE integrates with the rest of the Valhalla Suite from Valkyr Labs -- ThorAPI generated backend apis, Typescript (and other) client libraries and components.

**Full Application Generation:**

- Generate complete applications from OpenAPI specifications
- Poll generation status and download completed projects
- Configurable ThorAPI output folders via `.valoride/config`
- Seamless integration with generated Spring Boot backends and React frontends

ValkyrAI can be run as a service in your generated application stack, providing workflow automations, while built-in RBAC allows secure sharing of any object in the system.

Agentic reporting tracks **token usage and costs** across entire task loops, so you always know your spend and monetization features of the ValkyrLabs.com

### 🛠️ Valor P2P

P2P allows multiple Valor instances to communicate and orchestrate tasks together.

It's an innovative and fun way to increase the power of Valor in your IDE.

---

### 💳 ValorIDE Account Management

For ValorIDE account users, the extension provides comprehensive billing and usage tracking:

- **Credit Balance Monitoring**: Real-time balance display and transaction history
- **Usage Analytics**: Detailed breakdown of token usage and costs per task
- **Payment History**: Complete transaction records and billing management
- **ContentData Integration**: Access to enhanced content and data services

---

### 💻 Run Terminal Commands

With VS Code's new [Shell Integration API](https://code.visualstudio.com/updates/v1_93#_terminal-shell-integration-api), Valor IDE can:

- Install packages, run builds, deploy, and test.
- Handle long-running servers with background monitoring.
- React dynamically to compile errors and environment issues.

---

### 📝 Create & Edit Files

- Edits appear in VS Code's diff view.
- You can modify or reject changes instantly.
- Valor IDE proactively fixes syntax/linter/compiler errors.
- Every change is recorded in your file's **Timeline** for easy rollback.

---

### 🌐 Enhanced Browser Automation

With [Claude Sonnet's Computer Use](https://www.anthropic.com/news/3-5-models-and-computer-use):

- Launches a browser, clicks, types, scrolls.
- Captures screenshots and console logs.
- **Local Chrome Integration**: Connect to your existing Chrome browser for session-based debugging.
- **Browser Discovery**: Automatically detect and connect to running Chrome instances.
- Perfect for runtime debugging and fixing UI bugs.

[See Demo](https://x.com/sdrzn/status/1850880547825823989)

---

### 🛠️ Extend with MCP

Valor IDE can generate new **Model Context Protocol (MCP)** tools on the fly.\
Example prompts:

- `add a tool that fetches Jira tickets`
- `add a tool that manages AWS EC2s`
- `add a tool that pulls PagerDuty incidents`

**Advanced MCP Features:**

- **MCP Marketplace**: Discover and install curated MCP servers directly from the extension
- **Remote MCP Servers**: Connect to MCP servers via Server-Sent Events (SSE)
- **Rich Responses**: Automatic image previews, website thumbnails, and data visualizations
- **Auto-Approval Settings**: Configure which MCP tools require approval

These tools become part of Valor IDE's toolkit, ready for future use.

---

### 📂 Advanced Context & Mentions

- `@url` → fetch a URL and convert docs to markdown.
- `@problems` → pass workspace warnings/errors.
- `@file` → add file contents.
- `@folder` → add a whole folder's contents.
- `@terminal` → reference active terminal contents.
- `@git` → include git commits and working changes.

**Smart Context Management:**

- **Context Window Progress**: Visual indicator showing token usage and cost impact
- **File Context Tracking**: Automatic metadata tracking for optimized context
- **Sliding Window Management**: Maintains context beyond 200k tokens for long tasks

---

### 🎯 Plan/Act Mode Toggle

Switch between planning and execution modes:

- **Plan Mode**: Brainstorm and architect solutions with Valor IDE before implementation
- **Act Mode**: Execute the planned solution with full tool access
- **Mermaid Diagrams**: Visual representations of architecture and workflows in Plan mode
- **Model Switching**: Use different models for planning vs. execution

---

### ⏪ Checkpoints: Compare & Restore

- Snapshots your workspace at each task step.
- Compare differences and restore versions safely.
- Explore multiple approaches without losing progress.
- **Visual Indicators**: Clear checkpoint markers in the chat interface
- **Branch-per-Task**: Optimized storage with git-based checkpoint system

---

## Advanced Features

### 🔧 Developer Tools

- **Tree-Sitter AST Parsing**: Deep code analysis for better understanding
- **Advanced Search**: Regex-based file search across your entire project
- **File Content Optimization**: Smart handling of large files and binary detection
- **Output Filtering**: Configurable output processing for cleaner results

### ⚙️ Configuration & Customization

- **`.valoriderules`**: Project-specific custom instructions and rules
- **`.valorideignore`**: Exclude files and patterns from Valor IDE access
- **Multiple Rule Files**: Support for `.valoriderules/` directory with multiple configuration files
- **Advanced Settings**: Extended thinking budgets, reasoning effort controls, and model-specific options

### 🚀 Enhanced UI/UX

- **Drag & Drop**: Add files and folders directly to chat
- **Favorite Models**: Quick access to your preferred models
- **Advanced Auto-Approval**: Granular control over which operations require approval
- **Rich Markdown**: Full support for code blocks, diagrams, and formatted content
- **Task History Search**: Fuzzy search and filtering of previous tasks

---

## Contributing

- Start with our [Contributing Guide](CONTRIBUTING.md).
- Join the [Discord](https://discord.gg/valoride) → `#contributors` channel.
- Check open positions on our [Careers Page](https://valkyrlabs.com/v1/join-us).

### Local Development

```bash
# Clone the repo (requires git-lfs)
git clone https://github.com/valkyrlabs/valoride.git

# Open in VS Code
code valoride

# Install dependencies
npm run install:all

# Launch extension (F5 or Run → Start Debugging)
```

> ⚠️ You may need [esbuild problem matchers](https://marketplace.visualstudio.com/items?itemName=connor4312.esbuild-problem-matchers) if build issues occur.

### Creating a Pull Request

```bash
# Create a changeset entry
npm run changeset
```

Follow prompts for type (`major`, `minor`, `patch`) and description.\
Commit both your changes + `.changeset` file.\
Push → Open PR → CI runs → Changesetbot handles versioning + release.

---

## License

[Apache 2.0 © 2025 Valkyr Labs Inc.](./LICENSE)

---

### 🚀 Latest Developments

**Updated: September 24, 2025 (PSR Test Successful)**

#### Core Tool Enhancements
- **Precision Search and Replace Tool**: Advanced file editing capability featuring a three-layer strategy (AST → contextual → byte). This tool ensures reliable, atomic edits with built-in verification and rollback support. It prevents file truncation, preserves original line endings, and maintains comprehensive backup systems for maximum safety during code modifications. ✅ **Test Status: Verified** - Successfully tested with 1/1 hunks applied, no warnings, and proper delta tracking.

- **Enhanced File Editing Pipeline**: Improved safety protocols with automatic backup creation, verification steps, and error recovery for all file modifications.

#### ThorAPI Integration Advances
- **Full Stack Code Generation**: Seamless integration with ThorAPI for generating complete Spring Boot backends and React frontends from OpenAPI specifications.

- **TelecomP2P Component**: New peer-to-peer communication component for enhanced collaboration between Valor instances.

- **Engager Project**: Active development of TypeScript client libraries with improved error handling and state management.

#### Platform & Architecture
- **Communication Service**: Enhanced inter-service communication with improved reliability and testing coverage.

- **State Management**: Core state management improvements for better performance and consistency across the extension.

- **MCP Ecosystem**: Continued expansion of Model Context Protocol integration, enabling dynamic tool creation and enhanced agentic capabilities throughout the Valhalla Suite.

#### Agent Telemetry & UX
- **Session Analytics Dashboard**: New in-editor insights view surfaces token usage, tool calls, and error trends for each ValorIDE session.

- **Task Timeline Visualization**: Enhanced checkpoint diff viewer highlights plan/act transitions and makes rollbacks clearer for reviewers.

- **Failure Diagnostics**: Automatic aggregation of skipped edit reasons and PSR telemetry to speed up debugging during long-running tasks.

---

## Additional Resources

- **ValorIDE GitHub Repository:** [https://github.com/valkyrlabs/valoride](https://github.com/valkyrlabs/valoride)

- **ThorAPI Documentation:** [https://valkyrlabs.com/v1/docs/Products/ThorAPI/thorapi-documentation](https://valkyrlabs.com/v1/docs/Products/ThorAPI/thorapi-documentation)

- **MCP Documentation:** [https://modelcontextprotocol.org/docs](https://modelcontextprotocol.org/docs)

- **ValorIDE Documentation:** [docs/README.md](docs/README.md)
