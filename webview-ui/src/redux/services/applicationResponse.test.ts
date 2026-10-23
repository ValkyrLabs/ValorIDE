import { describe, expect, it } from "vitest";
import {
  applicationTagsFor,
  normalizeApplicationResponse,
} from "./applicationResponse";

describe("applicationResponse", () => {
  it("passes through raw application arrays", () => {
    expect(normalizeApplicationResponse([{ id: "app-1" }])).toEqual([
      { id: "app-1" },
    ]);
  });

  it("unwraps Spring-style page content", () => {
    expect(
      normalizeApplicationResponse({
        content: [{ id: "app-1" }, { id: "app-2" }],
        page: { totalElements: 2 },
      }),
    ).toEqual([{ id: "app-1" }, { id: "app-2" }]);
  });

  it("unwraps nested embedded collections", () => {
    expect(
      normalizeApplicationResponse({
        _embedded: {
          applicationList: [{ id: "embedded-app" }],
        },
      }),
    ).toEqual([{ id: "embedded-app" }]);
  });

  it("returns an empty array for non-list payloads", () => {
    expect(normalizeApplicationResponse({ message: "not a list" })).toEqual([]);
    expect(normalizeApplicationResponse("not-json")).toEqual([]);
  });

  it("builds stable RTK tags without calling map on an envelope", () => {
    expect(applicationTagsFor({ content: [{ id: "app-1" }, {}] })).toEqual([
      { type: "Application", id: "app-1" },
    ]);
  });
});
