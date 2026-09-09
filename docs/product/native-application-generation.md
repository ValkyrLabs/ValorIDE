# Native application generation

Application cards and Blueprint regeneration must use the existing extension-host artifact download service. ValkyrAI remains the authenticated, credit-gated generator and canonical Blueprint owner; archives flow downstream into ValorIDE.

1. Add failing acceptance checks for reference-only requests, exact request/application progress correlation, duplicate clicks, retries and account changes.
2. Route cards through the native downloader using host-stored authentication and the shared bounded transport. Preserve generation/extraction failures and completed steps. Do not navigate away from the user's current view on background progress.
3. Stage each archive independently, keep application output identities separate, and reject duplicate active generation before another paid request. Verify archive extraction and provenance before reporting completion.
4. Run focused host and webview tests, typechecks and artifact builds. Package/install/deployment require their own proof and coordinated release; source validation alone is not activation.

Bind each generation to the backend and workspace that selected the Application. Revalidate the secure session and target after asynchronous credential reads and progress callbacks, before the paid request and before exposing returned data. Capture the request URL once; a later configuration change must not redirect an existing session to another backend.

An open Blueprint retains its original backend. Reads, saves, and regeneration use the same session check, and a delayed response from an earlier session must not publish a specification or start generation. Reopening the same Application on a different backend creates a separate panel. A rejected continuation after a request was already sent does not prove that the server operation did not run or was not charged.
