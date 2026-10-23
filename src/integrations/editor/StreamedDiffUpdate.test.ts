import {
  calculateMinimalTextChange,
  getCompletedLineSnapshot,
  shouldRenderPartialSnapshot,
} from "./StreamedDiffUpdate";

describe("streamed diff updates", () => {
  it("does not render token changes until a complete line is available", () => {
    expect(getCompletedLineSnapshot("const value = 1")).toBeUndefined();
    expect(getCompletedLineSnapshot("const value = 1;\npartial")).toBe(
      "const value = 1;\n",
    );
  });

  it("calculates an append-only edit instead of replacing a growing document", () => {
    const currentContent = `${"existing line\n".repeat(10_000)}next`;
    const nextContent = `${currentContent} value`;

    expect(calculateMinimalTextChange(currentContent, nextContent)).toEqual({
      endOffset: currentContent.length,
      startOffset: currentContent.length,
      text: " value",
    });
  });

  it("preserves shared suffixes for edits in the middle of a document", () => {
    expect(
      calculateMinimalTextChange("before OLD after", "before NEW after"),
    ).toEqual({
      endOffset: 10,
      startOffset: 7,
      text: "NEW",
    });
  });

  it("coalesces identical and sub-frame updates but flushes bounded chunks", () => {
    const base = "line one\n";
    expect(
      shouldRenderPartialSnapshot({
        chunkSize: 5_120,
        currentContent: base,
        lastRenderAt: 100,
        minimumIntervalMs: 50,
        nextContent: base,
        now: 200,
      }),
    ).toBe(false);
    expect(
      shouldRenderPartialSnapshot({
        chunkSize: 5_120,
        currentContent: base,
        lastRenderAt: 100,
        minimumIntervalMs: 50,
        nextContent: `${base}line two\n`,
        now: 120,
      }),
    ).toBe(false);
    expect(
      shouldRenderPartialSnapshot({
        chunkSize: 5,
        currentContent: base,
        lastRenderAt: 100,
        minimumIntervalMs: 50,
        nextContent: `${base}line two\n`,
        now: 120,
      }),
    ).toBe(true);
  });

  it("bounds editor renders across a fast token stream", () => {
    let accumulatedContent = "";
    let renderedContent = "";
    let lastRenderAt = 0;
    let renderCount = 0;

    for (let tokenIndex = 1; tokenIndex <= 10_000; tokenIndex += 1) {
      accumulatedContent += tokenIndex % 100 === 0 ? "\n" : "x";
      const snapshot = getCompletedLineSnapshot(accumulatedContent);
      if (
        snapshot !== undefined &&
        shouldRenderPartialSnapshot({
          chunkSize: 5_120,
          currentContent: renderedContent,
          lastRenderAt,
          minimumIntervalMs: 50,
          nextContent: snapshot,
          now: tokenIndex,
        })
      ) {
        renderedContent = snapshot;
        lastRenderAt = tokenIndex;
        renderCount += 1;
      }
    }

    expect(renderedContent).toBe(accumulatedContent);
    expect(renderCount).toBe(100);
    expect(renderCount).toBeLessThan(10_000 / 50);
  });
});
