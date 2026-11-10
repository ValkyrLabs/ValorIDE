import { afterEach, describe, expect, it } from "@jest/globals";
import { JSDOM, VirtualConsole } from "jsdom";
import { acpPanelHtml } from "./acpPanelHtml";

const windows: JSDOM[] = [];
afterEach(() => windows.splice(0).forEach((dom) => dom.window.close()));

function render() {
  const sent: Array<{ type: string; text?: string }> = [];
  const errors: unknown[] = [];
  const console = new VirtualConsole();
  console.on("jsdomError", (error) => errors.push(error));
  const dom = new JSDOM(acpPanelHtml(), {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: console,
    beforeParse(window) {
      Object.assign(window, {
        acquireVsCodeApi: () => ({
          postMessage: (data: (typeof sent)[number]) => sent.push(data),
        }),
      });
    },
  });
  windows.push(dom);
  const { document } = dom.window;
  const get = <T extends HTMLElement = HTMLElement>(id: string) =>
    document.getElementById(id) as T;
  const receive = (data: unknown) =>
    dom.window.dispatchEvent(new dom.window.MessageEvent("message", { data }));
  const state = (patch: Record<string, unknown> = {}) =>
    receive({
      type: "state",
      state: {
        status: "ready",
        agentName: "Fixture agent",
        sessionId: "session-1",
        ...patch,
      },
    });
  const update = (update: unknown) => receive({ type: "update", update });
  return { dom, sent, errors, document, get, receive, state, update };
}

describe("ACP panel presentation", () => {
  it("loads with a per-document nonce and denies remote/active content", () => {
    const first = acpPanelHtml(),
      second = acpPanelHtml();
    const nonce = first.match(/script-src 'nonce-([^']+)'/)?.[1];
    expect(nonce).toBeTruthy();
    expect(first).toContain(`<script nonce="${nonce}">`);
    expect(first).toContain(`<style nonce="${nonce}">`);
    expect(second).not.toContain(`nonce-${nonce}`);
    expect(first).toContain("default-src 'none'");
    const view = render();
    expect(view.sent).toEqual([{ type: "ready" }]);
    expect(view.get<HTMLTextAreaElement>("prompt").disabled).toBe(true);
    expect(view.errors).toEqual([]);
  });

  it("sends a prompt once, retains exact whitespace, and waits for host acknowledgement", () => {
    const view = render();
    view.state();
    const input = view.get<HTMLTextAreaElement>("prompt");
    input.value = "  Help with this\nform  ";
    input.dispatchEvent(new view.dom.window.Event("input"));
    view
      .get("composer")
      .dispatchEvent(new view.dom.window.Event("submit", { cancelable: true }));
    view
      .get("composer")
      .dispatchEvent(new view.dom.window.Event("submit", { cancelable: true }));
    expect(view.sent.filter((x) => x.type === "prompt")).toEqual([
      { type: "prompt", text: "  Help with this\nform  " },
    ]);
    expect(input.value).toBe("");
    expect(input.disabled).toBe(true);
    expect(view.get("cancel").hidden).toBe(false);
    view.get("cancel").click();
    expect(view.sent.at(-1)).toEqual({ type: "cancel" });
    view.state({ status: "cancelling" });
    expect(view.get<HTMLButtonElement>("cancel").disabled).toBe(true);
    view.state();
    expect(input.disabled).toBe(false);
    expect(view.errors).toEqual([]);
  });

  it("renders agent text literally and coalesces whitespace-only streaming chunks", () => {
    const view = render();
    view.receive({ type: "user", text: "Explain the code" });
    for (const text of [
      "<execute_command>do not run</execute_command>",
      " ",
      "<img src='https://example.invalid/steal' onerror='window.pwned=1'>",
      "\nnext",
    ])
      view.update({
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text },
      });
    expect(view.document.querySelectorAll(".assistant")).toHaveLength(1);
    expect(
      view.document.querySelector(".assistant .text")?.textContent,
    ).toContain("</execute_command> <img");
    expect(view.document.querySelector(".user .text")?.textContent).toBe(
      "Explain the code",
    );
    expect(
      view.document.querySelectorAll("img,a,execute_command"),
    ).toHaveLength(0);
    expect(view.errors).toEqual([]);
  });

  it("keeps provider thoughts separate and preserves a manually collapsed disclosure", () => {
    const view = render();
    view.update({
      sessionUpdate: "agent_thought_chunk",
      content: { type: "text", text: "Checking the form" },
    });
    const disclosure = view.document.querySelector(
      ".thought details",
    ) as HTMLDetailsElement;
    expect(disclosure.open).toBe(true);
    disclosure.open = false;
    view.update({
      sessionUpdate: "agent_thought_chunk",
      content: { type: "text", text: " and handler" },
    });
    expect(disclosure.open).toBe(false);
    expect(view.document.querySelector(".thought .text")?.textContent).toBe(
      "Checking the form and handler",
    );
    view.update({
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "Found the cause." },
    });
    expect(view.document.querySelectorAll(".entry")).toHaveLength(2);
  });

  it("patches a keyed tool row without losing details and never applies its diff", () => {
    const view = render();
    view.update({
      sessionUpdate: "tool_call",
      toolCallId: "tool-1",
      title: "Edit file",
      kind: "edit",
      status: "pending",
      rawInput: { path: "/project/test.ts" },
      content: [
        {
          type: "diff",
          path: "/project/test.ts",
          oldText: "old",
          newText: "new",
        },
      ],
    });
    view.update({
      sessionUpdate: "tool_call_update",
      toolCallId: "tool-1",
      status: "completed",
      rawInput: null,
    });
    expect(view.document.querySelectorAll(".tool")).toHaveLength(1);
    expect(
      view.document.querySelector(".tool")?.getAttribute("data-status"),
    ).toBe("completed");
    const text = view.document.querySelector(".tool pre")?.textContent;
    expect(text).toContain('"path": "/project/test.ts"');
    expect(text).toContain("Before:\nold\nAfter:\nnew");
    expect(view.sent).toEqual([{ type: "ready" }]);
  });

  it("shows session capabilities, dispatches native actions, and updates the plan in place", () => {
    const view = render();
    view.state({
      loadSession: true,
      authMethods: [{ id: "browser", name: "Login" }],
      modes: {
        currentModeId: "ask",
        availableModes: [
          { id: "ask", name: "Ask" },
          { id: "code", name: "Code" },
        ],
      },
    });
    expect(view.get("setMode").textContent).toBe("Mode: Ask");
    for (const id of ["resume", "authenticate", "newSession", "setMode"])
      view.get(id).click();
    expect(view.sent.slice(-4).map((x) => x.type)).toEqual([
      "resume",
      "authenticate",
      "newSession",
      "setMode",
    ]);
    view.update({
      sessionUpdate: "current_mode_update",
      currentModeId: "code",
    });
    expect(view.get("setMode").textContent).toBe("Mode: Code");
    view.update({
      sessionUpdate: "plan",
      entries: [{ content: "Inspect", status: "in_progress" }],
    });
    view.update({
      sessionUpdate: "plan",
      entries: [
        { content: "Inspect", status: "completed" },
        { content: "Verify", status: "pending" },
      ],
    });
    expect(view.document.querySelectorAll(".plan")).toHaveLength(1);
    expect(view.document.querySelectorAll(".plan li")).toHaveLength(2);
    view.state({
      status: "error",
      authMethods: [{ id: "browser", name: "Login" }],
      error: "Sign in to this agent",
    });
    expect(view.get<HTMLButtonElement>("authenticate").disabled).toBe(false);
    expect(view.get("error").textContent).toBe("Sign in to this agent");
  });

  it("renders resources inertly, reveals hidden controls, bounds output, and resets", () => {
    const view = render();
    view.update({
      sessionUpdate: "agent_message_chunk",
      content: {
        type: "resource_link",
        name: "Hidden\u202Efile",
        uri: "file:///outside/secret",
      },
    });
    expect(
      view.document.querySelector(".assistant .text")?.textContent,
    ).toContain("[U+202E]");
    expect(
      view.document.querySelector(".assistant .text")?.textContent,
    ).toContain("file:///outside/secret");
    view.update({
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "x".repeat(200000) },
    });
    expect(
      view.document.querySelector(".assistant .text")!.textContent!.length,
    ).toBeLessThan(121000);
    expect(view.get("retention").hidden).toBe(false);
    for (let i = 0; i < 270; i++)
      view.receive({ type: "notice", text: "Notice " + i });
    expect(view.document.querySelectorAll(".entry").length).toBeLessThanOrEqual(
      250,
    );
    view.receive({ type: "reset" });
    expect(view.document.querySelectorAll(".entry")).toHaveLength(0);
    expect(view.get("empty").hidden).toBe(false);
    expect(view.get("retention").hidden).toBe(true);
    expect(view.errors).toEqual([]);
  });
});
