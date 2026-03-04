import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OptionsButtons } from "./OptionsButtons";

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
});
