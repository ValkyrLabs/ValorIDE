/** Native consent belongs to one host account state, including signed-out state.
 * This is revocation, not a verified principal/tenant or a remote execution grant.
 * Snapshots contain only local revisions/destination, never credentials.
 */
export function createAcpHostAccountGuard(options: {
  snapshot(): string;
  subscribe(listener: () => void): { dispose(): void };
  onRevoke(): void;
}): { assertActive(): void; dispose(): void } {
  const initial = options.snapshot();
  let disposed = false;
  let revoked = false;
  const revoke = () => {
    if (disposed || revoked) return;
    revoked = true;
    options.onRevoke();
  };
  // Subscribe before native consent. Rotation can keep the same local revision,
  // and a login may start while a modal is still waiting for the user's answer.
  const registration = options.subscribe(revoke);
  return {
    assertActive() {
      if (!disposed && !revoked) {
        try {
          if (options.snapshot() !== initial) revoke();
        } catch {
          revoke();
        }
      }
      if (disposed || revoked)
        throw new Error(
          "The ACP host account or credentials changed. Restart the ACP server and approve a new session.",
        );
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      registration.dispose();
    },
  };
}
