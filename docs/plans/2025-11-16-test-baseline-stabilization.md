# Test Baseline Stabilization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore the default `npm test` pipeline so that the TypeScript compilation phase succeeds without missing Jest globals or rootDir violations.

**Architecture:** Adjust the shared `tsconfig.test.json` so test files compile in the same project root as the rest of the repo, and load the Jest type definitions alongside the existing Mocha/Chai globals. No runtime behavior changes—just configuration updates plus verification.

**Tech Stack:** TypeScript 5.x, VS Code extension build scripts (`npm test`), `tsconfig.test.json`.

---

### Task 1: Provide Jest globals to TypeScript tests

**Files:**

- Modify: `tsconfig.test.json`

**Step 1: Reproduce the failure**

Run: `npx tsc -p ./tsconfig.test.json --outDir out`

Expected: `TS2304: Cannot find name 'expect'` and similar errors for `jest`.

**Step 2: Add Jest types to the config**

Update the `"types"` array inside `compilerOptions` to include `"jest"` (keep existing entries).

```jsonc
  "types": [
    "node",
    "mocha",
    "should",
    "vscode",
    "chai",
    "jest"
  ],
```

**Step 3: Re-run the compiler**

Run: `npx tsc -p ./tsconfig.test.json --outDir out`

Expected: `expect`/`jest` errors disappear, but the `rootDir` violation for `webview-ui/src//*` still shows (addressed in Task 2).

---

### Task 2: Allow test builds to include webview modules

**Files:**

- Modify: `tsconfig.test.json`

**Step 1: Change the `rootDir` to match the repo root**

Set `"rootDir": "."` (or remove the override) so the compiler can include files under `webview-ui/src`.

```jsonc
  "outDir": "out",
  "rootDir": "."
```

**Step 2: Compile again to confirm success**

Run: `npx tsc -p ./tsconfig.test.json --outDir out`

Expected: TypeScript finishes with `Found 0 errors. Watching for file changes.` (or simply exits cleanly with no diagnostics).

---

### Task 3: Verify the full `npm test` pipeline

**Files:** (no code edits—validation only)

**Step 1: Execute the default test script**

Run: `npm test`

Expected: `pretest` completes (`compile-tests`, `compile`, `lint`) and the remaining VS Code test runner finishes without TypeScript compile failures.

**Step 2: Commit the configuration changes**

```bash
git add tsconfig.test.json docs/plans/2025-11-16-test-baseline-stabilization.md
git commit -m "chore: stabilize TypeScript test config"
```

---

Plan complete. Two execution options:

1. **Subagent-Driven (this session)** – I dispatch fresh subagents per task with reviews between tasks.
2. **Parallel Session (separate)** – Open a new session that runs superpowers:executing-plans to follow this document.

Which approach would you like to use?
