import React from "react";
import {
  parseWorkflowStudioTarget,
  isWorkflowStudioId,
} from "@shared/WorkflowStudioTarget";
import { vscode } from "../../utils/vscode";

const labels: Record<string, string> = {
  PENDING: "Pending",
  RUNNING: "Running",
  PAUSED: "Paused",
  WAITING_FOR_USER: "Waiting for input",
  WAITING_FOR_APPROVAL: "Waiting for approval",
  WAITING_UNTIL: "Scheduled to resume",
  QUARANTINED: "Needs review",
  SUCCESS: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  TIMEOUT: "Timed out",
};
const descriptions: Record<string, string> = {
  ask_human_approval: "ValkyrAI requires human approval before proceeding.",
  stop_insufficient_credits:
    "The selected account needs credits before proceeding.",
  stop_policy_denied: "ValkyrAI policy does not allow this operation.",
};
const isRecord = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown) => (typeof value === "string" ? value : "");
const reference = (value: unknown): value is string =>
  typeof value === "string" && /^[a-z0-9][a-z0-9._:/-]{0,127}$/i.test(value);
const workflowButtonStyle: React.CSSProperties = {
  cursor: "pointer",
  color: "var(--vscode-button-foreground)",
  background: "var(--vscode-button-background)",
  border: "1px solid var(--vscode-button-border, transparent)",
  borderRadius: 4,
  padding: "6px 10px",
  font: "inherit",
};

function requiredInputs(
  value: unknown,
): { name: string; type: string }[] | null {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.requiredInputKeys) ||
    value.requiredInputKeys.length > 50 ||
    !value.requiredInputKeys.every(reference)
  )
    return null;
  const types = isRecord(value.inputTypes) ? value.inputTypes : {};
  return Array.from(new Set<string>(value.requiredInputKeys)).map((name) => ({
    name,
    type:
      Object.hasOwn(types, name) && reference(types[name])
        ? types[name]
        : "Not specified",
  }));
}

function ProcedureCandidateReview({
  item,
  backend,
}: {
  item: Record<string, any>;
  backend: unknown;
}) {
  const inputs = requiredInputs(item.inputContract);
  const version = isWorkflowStudioId(item.workflowVersionId)
    ? item.workflowVersionId
    : null;
  const target =
    inputs && version && reference(item.procedureRef)
      ? parseWorkflowStudioTarget({ workflowId: item.workflowId, backend })
      : null;
  return (
    <li
      style={{
        listStyle: "none",
        border: "1px solid var(--vscode-panel-border)",
        borderRadius: 6,
        padding: 10,
      }}
    >
      <strong>{text(item.name) || text(item.procedureRef)}</strong>
      <div
        style={{
          fontSize: 12,
          color: "var(--vscode-descriptionForeground)",
          marginTop: 4,
        }}
      >
        {text(item.procedureRef)}
      </div>
      <details style={{ margin: "10px 0", fontSize: 12 }}>
        <summary style={{ cursor: "pointer" }}>
          Review inputs and version
        </summary>
        {inputs === null ? (
          <p>Input details are unavailable.</p>
        ) : inputs.length === 0 ? (
          <p>No required top-level inputs declared.</p>
        ) : (
          <table
            style={{
              width: "100%",
              marginTop: 8,
              textAlign: "left",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th scope="col">Required input</th>
                <th scope="col">Type</th>
              </tr>
            </thead>
            <tbody>
              {inputs.map((input) => (
                <tr key={input.name}>
                  <td style={{ padding: "4px 8px 4px 0" }}>{input.name}</td>
                  <td>{input.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {inputs?.some((input) =>
          ["object", "array"].includes(input.type.toLowerCase()),
        ) && <p>Nested fields require the workflow's input contract.</p>}
        <p
          style={{
            marginBottom: 4,
            color: "var(--vscode-descriptionForeground)",
          }}
        >
          Workflow version
        </p>
        <div style={{ fontFamily: "var(--vscode-editor-font-family)" }}>
          {version || "Unavailable"}
        </div>
      </details>
      {target && (
        <button
          type="button"
          style={workflowButtonStyle}
          onClick={() =>
            vscode.postMessage({
              type: "openWorkflowStudio",
              workflowStudioTarget: target,
            })
          }
        >
          Open workflow
        </button>
      )}
    </li>
  );
}

/** Presentation only: all invocation and authorization stay in the host tool path. */
export default function ProcedureToolCard({
  content,
  awaitingApproval = false,
}: {
  content?: string;
  awaitingApproval?: boolean;
}) {
  let data: Record<string, any> = {};
  try {
    const parsed = JSON.parse(content || "{}");
    if (isRecord(parsed)) data = parsed;
  } catch {
    /* Incomplete history is not execution proof. */
  }
  const result = isRecord(data.result) ? data.result : {};
  const request = data.phase === "request";
  const workflow = isRecord(result.workflow)
    ? result.workflow
    : data.action === "status"
      ? result
      : {};
  const state = text(workflow.state);
  const knownState = Object.hasOwn(labels, state);
  const controlAction = ["pause", "resume", "cancel"].includes(data.action);
  const controlResult =
    data.phase === "result" &&
    controlAction &&
    result.status === "control_returned" &&
    result.action === data.action &&
    isWorkflowStudioId(workflow.id) &&
    knownState;
  const inspection =
    data.phase === "result" &&
    data.action === "inspect" &&
    isWorkflowStudioId(result.procedureId) &&
    isWorkflowStudioId(result.workflowId) &&
    isWorkflowStudioId(result.workflowVersionId) &&
    reference(result.procedureRef) &&
    result.runtimeValidationRequired === true &&
    ((result.status === "input_contract_available" &&
      isRecord(result.inputSchema)) ||
      (result.status === "input_contract_unavailable" &&
        result.inputSchema === null));
  const candidates = Array.isArray(result.procedures)
    ? result.procedures.filter(isRecord).slice(0, 20)
    : null;
  const coverage = isRecord(result.coverage) ? result.coverage : {};
  const error =
    data.phase === "error" && isRecord(result.error) ? result.error : null;
  let title = "Valkyr procedure",
    status = "Unverified",
    description = "Procedure details are unavailable. No outcome was inferred.";
  if (request && controlAction) {
    title =
      data.action === "pause"
        ? "Pause this execution"
        : data.action === "resume"
          ? "Resume this execution"
          : "Cancel this execution";
    status = awaitingApproval ? "Awaiting approval" : "Requested";
    description =
      data.action === "pause"
        ? "Request a pause at a supported execution boundary. Work already in progress may finish."
        : data.action === "resume"
          ? "Resume a paused execution under its current permissions. This does not approve an action or supply requested input."
          : "Request cancellation of this execution. Cancellation does not reverse completed effects.";
  } else if (
    request &&
    ["search", "inspect", "execute", "status"].includes(data.action)
  ) {
    title =
      data.action === "search"
        ? "Find a reusable procedure"
        : data.action === "inspect"
          ? "Inspect procedure inputs"
          : data.action === "status"
            ? "Check procedure progress"
            : "Run a Valkyr procedure";
    status = awaitingApproval ? "Awaiting approval" : "Requested";
    description =
      data.action === "execute"
        ? "ValkyrAI will validate the procedure and apply its permissions and approval requirements."
        : "Read from your selected ValkyrAI backend.";
  } else if (error) {
    status =
      text(error.code) === "DISPATCH_OUTCOME_UNKNOWN"
        ? "Dispatch unverified"
        : text(error.code) === "CONTROL_OUTCOME_UNKNOWN"
          ? "Control unverified"
          : "Could not proceed";
    description = text(error.message) || "No verified outcome is available.";
  } else if (inspection) {
    title = "Procedure inputs";
    status =
      result.status === "input_contract_available"
        ? "Input contract available"
        : "Input contract unavailable";
    description =
      result.status === "input_contract_available"
        ? "These inputs belong to the referenced workflow version. ValkyrAI still validates the procedure and permissions when it runs."
        : result.reason === "not_declared"
          ? "This workflow version does not declare an input schema. Do not guess its nested inputs."
          : result.reason === "schema_too_large"
            ? "The input schema exceeds this client's display limit. Open the workflow to review its contract."
            : "The declared input schema could not be displayed. Open the workflow to review its contract.";
  } else if (controlResult) {
    status = labels[state];
    description =
      "ValkyrAI returned this execution state after the control request. The request may have arrived after the execution changed state.";
  } else if (
    data.phase === "result" &&
    data.action === "search" &&
    candidates
  ) {
    title = "Reusable procedures";
    status = `${candidates.length} candidate${candidates.length === 1 ? "" : "s"}`;
    description = candidates.length
      ? "Candidates require runtime validation before execution."
      : "No eligible candidates were returned on this page. Other procedures may exist.";
  } else if (data.phase === "result" && result.status === "blocked") {
    status = "Blocked";
    description =
      descriptions[text(result.recommendedRoute)] ||
      "ValkyrAI requires a policy decision before proceeding.";
  } else if (data.phase === "result" && result.status === "fallback_required") {
    status = "Agent reasoning needed";
    description =
      "No reusable procedure was started. No fallback agent was launched.";
  } else if (
    data.phase === "result" &&
    ((data.action === "execute" && result.status === "procedure_started") ||
      data.action === "status") &&
    knownState
  ) {
    status = labels[state];
    description =
      state === "SUCCESS"
        ? "The exact workflow execution completed successfully."
        : ["FAILED", "CANCELLED", "TIMEOUT"].includes(state)
          ? "This execution ended without a successful outcome."
          : "The workflow has not completed. Check this execution for its final outcome.";
  }

  const details = request ? data.parameters : undefined;
  const studioTarget = inspection
    ? parseWorkflowStudioTarget({
        workflowId: result.workflowId,
        backend: data.backend,
      })
    : data.phase === "result" &&
        (data.action === "status" ||
          (data.action === "execute" &&
            result.status === "procedure_started") ||
          controlResult) &&
        knownState &&
        isWorkflowStudioId(workflow.id)
      ? parseWorkflowStudioTarget({
          workflowId: workflow.workflowId,
          backend: data.backend,
        })
      : null;
  const detailEntries = [
    ["Backend", data.backend],
    ["Procedure", result.procedureRef],
    [
      "Execution",
      workflow.id ||
        (isWorkflowStudioId(data.executionId) ? data.executionId : undefined),
    ],
    ["Version", result.workflowVersionId],
    ["Receipt", result.routeReceiptRef],
  ].filter(([, value]) => typeof value === "string" && value);
  return (
    <section
      aria-label={title}
      style={{
        border: "1px solid var(--vscode-panel-border)",
        borderRadius: 8,
        padding: 12,
        overflowWrap: "anywhere",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "baseline",
          flexWrap: "wrap",
        }}
      >
        <strong>{title}</strong>
        <span
          style={{
            marginLeft: "auto",
            color:
              status === "Completed"
                ? "var(--vscode-charts-green)"
                : "var(--vscode-descriptionForeground)",
            fontSize: 12,
          }}
        >
          {status}
        </span>
      </div>
      <p style={{ margin: "8px 0", lineHeight: 1.5 }}>{description}</p>
      {detailEntries.length > 0 && (
        <dl style={{ margin: "8px 0", fontSize: 12 }}>
          {detailEntries.map(([label, value]) => (
            <React.Fragment key={label}>
              <dt style={{ color: "var(--vscode-descriptionForeground)" }}>
                {label}
              </dt>
              <dd
                style={{
                  margin: "2px 0 8px",
                  fontFamily: "var(--vscode-editor-font-family)",
                }}
              >
                {value}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      )}
      {studioTarget && (
        <button
          type="button"
          onClick={() =>
            vscode.postMessage({
              type: "openWorkflowStudio",
              workflowStudioTarget: studioTarget,
            })
          }
          style={workflowButtonStyle}
        >
          Open workflow
        </button>
      )}
      {data.phase === "result" && data.action === "search" && candidates && (
        <>
          {candidates.length > 0 && (
            <ul style={{ padding: 0, display: "grid", gap: 8 }}>
              {candidates.map((item, index) => (
                <ProcedureCandidateReview
                  key={index}
                  item={item}
                  backend={data.backend}
                />
              ))}
            </ul>
          )}
          <small>
            One authorized page
            {Number.isInteger(coverage.page)
              ? ` · page ${coverage.page + 1}`
              : ""}
            . Full catalog coverage is unverified.
          </small>
          <p style={{ fontSize: 12, marginBottom: 0 }}>
            {coverage.stopReason === "end_of_list"
              ? "Reached the end of this query. Earlier pages are not verified here."
              : coverage.stopReason === "page_limit"
                ? "Search stopped at the page limit. More procedures may exist."
                : Number.isInteger(coverage.page) &&
                    coverage.page >= 0 &&
                    Number.isInteger(coverage.nextPage) &&
                    coverage.nextPage === coverage.page + 1 &&
                    coverage.nextPage <= 10000
                  ? `Continue with page ${coverage.nextPage + 1} to look for more procedures.`
                  : null}
          </p>
        </>
      )}
      {inspection && result.status === "input_contract_available" && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer" }}>
            Review full input schema
          </summary>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              maxHeight: 320,
              overflow: "auto",
              fontSize: 12,
            }}
          >
            {JSON.stringify(result.inputSchema, null, 2)}
          </pre>
        </details>
      )}
      {request && isRecord(details) && (
        <details>
          <summary style={{ cursor: "pointer" }}>Review parameters</summary>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              maxHeight: 260,
              overflow: "auto",
              fontSize: 12,
            }}
          >
            {JSON.stringify(details, null, 2)}
          </pre>
        </details>
      )}
    </section>
  );
}
