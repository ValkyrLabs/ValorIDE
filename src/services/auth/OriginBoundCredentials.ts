import { createHash } from "node:crypto";
import type { ExtensionContext } from "vscode";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import {
  credentialOrigin,
  forgetCredentialOrigin,
  registerCredentialOrigin,
  getCredentialRevision,
} from "@shared/CredentialOrigin";

export const BACKEND_CREDENTIAL_KEYS = [
  "jwtToken",
  "valkyraiJwt",
  "valorideApiKey",
  "refreshToken",
  "graymatter-token",
  "valor_jwt_token",
] as const;
export const isBackendCredential = (key: string): boolean =>
  (BACKEND_CREDENTIAL_KEYS as readonly string[]).includes(key);
const bindingKey = (key: string) => `credentialOrigin:${key}`;
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

/** Existing unbound credentials are quarantined, never assigned the current host. */
export const readBoundCredential = async (
  context: ExtensionContext,
  key: string,
  destination = getValkyraiBasePath(),
  fallbackValue?: string,
): Promise<string | undefined> => {
  const revision = getCredentialRevision();
  const [storedValue, raw] = await Promise.all([
    context.secrets.get(key),
    context.secrets.get(bindingKey(key)),
  ]);
  const value = storedValue || fallbackValue;
  if (!value || !raw) return undefined;
  try {
    const binding = JSON.parse(raw);
    const origin = credentialOrigin(destination);
    if (
      revision !== getCredentialRevision() ||
      binding.version !== 1 ||
      binding.origin !== origin ||
      binding.sha256 !== digest(value) ||
      credentialOrigin(getValkyraiBasePath()) !== origin
    )
      return undefined;
    registerCredentialOrigin(value, origin);
    return value;
  } catch {
    return undefined;
  }
};

export const writeBoundCredential = async (
  context: ExtensionContext,
  key: string,
  value: string | undefined,
  issuanceHost?: string,
): Promise<void> => {
  const revision = getCredentialRevision();
  const previous = await context.secrets.get(key);
  if (!value) {
    if (previous) forgetCredentialOrigin(previous);
    await context.secrets.delete(bindingKey(key));
    await context.secrets.delete(key);
    return;
  }
  // Ordinary settings saves must not silently rebind an unchanged credential.
  if (previous === value) {
    if (
      issuanceHost &&
      (await readBoundCredential(context, key, issuanceHost)) !== value
    ) {
      throw new Error(
        "This saved credential is unbound or belongs to another backend. Sign out and sign in at the selected destination.",
      );
    }
    return;
  }
  if (!issuanceHost)
    throw new Error(
      "A new backend credential requires destination-specific sign-in.",
    );
  const origin = credentialOrigin(issuanceHost);
  if (
    revision !== getCredentialRevision() ||
    origin !== credentialOrigin(getValkyraiBasePath())
  )
    throw new Error(
      "The session or backend changed during sign-in. Retry at the selected destination.",
    );
  registerCredentialOrigin(value, origin);
  // Metadata first: an interrupted write cannot make the old value valid under
  // a new binding because the fingerprint must match the exact stored value.
  await context.secrets.store(
    bindingKey(key),
    JSON.stringify({ version: 1, origin, sha256: digest(value) }),
  );
  if (
    revision !== getCredentialRevision() ||
    origin !== credentialOrigin(getValkyraiBasePath())
  )
    throw new Error(
      "The session or backend changed during sign-in. Retry at the selected destination.",
    );
  await context.secrets.store(key, value);
  if (previous && previous !== value) forgetCredentialOrigin(previous);
};
