import { describe, expect, it, vi } from "vitest";
import { loadApplicationPages } from "./applicationPaging";

const page = (start = 0) =>
  Array.from({ length: 20 }, (_, i) => ({ id: `app-${i + start}` }));
const clipping = {
  id: "4b2a4dc5-e9f6-45c4-aaaa-0bb187ee386c",
  name: "John Social Video Clipping",
  ownerId: "0c339b19-a9eb-475a-8501-0c272c0c2f0b",
  status: "disabled",
};

describe("complete authorized application paging", () => {
  it("includes the production Clipping record after the first twenty records", async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce({ data: page() })
      .mockResolvedValueOnce({ data: [clipping] });
    const result = await loadApplicationPages(read);
    expect(result).toEqual({ data: [...page(), clipping] });
    expect(read.mock.calls.map((call) => call[0])).toEqual([
      "Application?page=0&size=20&sort=id,asc",
      "Application?page=1&size=20&sort=id,asc",
    ]);
  });

  it("follows explicit metadata after short and empty pages", async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce({ data: { content: [], page: { totalPages: 3 } } })
      .mockResolvedValueOnce({
        data: { content: [{ id: "first" }], page: { totalPages: 3 } },
      })
      .mockResolvedValueOnce({
        data: { content: [clipping], page: { totalPages: 3 } },
      });
    expect(await loadApplicationPages(read)).toEqual({
      data: [{ id: "first" }, clipping],
    });
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("deduplicates overlapping records without changing their owner or status", async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce({
        data: { content: [clipping, { id: "other" }], last: false },
      })
      .mockResolvedValueOnce({ data: { content: [clipping], last: true } });
    expect(await loadApplicationPages(read)).toEqual({
      data: [clipping, { id: "other" }],
    });
  });

  it("preserves page-two authorization failures and returns no partial success", async () => {
    const error = { status: 403, data: { message: "Access denied" } };
    const read = vi
      .fn()
      .mockResolvedValueOnce({ data: page() })
      .mockResolvedValueOnce({ error });
    expect(await loadApplicationPages(read)).toEqual({ error });
  });

  it("turns interrupted loading into an actionable error without caching page zero", async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce({ data: page() })
      .mockRejectedValueOnce(new Error("network interrupted"));
    expect(await loadApplicationPages(read)).toMatchObject({
      error: {
        status: "CUSTOM_ERROR",
        error: expect.stringContaining("before all pages"),
      },
    });
  });

  it("stops an ignored-page loop after two requests", async () => {
    const read = vi.fn().mockResolvedValue({ data: page() });
    expect(await loadApplicationPages(read)).toMatchObject({
      error: { error: expect.stringContaining("repeated an application page") },
    });
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("does not silently accept a malformed envelope as an empty collection", async () => {
    expect(
      await loadApplicationPages(
        vi.fn().mockResolvedValue({ data: { message: "bad page" } }),
      ),
    ).toMatchObject({ error: { status: "CUSTOM_ERROR" } });
  });

  it("does not mix scopes after account, tenant or backend changes", async () => {
    let current = true;
    const read = vi.fn().mockImplementation(async () => {
      current = false;
      return { data: page() };
    });
    expect(
      await loadApplicationPages(read, { isCurrent: () => current }),
    ).toMatchObject({
      error: { error: expect.stringContaining("changed while loading") },
    });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("does not request another page after cancellation", async () => {
    const controller = new AbortController();
    const read = vi.fn().mockImplementation(async () => {
      controller.abort();
      return { data: page() };
    });
    expect(
      await loadApplicationPages(read, { signal: controller.signal }),
    ).toMatchObject({ error: { error: expect.stringContaining("cancelled") } });
    expect(read).toHaveBeenCalledTimes(1);
  });
});
