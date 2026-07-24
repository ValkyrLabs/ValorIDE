import {
  buildWorkflowProjectFiles,
  redactWorkflowProjectValue,
  workflowProjectRootName,
} from "./workflowProjectProjection";

describe("workflowProjectProjection", () => {
  it("projects immutable definitions, tests, traces, and artifact manifests", () => {
    const files = buildWorkflowProjectFiles({
      workflow: { id: "workflow-1234567890", name: "Weekly CEO Review" },
      latestVersion: { id: "version-1" },
      versions: [
        {
          id: "version-1",
          workflowId: "workflow-1234567890",
          versionNumber: 1,
          contentHash: "sha256:definition",
          definitionSnapshot: '{"nodes":[{"id":"task-1"}]}',
        },
      ],
      deployments: [{ id: "deployment-1", status: "ACTIVE" }],
      recentExecutions: [
        { id: "execution-1", workflowVersionId: "version-1", state: "FAILED" },
      ],
      testsByVersion: {
        "version-1": [
          {
            id: "test-1",
            name: "Failure replay",
            fixtureData: '{"customerId":"customer-1"}',
          },
        ],
      },
      explanationsByExecution: {
        "execution-1": {
          execution: { id: "execution-1", state: "FAILED" },
          runs: [
            {
              id: "run-1",
              logicalStepKey: "task-1#0",
              externalReceiptRef: "provider:receipt-1",
            },
          ],
          checkpoints: [{ id: "checkpoint-1", sequenceNo: 1 }],
          lastEvents: [{ sequenceNo: 1, eventType: "STARTED" }],
          artifacts: [
            { id: "artifact-1", contentRef: "file-record:secured-1" },
          ],
          diagnosis: "Provider timeout",
          recommendedActions: ["Replay with mocks"],
        },
      },
    });

    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        "README.md",
        "definition/workflow.json",
        "versions/v1-version-1.workflow.json",
        "tests/failure-replay-test-1.test.json",
        "traces/execution-1/execution.json",
        "traces/execution-1/runs.json",
        "traces/execution-1/checkpoints.json",
        "traces/execution-1/events.json",
        "artifacts/execution-1/manifest.json",
      ]),
    );
    expect(files["versions/v1-version-1.workflow.json"]).toContain("task-1");
    expect(files["artifacts/execution-1/manifest.json"]).toContain(
      "file-record:secured-1",
    );
    expect(
      workflowProjectRootName({
        id: "workflow-1234567890",
        name: "Weekly CEO Review",
      }),
    ).toBe("weekly-ceo-review-workflow-123");
  });

  it("redacts secret-bearing fields and strings while preserving secure refs", () => {
    const sentinel = "workflow-project-secret-sentinel";
    const projected = redactWorkflowProjectValue({
      password: sentinel,
      clientSecret: sentinel,
      bearer: `Authorization: Bearer ${sentinel}`,
      tokenCount: 42,
      securedInputRef: "workflow-artifact:secured-1",
    });
    const serialized = JSON.stringify(projected);

    expect(serialized).not.toContain(sentinel);
    expect(projected).toMatchObject({
      password: "<redacted>",
      clientSecret: "<redacted>",
      tokenCount: 42,
      securedInputRef: "workflow-artifact:secured-1",
    });
  });
});
