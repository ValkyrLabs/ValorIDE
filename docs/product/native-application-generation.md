# Native application generation

Application cards and Blueprint regeneration must use the existing extension-host artifact download service. ValkyrAI remains the authenticated, credit-gated generator and canonical Blueprint owner; archives flow downstream into ValorIDE.

1. Add failing acceptance checks for reference-only requests, exact request/application progress correlation, duplicate clicks, retries and account changes.
2. Route cards through the native downloader using host-stored authentication and the shared bounded transport. Preserve generation/extraction failures and completed steps. Do not navigate away from the user's current view on background progress.
3. Stage each archive independently, keep application output identities separate, and reject duplicate active generation before another paid request. Verify archive extraction and provenance before reporting completion.
4. Run focused host and webview tests, typechecks and artifact builds. Package/install/deployment require their own proof and coordinated release; source validation alone is not activation.
