/** Session destinations are exact origins, never hostname suffixes or tenant IDs. */
export const credentialOrigin = (value: string): string => {
  const url = new URL(value);
  const protocol =
    url.protocol === "wss:"
      ? "https:"
      : url.protocol === "ws:"
        ? "http:"
        : url.protocol;
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    (protocol !== "https:" && !(protocol === "http:" && local))
  ) {
    throw new Error(
      "Use an HTTPS backend URL, or explicit loopback HTTP, without credentials, query or fragment.",
    );
  }
  return `${protocol}//${url.host}`;
};

// Populated only by authenticated issuance or verified origin-bound storage.
// This is process memory, not a credential export or a new persistent token.
const bindings = new Map<string, string>();
let credentialRevision = 0;
export const getCredentialRevision = (): number => credentialRevision;
export const registerCredentialOrigin = (token: string, host: string): void => {
  const origin = credentialOrigin(host);
  if (!token.trim()) throw new Error("A session credential is required.");
  const existing = bindings.get(token);
  if (existing && existing !== origin)
    throw new Error(
      "This credential belongs to another backend. Sign in at the selected destination.",
    );
  bindings.set(token, origin);
};
export const registeredCredentialOrigin = (token: string): string | undefined =>
  bindings.get(token);
export const forgetCredentialOrigin = (token: string): void => {
  bindings.delete(token);
};
export const clearCredentialOrigins = (): void => {
  credentialRevision += 1;
  bindings.clear();
};

export const assertCredentialHeaders = (
  destination: string,
  headers: Headers,
): void => {
  const authorization = headers.get("Authorization");
  if (authorization) {
    const bearer = authorization.match(/^Bearer\s+(.+)$/i);
    if (!bearer)
      throw new Error(
        "Use a destination-bound Bearer session for backend requests.",
      );
    assertCredentialDestination(bearer[1], destination);
  }
  const session = headers.get("jwtSession");
  if (session) assertCredentialDestination(session, destination);
};

export const assertRefreshCredential = (
  destination: string,
  body: unknown,
): void => {
  let candidate: unknown = body;
  if (typeof body === "string") {
    try {
      candidate = JSON.parse(body);
    } catch {
      candidate = new URLSearchParams(body);
    }
  }
  for (const key of ["refreshToken", "refresh_token"]) {
    const value =
      candidate instanceof URLSearchParams ||
      (typeof FormData !== "undefined" && candidate instanceof FormData)
        ? candidate.get(key)
        : (candidate as Record<string, unknown> | undefined)?.[key];
    if (typeof value === "string")
      assertCredentialDestination(value, destination);
  }
};

export const assertSafeWebSocketUrl = (
  value: string,
  selectedHost: string,
): void => {
  const url = new URL(value);
  if (
    !/^wss?:$/.test(url.protocol) ||
    Array.from(url.searchParams.keys()).some((key) =>
      /token|jwt|auth|session|key/i.test(key),
    ) ||
    Array.from(url.searchParams.values()).some((value) => bindings.has(value))
  ) {
    throw new Error(
      "WebSocket credentials must use authenticated CONNECT headers, never a URL.",
    );
  }
  const safe = new URL(url);
  safe.search = "";
  if (credentialOrigin(safe.toString()) !== credentialOrigin(selectedHost))
    throw new Error(
      "The WebSocket destination differs from the selected backend. Sign in at that destination explicitly.",
    );
};

export const assertCredentialDestination = (
  token: string,
  destination: string,
): void => {
  let origin: string;
  try {
    const url = new URL(destination);
    if (Array.from(url.searchParams.values()).includes(token))
      throw new Error("Credential in URL");
    url.search = "";
    origin = credentialOrigin(url.toString());
  } catch {
    throw new Error(
      "Refusing a credential request to an invalid backend destination.",
    );
  }
  if (!token || bindings.get(token) !== origin) {
    throw new Error(
      "Sign in at the selected backend before connecting. The existing session is not bound to this destination.",
    );
  }
};
