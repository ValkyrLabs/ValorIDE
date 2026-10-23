import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type {
  OmegaRetrievalTrajectoryResponse,
  OmegaSupersessionReadResponse,
} from "@thorapi/services/creditsApi";

const apiSpies = vi.hoisted(() => ({
  inspect: vi.fn(),
  trajectory: vi.fn(),
}));

vi.mock("@thorapi/services/creditsApi", () => ({
  useExecuteOmegaSupersessionReadMutation: () => [apiSpies.inspect],
  useLazyGetOmegaRetrievalTrajectoryQuery: () => [apiSpies.trajectory],
}));

import OmegaTraversalReplayPanel, {
  evaluateOmegaReplayIntegrity,
} from "./OmegaTraversalReplayPanel";

const SOURCE_REF = "11111111-1111-1111-1111-111111111111";

const inspection = (): OmegaSupersessionReadResponse => ({
  tool: "SUPERSESSION_READ",
  planRef: "gm_plan_1",
  parentSearchReceiptRef: "gm_rr_1",
  searchTraceId: "gm_trace_1",
  searchTrajectoryRef: "gm_traj_1",
  inspectionStepSequence: 2,
  selectedSourceRef: SOURCE_REF,
  asOf: "2026-07-01T12:00:00.000Z",
  temporalBasis: "BI_TEMPORAL",
  edges: [
    {
      edgeRef: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      fromType: "MemoryEntry",
      fromRef: SOURCE_REF,
      toType: "MemoryEntry",
      toRef: "22222222-2222-2222-2222-222222222222",
      relationType: "SUPERSEDES",
      confidence: 0.91,
      recordedAt: "2026-06-15T12:00:00.000Z",
      recordedFrom: "2026-06-15T12:00:00.000Z",
      validFrom: "2026-06-01T12:00:00.000Z",
    },
  ],
  edgeCount: 1,
  completeWithinReceipt: true,
  policyFlags: [
    "server_derived_identity_scope",
    "plan_query_hash_verified",
    "parent_search_receipt_lineage_verified",
    "edge_acl_rechecked",
    "both_edge_endpoints_receipt_bound",
    "temporal_as_of_enforced",
    "valid_time_and_recorded_time_checked",
    "no_broad_search_reexecution",
  ],
  observedAt: "2026-07-01T12:00:01.000Z",
});

const trajectory = (): OmegaRetrievalTrajectoryResponse => ({
  trajectory: {
    trajectoryId: "gm_traj_1",
    traceId: "gm_trace_1",
    receiptRef: "gm_rr_1",
    planRef: "gm_plan_1",
  },
  steps: [
    {
      trajectoryId: "gm_traj_1",
      traceId: "gm_trace_1",
      sequenceNumber: 1,
      tool: "graph_expand",
      operation: "expand_authorized_graph",
      status: "SUCCEEDED",
      requestHash: "hash-1",
    },
    {
      trajectoryId: "gm_traj_1",
      traceId: "gm_trace_1",
      sequenceNumber: 2,
      tool: "supersession_read",
      operation: "inspect_supersession",
      status: "SUCCEEDED",
      requestHash: "hash-2",
    },
  ],
});

const resolved = <T,>(value: T) => ({
  unwrap: () => Promise.resolve(value),
});

const rejected = (value: unknown) => ({
  unwrap: () => Promise.reject(value),
});

const fillReplayInputs = () => {
  fireEvent.change(screen.getByLabelText("Plan reference"), {
    target: { value: "gm_plan_1" },
  });
  fireEvent.change(screen.getByLabelText("Parent search receipt"), {
    target: { value: "gm_rr_1" },
  });
  fireEvent.change(screen.getByLabelText("Selected source UUID"), {
    target: { value: SOURCE_REF },
  });
  fireEvent.change(screen.getByLabelText("Exact plan query"), {
    target: { value: "Which decision superseded the earlier one?" },
  });
};

describe("OmegaTraversalReplayPanel", () => {
  beforeEach(() => {
    apiSpies.inspect.mockReset();
    apiSpies.trajectory.mockReset();
    apiSpies.inspect.mockReturnValue(resolved(inspection()));
    apiSpies.trajectory.mockReturnValue(resolved(trajectory()));
  });

  it("loads exact receipt lineage and draws only the returned temporal edge", async () => {
    render(<OmegaTraversalReplayPanel />);
    fillReplayInputs();

    fireEvent.click(
      screen.getByRole("button", { name: "Load receipt replay" }),
    );

    expect(await screen.findByText("Lineage verified")).toBeInTheDocument();
    expect(apiSpies.inspect).toHaveBeenCalledWith({
      planId: "gm_plan_1",
      query: "Which decision superseded the earlier one?",
      parentSearchReceiptRef: "gm_rr_1",
      selectedSourceRef: SOURCE_REF,
      maxEdges: 25,
    });
    expect(apiSpies.trajectory).toHaveBeenCalledWith("gm_traj_1", true);
    expect(
      screen.getByRole("img", {
        name: "2 authorized nodes and 1 receipt-bound edges",
      }),
    ).toBeInTheDocument();
    expect(
      document.querySelector(
        '[data-edge-ref="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"]',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Selected Omega edge interval"),
    ).toHaveTextContent("2026-06-01T12:00:00.000Z");
    expect(
      screen.getByText(/inspect_supersession · SUCCEEDED · step 2/i),
    ).toBeInTheDocument();
  });

  it("blocks edge rendering when trajectory lineage disagrees", async () => {
    const mismatched = trajectory();
    mismatched.trajectory.receiptRef = "gm_rr_other";
    apiSpies.trajectory.mockReturnValue(resolved(mismatched));
    render(<OmegaTraversalReplayPanel />);
    fillReplayInputs();

    fireEvent.click(
      screen.getByRole("button", { name: "Load receipt replay" }),
    );

    expect(await screen.findByText("Rendering blocked")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("trajectory lineage");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(document.querySelector("[data-edge-ref]")).toBeNull();
  });

  it("stops before trajectory retrieval when the inspection mismatches the request", async () => {
    const mismatched = inspection();
    mismatched.tool = "KEYWORD_SEARCH";
    apiSpies.inspect.mockReturnValue(resolved(mismatched));
    render(<OmegaTraversalReplayPanel />);
    fillReplayInputs();

    fireEvent.click(
      screen.getByRole("button", { name: "Load receipt replay" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "lineage is not in a state that permits replay",
    );
    expect(apiSpies.trajectory).not.toHaveBeenCalled();
  });

  it("never displays a server error payload", async () => {
    apiSpies.inspect.mockReturnValue(
      rejected({ status: 403, data: { secretToken: "do-not-render" } }),
    );
    render(<OmegaTraversalReplayPanel />);
    fillReplayInputs();

    fireEvent.click(
      screen.getByRole("button", { name: "Load receipt replay" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "outside your authorized GrayMatter scope",
    );
    expect(document.body).not.toHaveTextContent("do-not-render");
  });

  it("fails closed on missing attestations, failed steps, and stale intervals", () => {
    const value = inspection();
    const trace = trajectory();
    value.policyFlags = value.policyFlags.filter(
      (flag) => flag !== "edge_acl_rechecked",
    );
    value.edges[0].recordedTo = "2026-06-30T12:00:00.000Z";
    trace.steps[1].status = "FAILED";

    const integrity = evaluateOmegaReplayIntegrity(value, trace);

    expect(integrity.safeToRender).toBe(false);
    expect(integrity.failures).toEqual(
      expect.arrayContaining([
        "policy attestations",
        "temporal interval",
        "inspection step",
      ]),
    );
  });
});
