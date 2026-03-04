# Extension Packaging Size Reduction

## Context
`vsce package` warns that the extension includes a large number of files. The
extension already bundles runtime code into `dist/`, but the current
`.vscodeignore` allows source folders to be shipped, inflating the VSIX.

## Goals
- Reduce packaged file count and remove the packaging warning.
- Keep runtime behavior unchanged by continuing to ship `dist/`, `assets/`, and
  required metadata files.

## Non-Goals
- No functional changes to the extension.
- No adjustments to bundling or build output structure.
- No changes to sourcemap handling in this pass.

## Proposed Approach
Use `.vscodeignore` to exclude source directories that do not need to ship at
runtime. Specifically, ignore `src/**` and `webview-ui/**`, which are already
compiled/bundled into `dist/`. Keep the explicit allowlist for `dist/`, `assets/`,
and metadata files (`package.json`, `README.md`, `CHANGELOG.md`, `LICENSE`).

## Packaging Flow (Data Flow)
1. Build step produces `dist/extension.js` and `dist/webview/**`.
2. `vsce package` reads `.vscodeignore` to filter the workspace file list.
3. The VSIX includes `dist/`, `assets/`, and metadata only.

## Risks and Error Handling
- Risk: Confirm that no runtime loads files from `src/` or `webview-ui/`. The
  current entrypoint (`dist/extension.js`) and webview assets (`dist/webview`)
  should cover runtime needs.
- If the extension starts depending on raw source files, revisit ignore rules.

## Verification
- Run `vsce package` (or `yarn run v`) and confirm the large-file warning is
  gone and the extension loads correctly.
