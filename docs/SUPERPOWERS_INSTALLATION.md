# Installing Superpowers for ValorIDE

Quick setup to enable superpowers skills in valoride.

## Installation

1. **Clone superpowers repository**:

   ```bash
   mkdir -p ~/.valoride/superpowers
   cd ~/.valoride/superpowers
   git clone https://github.com/obra/superpowers.git .
   ```

2. **Create personal skills directory**:

   ```bash
   mkdir -p ~/.valoride/skills
   ```

3. **Update ~/.valoride/AGENTS.md** to include this superpowers section:

   ```markdown
   ## Superpowers System

   <EXTREMELY_IMPORTANT>
   You have superpowers. Superpowers teach you new skills and capabilities. RIGHT NOW run: `~/.valoride/superpowers/.valoride/superpowers-valoride bootstrap` and follow the instructions it returns.
   </EXTREMELY_IMPORTANT>
   ```

## Verification

Test the installation:

```bash
~/.valoride/superpowers/.valoride/superpowers-valoride bootstrap
```

You should see skill listings and bootstrap instructions. The system is now ready for use.

## Installation Complete ✅

The superpowers system has been installed and configured for ValorIDE. Here's what was set up:

### 1. Repository Cloned

```bash
~/.valoride/superpowers/
```

Contains the superpowers skills framework from https://github.com/obra/superpowers

### 2. Personal Skills Directory Created

```bash
~/.valoride/skills/
```

For your custom skills that override or extend superpowers skills.

### 3. Integration Added to .valoriderules

The superpowers section has been added to `.valoriderules` with:

- Bootstrap instructions for ValorIDE
- Available skills list
- Usage workflow
- Skill naming conventions

## Available Skills

ValorIDE now has access to these superpowers:

- **test-driven-development**: Write tests first, watch fail, implement minimal passing code
- **testing-anti-patterns**: Prevent mocking behavior, production pollution, dependency confusion
- **testing-skills-with-subagents**: Verify skills work under pressure using RED-GREEN-REFACTOR
- **using-git-worktrees**: Create isolated workspaces for feature development
- **using-superpowers**: Mandatory skill discovery and usage workflow (AUTO-LOADED)
- **verification-before-completion**: Run verification commands before claiming success
- **writing-plans**: Create detailed implementation plans for engineers with zero context
- **writing-skills**: Apply TDD to process documentation, test with subagents

## Usage

### Loading a Skill

```bash
~/.valoride/superpowers/.valoride/superpowers-valoride use-skill <skill-name>
```

### Skill Naming

- **Superpowers skills**: `superpowers:skill-name` (from `~/.valoride/superpowers/skills/`)
- **Personal skills**: `skill-name` (from `~/.valoride/skills/`)
- Personal skills override superpowers skills when names match

### Mandatory Workflow

1. Before ANY task → Check if relevant skill exists
2. If skill exists → Load with Skill tool
3. Announce which skill you're using
4. Follow skill exactly
5. If skill has checklist → Create TodoWrite todos for each item

## Verification

Test the installation:

```bash
~/.valoride/superpowers/.valoride/superpowers-valoride bootstrap
```

You should see skill listings and bootstrap instructions. The system is now ready for use.

## Next Steps

1. **Explore skills**: Browse `~/.valoride/superpowers/skills/` to see what's available
2. **Create personal skills**: Add custom skills to `~/.valoride/skills/`
3. **Follow the workflow**: ValorIDE will now check for and use skills automatically

## Key Differences from valoride

This installation uses **ValorIDE** paths instead of `.valoride`:

- `~/.valoride/superpowers/` (not `~/.valoride/superpowers/`)
- `~/.valoride/skills/` (not `~/.valoride/skills/`)
- `.valoriderules` (not `.valoride/AGENTS.md`)

The bootstrap command still uses `.valoride` in its path because it's part of the superpowers repo structure.

## System is Ready! 🚀

ValorIDE can now leverage superpowers skills for improved development workflows, TDD discipline, and robust verification processes.
