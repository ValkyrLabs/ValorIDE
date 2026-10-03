# Backend sign-in and host changes

ValorIDE defaults to hosted ValkyrAI at `https://api-0.valkyrlabs.com/v1`. Local GrayMatter Lite MCP setup remains separate and works without hosted signup; connecting Lite does not transfer a hosted session to a local API server.

Changing the API backend signs out the existing session and stops authenticated REST and SWARM connections. Use **Select host for sign-in**, then **Account** to sign in at that destination. A 401 or 403 during a schema test means authentication is required; it does not verify deployment identity. A successful OpenAPI schema response establishes schema availability, not permission to reuse an existing account.

Sessions are bound to the scheme, hostname and effective port captured during password login or one-time code exchange. HTTPS is required except for explicit loopback HTTP. Aliases such as `localhost` and `127.0.0.1`, different ports, and HTTP downgrades require their own sign-in. Changing only an API path within the same origin retains the binding.

Existing sessions without reliable origin metadata remain inactive. Sign out and sign in through Account to replace them; no token copying or export is needed. Settings and credential-bearing URI callbacks cannot assign a new origin to a saved token. Interrupted storage writes fail closed, and repeated same-origin saves retain a valid binding.

REST uses explicit origin-bound authentication headers, omits implicit cookie credentials, and rejects redirects. Native password sign-in carries only the CSRF cookies captured from its selected login origin. SWARM sends authentication in STOMP CONNECT headers and rechecks the binding before automatic reconnect; JWTs are never added to WebSocket URLs or auth debug output.

The server must support `Authorization: Bearer` on STOMP CONNECT. Current ValkyrAI source and its security tests support this protocol with tenant validation intact. A deployment using an older incompatible protocol must be upgraded through its owner; connection failure never falls back to a JWT URL.

Generated ThorAPI services delegate their `customBaseQuery` to ValorIDE's application transport. Use `npm run sync:thorapi` to import regenerated services. This command preserves ValorIDE's application-owned browser session and CSRF helpers and installs the transport adapter in staging before replacing generated files. A missing local helper stops the sync before replacement; a later interrupted sync can be repeated safely. The transport tests verify that explicit foreign-origin credentials are rejected before dispatch.

Directly overwriting these files with upstream generator output bypasses this supported import path. The separately owned ValkyrAI templates `typescript-redux-query/customBaseQuery.mustache`, `authTokenStorage.mustache`, `authFetch.mustache`, and `csrfToken.mustache` still need their own origin-aware transport review and codegen lock update. Standalone generated applications need an application-specific session policy; they cannot import ValorIDE's transport.
