import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TabButton, TabList } from "./TabList";

afterEach(cleanup);

const Example = () => {
  const [active, setActive] = useState("models");
  return <>
    <TabList aria-label="Settings sections">
      {["models", "disabled", "backend", "browser"].map(key => <TabButton key={key}
        id={`test-tab-${key}`} aria-controls="test-panel" isActive={key === active}
        disabled={key === "disabled"} onClick={() => setActive(key)}>{key}</TabButton>)}
    </TabList>
    <div role="tabpanel" id="test-panel" aria-labelledby={`test-tab-${active}`}>{active} contents</div>
  </>;
};

describe("shared operational tab navigation", () => {
  it("keeps one active tab stop and names the selected panel", () => {
    render(<Example />);
    expect(screen.getByRole("tab", { name: "models" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "backend" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tabpanel", { name: "models" })).toHaveTextContent("models contents");
  });
  it("skips disabled tabs and updates focus, selection and panel together", () => {
    render(<Example />);
    const models = screen.getByRole("tab", { name: "models" }); models.focus();
    fireEvent.keyDown(models, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "backend" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "backend" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "backend" })).toHaveTextContent("backend contents");
    expect(models).toHaveAttribute("tabindex", "-1");
  });
  it("supports wraparound and Home/End over repeated navigation", () => {
    render(<Example />);
    screen.getByRole("tab", { name: "models" }).focus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "browser" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(screen.getByRole("tab", { name: "models" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(screen.getByRole("tab", { name: "browser" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "models" })).toHaveFocus();
  });
  it("does not consume Tab or Escape and keeps nested tab groups independent", () => {
    const changes: string[] = [];
    render(<TabList aria-label="outer">
      <TabButton isActive onClick={() => changes.push("outer")}>outer tab</TabButton>
      <TabList aria-label="inner">
        <TabButton isActive onClick={() => changes.push("first")}>first</TabButton>
        <TabButton isActive={false} onClick={() => changes.push("second")}>second</TabButton>
      </TabList>
    </TabList>);
    const first = screen.getByRole("tab", { name: "first" }); first.focus();
    expect(fireEvent.keyDown(first, { key: "Tab" })).toBe(true);
    expect(fireEvent.keyDown(first, { key: "Escape" })).toBe(true);
    expect(changes).toEqual([]);
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(changes).toEqual(["second"]);
    expect(screen.getByRole("tab", { name: "second" })).toHaveFocus();
  });
});
