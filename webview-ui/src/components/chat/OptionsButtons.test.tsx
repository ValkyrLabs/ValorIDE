import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OptionsButtons } from "./OptionsButtons";

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: { postMessage: vi.fn(), isAvailable: () => false },
}));

describe("OptionsButtons", () => {
  it("sends the selection immediately when onSelectOption is provided", () => {
    const onSelectOption = vi.fn();

    render(
      <OptionsButtons
        options={["Yes"]}
        selected={undefined}
        isActive
        inputValue=""
        onSelectOption={onSelectOption}
      />,
    );

    fireEvent.click(screen.getByText("Yes"));

    expect(onSelectOption).toHaveBeenCalledWith("Yes");
  });

  it("renders selectable Sage-style option cards", () => {
    const onSelectOption = vi.fn();

    render(
      <OptionsButtons
        options={[
          {
            command: "/new secure-intake",
            label: "Generate Secure Intake",
            description: "Create the app bundle and hand it to ValorIDE.",
            value: "Generate Secure Intake",
          },
        ]}
        isActive
        onSelectOption={onSelectOption}
      />,
    );

    expect(screen.getByText("/new secure-intake")).toBeInTheDocument();
    expect(screen.getByText("Generate Secure Intake")).toBeInTheDocument();
    expect(
      screen.getByText("Create the app bundle and hand it to ValorIDE."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Generate Secure Intake"));

    expect(onSelectOption).toHaveBeenCalledWith("Generate Secure Intake");
  });

  it("normalizes object-map options into selectable cards", () => {
    const onSelectOption = vi.fn();

    render(
      <OptionsButtons
        options={{
          approve: {
            label: "Approve",
            description: "Run the requested tool.",
          },
          revise: "Revise the plan",
        }}
        isActive
        onSelectOption={onSelectOption}
      />,
    );

    fireEvent.click(screen.getByText("Approve"));
    fireEvent.click(screen.getByText("revise"));

    expect(onSelectOption).toHaveBeenNthCalledWith(1, "approve");
    expect(onSelectOption).toHaveBeenNthCalledWith(2, "Revise the plan");
  });
});
