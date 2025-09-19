Here’s a focused audit + plan covering redundant/outdated code, risky patterns, and a set of high‑leverage enhancements we can build by wiring up what we already have.

Summary

Non‑Thor RTK services still in use under webview-ui/src/redux/services. Some use an outdated customBaseQuery, miss auth headers, and duplicate Thor services.
Legacy action-based middlewares and actions are registered but appear unused. They bloat the store and risk confusion with RTK Query.
WebSocket state is duplicated and inconsistent across two slices; middleware mixes them.
Several bridge/RTK boundaries are in good shape (e.g., Thor RTK in webview, extension host using fetch), but baseQuery normalization is needed.
Findings are grouped below, with file references and recommended next steps.

Potentially redundant or non‑Thor RTK Query usage

Non‑Thor RTK services: webview-ui/src/redux/services
webview-ui/src/redux/services/PrincipalService.tsx:1 and webview-ui/src/redux/services/AuthService.tsx:1 use createApi with a local customBaseQuery that is weaker/inconsistent.
webview-ui/src/redux/services/LogoutService.tsx:1 uses fetchBaseQuery({ baseUrl: BASE_PATH }) directly without auth headers.
webview-ui/src/redux/services/ApplicationService.tsx:1 uses createApi with Thor’s customBaseQuery (good).
Duplicate custom base queries:
Outdated: webview-ui/src/redux/customBaseQuery.tsx:1 (pulls BASE_PATH from ../thor/src, sets only lowercase authorization, no JSON/credentials defaults).
Canonical: webview-ui/src/thor/redux/customBaseQuery.tsx:1 (handles Accept/Content-Type, credentials: 'include', case-insensitive Authorization, storage fallbacks, event dispatch).
Thor RTK services are the main, comprehensive set: webview-ui/src/thor/redux/services/\* and combined store/middleware in webview-ui/src/thor/redux/store.tsx:1 and webview-ui/src/thor/redux/middlewares/index.tsx:1.
Dead or abandoned code paths

Legacy action-based middleware pattern (likely pre‑RTK Query), in both custom and thor trees:
Actions: webview-ui/src/redux/actions/_.tsx and webview-ui/src/thor/redux/actions/_.tsx
Middlewares: webview-ui/src/redux/middlewares/*ApiMiddleware.tsx and webview-ui/src/thor/redux/middlewares/*ApiMiddleware.tsx
Example: webview-ui/src/redux/middlewares/LoginApiMiddleware.tsx:1 uses @thor/api client, handles ADD*/LIST*/FETCH*/UPDATE*/DELETE\_... request types.
No dispatchers found for these action creators in app code. They are registered in store but appear unused.
Duplicate WebSocket slice implementations and mixed usage:
Slice A: webview-ui/src/redux/services/websocketSlice.ts:1 (actions: setConnected, addMessage).
Slice B: webview-ui/src/components/ServerConsole/websocketSlice.tsx:1 (actions: setConnected, addMessage, addStatus).
Middleware imports mixed sources: webview-ui/src/redux/middleware/websocketMiddleware.ts:6 imports actions from components/ServerConsole/websocketSlice, but state type from redux/services/websocketSlice.
A context helper that seems unused: webview-ui/src/websocket/WebSocketContext.tsx:1 and doc webview-ui/src/websocket/WebSocketDocumentation.md:1 (no imports of useWebSocketContext elsewhere).
Outdated/duplicate custom base query:
webview-ui/src/redux/customBaseQuery.tsx:1 exists but is mostly superseded by webview-ui/src/thor/redux/customBaseQuery.tsx:1; only a few custom services still import it. It should be replaced or removed.
Misc docs/placeholder:
webview-ui/src/components/ServerConsole/ConsolePane.txt:12 looks like stray snippet text, not code.
Error‑prone, incomplete, or insecure code

Missing auth headers in RTK base query:
webview-ui/src/redux/services/LogoutService.tsx:1 uses fetchBaseQuery({ baseUrl: BASE_PATH }) without Authorization header injection. This likely fails in protected environments.
Inconsistent base query between services:
AuthService, PrincipalService, and AclService still import local ../customBaseQuery, which:
Sets only lowercase authorization.
Omits Accept/Content-Type default headers.
Omits credentials: 'include' and token fallback from localStorage.
Thor customBaseQuery is more robust and should be the single source of truth.
Legacy action-based middleware registered in store may shadow RTK Query services and is difficult to reason about:
webview-ui/src/redux/store.tsx:1 concatenates both middlewares (custom) and thorMiddlewares (thor). The custom middlewares reference action types that the app likely never dispatches — unnecessary bloat and potential side-effects.
WebSocket state shape mismatch:
webview-ui/src/redux/services/websocketSlice.ts:1 lacks addStatus, while middleware and server console expect statuses too. Mixing these two slices produces confusing state expectations and potential runtime errors.
Token consistency:
AuthService login path uses import.meta.env.VITE_basePath || "http://localhost:8080/v1" which may bypass the RTK base path and content-type defaults. This is fine for auth, but should standardize header handling and JWT propagation into session/local storage and dispatch a consistent “jwt-token-updated” event like Thor customBaseQuery.
Concrete refactor steps

Unify base query
Replace imports of ../redux/customBaseQuery in custom services with ../../thor/redux/customBaseQuery.
webview-ui/src/redux/services/AuthService.tsx:1
webview-ui/src/redux/services/PrincipalService.tsx:1
webview-ui/src/redux/services/AclService.tsx:1
Update LogoutService to use Thor customBaseQuery instead of naked fetchBaseQuery.
webview-ui/src/redux/services/LogoutService.tsx:1
Remove webview-ui/src/redux/customBaseQuery.tsx:1 after migrating imports.
De‑register and delete legacy action-based middlewares and actions
Remove middlewares from the store that add the legacy action middlewares:
webview-ui/src/redux/store.tsx:33 remove .concat(middlewares as any)
Delete these files if confirmed unused:
Actions: webview-ui/src/redux/actions/*.tsx
Middlewares: webview-ui/src/redux/middlewares/*ApiMiddleware.tsx
Similarly generated thor action-based middlewares under webview-ui/src/thor/redux/middlewares/_ApiMiddleware.tsx and webview-ui/src/thor/redux/actions/_.tsx are safe to remove if nothing dispatches them. Thor RTK Query services are already in use.
Consolidate WebSocket implementation
Choose one slice (recommend the one in components/ServerConsole since it has addStatus) and delete the other.
Keep: webview-ui/src/components/ServerConsole/websocketSlice.tsx:1
Remove: webview-ui/src/redux/services/websocketSlice.ts:1
Update store and middleware to import state and actions from the same slice file:
webview-ui/src/redux/store.tsx:16 redirect to the unified reducer
webview-ui/src/redux/middleware/websocketMiddleware.ts:6 and :9 ensure consistent import source and types
Remove unused context/doc if not planned to use:
webview-ui/src/websocket/WebSocketContext.tsx:1
webview-ui/src/websocket/WebSocketDocumentation.md:1
Normalize auth/login flow
Keep AuthService.loginUser for auth, but ensure the token storage and header behavior mirrors Thor base query:
When setting localStorage/authToken, also mirror to sessionStorage/jwtToken.
Dispatch the same 'jwt-token-updated' event to keep consumers in sync.
Clean up stray artifacts
Remove webview-ui/src/components/ServerConsole/ConsolePane.txt:12 (stray import sample).
Document the RTK architecture
A short README in webview-ui/src/redux/ explaining:
Webview uses Thor RTK Query; extension host uses fetch/bridges.
All services must import thor/redux/customBaseQuery.
Avoid action-based middewares; use RTK Query hooks.
WebSocket: one slice, one middleware, one state shape.
POTENTIALLY AWESOME ENHANCEMENTS

Agent Mesh Control Panel
Build a single dashboard showing:
P2P status + instance ID + peers (from webview-ui/src/P2P/thorBridge.ts:1 events).
WebSocket connection/subscribe controls and live feed (unified slice + middleware).
Host instance + server status via Thor:
webview-ui/src/thor/redux/services/HostInstanceService.tsx:1
webview-ui/src/thor/redux/services/WebsocketSessionService.tsx:1
Usage/balance summary via:
webview-ui/src/thor/redux/services/UsageTransactionService.tsx:1
webview-ui/src/thor/redux/services/BalanceResponseService.tsx:1
Value: one command center to observe and steer “Agentic Web” connectivity directly inside the IDE.
Media Ingest + Analysis (YouTube-in-IDE)
UI panel to paste a YouTube URL and drive an ingest pipeline using existing types/services:
Store and tag media in ContentDataService and ContentMediaLinkService (Thor).
Download/extract via McpDownloadResponseService and McpResourceService where relevant.
Transcribe and chunk; feed to ValkyraiLlmService and ChatCompletionRequestService for summarization, task creation, or code generation.
Save outputs back as NoteService entries with references to timestamps and code links.
Value: transform arbitrary video content into actionable tasks/docs/code directly in your dev loop.
App Generator UX
Build a first-class UI for src/services/appService.ts:1:
List apps, generate code, show generation status and logs, surface download link with filename parsed in ApplicationService response handler.
Offer deploy button via webview-ui/src/redux/services/ApplicationService.tsx:107.
Value: turn the “generate + download” flow into a delightful experience; no context switching.
Workflow Orchestrator
Visual builder leveraging:
webview-ui/src/thor/redux/services/WorkflowService.tsx:1
webview-ui/src/thor/redux/services/AgentEventTriggerService.tsx:1
webview-ui/src/thor/redux/services/ChatCompletionRequestService.tsx:1
Enable “playbooks” combining LLM steps, tool calls (MCP), and data routing into ContentData or external services; run and monitor from the mesh panel.
Thor Studio
Reuse generated forms in webview-ui/src/thor/redux/components/form to provide a “no-code admin” across all Thor models (OAS objects, ACL, org, sales pipeline, etc.).
Value: Rapid admin/testing tool integrated into the IDE’s sidebar.
Implementation plan (targeted)

Fix base query usage:
Migrate AuthService, PrincipalService, AclService, LogoutService to ../../thor/redux/customBaseQuery, add missing auth headers automatically.
Remove legacy action middlewares:
Stop registering them in webview-ui/src/redux/store.tsx:33, delete webview-ui/src/redux/actions/*.tsx and webview-ui/src/redux/middlewares/*ApiMiddleware.tsx if confirmed unused.
Consolidate WebSocket state:
Keep components/ServerConsole/websocketSlice.tsx, update imports everywhere else, remove redux/services/websocketSlice.ts.
Document and enforce RTK conventions:
Add a short README.md in webview-ui/src/redux/ and a linter rule or quick check to prevent importing redux/customBaseQuery.tsx.
Callouts

Extension host fetch usage is appropriate; keep bridges like src/services/content-data/ContentDataBridge.ts:4 and src/services/account/ValorIDEAccountService.ts:3 that delegate data ownership to the webview RTK layer.
Sentry/PostHog configs in src/services/error/ErrorService.ts:29 and src/services/telemetry/TelemetryService.ts:99 look fine; ensure keys aren’t committed if they’re secrets.
History view webview-ui/src/components/history/HistoryView.tsx:1 is solid; consider adding grouped views, export filters, and integration with usage/mesh status.
Would you like me to:

Create issues/PR-level TODOs for the refactors above, or start the quick fixes (base query unification + websocket consolidation)?
Sketch wireframes for the Agent Mesh panel and Media Ingest flow?
Remove the legacy middlewares and unused files in a follow-up patch?
