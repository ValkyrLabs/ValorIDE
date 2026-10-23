import { collectWorkflowPages, workflowCollection } from "./workflowCollection";

describe("workflow collections", () => {
  it("reads arrays and supported API envelopes", () => {
    expect(workflowCollection([{ id: "array" }])).toEqual([{ id: "array" }]);
    expect(workflowCollection({ content: [{ id: "page" }] })).toEqual([
      { id: "page" },
    ]);
    expect(
      workflowCollection({ _embedded: { workflows: [{ id: "hal" }] } }),
    ).toEqual([{ id: "hal" }]);
  });

  it("loads all pages and deduplicates workflow ids", async () => {
    const pages = [
      { content: [{ id: "one" }, { id: "two" }] },
      { content: [{ id: "two" }, { id: "three" }] },
      { content: [{ id: "four" }] },
    ];
    const fetchPage = jest.fn(async (page: number) => pages[page]);

    const workflows = await collectWorkflowPages(fetchPage, 2);

    expect(workflows.map((workflow) => workflow.id)).toEqual([
      "one",
      "two",
      "three",
      "four",
    ]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("stops when a server ignores paging and repeats a full page", async () => {
    const repeated = { content: [{ id: "one" }, { id: "two" }] };
    const fetchPage = jest.fn(async () => repeated);

    const workflows = await collectWorkflowPages(fetchPage, 2, 50);

    expect(workflows).toHaveLength(2);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
