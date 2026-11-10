import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAcpHostAccountGuard } from "./AcpHostAccountGuard";

const signedOut = JSON.stringify({
  origin: "https://backend.example",
  credentialRevision: 0,
  authenticationRevision: 0,
  account: "signed-out",
});

function fixture(initial = signedOut) {
  let current = initial;
  let snapshotError: Error | undefined;
  let listener!: () => void;
  let revoked = 0;
  let disposed = 0;
  let snapshots = 0;
  const guard = createAcpHostAccountGuard({
    snapshot: () => {
      snapshots++;
      if (snapshotError) throw snapshotError;
      return current;
    },
    subscribe: (callback) => {
      listener = callback;
      return {
        dispose: () => {
          disposed++;
        },
      };
    },
    onRevoke: () => {
      revoked++;
    },
  });
  return {
    guard,
    change: (value: string) => {
      current = value;
    },
    failSnapshot: () => {
      snapshotError = new Error("Snapshot unavailable");
    },
    recoverSnapshot: () => {
      snapshotError = undefined;
    },
    notify: () => listener(),
    counts: () => ({ revoked, disposed, snapshots }),
  };
}

describe("ACP host local account lease", () => {
  it("preserves a stable signed-out snapshot for offline and local-only ACP", () => {
    const f = fixture();
    try {
      assert.doesNotThrow(() => f.guard.assertActive());
      assert.doesNotThrow(() => f.guard.assertActive());
      assert.equal(f.counts().revoked, 0);
    } finally {
      f.guard.dispose();
    }
  });

  it("captures its initial snapshot and installs revocation synchronously", () => {
    const order: string[] = [];
    const guard = createAcpHostAccountGuard({
      snapshot: () => {
        order.push("snapshot");
        return signedOut;
      },
      subscribe: () => {
        order.push("subscribe");
        return { dispose() {} };
      },
      onRevoke: () => {
        order.push("revoke");
      },
    });
    try {
      assert.equal(order[0], "snapshot");
      assert.ok(order.includes("subscribe"));
      assert.ok(!order.includes("revoke"));
      assert.doesNotThrow(() => guard.assertActive());
    } finally {
      guard.dispose();
    }
  });

  for (const [label, snapshot] of [
    ["new login", { authenticationRevision: 1, account: "local-account" }],
    ["logout or credential invalidation", { credentialRevision: 1 }],
    ["backend origin change", { origin: "https://another-backend.example" }],
  ] as const) {
    it(`permanently revokes on ${label}, even if the old snapshot returns`, () => {
      const f = fixture();
      try {
        f.change(JSON.stringify({ ...JSON.parse(signedOut), ...snapshot }));
        assert.throws(() => f.guard.assertActive());
        assert.equal(f.counts().revoked, 1);
        f.change(signedOut);
        assert.throws(() => f.guard.assertActive());
        f.notify();
        assert.equal(f.counts().revoked, 1);
      } finally {
        f.guard.dispose();
      }
    });
  }

  it("revokes on event-only token rotation without requiring a different snapshot", () => {
    const f = fixture();
    try {
      f.notify();
      assert.equal(f.counts().revoked, 1);
      assert.throws(() => f.guard.assertActive());
      f.notify();
      f.notify();
      assert.equal(f.counts().revoked, 1);
    } finally {
      f.guard.dispose();
    }
  });

  it("fails closed when a later snapshot throws and never silently recovers", () => {
    const f = fixture();
    try {
      f.failSnapshot();
      assert.throws(() => f.guard.assertActive());
      assert.equal(f.counts().revoked, 1);
      f.recoverSnapshot();
      assert.throws(() => f.guard.assertActive());
      f.notify();
      assert.equal(f.counts().revoked, 1);
    } finally {
      f.guard.dispose();
    }
  });

  it("cannot lose a revocation delivered while subscribe is registering", () => {
    let revoked = 0;
    let disposed = 0;
    let listener!: () => void;
    const guard = createAcpHostAccountGuard({
      snapshot: () => signedOut,
      subscribe: (callback) => {
        listener = callback;
        callback();
        callback();
        return {
          dispose: () => {
            disposed++;
          },
        };
      },
      onRevoke: () => {
        revoked++;
      },
    });
    assert.equal(revoked, 1);
    assert.throws(() => guard.assertActive());
    guard.dispose();
    guard.dispose();
    listener();
    assert.equal(revoked, 1);
    assert.equal(disposed, 1);
  });

  it("detects a silent snapshot change during subscription registration", () => {
    let current = signedOut;
    let revoked = 0;
    const guard = createAcpHostAccountGuard({
      snapshot: () => current,
      subscribe: () => {
        current = "a-new-local-session-revision";
        return { dispose() {} };
      },
      onRevoke: () => {
        revoked++;
      },
    });
    try {
      assert.throws(() => guard.assertActive());
      assert.equal(revoked, 1);
    } finally {
      guard.dispose();
    }
  });

  it("disposes once without invoking revocation and ignores queued late events", () => {
    const f = fixture();
    f.guard.dispose();
    f.guard.dispose();
    const snapshotsAtDisposal = f.counts().snapshots;
    f.change("changed-after-disposal");
    f.notify();
    f.notify();
    assert.throws(() => f.guard.assertActive());
    assert.deepEqual(f.counts(), {
      revoked: 0,
      disposed: 1,
      snapshots: snapshotsAtDisposal,
    });
  });

  it("marks the lease revoked before calling a reentrant revocation handler", () => {
    let listener!: () => void;
    let revoked = 0;
    const guard = createAcpHostAccountGuard({
      snapshot: () => signedOut,
      subscribe: (callback) => {
        listener = callback;
        return { dispose() {} };
      },
      onRevoke: () => {
        revoked++;
        assert.throws(() => guard.assertActive());
        guard.dispose();
      },
    });
    listener();
    listener();
    assert.equal(revoked, 1);
    assert.throws(() => guard.assertActive());
  });
});
