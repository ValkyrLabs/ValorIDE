# ValorIDE test reliability and user-visible recovery

The native procedure consumer is locally built, but the full host gate remains unclean. An isolated baseline at the same starting commit reproduced all 46 remaining failing suites and all 24 failing assertions. This increment must restore execution of every test with its intended runner and repair genuine product or fixture defects; excluding tests without running them elsewhere does not satisfy the gate.

Current checkout: shared dirty rc-6 at 96ad817370eed2231b3f83f68939acf4598ae42f. Preserve the native procedure work and preexisting package version/submodule/notes. ValkyrAI backend/frontend and Maven remain owned by the coordinated release lane; GrayMatter submission source/index/archive remains frozen. This work does not publish or alter production.

## Plan

1. Establish a complete test inventory and retain the initial failure evidence. Group explicit Jest, Vitest, Mocha/VS Code and Node test files under their actual runners. Ensure every discovered host test is assigned exactly once; preserve the existing webview Vitest gate. Use the existing VS Code test CLI for real extension-host coverage.
2. Repair user-visible failures with focused regressions: malformed API history must not crash the chat or misattribute usage; parsing tool-only responses must preserve actual prose without empty artifacts. Validate mention fixtures against the real UI syntax and session fixtures against duplicate-session protection before changing production behavior. Resolve the marketplace creator display failure against its current service contract.
3. Repair Jest mock/dynamic-import handling and environment version compatibility without weakening test assertions. Add maintained package scripts/configuration for the distinct runners; use existing dependencies where compatible and record any intentional dependency update.
4. Run each complete runner and inspect every failure. Then run root/webview types, lint, the webview suite, and the canonical production package build. Record exact counts, coverage, remaining boundaries and current artifacts in GrayMatter with readback. Installation and live independent-agent mechanization remain separate work.

Initial failure classification: 22 Mocha suites and 10 Vitest suites run under Jest, two Node-test files run under Jest, seven Jest runtime/module setup failures, and five assertion/fixture suites. Source and test results are under `ValkyrAI/work/deployment/20260907-valoride-test-reliability/`; the preceding full baseline inventory is under `20260907-valoride-procedures/`.

## Implemented and verified

The runner inventory covers all 139 host test files exactly once: Jest 105, Vitest 10, Mocha in VS Code 22, and Node 2. Jest now uses compatible 29.x environments and normal mock hoisting; dynamic imports compile for its CommonJS runtime. The existing VS Code CLI runs TypeScript through ts-node with repository aliases, a fresh isolated profile, BDD hooks and normal logger setup. The launcher accommodates the current macOS Code executable name. Tests no longer depend on personal prompt files or leak filesystem-watcher stubs across suites.

Product repairs include malformed API-history recovery and correct request/finish pairing; removal of empty tool-parser text blocks; safe empty-history truncation while preserving the initial conversation pair; creator-name attribution without fabricated verification; chat recovery through the existing task RPC with visible failure handling; bounded command output including its truncation notice and retained head/tail; accurate repetition counts; message echo suppression; and removal of communication listeners and discovery timers on disconnect. The application extraction-failure test now waits for the custom button's asynchronous enabled-state reflection.

Fixture repairs preserve current runtime contracts: normalized stored principals, a strong extension-context reference, one TerminalProcess per command, the retained opening conversation pair, actual @/file mention syntax, unique active remote-session IDs and typed WebsocketMessage payloads. Repetitive-output assertions now exercise the owning OutputFilterService through its public command-filter interface.

| Gate | Result |
| --- | --- |
| Jest host | 105 suites, 815 passed |
| Vitest host | 10 files, 91 passed |
| Node host | 2 files, 6 passed |
| Actual VS Code 1.136.1 extension host | 22 files, 231 passed, 4 skipped because Ollama was unavailable |
| Full webview | 62 passed files and 2 skipped files; 470 passed tests and 34 existing skips |
| Package-audit helper tests | 5 passed |
| Canonical production package | Webview types/build, synchronization, root types, ESLint and production extension bundle passed |

The final combined matrix used `VALORIDE_TEST_VSCODE_VERSION=1.136.1 npm --ignore-scripts test` after `npm run package`. Suppressing the already-completed pretest build preserved the exact production artifact under test; all four host runners and the webview runner executed. Routine development uses `npm test`, which also runs the compile/type/lint pretest. Individual runners are exposed as `test:host:jest`, `test:host:vitest`, `test:host:node` and `test:host:vscode`; `test:inventory` prints the complete assignment. Optional local VS Code selection uses VALORIDE_TEST_VSCODE_EXECUTABLE or VALORIDE_TEST_VSCODE_VERSION. Live Ollama coverage remains unverified when its service is absent.

Production extension: 22,225,904 bytes, SHA-256 `83762013e47b15e255b09a863a078e1d206dfb583142c8461896d2c62b0e412b`. Seven shipped webview files match their build inputs; tree SHA-256 `bbc68c9afe4dbe1e1249e90aecd896ace117b2b8d13f25a0145eb2a74412d7c8`.

GrayMatter methodology decision `952fc574-55a5-463a-aee6-0b6f8d85b7e0` has exact-ID and full-text readback. Evidence is in `ValkyrAI/work/deployment/20260907-valoride-test-reliability/`, including red regressions, the first matrix run, final matrix, source ownership and bundle hashes. This closes the previously unclean local host gate for the native deterministic-procedure consumer. VSIX installation/publication, arbitrary Codex-trace compilation, independent live agent reuse and lifetime-cost measurement remain separate acceptance work. ValkyrAI and GrayMatter release-owner freezes were preserved.
