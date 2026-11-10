# Editing a generated application's Blueprint

Choose **Edit Blueprint** on the generated project in the Projects tree, or open the editor for an application in Apps. The editor uses the same ValkyrLabs OpenAPI Design Center as the website. The header identifies the selected app; choosing a different project opens a separate editor.

- **Build**, **Source** and **Preview** operate on the current draft. Apply pending component edits before switching tools or exporting. Source accepts OpenAPI YAML or JSON, including vendor extensions.
- **Upload local file** opens a native picker and replaces the draft; it does not publish a spec, change application identity, or generate code.
- **Download file** exports the current draft as JSON or YAML, including unpublished source edits.
- **Save Blueprint** publishes to the selected application's canonical OpenAPI endpoint using the revision loaded by the panel. A conflict does not overwrite the server or silently discard your draft; download your edits, then reload and reconcile.
- **Save & regenerate** asks for confirmation, saves first, then creates a generation request pinned to the saved specification ID. If that revision changes before admission, regeneration fails instead of using someone else's edit. A generation failure does not roll back a successful save.

An unbound editor supports local draft and file operations only. Account or backend changes invalidate an open application editor: reopen it in the intended session. On a custom backend, the extension asks before sharing the selected document with the ValkyrLabs-hosted designer. The designer gets the document, not the extension's credentials.

Project-triggered regeneration updates that exact folder, even if nested inside another workspace. Before requesting a generation it checks the previously installed identity, title, version, folder name, and pending sync state. A renamed checkout or Git-only clone with no private install baseline can still edit a Blueprint, but cannot request an in-place generation. Restore the canonical folder name or import the complete generated package to establish the baseline. To create a separately named/versioned project, save the Blueprint and generate it from Apps into a general workspace.

## Release and verification

Roll out the ValkyrLabs website route `/openapi-designer/valoride` alongside the extension. A site without the bridge will time out with an actionable error; the IDE does not fall back to editing an unrelated web catalog record.

For a local browser check, start Vite in the ValkyrAI checkout's `web/typescript/valkyr_labs_com` with `node_modules/.bin/vite --host 127.0.0.1 --port 5228 --strictPort`. Run `node scripts/verify-hosted-blueprint.cjs` in ValorIDE with Chromium installed. This exercises the real website and extension panel with local files and a fixture authenticated API; it creates no live generation or tenant deployment.
