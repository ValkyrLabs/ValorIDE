# Valor IDE – The Agentic Coder, Powered by ThorAPI ⚡

---

## What is Valor IDE?

Valor IDE is your **agentic coding companion** inside VS Code.\
Unlike traditional “autocomplete” assistants, Valor IDE can actually **use your CLI and Editor** — giving it hands-on power to build, debug, and ship your code alongside you.

Built on **ThorAPI’s secure generation engine** and **Claude Opus agentic capabilities**, Valor IDE is more than code completion:

- It analyzes your project with **AST parsing, regex search, and source tree exploration**.
- It edits files, fixes errors, installs dependencies, and runs commands.
- It can **launch a browser**, click around, capture console logs/screenshots, and fix UI bugs.
- It extends itself with the **Model Context Protocol (MCP)** to add brand-new tools.
- Every action is **human-in-the-loop**: you approve edits and commands, keeping safety + control in your hands.

**In short: Valor IDE is the future of coding—accessible, agentic, and always under your command.**

---

## How It Works

1. **Define a Task**
   - Example: “Fix this bug” or “Convert this mockup into a working app.”
   - You can even add screenshots or errors from your workspace.

2. **Valor IDE Gathers Context**
   - Scans your project structure.
   - Reads files and ASTs.
   - Decides what’s relevant without overwhelming the context window.

3. **Agentic Execution**
   - Creates/edits files with diffs.
   - Runs commands in your terminal and adapts to live output.
   - For web projects, launches a headless browser to test/debug.

4. **Review & Approve**
   - You see the diffs. You approve or revert.
   - Valor IDE learns and continues until the task is complete.

---

## Core Features

### 🔗 Use Any API & Model

Valor IDE integrates with OpenRouter, Anthropic, OpenAI, Google Gemini, AWS Bedrock, Azure, GCP Vertex, or local models (Ollama / LM Studio).\
It also tracks **token usage and costs** across entire task loops, so you always know your spend.

---

### 💻 Run Terminal Commands

With VS Code’s new [Shell Integration API](https://code.visualstudio.com/updates/v1_93#_terminal-shell-integration-api), Valor IDE can:

- Install packages, run builds, deploy, and test.
- Handle long-running servers with background monitoring.
- React dynamically to compile errors and environment issues.

---

### 📝 Create & Edit Files

- Edits appear in VS Code’s diff view.
- You can modify or reject changes instantly.
- Valor IDE proactively fixes syntax/linter/compiler errors.
- Every change is recorded in your file’s **Timeline** for easy rollback.

---

### 🌐 Browser Automation

With [Claude Sonnet’s Computer Use](https://www.anthropic.com/news/3-5-models-and-computer-use):

- Launches a browser, clicks, types, scrolls.
- Captures screenshots and console logs.
- Perfect for runtime debugging and fixing UI bugs.

[See Demo](https://x.com/sdrzn/status/1850880547825823989)

---

### 🛠️ Extend with MCP

Valor IDE can generate new **Model Context Protocol (MCP)** tools on the fly.\
Example prompts:

- `add a tool that fetches Jira tickets`
- `add a tool that manages AWS EC2s`
- `add a tool that pulls PagerDuty incidents`

These tools become part of Valor IDE’s toolkit, ready for future use.

---

### 📂 Add Context Easily

- `@url` → fetch a URL and convert docs to markdown.
- `@problems` → pass workspace warnings/errors.
- `@file` → add file contents.
- `@folder` → add a whole folder’s contents.

---

### ⏪ Checkpoints: Compare & Restore

- Snapshots your workspace at each task step.
- Compare differences and restore versions safely.
- Explore multiple approaches without losing progress.

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
