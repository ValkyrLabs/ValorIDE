import { useEffect, useId, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  useExecuteOmegaSupersessionReadMutation,
  useLazyGetOmegaRetrievalTrajectoryQuery,
} from "@thorapi/services/creditsApi";
import type {
  OmegaRetrievalTrajectoryResponse,
  OmegaSupersessionEdge,
  OmegaSupersessionReadRequest,
  OmegaSupersessionReadResponse,
  OmegaTemporalInstant,
} from "@thorapi/services/creditsApi";

import "./OmegaTraversalReplayPanel.css";

const REQUIRED_POLICY_FLAGS = [
  "server_derived_identity_scope",
  "plan_query_hash_verified",
  "parent_search_receipt_lineage_verified",
  "edge_acl_rechecked",
  "both_edge_endpoints_receipt_bound",
  "temporal_as_of_enforced",
  "valid_time_and_recorded_time_checked",
  "no_broad_search_reexecution",
] as const;

type ReplayBundle = {
  inspection: OmegaSupersessionReadResponse;
  trajectory: OmegaRetrievalTrajectoryResponse;
};

type VisualNode = {
  ref: string;
  type: string;
  x: number;
  y: number;
};

export type OmegaReplayIntegrity = {
  safeToRender: boolean;
  failures: string[];
};

const normalizedToken = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const parsedTime = (value?: OmegaTemporalInstant): number => {
  if (!value) return Number.NaN;
  const date = value instanceof Date ? value : new Date(value);
  return date.getTime();
};

const containsTime = (
  instant: number,
  start?: OmegaTemporalInstant,
  end?: OmegaTemporalInstant,
): boolean => {
  const startTime = start ? parsedTime(start) : Number.NEGATIVE_INFINITY;
  const endTime = end ? parsedTime(end) : Number.POSITIVE_INFINITY;
  return (
    Number.isFinite(instant) &&
    !Number.isNaN(startTime) &&
    !Number.isNaN(endTime) &&
    startTime <= instant &&
    instant < endTime
  );
};

const formatTime = (value?: OmegaTemporalInstant): string => {
  const instant = parsedTime(value);
  return Number.isFinite(instant) ? new Date(instant).toISOString() : "open";
};

const shortRef = (value?: string): string =>
  hasText(value) ? value.slice(0, 8) : "unknown";

const receiptBoundGraph = (
  edges: OmegaSupersessionEdge[],
): { nodes: VisualNode[]; height: number } => {
  const identities = new Map<string, string>();
  edges.forEach((edge) => {
    if (hasText(edge.fromRef)) identities.set(edge.fromRef, edge.fromType);
    if (hasText(edge.toRef)) identities.set(edge.toRef, edge.toType);
  });
  const columns = Math.max(1, Math.min(5, identities.size));
  const rows = Math.max(1, Math.ceil(identities.size / columns));
  const horizontalGap = 720 / (columns + 1);
  const nodes: VisualNode[] = [];
  identities.forEach((type, ref) => {
    const index = nodes.length;
    nodes.push({
      ref,
      type,
      x: Math.round(horizontalGap * ((index % columns) + 1)),
      y: 70 + Math.floor(index / columns) * 120,
    });
  });
  return { nodes, height: Math.max(150, rows * 120) };
};

export const evaluateOmegaReplayIntegrity = (
  inspection: OmegaSupersessionReadResponse,
  trajectory: OmegaRetrievalTrajectoryResponse,
): OmegaReplayIntegrity => {
  const edges = inspection.edges ?? [];
  const header = trajectory.trajectory;
  const step = (trajectory.steps ?? []).find(
    (candidate) =>
      candidate.sequenceNumber === inspection.inspectionStepSequence,
  );
  const asOf = parsedTime(inspection.asOf);
  const failures: string[] = [];

  if (normalizedToken(inspection.tool) !== "supersession_read") {
    failures.push("tool identity");
  }
  if (
    REQUIRED_POLICY_FLAGS.some(
      (flag) => !(inspection.policyFlags ?? []).includes(flag),
    )
  ) {
    failures.push("policy attestations");
  }
  if (inspection.edgeCount !== edges.length) failures.push("edge count");
  if (edges.length > 0 && inspection.completeWithinReceipt !== true) {
    failures.push("receipt endpoint scope");
  }
  if (
    edges.some(
      (edge) =>
        edge.fromRef !== inspection.selectedSourceRef &&
        edge.toRef !== inspection.selectedSourceRef,
    )
  ) {
    failures.push("selected source scope");
  }
  if (
    edges.some(
      (edge) =>
        !hasText(edge.edgeRef) ||
        !hasText(edge.fromType) ||
        !hasText(edge.fromRef) ||
        !hasText(edge.toType) ||
        !hasText(edge.toRef) ||
        !hasText(edge.relationType) ||
        !Number.isFinite(edge.confidence) ||
        edge.confidence < 0 ||
        edge.confidence > 1,
    )
  ) {
    failures.push("edge shape");
  }
  if (
    !Number.isFinite(asOf) ||
    edges.some(
      (edge) =>
        !containsTime(asOf, edge.validFrom, edge.validTo) ||
        !containsTime(
          asOf,
          edge.recordedFrom ?? edge.recordedAt,
          edge.recordedTo,
        ),
    )
  ) {
    failures.push("temporal interval");
  }
  if (
    !header ||
    header.trajectoryId !== inspection.searchTrajectoryRef ||
    header.traceId !== inspection.searchTraceId ||
    header.receiptRef !== inspection.parentSearchReceiptRef ||
    header.planRef !== inspection.planRef
  ) {
    failures.push("trajectory lineage");
  }
  if (
    !step ||
    normalizedToken(step.tool) !== "supersession_read" ||
    normalizedToken(step.status) !== "succeeded" ||
    step.trajectoryId !== inspection.searchTrajectoryRef ||
    step.traceId !== inspection.searchTraceId
  ) {
    failures.push("inspection step");
  }

  return { safeToRender: failures.length === 0, failures };
};

export const assertRequestedReplayLineage = (
  request: OmegaSupersessionReadRequest,
  inspection: OmegaSupersessionReadResponse,
): void => {
  if (
    inspection.planRef !== request.planId ||
    inspection.parentSearchReceiptRef !== request.parentSearchReceiptRef ||
    inspection.selectedSourceRef !== request.selectedSourceRef ||
    normalizedToken(inspection.tool) !== "supersession_read" ||
    !hasText(inspection.searchTrajectoryRef) ||
    !hasText(inspection.searchTraceId)
  ) {
    throw Object.assign(new Error("omega_replay_lineage_mismatch"), {
      status: 409,
    });
  }
};

const safeReplayError = (error: unknown): string => {
  const status =
    error && typeof error === "object"
      ? (error as { status?: number | string }).status
      : undefined;
  if (status === 400) return "Check the exact plan and replay inputs.";
  if (status === 401) return "Sign in before loading an OmegaRAG replay.";
  if (status === 403)
    return "This receipt or source is outside your authorized GrayMatter scope.";
  if (status === 404)
    return "The authorized receipt, source, plan, or trajectory was not found.";
  if (status === 409)
    return "The receipt lineage is not in a state that permits replay.";
  return "Unable to load the authorized replay. No response content was displayed.";
};

const OmegaTraversalReplayPanel = () => {
  const [executeInspection] = useExecuteOmegaSupersessionReadMutation();
  const [loadTrajectory] = useLazyGetOmegaRetrievalTrajectoryQuery();
  const markerId = `valor-omega-arrow-${useId().replace(/:/g, "")}`;
  const [planId, setPlanId] = useState("");
  const [receiptRef, setReceiptRef] = useState("");
  const [sourceRef, setSourceRef] = useState("");
  const [query, setQuery] = useState("");
  const [asOf, setAsOf] = useState("");
  const [maxEdges, setMaxEdges] = useState(25);
  const [bundle, setBundle] = useState<ReplayBundle>();
  const [selectedStep, setSelectedStep] = useState(0);
  const [selectedEdge, setSelectedEdge] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const steps = useMemo(
    () =>
      [...(bundle?.trajectory.steps ?? [])].sort(
        (left, right) => left.sequenceNumber - right.sequenceNumber,
      ),
    [bundle],
  );
  const defaultStep = Math.max(
    0,
    steps.findIndex(
      (step) =>
        step.sequenceNumber === bundle?.inspection.inspectionStepSequence,
    ),
  );
  const edges = bundle?.inspection.edges ?? [];
  const graph = useMemo(() => receiptBoundGraph(edges), [edges]);
  const nodesByRef = useMemo(
    () => new Map(graph.nodes.map((node) => [node.ref, node])),
    [graph.nodes],
  );
  const integrity = bundle
    ? evaluateOmegaReplayIntegrity(bundle.inspection, bundle.trajectory)
    : undefined;

  useEffect(() => {
    setSelectedStep(defaultStep);
    setSelectedEdge(0);
  }, [defaultStep, bundle?.inspection.searchTrajectoryRef]);

  const ready = Boolean(
    planId.trim() && receiptRef.trim() && sourceRef.trim() && query.trim(),
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || loading) return;
    setLoading(true);
    setError("");
    setBundle(undefined);
    try {
      const request: OmegaSupersessionReadRequest = {
        planId: planId.trim(),
        query: query.trim(),
        parentSearchReceiptRef: receiptRef.trim(),
        selectedSourceRef: sourceRef.trim(),
        maxEdges,
      };
      if (asOf) {
        const instant = new Date(asOf);
        if (Number.isNaN(instant.getTime())) {
          throw Object.assign(new Error("invalid_as_of"), { status: 400 });
        }
        request.asOf = instant.toISOString();
      }
      const inspection = await executeInspection(request).unwrap();
      assertRequestedReplayLineage(request, inspection);
      const trajectory = await loadTrajectory(
        inspection.searchTrajectoryRef,
        true,
      ).unwrap();
      setBundle({ inspection, trajectory });
    } catch (caught) {
      setError(safeReplayError(caught));
    } finally {
      setLoading(false);
    }
  };

  const selected = steps[selectedStep];
  const selectedTemporalEdge = edges[selectedEdge];

  return (
    <section
      aria-label="OmegaRAG receipt replay"
      className="valor-omega-replay"
    >
      <header className="valor-omega-replay-heading">
        <div>
          <span>OMR-GRAPH-009</span>
          <h4>Temporal traversal replay</h4>
        </div>
        <p>
          Draw only explicit temporal edges already authorized by one parent
          receipt. No broad graph read or source content is displayed.
        </p>
      </header>

      <form onSubmit={submit}>
        <label>
          Plan reference
          <input
            onChange={(event) => setPlanId(event.target.value)}
            required
            value={planId}
          />
        </label>
        <label>
          Parent search receipt
          <input
            onChange={(event) => setReceiptRef(event.target.value)}
            required
            value={receiptRef}
          />
        </label>
        <label>
          Selected source UUID
          <input
            onChange={(event) => setSourceRef(event.target.value)}
            required
            value={sourceRef}
          />
        </label>
        <label className="wide">
          Exact plan query
          <textarea
            onChange={(event) => setQuery(event.target.value)}
            required
            rows={2}
            value={query}
          />
        </label>
        <label>
          Recorded-time ceiling
          <input
            onChange={(event) => setAsOf(event.target.value)}
            type="datetime-local"
            value={asOf}
          />
        </label>
        <label>
          Edge limit
          <input
            max={50}
            min={1}
            onChange={(event) => {
              const requested = Number(event.target.value);
              setMaxEdges(
                Number.isFinite(requested)
                  ? Math.max(1, Math.min(50, Math.floor(requested)))
                  : 1,
              );
            }}
            type="number"
            value={maxEdges}
          />
        </label>
        <button disabled={!ready || loading} type="submit">
          {loading ? "Verifying lineage…" : "Load receipt replay"}
        </button>
      </form>

      {error ? (
        <p aria-live="polite" className="valor-omega-error" role="alert">
          {error}
        </p>
      ) : null}

      {bundle && integrity ? (
        <div className="valor-omega-result">
          <div className="valor-omega-result-header">
            <div>
              <strong>Receipt-bound temporal graph</strong>
              <span>
                {bundle.inspection.temporalBasis} · as of{" "}
                {formatTime(bundle.inspection.asOf)}
              </span>
            </div>
            <span className={integrity.safeToRender ? "verified" : "blocked"}>
              {integrity.safeToRender
                ? "Lineage verified"
                : "Rendering blocked"}
            </span>
          </div>

          <ol aria-label="Omega traversal steps" className="valor-omega-steps">
            {steps.map((step, index) => (
              <li
                key={`${step.sequenceNumber}-${step.requestHash ?? step.tool}`}
              >
                <button
                  aria-pressed={selectedStep === index}
                  onClick={() => setSelectedStep(index)}
                  type="button"
                >
                  {step.sequenceNumber}. {step.tool ?? "unknown tool"}
                </button>
              </li>
            ))}
          </ol>

          {selected ? (
            <p aria-live="polite" className="valor-omega-selection">
              {selected.operation ?? selected.tool ?? "Unknown operation"} ·{" "}
              {selected.status} · step {selected.sequenceNumber}
            </p>
          ) : null}

          {!integrity.safeToRender ? (
            <div className="valor-omega-warning" role="status">
              <strong>Receipt-to-visual consistency failed.</strong>
              <span>
                Edge rendering is disabled: {integrity.failures.join(", ")}.
              </span>
            </div>
          ) : null}

          {integrity.safeToRender && graph.nodes.length > 0 ? (
            <svg
              aria-label={`${graph.nodes.length} authorized nodes and ${edges.length} receipt-bound edges`}
              className="valor-omega-graph"
              role="img"
              viewBox={`0 0 720 ${graph.height}`}
            >
              <title>
                Authorized temporal graph at{" "}
                {formatTime(bundle.inspection.asOf)}
              </title>
              <defs>
                <marker
                  id={markerId}
                  markerHeight="7"
                  markerWidth="10"
                  orient="auto"
                  refX="9"
                  refY="3.5"
                >
                  <polygon points="0 0, 10 3.5, 0 7" />
                </marker>
              </defs>
              {edges.map((edge, index) => {
                const from = nodesByRef.get(edge.fromRef);
                const to = nodesByRef.get(edge.toRef);
                if (!from || !to) return null;
                return (
                  <g data-edge-ref={edge.edgeRef} key={edge.edgeRef}>
                    <line
                      className={
                        selectedEdge === index ? "selected" : undefined
                      }
                      markerEnd={`url(#${markerId})`}
                      x1={from.x}
                      x2={to.x}
                      y1={from.y}
                      y2={to.y}
                    />
                    <text
                      textAnchor="middle"
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2 - 8}
                    >
                      {edge.relationType}
                    </text>
                  </g>
                );
              })}
              {graph.nodes.map((node) => (
                <g data-node-ref={node.ref} key={node.ref}>
                  <circle cx={node.x} cy={node.y} r="25" />
                  <text textAnchor="middle" x={node.x} y={node.y - 2}>
                    {node.type}
                  </text>
                  <text
                    className="node-ref"
                    textAnchor="middle"
                    x={node.x}
                    y={node.y + 13}
                  >
                    {shortRef(node.ref)}
                  </text>
                </g>
              ))}
            </svg>
          ) : integrity.safeToRender ? (
            <p>No explicit authorized temporal edges exist for this source.</p>
          ) : null}

          {integrity.safeToRender && edges.length > 0 ? (
            <div className="valor-omega-edge-inspector">
              <div aria-label="Omega temporal edges" role="group">
                {edges.map((edge, index) => (
                  <button
                    aria-pressed={selectedEdge === index}
                    key={edge.edgeRef}
                    onClick={() => setSelectedEdge(index)}
                    type="button"
                  >
                    {edge.fromType}:{shortRef(edge.fromRef)} —{" "}
                    {edge.relationType} → {edge.toType}:{shortRef(edge.toRef)}
                  </button>
                ))}
              </div>
              {selectedTemporalEdge ? (
                <dl aria-label="Selected Omega edge interval">
                  <div>
                    <dt>Valid</dt>
                    <dd>
                      {formatTime(selectedTemporalEdge.validFrom)} →{" "}
                      {formatTime(selectedTemporalEdge.validTo)}
                    </dd>
                  </div>
                  <div>
                    <dt>Recorded</dt>
                    <dd>
                      {formatTime(
                        selectedTemporalEdge.recordedFrom ??
                          selectedTemporalEdge.recordedAt,
                      )}{" "}
                      → {formatTime(selectedTemporalEdge.recordedTo)}
                    </dd>
                  </div>
                  <div>
                    <dt>Confidence</dt>
                    <dd>{selectedTemporalEdge.confidence}</dd>
                  </div>
                </dl>
              ) : null}
            </div>
          ) : null}

          <footer>
            Receipt {bundle.inspection.parentSearchReceiptRef} · plan{" "}
            {bundle.inspection.planRef} · trace{" "}
            {bundle.inspection.searchTraceId} · trajectory{" "}
            {bundle.inspection.searchTrajectoryRef} · source{" "}
            {shortRef(bundle.inspection.selectedSourceRef)}
          </footer>
        </div>
      ) : null}
    </section>
  );
};

export default OmegaTraversalReplayPanel;
