/** Source-only contract model checks; not production admission or parser verification. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  canonicalWorkspaceEvidence,
  evaluateFixtureSnapshot,
  interpretLifecycle,
  promptDigest,
  workspaceBindingDigest,
} from "./acp-admission-host-model.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const fixturePath = process.env.ACP_ADMISSION_FIXTURES
  ? path.resolve(process.env.ACP_ADMISSION_FIXTURES)
  : path.resolve(
      root,
      "../ValkyrAI/valkyrai/src/test/resources/contracts/acp-admission-v1.json",
    );
// Read the producer-owned corpus itself. Do not copy its cases into this checkout.
const corpus = JSON.parse(readFileSync(fixturePath, "utf8"));
const vectors = JSON.parse(
  readFileSync(
    new URL("./fixtures/acp-host-encoding-v1.json", import.meta.url),
    "utf8",
  ),
);

describe("shared host byte vectors (synthetic, not a task-envelope verifier)", () => {
  it("keeps vectors disabled and matches all eight workspace tuple strings", () => {
    assert.equal(vectors.productionRouteEnabled, false);
    const { input, canonicalText, utf8Hex, digest } = vectors.workspace;
    assert.equal(JSON.parse(canonicalText).length, 8);
    assert.equal(canonicalWorkspaceEvidence(input), canonicalText);
    assert.equal(Buffer.from(canonicalText, "utf8").toString("hex"), utf8Hex);
    assert.equal(workspaceBindingDigest(input), digest);
  });
  for (const [i, vector] of vectors.prompts.entries()) {
    it(`matches exact single-text UTF-8 vector ${i + 1}`, () => {
      assert.equal(
        Buffer.from(vector.text, "utf8").toString("hex"),
        vector.utf8Hex,
      );
      assert.equal(promptDigest(vector.text), vector.digest);
    });
  }
  it("does not normalize Unicode or trim/normalize whitespace", () => {
    assert.notEqual(
      promptDigest(vectors.prompts[0].text),
      promptDigest(vectors.prompts[1].text),
    );
    const raw = vectors.prompts[2].text;
    assert.notEqual(promptDigest(raw), promptDigest(raw.trim()));
    assert.notEqual(
      promptDigest(raw),
      promptDigest(raw.replaceAll("\r\n", "\n")),
    );
  });
  it("rejects malformed Unicode, empty, oversized or non-text prompt inputs", () => {
    for (const text of [
      "\ud800",
      "\udfff",
      "",
      null,
      {},
      "x".repeat(1024 * 1024 + 1),
    ])
      assert.throws(() => promptDigest(text));
    assert.throws(() =>
      canonicalWorkspaceEvidence({
        ...vectors.workspace.input,
        hostSessionId: "\ud800",
      }),
    );
  });
});

/** Fixture patching only, not an admission parser or a JSON Patch implementation. */
function applyFixtureChanges(baseline, changes) {
  const result = structuredClone(baseline);
  for (const change of changes) {
    assert.equal(
      typeof change.path,
      "string",
      "Fixture change needs a JSON pointer",
    );
    assert.ok(
      change.path.startsWith("/") && change.path.length > 1,
      "Root replacement is not a fixture mutation",
    );
    const keys = change.path
      .slice(1)
      .split("/")
      .map((part) => {
        assert.ok(!/~(?![01])/.test(part), "Malformed JSON pointer escape");
        const key = part.replaceAll("~1", "/").replaceAll("~0", "~");
        assert.ok(
          !["__proto__", "constructor", "prototype"].includes(key),
          "Unsafe fixture key",
        );
        return key;
      });
    let owner = result;
    for (const key of keys.slice(0, -1)) {
      assert.ok(
        owner && typeof owner === "object" && Object.hasOwn(owner, key),
        `Missing fixture path: ${change.path}`,
      );
      owner = owner[key];
    }
    const key = keys.at(-1);
    assert.ok(
      owner && typeof owner === "object" && Object.hasOwn(owner, key),
      `Missing fixture field: ${change.path}`,
    );
    assert.ok(
      Object.hasOwn(change, "value"),
      "Fixture mutation needs an explicit value",
    );
    owner[key] = structuredClone(change.value);
  }
  return result;
}

describe("producer-owned ACP admission fixture decisions (synthetic model only)", () => {
  it("keeps the production route disabled and discovers the current producer inventory", (t) => {
    assert.equal(
      corpus.fixtureVersion,
      "valkyr-acp-admission-fixtures/draft-1",
    );
    assert.equal(corpus.productionRouteEnabled, false);
    assert.match(corpus.scope, /not grants or production verification/);
    assert.ok(corpus.cases.length > 0);
    assert.ok(corpus.lifecycleTraces.length > 0);
    t.diagnostic(
      `${corpus.cases.length} decision fixtures; ${corpus.lifecycleTraces.length} lifecycle traces; ${corpus.parserRejections.length} parser requirements (inventory only)`,
    );
    for (const collection of [corpus.cases, corpus.lifecycleTraces]) {
      assert.equal(
        new Set(collection.map(({ id }) => id)).size,
        collection.length,
      );
      assert.ok(
        collection.every(({ id }) => typeof id === "string" && id.length > 0),
      );
    }
  });

  for (const fixture of corpus.cases) {
    it(`${fixture.id}: ${fixture.expected} / ${fixture.reason}`, () => {
      const snapshot = applyFixtureChanges(corpus.baseline, fixture.changes);
      const before = structuredClone(snapshot);
      assert.deepEqual(evaluateFixtureSnapshot(snapshot), {
        decision: fixture.expected,
        reason: fixture.reason,
      });
      assert.deepEqual(
        snapshot,
        before,
        "Evaluation must not consume or mutate the fixture record",
      );
    });
  }

  it("baseline eligibility is not admission, durable consumption, or a task-start grant", () => {
    const snapshot = structuredClone(corpus.baseline);
    assert.deepEqual(evaluateFixtureSnapshot(snapshot), {
      decision: "eligible-for-atomic-consume",
      reason: "still-requires-durable-consumption-and-final-host-check",
    });
    assert.equal(snapshot.recordState, "READY");
    const result = interpretLifecycle(["start-attempt:hostA"]);
    assert.equal(result.committedConsumes, 0);
    assert.equal(result.taskStarts, 0);
    assert.equal(result.rejectedStarts, 1);
  });
});

describe("fixture mutation safety (test infrastructure, not wire parsing)", () => {
  it("changes existing JSON-pointer targets without mutating the baseline", () => {
    const baseline = { "a/b": { "~value": "old" }, nullable: null };
    assert.deepEqual(
      applyFixtureChanges(baseline, [
        { path: "/a~1b/~0value", value: "new" },
        { path: "/nullable", value: "present" },
      ]),
      { "a/b": { "~value": "new" }, nullable: "present" },
    );
    assert.deepEqual(baseline, { "a/b": { "~value": "old" }, nullable: null });
  });

  for (const pointer of [
    "",
    "/",
    "/missing",
    "/present/missing",
    "/present~2",
    "/__proto__/polluted",
    "/constructor/prototype",
  ]) {
    it(`rejects absent or unsafe patch target ${JSON.stringify(pointer)}`, () => {
      assert.throws(() =>
        applyFixtureChanges({ present: {} }, [{ path: pointer, value: true }]),
      );
    });
  }
});

describe("ACP lifecycle traces (sequential model, not database concurrency proof)", () => {
  for (const fixture of corpus.lifecycleTraces) {
    it(`${fixture.id}: ${fixture.expected}`, () => {
      const events = [...fixture.events];
      const result = interpretLifecycle(events);
      assert.deepEqual(events, fixture.events);
      for (const key of [
        "committedConsumes",
        "taskStarts",
        "rejectedConsumes",
        "rejectedStarts",
      ]) {
        assert.ok(Number.isSafeInteger(result[key]) && result[key] >= 0, key);
      }
      assert.ok(
        result.committedConsumes <= fixture.maxCommittedConsumes,
        "Committed consumption exceeds fixture limit",
      );
      assert.ok(
        result.taskStarts <= fixture.maxTaskStarts,
        "Task starts exceed fixture limit",
      );
      if (Object.hasOwn(fixture, "maxAdmissionRecords")) {
        assert.ok(
          Number.isSafeInteger(result.admissionRecords) &&
            result.admissionRecords >= 0,
        );
        assert.ok(
          Number.isSafeInteger(result.rejectedIssues) &&
            result.rejectedIssues >= 0,
        );
        assert.ok(
          result.admissionRecords <= fixture.maxAdmissionRecords,
          "Admission reservation exceeds fixture limit",
        );
      }
      switch (fixture.expected) {
        case "one-start":
          assert.equal(result.committedConsumes, 1);
          assert.equal(result.taskStarts, 1);
          break;
        case "exactly-one-winner":
          assert.equal(result.committedConsumes, 1);
          break;
        case "second-consume-rejected":
        case "replay-rejected-after-restart":
        case "replay-rejected":
          assert.equal(result.committedConsumes, 1);
          assert.ok(result.rejectedConsumes >= 1);
          break;
        case "reconcile-without-start":
          assert.equal(result.committedConsumes, 1);
          assert.equal(result.taskStarts, 0);
          assert.equal(result.uncertain, true);
          assert.equal(result.recordState, "CONSUMED");
          break;
        case "start-rejected":
          assert.equal(result.taskStarts, 0);
          assert.ok(result.rejectedStarts >= 1);
          break;
        case "duplicate-start-rejected":
          assert.equal(result.taskStarts, 1);
          assert.ok(result.rejectedStarts >= 1);
          break;
        case "valid-record-preserved":
          assert.equal(result.committedConsumes, 1);
          assert.ok(result.rejectedConsumes >= 1);
          assert.equal(result.recordState, "CONSUMED");
          break;
        case "same-pending-admission":
          assert.equal(result.admissionRecords, 1);
          assert.equal(result.rejectedIssues, 0);
          assert.equal(result.committedConsumes, 0);
          assert.equal(result.taskStarts, 0);
          assert.equal(result.recordState, "READY");
          break;
        case "one-reservation-winner":
        case "second-issue-rejected":
          assert.equal(result.admissionRecords, 1);
          assert.ok(result.rejectedIssues >= 1);
          break;
        case "stale-fence-rejected":
          assert.equal(result.committedConsumes, 0);
          assert.equal(result.taskStarts, 0);
          assert.ok(result.rejectedConsumes >= 1);
          break;
        case "no-second-spawn":
          assert.equal(result.committedConsumes, 1);
          assert.equal(result.taskStarts, 1);
          assert.equal(result.uncertain, true);
          break;
        case "file-operation-rejected":
          assert.equal(result.fileOperations, 0);
          assert.ok(result.rejectedFileOperations >= 1);
          break;
        default:
          assert.fail(
            `New producer lifecycle outcome requires explicit consumer review: ${fixture.expected}`,
          );
      }
    });
  }

  it("never starts after a lost consume response, even after status and a valid local check", () => {
    const fixture = corpus.lifecycleTraces.find(
      ({ id }) => id === "lost-consume-response",
    );
    assert.ok(fixture, "Producer lost-response trace must remain present");
    const result = interpretLifecycle([
      ...fixture.events,
      "final-check:valid",
      "start-attempt:hostA",
    ]);
    assert.equal(result.committedConsumes, 1);
    assert.equal(result.taskStarts, 0);
    assert.equal(result.rejectedStarts, 1);
    assert.equal(result.uncertain, true);
    assert.equal(result.recordState, "CONSUMED");
  });

  for (const fixture of corpus.lifecycleTraces.filter(({ id }) =>
    id.startsWith("consumer-crash-"),
  )) {
    it(`${fixture.id} cannot recover a start grant from status or a local check`, () => {
      const result = interpretLifecycle([
        ...fixture.events,
        "status-read:consumed",
        "final-check:valid",
        "start-attempt:hostA",
      ]);
      assert.ok(result.taskStarts <= fixture.maxTaskStarts);
      assert.equal(result.uncertain, true);
      assert.ok(result.rejectedStarts >= 1);
    });
  }
});

describe("unimplemented production parser requirement inventory", () => {
  it("tracks the ten parser obligations without claiming to execute a wire parser", () => {
    const requirements = [
      "unknown-version",
      "unknown-field",
      "duplicate-json-key",
      "oversize-identifier",
      "malformed-uuid",
      "ambiguous-digest",
      "origin-with-userinfo",
      "origin-with-query",
      "untrusted-redirect",
      "caller-selected-verifier-url",
    ];
    assert.equal(corpus.parserRejections.length, 10);
    assert.deepEqual(new Set(corpus.parserRejections), new Set(requirements));
  });
});

const workspace = Object.freeze({
  canonicalUri: "file:///fixture/Workspace%20One",
  rootDevice: "18446744073709551615",
  rootInode: "9007199254740993",
  hostProcessEpoch: "fixture-process-1",
  hostConnectionId: "fixture-connection-1",
  hostSessionId: "fixture-session-1",
  workspaceTrustGeneration: "7",
});
const canonicalWorkspace =
  '["valoride-acp-workspace/v1","file:///fixture/Workspace%20One","18446744073709551615","9007199254740993","fixture-process-1","fixture-connection-1","fixture-session-1","7"]';

describe("draft synthetic workspace evidence encoding (no filesystem probes)", () => {
  it("uses the exact versioned array order and preserves lossless decimal strings", () => {
    assert.equal(canonicalWorkspaceEvidence(workspace), canonicalWorkspace);
    const digest = `sha256:${createHash("sha256").update(canonicalWorkspace, "utf8").digest("hex")}`;
    assert.equal(workspaceBindingDigest(workspace), digest);
    assert.match(digest, /^sha256:[0-9a-f]{64}$/);
    assert.equal(workspaceBindingDigest({ ...workspace }), digest);
    const reversedProperties = Object.fromEntries(
      Object.entries(workspace).reverse(),
    );
    assert.equal(
      canonicalWorkspaceEvidence(reversedProperties),
      canonicalWorkspace,
    );
    assert.equal(workspaceBindingDigest(reversedProperties), digest);
  });

  for (const [field, replacement] of Object.entries({
    canonicalUri: "file:///fixture/Workspace%20Two",
    rootDevice: "18446744073709551616",
    rootInode: "9007199254740994",
    hostProcessEpoch: "fixture-process-2",
    hostConnectionId: "fixture-connection-2",
    hostSessionId: "fixture-session-2",
    workspaceTrustGeneration: "8",
  })) {
    it(`changes the fingerprint when ${field} changes`, () => {
      assert.notEqual(
        workspaceBindingDigest({ ...workspace, [field]: replacement }),
        workspaceBindingDigest(workspace),
      );
    });
  }

  for (const value of [
    "/fixture/workspace",
    "https://fixture.invalid/workspace",
    "file://remote/fixture/workspace",
    "file://localhost/fixture/workspace",
    "file:///fixture/../workspace",
    "file:///fixture/Workspace One",
    "file:///fixture/workspace?query=1",
    "file:///fixture/workspace#fragment",
    "file:///fixture/bad%GG",
    "file:///fixture/encoded%2Fseparator",
    "file:///fixture/null%00byte",
  ]) {
    it(`rejects malformed or noncanonical local workspace URI ${JSON.stringify(value)}`, () => {
      assert.throws(() =>
        canonicalWorkspaceEvidence({ ...workspace, canonicalUri: value }),
      );
      assert.throws(() =>
        workspaceBindingDigest({ ...workspace, canonicalUri: value }),
      );
    });
  }

  for (const field of Object.keys(workspace)) {
    it(`rejects a missing, empty, or non-string ${field}`, () => {
      const missing = { ...workspace };
      delete missing[field];
      assert.throws(() => canonicalWorkspaceEvidence(missing));
      for (const value of ["", null, undefined, 7, true, {}, []]) {
        assert.throws(() =>
          canonicalWorkspaceEvidence({ ...workspace, [field]: value }),
        );
      }
    });
  }

  for (const field of ["rootDevice", "rootInode", "workspaceTrustGeneration"]) {
    it(`rejects lossy or ambiguous decimal ${field}`, () => {
      for (const value of [
        "01",
        "-1",
        "+1",
        "1.0",
        "1e3",
        " 1",
        "1 ",
        "NaN",
        "Infinity",
      ]) {
        assert.throws(() =>
          canonicalWorkspaceEvidence({ ...workspace, [field]: value }),
        );
      }
    });
  }

  it("rejects extra fields, control characters, and invalid evidence containers", () => {
    assert.throws(() =>
      canonicalWorkspaceEvidence({
        ...workspace,
        callerAuthority: "not-authority",
      }),
    );
    assert.throws(() =>
      canonicalWorkspaceEvidence({
        ...workspace,
        hostSessionId: "session\nreplacement",
      }),
    );
    for (const invalid of [null, undefined, [], "workspace", 1]) {
      assert.throws(() => canonicalWorkspaceEvidence(invalid));
    }
  });
});
