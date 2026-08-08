import { classifyTaskCompletion } from "./TaskLifecycle";

describe("task completion outcome classification", () => {
  it("classifies blocked no-page prose without promoting it to success", () => {
    expect(
      classifyTaskCompletion({
        evidenceRefs: ["valoride-checkpoint:partial-change"],
        summary:
          "Blocked: the workflow could not proceed; no page was created.",
      }),
    ).toMatchObject({
      confidence: "INFERRED",
      kind: "blocked",
      source: "legacy-classifier",
    });
  });

  it("classifies explicit-failure prose without promoting it to success", () => {
    expect(
      classifyTaskCompletion({
        evidenceRefs: ["valoride-checkpoint:partial-change"],
        summary: "Failed explicitly: page generation failed.",
      }),
    ).toMatchObject({
      confidence: "INFERRED",
      kind: "failed",
      source: "legacy-classifier",
    });
  });

  it("keeps success prose without machine proof outcome-uncertain", () => {
    expect(
      classifyTaskCompletion({
        summary: "SUCCEEDED: the requested page is ready.",
      }),
    ).toEqual({
      confidence: "UNRESOLVED",
      evidenceRefs: [],
      kind: "outcome-uncertain",
      source: "legacy-classifier",
      summary: "SUCCEEDED: the requested page is ready.",
    });
  });

  it("accepts success only with a runtime-supplied evidence carrier", () => {
    expect(
      classifyTaskCompletion({
        evidenceRefs: ["valoride-checkpoint:abc123"],
        summary: "SUCCEEDED: the requested page is ready.",
      }),
    ).toEqual({
      confidence: "EXPLICIT",
      evidenceRefs: ["valoride-checkpoint:abc123"],
      kind: "completed",
      source: "runtime-envelope",
      summary: "SUCCEEDED: the requested page is ready.",
    });
  });
});
