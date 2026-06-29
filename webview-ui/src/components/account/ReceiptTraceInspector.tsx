import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  VSCodeButton,
  VSCodeDivider,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";
import {
  useGetAppGenerationTraceQuery,
  useGetCreditDebitReceiptByReceiptRefQuery,
  useGetSkilloptRouteReceiptQuery,
  useListCreditDebitReceiptsQuery,
  useListSkilloptRouteReceiptsQuery,
} from "@thorapi/services/creditsApi";
import type {
  AppGenerationTraceResponse,
  CreditDebitReceipt,
  SkillOptRouteReceipt,
  SwarmCommandResponse,
} from "@thorapi/model";
import {
  FaBalanceScale,
  FaBoxOpen,
  FaCheckCircle,
  FaCoins,
  FaExclamationTriangle,
  FaFileArchive,
  FaProjectDiagram,
  FaReceipt,
  FaRoute,
  FaSearch,
  FaServer,
} from "react-icons/fa";

type InspectorMode = "generation" | "skillopt" | "credit" | "swarm";

type ReceiptTraceInspectorProps = {
  accountId: string;
  initialSwarmCommandResponse?:
    | SwarmCommandResponse
    | Record<string, unknown>
    | string;
  onConsumeInitialSwarmCommandResponse?: () => void;
};

const SENSITIVE_FIELD_PATTERN =
  /(authorization|jwt|password|secret|session|token|api[_-]?key|csrf|credential)/i;

export const sanitizeReceiptPayload = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeReceiptPayload(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce(
      (acc, [key, entryValue]) => {
        acc[key] = SENSITIVE_FIELD_PATTERN.test(key)
          ? "[redacted]"
          : sanitizeReceiptPayload(entryValue);
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }

  return value;
};

const getErrorText = (error: unknown): string => {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const maybeData = (error as any).data;
    if (typeof maybeData?.message === "string") return maybeData.message;
    if (typeof maybeData?.error === "string") return maybeData.error;
    if (typeof (error as any).message === "string")
      return (error as any).message;
  }
  return "Receipt lookup failed";
};

const formatJson = (value: unknown): string =>
  JSON.stringify(sanitizeReceiptPayload(value), null, 2);

const inferReceiptMode = (receiptRef: string): InspectorMode | undefined => {
  const normalized = receiptRef.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.startsWith("{") || normalized.includes("swarm-command")) {
    return "swarm";
  }
  if (
    normalized.startsWith("cdr_") ||
    normalized.startsWith("cdr-") ||
    normalized.startsWith("credit-") ||
    normalized.includes("creditdebit") ||
    normalized.includes("credit-debit")
  ) {
    return "credit";
  }
  if (
    normalized.startsWith("skillopt") ||
    normalized.startsWith("skill-opt") ||
    normalized.startsWith("route-") ||
    normalized.includes("skillopt")
  ) {
    return "skillopt";
  }
  if (
    normalized.startsWith("appgen") ||
    normalized.startsWith("generation") ||
    normalized.startsWith("gen-") ||
    normalized.includes("generation")
  ) {
    return "generation";
  }
  return undefined;
};

const formatPercent = (value?: number): string | undefined => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return undefined;
  }
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
};

const formatCredits = (value?: number): string | undefined => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return undefined;
  }
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} credits`;
};

const formatBytes = (value?: number): string | undefined => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return undefined;
  }
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
};

const formatDuration = (value?: number): string | undefined => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return undefined;
  }
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} s`;
};

const formatDateTime = (value?: Date | string): string | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString();
};

const compactLabel = (
  value?: string | number | boolean | null,
): string | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value).replace(/_/g, " ");
};

const parseJsonObject = (
  value?: string,
): Record<string, unknown> | undefined => {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

const parseSwarmCommandTrace = (
  value?: string,
): SwarmCommandResponse | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const sanitizeSwarmTrace = (
    trace: SwarmCommandResponse,
  ): SwarmCommandResponse => {
    const workflowDispatch = parseJsonObject(trace.workflowDispatchJson);
    if (!workflowDispatch) {
      return trace;
    }
    return {
      ...trace,
      workflowDispatchJson: JSON.stringify(
        sanitizeReceiptPayload(workflowDispatch),
      ),
    };
  };

  const parsed = parseJsonObject(trimmed);
  if (parsed) {
    return sanitizeSwarmTrace(parsed as SwarmCommandResponse);
  }

  return { receiptRef: trimmed };
};

const getReceiptId = (
  receipt:
    | AppGenerationTraceResponse
    | SkillOptRouteReceipt
    | CreditDebitReceipt
    | SwarmCommandResponse
    | undefined,
): string | undefined => {
  if (!receipt) return undefined;
  return (
    (receipt as any).receiptRef ||
    (receipt as any).traceId ||
    (receipt as any).id ||
    undefined
  );
};

const recentRows = <T,>(rows: T[] | undefined): T[] =>
  Array.isArray(rows) ? rows.slice(0, 5) : [];

const ReceiptSummary = ({
  title,
  value,
}: {
  title: string;
  value?: string | number | null;
}) => {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="receipt-trace-summary-item">
      <span>{title}</span>
      <code>{String(value)}</code>
    </div>
  );
};

const ReceiptJson = ({
  title,
  payload,
}: {
  title: string;
  payload: unknown;
}) => (
  <details className="receipt-trace-json" open>
    <summary>{title}</summary>
    <pre>{formatJson(payload)}</pre>
  </details>
);

const RouteMetric = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value?: string | number | null;
}) => {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="skillopt-route-metric">
      <span className="skillopt-route-metric-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
};

const GenerationTraceCard = ({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) => (
  <section className="generation-trace-card">
    <div className="generation-trace-card-title">
      {icon}
      <h4>{title}</h4>
    </div>
    {children}
  </section>
);

const GenerationTraceChain = ({
  trace,
}: {
  trace: AppGenerationTraceResponse;
}) => {
  const receipt = trace.generationReceipt;
  const request = trace.appGenerationRequest;
  const run = trace.thorApiGenerationRun;
  const artifactSet = trace.generatedArtifactSet;
  const artifacts = trace.generatedArtifacts || [];
  const skillOpt = trace.skillOptRouteReceipt;
  const contextPage = trace.contextPage;
  const creditDebit = trace.creditDebitReceipt;
  const receiptSummary = parseJsonObject(receipt?.summaryJson);
  const runSummary = parseJsonObject(run?.summaryJson);
  const artifactManifest = parseJsonObject(artifactSet?.manifestJson);

  return (
    <section
      className="generation-trace-chain"
      aria-label="Generation trace chain"
    >
      <div className="generation-trace-heading">
        <div>
          <span>
            {compactLabel(receipt?.status) ||
              compactLabel(run?.status) ||
              "trace"}
          </span>
          <h4>
            {receipt?.generator || run?.generator || "ThorAPI generation"}
          </h4>
        </div>
        <div className="generation-trace-status">
          {receipt?.errorMessage || run?.errorMessage ? (
            <FaExclamationTriangle aria-hidden="true" />
          ) : (
            <FaCheckCircle aria-hidden="true" />
          )}
          {compactLabel(receipt?.status || run?.status) || "recorded"}
        </div>
      </div>

      {request?.intentSummary && (
        <p className="generation-trace-intent">{request.intentSummary}</p>
      )}

      <div className="generation-trace-grid">
        <GenerationTraceCard
          icon={<FaReceipt aria-hidden="true" />}
          title="Request"
        >
          <div className="generation-trace-card-grid">
            <ReceiptSummary
              title="Request"
              value={trace.requestRef || request?.requestRef}
            />
            <ReceiptSummary
              title="Application"
              value={trace.applicationId || request?.applicationId}
            />
            <ReceiptSummary
              title="Spec draft"
              value={request?.specDraftRef || receipt?.specDraftRef}
            />
            <ReceiptSummary
              title="Object model"
              value={request?.objectModelRef || receipt?.objectModelRef}
            />
            <ReceiptSummary
              title="Spec revision"
              value={request?.specRevisionRef || receipt?.specRevisionRef}
            />
            <ReceiptSummary
              title="Idempotency"
              value={request?.idempotencyKey}
            />
          </div>
        </GenerationTraceCard>

        <GenerationTraceCard
          icon={<FaRoute aria-hidden="true" />}
          title="Route + Context"
        >
          <div className="generation-trace-card-grid">
            <ReceiptSummary
              title="Route"
              value={
                compactLabel(skillOpt?.recommendedRoute) ||
                trace.skillOptRouteReceiptRef
              }
            />
            <ReceiptSummary
              title="Confidence"
              value={formatPercent(skillOpt?.confidence)}
            />
            <ReceiptSummary
              title="Context score"
              value={formatPercent(skillOpt?.contextSufficiency)}
            />
            <ReceiptSummary
              title="Context page"
              value={contextPage?.pageRef || trace.contextPageRef}
            />
            <ReceiptSummary
              title="Token estimate"
              value={contextPage?.tokenEstimate}
            />
            <ReceiptSummary
              title="Hydration"
              value={compactLabel(skillOpt?.requiredHydration)}
            />
          </div>
        </GenerationTraceCard>

        <GenerationTraceCard
          icon={<FaProjectDiagram aria-hidden="true" />}
          title="Run"
        >
          <div className="generation-trace-card-grid">
            <ReceiptSummary
              title="Run"
              value={trace.generationRunRef || run?.generationRunRef}
            />
            <ReceiptSummary
              title="Status"
              value={compactLabel(run?.status || receipt?.status)}
            />
            <ReceiptSummary
              title="Started"
              value={formatDateTime(run?.startedAt)}
            />
            <ReceiptSummary
              title="Completed"
              value={formatDateTime(run?.completedAt || receipt?.createdAt)}
            />
            <ReceiptSummary
              title="Duration"
              value={formatDuration(run?.durationMillis)}
            />
            <ReceiptSummary
              title="Error"
              value={run?.errorMessage || receipt?.errorMessage}
            />
          </div>
        </GenerationTraceCard>

        <GenerationTraceCard
          icon={<FaFileArchive aria-hidden="true" />}
          title="Artifacts"
        >
          <div className="generation-trace-card-grid">
            <ReceiptSummary
              title="Set"
              value={trace.artifactSetRef || artifactSet?.artifactSetRef}
            />
            <ReceiptSummary
              title="Status"
              value={compactLabel(artifactSet?.status)}
            />
            <ReceiptSummary title="ZIP" value={artifactSet?.zipFileName} />
            <ReceiptSummary
              title="Count"
              value={artifactSet?.artifactCount ?? artifacts.length}
            />
            <ReceiptSummary
              title="Size"
              value={formatBytes(artifactSet?.totalBytes)}
            />
            <ReceiptSummary
              title="Build"
              value={
                trace.buildRunRef || run?.buildRunRef || receipt?.buildRunRef
              }
            />
            <ReceiptSummary
              title="Test"
              value={trace.testRunRef || run?.testRunRef || receipt?.testRunRef}
            />
          </div>
        </GenerationTraceCard>

        <GenerationTraceCard
          icon={<FaCoins aria-hidden="true" />}
          title="Billing"
        >
          <div className="generation-trace-card-grid">
            <ReceiptSummary
              title="Billable"
              value={compactLabel(receipt?.billable)}
            />
            <ReceiptSummary
              title="Estimate"
              value={formatCredits(receipt?.estimatedCredits)}
            />
            <ReceiptSummary
              title="Debited"
              value={formatCredits(
                receipt?.debitedCredits || creditDebit?.amountCredits,
              )}
            />
            <ReceiptSummary
              title="Debit receipt"
              value={trace.creditDebitReceiptRef || creditDebit?.receiptRef}
            />
            <ReceiptSummary
              title="Reservation"
              value={
                receipt?.creditReservationRef || creditDebit?.reservationRef
              }
            />
            <ReceiptSummary
              title="Balance"
              value={formatCredits(creditDebit?.currentBalance)}
            />
          </div>
        </GenerationTraceCard>

        <GenerationTraceCard
          icon={<FaServer aria-hidden="true" />}
          title="Runtime"
        >
          <div className="generation-trace-card-grid">
            <ReceiptSummary
              title="Binding"
              value={
                trace.runtimeBindingRef ||
                run?.runtimeBindingRef ||
                receipt?.runtimeBindingRef
              }
            />
            <ReceiptSummary
              title="Tenant"
              value={trace.tenantId || receipt?.tenantId || run?.tenantId}
            />
            <ReceiptSummary
              title="Account"
              value={trace.accountId || receipt?.accountId || run?.accountId}
            />
            <ReceiptSummary
              title="Trace"
              value={trace.traceId || receipt?.traceId || run?.traceId}
            />
          </div>
        </GenerationTraceCard>
      </div>

      {artifacts.length > 0 && (
        <div className="generation-artifact-list">
          {artifacts.slice(0, 8).map((artifact) => (
            <div className="generation-artifact-row" key={artifact.artifactRef}>
              <FaBoxOpen aria-hidden="true" />
              <div>
                <strong>
                  {compactLabel(artifact.artifactType) || "artifact"}
                </strong>
                <code>{artifact.artifactRef}</code>
                <span>
                  {compactLabel(artifact.status) || "recorded"}
                  {artifact.fileName ? ` · ${artifact.fileName}` : ""}
                  {artifact.byteSize
                    ? ` · ${formatBytes(artifact.byteSize)}`
                    : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {(receiptSummary || runSummary || artifactManifest) && (
        <details className="generation-trace-summary-json">
          <summary>Generation summary</summary>
          <pre>
            {formatJson({
              receipt: receiptSummary,
              run: runSummary,
              artifactManifest,
            })}
          </pre>
        </details>
      )}
    </section>
  );
};

const SkillOptRouteExplanation = ({
  receipt,
}: {
  receipt: SkillOptRouteReceipt;
}) => {
  const scoreMap = parseJsonObject(receipt.routeScoresJson);
  const statusIcon =
    receipt.stopReason || receipt.requiredApproval ? (
      <FaExclamationTriangle aria-hidden="true" />
    ) : (
      <FaCheckCircle aria-hidden="true" />
    );

  return (
    <section
      className="skillopt-route-explanation"
      aria-label="SkillOpt route explanation"
    >
      <div className="skillopt-route-heading">
        <div>
          <span>{compactLabel(receipt.taskType) || "task"}</span>
          <h4>{compactLabel(receipt.recommendedRoute) || "route pending"}</h4>
        </div>
        <div className="skillopt-route-status">
          {statusIcon}
          {compactLabel(
            receipt.outcome || receipt.stopReason || receipt.policyDecision,
          ) || "selected"}
        </div>
      </div>

      {receipt.routeExplanation && (
        <p className="skillopt-route-copy">{receipt.routeExplanation}</p>
      )}

      <div className="skillopt-route-metrics">
        <RouteMetric
          icon={<FaBalanceScale aria-hidden="true" />}
          label="Confidence"
          value={formatPercent(receipt.confidence)}
        />
        <RouteMetric
          icon={<FaCheckCircle aria-hidden="true" />}
          label="Context"
          value={formatPercent(receipt.contextSufficiency)}
        />
        <RouteMetric
          icon={<FaCoins aria-hidden="true" />}
          label="Estimate"
          value={formatCredits(receipt.estimatedCreditCost)}
        />
        <RouteMetric
          icon={<FaCoins aria-hidden="true" />}
          label="Balance"
          value={formatCredits(receipt.creditBalance)}
        />
      </div>

      <div className="skillopt-route-flags">
        <ReceiptSummary
          title="Fallback"
          value={compactLabel(receipt.fallbackRoute)}
        />
        <ReceiptSummary
          title="Hydration"
          value={compactLabel(receipt.requiredHydration)}
        />
        <ReceiptSummary
          title="Approval"
          value={compactLabel(receipt.requiredApproval)}
        />
        <ReceiptSummary
          title="Billable"
          value={compactLabel(receipt.billable)}
        />
        <ReceiptSummary title="Policy" value={receipt.policyDecision} />
        <ReceiptSummary title="Stop reason" value={receipt.stopReason} />
        <ReceiptSummary title="Context" value={receipt.contextPage?.pageRef} />
        <ReceiptSummary
          title="Procedure"
          value={receipt.procedure?.procedureRef}
        />
        <ReceiptSummary
          title="Signal cost"
          value={formatCredits(receipt.skillSignal?.actualCreditCost)}
        />
        <ReceiptSummary title="Rating" value={receipt.rating?.rating} />
      </div>

      {scoreMap && (
        <details className="skillopt-route-scores">
          <summary>Route scores</summary>
          <pre>{formatJson(scoreMap)}</pre>
        </details>
      )}
    </section>
  );
};

const SwarmCommandTrace = ({ trace }: { trace: SwarmCommandResponse }) => {
  const workflowDispatch = parseJsonObject(trace.workflowDispatchJson);
  const failedClosed = Boolean(trace.rejectionCode);

  return (
    <section
      className="generation-trace-chain"
      aria-label="SWARM command trace"
    >
      <div className="generation-trace-heading">
        <div>
          <span>{compactLabel(trace.status) || "command"}</span>
          <h4>SWARM Command</h4>
        </div>
        <div className="generation-trace-status">
          {failedClosed ? (
            <FaExclamationTriangle aria-hidden="true" />
          ) : (
            <FaCheckCircle aria-hidden="true" />
          )}
          {compactLabel(trace.rejectionCode || trace.status) || "recorded"}
        </div>
      </div>

      <div className="generation-trace-grid">
        <GenerationTraceCard
          icon={<FaReceipt aria-hidden="true" />}
          title="Command"
        >
          <div className="generation-trace-card-grid">
            <ReceiptSummary title="Receipt" value={trace.receiptRef} />
            <ReceiptSummary title="Command" value={trace.commandId} />
            <ReceiptSummary title="Trace" value={trace.traceId} />
            <ReceiptSummary title="Target" value={trace.targetInstanceId} />
            <ReceiptSummary
              title="Issued"
              value={formatDateTime(trace.issuedAt)}
            />
            <ReceiptSummary title="Rejection" value={trace.rejectionCode} />
          </div>
        </GenerationTraceCard>

        <GenerationTraceCard
          icon={<FaRoute aria-hidden="true" />}
          title="Evidence Refs"
        >
          <div className="generation-trace-card-grid">
            <ReceiptSummary title="ContextPage" value={trace.contextPageRef} />
            <ReceiptSummary title="SkillOpt" value={trace.skillOptReceiptRef} />
            <ReceiptSummary
              title="Workflow"
              value={trace.workflowExecutionRef}
            />
            <ReceiptSummary title="Status" value={compactLabel(trace.status)} />
          </div>
        </GenerationTraceCard>
      </div>

      {workflowDispatch && (
        <details className="generation-trace-summary-json">
          <summary>Workflow dispatch evidence</summary>
          <pre>{formatJson(workflowDispatch)}</pre>
        </details>
      )}
    </section>
  );
};

const ModeButton = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) => (
  <VSCodeButton appearance={active ? "primary" : "secondary"} onClick={onClick}>
    {children}
  </VSCodeButton>
);

const ReceiptTraceInspector = ({
  accountId,
  initialSwarmCommandResponse,
  onConsumeInitialSwarmCommandResponse,
}: ReceiptTraceInspectorProps) => {
  const [mode, setMode] = useState<InspectorMode>("generation");
  const [receiptRefInput, setReceiptRefInput] = useState("");
  const [submittedReceiptRef, setSubmittedReceiptRef] = useState("");

  const submitReceiptLookup = () => {
    const nextReceiptRef = receiptRefInput.trim();
    if (!nextReceiptRef) return;
    const inferredMode = inferReceiptMode(nextReceiptRef);
    if (inferredMode && inferredMode !== mode) {
      setMode(inferredMode);
    }
    setSubmittedReceiptRef(nextReceiptRef);
  };

  useEffect(() => {
    if (!initialSwarmCommandResponse) return;
    const serialized =
      typeof initialSwarmCommandResponse === "string"
        ? initialSwarmCommandResponse
        : JSON.stringify(initialSwarmCommandResponse);
    setMode("swarm");
    setReceiptRefInput(serialized);
    setSubmittedReceiptRef(serialized);
    onConsumeInitialSwarmCommandResponse?.();
  }, [initialSwarmCommandResponse, onConsumeInitialSwarmCommandResponse]);

  const receiptRef = submittedReceiptRef.trim();
  const hasReceiptRef = receiptRef.length > 0;
  const hasAccountId = accountId.trim().length > 0;

  const appGenerationTrace = useGetAppGenerationTraceQuery(receiptRef, {
    skip: mode !== "generation" || !hasReceiptRef,
  });
  const skilloptReceipt = useGetSkilloptRouteReceiptQuery(
    { accountId, receiptRef },
    {
      skip: mode !== "skillopt" || !hasAccountId || !hasReceiptRef,
    },
  );
  const creditDebitReceipt = useGetCreditDebitReceiptByReceiptRefQuery(
    { accountId, receiptRef },
    {
      skip: mode !== "credit" || !hasAccountId || !hasReceiptRef,
    },
  );
  const skilloptReceiptList = useListSkilloptRouteReceiptsQuery(
    { accountId },
    {
      skip: !hasAccountId,
    },
  );
  const creditDebitReceiptList = useListCreditDebitReceiptsQuery(
    { accountId },
    {
      skip: !hasAccountId,
    },
  );
  const swarmTrace = useMemo(
    () =>
      mode === "swarm" && hasReceiptRef
        ? parseSwarmCommandTrace(receiptRef)
        : undefined,
    [hasReceiptRef, mode, receiptRef],
  );

  const activeResult = useMemo(() => {
    if (mode === "generation") return appGenerationTrace;
    if (mode === "skillopt") return skilloptReceipt;
    if (mode === "swarm") return undefined;
    return creditDebitReceipt;
  }, [appGenerationTrace, creditDebitReceipt, mode, skilloptReceipt]);

  const currentPayload = mode === "swarm" ? swarmTrace : activeResult?.data;
  const isLoading = Boolean(
    activeResult?.isLoading || activeResult?.isFetching,
  );
  const errorText = getErrorText(activeResult?.error);
  const generatedTrace =
    mode === "generation"
      ? (currentPayload as AppGenerationTraceResponse | undefined)
      : undefined;
  const routeReceipt =
    mode === "skillopt"
      ? (currentPayload as SkillOptRouteReceipt | undefined)
      : undefined;
  const swarmCommandTrace =
    mode === "swarm"
      ? (currentPayload as SwarmCommandResponse | undefined)
      : undefined;

  return (
    <div className="receipt-trace-inspector">
      <div className="receipt-trace-header">
        <div>
          <h3>Receipts</h3>
          <div className="receipt-trace-subtitle">
            {accountId || "No account"}
          </div>
        </div>
        <FaReceipt aria-hidden="true" />
      </div>

      <div
        className="receipt-trace-modes"
        role="group"
        aria-label="Receipt type"
      >
        <ModeButton
          active={mode === "generation"}
          onClick={() => setMode("generation")}
        >
          Generation
        </ModeButton>
        <ModeButton
          active={mode === "skillopt"}
          onClick={() => setMode("skillopt")}
        >
          SkillOpt
        </ModeButton>
        <ModeButton
          active={mode === "credit"}
          onClick={() => setMode("credit")}
        >
          Credit
        </ModeButton>
        <ModeButton active={mode === "swarm"} onClick={() => setMode("swarm")}>
          SWARM
        </ModeButton>
      </div>

      <div className="receipt-trace-lookup">
        <VSCodeTextField
          value={receiptRefInput}
          placeholder={
            mode === "swarm"
              ? "receiptRef or SwarmCommandResponse JSON"
              : "receiptRef"
          }
          onInput={(event) =>
            setReceiptRefInput((event.target as HTMLInputElement).value)
          }
        />
        <VSCodeButton
          appearance="primary"
          disabled={!receiptRefInput.trim()}
          onClick={submitReceiptLookup}
          title="Lookup receipt"
        >
          <FaSearch />
        </VSCodeButton>
      </div>

      {!hasAccountId && mode !== "generation" && (
        <div className="receipt-trace-alert">Account scope is required.</div>
      )}

      {isLoading && (
        <div className="receipt-trace-alert">Loading receipt...</div>
      )}
      {errorText && (
        <div className="receipt-trace-alert error">{errorText}</div>
      )}

      {currentPayload && (
        <div className="receipt-trace-result">
          <div className="receipt-trace-summary">
            <ReceiptSummary
              title="Receipt"
              value={getReceiptId(currentPayload as any)}
            />
            <ReceiptSummary
              title="Trace"
              value={(currentPayload as any).traceId}
            />
            <ReceiptSummary
              title="Tenant"
              value={(currentPayload as any).tenantId}
            />
            <ReceiptSummary
              title="Account"
              value={(currentPayload as any).accountId}
            />
            <ReceiptSummary
              title="Context"
              value={(currentPayload as any).contextPageRef}
            />
            <ReceiptSummary
              title="Command"
              value={(currentPayload as any).commandId}
            />
            <ReceiptSummary
              title="Route"
              value={
                (currentPayload as any).recommendedRoute ||
                (currentPayload as any).selectedRoute ||
                (currentPayload as any).skillOptReceiptRef ||
                generatedTrace?.skillOptRouteReceiptRef
              }
            />
            <ReceiptSummary
              title="Workflow"
              value={(currentPayload as any).workflowExecutionRef}
            />
            <ReceiptSummary
              title="Debit"
              value={
                (currentPayload as any).creditDebitReceiptRef ||
                generatedTrace?.creditDebitReceiptRef
              }
            />
          </div>

          {generatedTrace && <GenerationTraceChain trace={generatedTrace} />}

          {routeReceipt && <SkillOptRouteExplanation receipt={routeReceipt} />}

          {swarmCommandTrace && <SwarmCommandTrace trace={swarmCommandTrace} />}

          <ReceiptJson title="Evidence" payload={currentPayload} />
        </div>
      )}

      <VSCodeDivider />

      <div className="receipt-trace-recent">
        <div className="receipt-trace-recent-title">
          <FaRoute aria-hidden="true" />
          Recent account receipts
        </div>
        <div className="receipt-trace-recent-grid">
          {recentRows(skilloptReceiptList.data).map((receipt) => (
            <button
              type="button"
              key={`skillopt-${getReceiptId(receipt)}`}
              onClick={() => {
                setMode("skillopt");
                setReceiptRefInput(getReceiptId(receipt) || "");
                setSubmittedReceiptRef(getReceiptId(receipt) || "");
              }}
            >
              <span>SkillOpt</span>
              <code>{getReceiptId(receipt) || "receipt"}</code>
            </button>
          ))}
          {recentRows(creditDebitReceiptList.data).map((receipt) => (
            <button
              type="button"
              key={`credit-${getReceiptId(receipt)}`}
              onClick={() => {
                setMode("credit");
                setReceiptRefInput(getReceiptId(receipt) || "");
                setSubmittedReceiptRef(getReceiptId(receipt) || "");
              }}
            >
              <span>Credit</span>
              <code>{getReceiptId(receipt) || "receipt"}</code>
            </button>
          ))}
          {!skilloptReceiptList.data?.length &&
            !creditDebitReceiptList.data?.length && (
              <div className="receipt-trace-empty">
                No recent receipts loaded.
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptTraceInspector;
