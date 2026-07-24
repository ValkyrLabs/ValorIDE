export type WorkflowProjectSnapshot = {
  workflow: Record<string, any>;
  latestVersion?: Record<string, any> | null;
  versions: Record<string, any>[];
  deployments: Record<string, any>[];
  recentExecutions: Record<string, any>[];
  testsByVersion: Record<string, Record<string, any>[]>;
  explanationsByExecution: Record<string, Record<string, any>>;
};

const sensitiveKey = (key: string) => {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (
    normalized.endsWith("ref") ||
    normalized.includes("tokencount") ||
    normalized.includes("tokensused")
  ) {
    return false;
  }
  return [
    "password",
    "passwd",
    "secret",
    "credential",
    "apikey",
    "accesskey",
    "privatekey",
    "authorization",
    "cookie",
    "accesstoken",
    "refreshtoken",
    "bearertoken",
    "sessiontoken",
    "hiddenreasoning",
  ].some((name) => normalized.includes(name));
};

const redactText = (value: string) =>
  value
    .replace(/(authorization\s*:\s*bearer\s+)[^\s"']+/gi, "$1<redacted>")
    .replace(
      /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g,
      "<redacted-jwt>",
    )
    .replace(
      /\b(password|secret|api[_-]?key|token)\s*[=:]\s*[^\s,;]+/gi,
      "$1=<redacted>",
    );

export const redactWorkflowProjectValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactWorkflowProjectValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        sensitiveKey(key) ? "<redacted>" : redactWorkflowProjectValue(child),
      ]),
    );
  }
  return typeof value === "string" ? redactText(value) : value;
};

const slug = (value: unknown, fallback: string) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return normalized || fallback;
};

const json = (value: unknown) =>
  `${JSON.stringify(redactWorkflowProjectValue(value), null, 2)}\n`;

const parseJson = (value: unknown) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const versionFileName = (version: Record<string, any>) =>
  `v${version.versionNumber ?? "unknown"}-${String(version.id || "version").slice(0, 12)}.workflow.json`;

const testFileName = (test: Record<string, any>) =>
  `${slug(test.name, "workflow-test")}-${String(test.id || "test").slice(0, 12)}.test.json`;

export const buildWorkflowProjectFiles = (
  snapshot: WorkflowProjectSnapshot,
): Record<string, string> => {
  const workflow = snapshot.workflow || {};
  const workflowId = String(workflow.id || "unknown-workflow");
  const name = String(workflow.name || workflow.description || "Workflow");
  const files: Record<string, string> = {};
  files["README.md"] =
    `# ${name}\n\nThis is a read-only, authenticated ValorIDE projection of ValkyrAI workflow truth. Runtime identity is the immutable WorkflowVersion content hash plus its deployment; editing these virtual files never mutates the server. Use the governed workflow engineering commands to preview, test, approve, and explicitly save changes.\n\n- Workflow: \`${workflowId}\`\n- Versions: ${snapshot.versions.length}\n- Deployments: ${snapshot.deployments.length}\n- Projected executions: ${snapshot.recentExecutions.length}\n\n## Structure\n\n- \`definition/workflow.json\`: mutable design metadata for inspection only\n- \`versions/*.workflow.json\`: immutable version snapshots\n- \`tests/*.test.json\`: version-bound fixtures and assertions\n- \`traces/<execution>/\`: execution, Runs, checkpoints, events, and diagnosis\n- \`artifacts/<execution>/manifest.json\`: secured artifact metadata and receipt references; restricted bytes are never projected\n`;
  files["definition/workflow.json"] = json(workflow);
  files["deployments/index.json"] = json(snapshot.deployments);
  files["versions/index.json"] = json(
    snapshot.versions.map(
      ({ definitionSnapshot: _snapshot, ...version }) => version,
    ),
  );

  snapshot.versions.forEach((version) => {
    files[`versions/${versionFileName(version)}`] = json({
      workflowVersionId: version.id,
      workflowId: version.workflowId,
      versionNumber: version.versionNumber,
      contentHash: version.contentHash,
      abiHash: version.abiHash,
      validationStatus: version.validationStatus,
      definition: parseJson(version.definitionSnapshot),
    });
    const tests = snapshot.testsByVersion[String(version.id)] || [];
    tests.forEach((test) => {
      files[`tests/${testFileName(test)}`] = json({
        ...test,
        fixtureData: parseJson(test.fixtureData),
        mocks: parseJson(test.mocks),
        assertions: parseJson(test.assertions),
        deterministicControls: parseJson(test.deterministicControls),
        faultPlan: parseJson(test.faultPlan),
      });
    });
  });

  files["tests/index.json"] = json(
    Object.values(snapshot.testsByVersion).flat(),
  );

  snapshot.recentExecutions.forEach((execution) => {
    const executionId = String(execution.id || "unknown-execution");
    const explanation = snapshot.explanationsByExecution[executionId] || {};
    const traceRoot = `traces/${executionId}`;
    files[`${traceRoot}/execution.json`] = json(
      explanation.execution || execution,
    );
    files[`${traceRoot}/runs.json`] = json(explanation.runs || []);
    files[`${traceRoot}/checkpoints.json`] = json(
      explanation.checkpoints || [],
    );
    files[`${traceRoot}/events.json`] = json(explanation.lastEvents || []);
    files[`${traceRoot}/diagnosis.json`] = json({
      summary: explanation.summary || {},
      diagnosis: explanation.diagnosis || null,
      recommendedActions: explanation.recommendedActions || [],
    });
    files[`artifacts/${executionId}/manifest.json`] = json({
      artifacts: explanation.artifacts || [],
      receipts: (explanation.runs || []).map((run: Record<string, any>) => ({
        runId: run.id,
        logicalStepKey: run.logicalStepKey,
        externalReceiptRef: run.externalReceiptRef,
        grayMatterReceiptRef: run.grayMatterReceiptRef,
        swarmReceiptRef: run.swarmReceiptRef,
        skillOpticsReceiptRef: run.skillOpticsReceiptRef,
        compensationReceiptRef: run.compensationReceiptRef,
      })),
    });
  });

  return files;
};

export const workflowProjectRootName = (workflow: Record<string, any>) =>
  `${slug(workflow.name || workflow.description, "workflow")}-${String(workflow.id || "unknown").slice(0, 12)}`;
