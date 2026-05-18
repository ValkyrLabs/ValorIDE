import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OptionsButtons } from "./OptionsButtons";
describe("OptionsButtons", () => {
  it("sends the selection immediately when onSelectOption is provided", () => {
    const onSelectOption = vi.fn();
    render(
      _jsx(OptionsButtons, {
        options: ["Yes"],
        selected: undefined,
        isActive: true,
        inputValue: "",
        onSelectOption: onSelectOption,
      }),
    );
    fireEvent.click(screen.getByText("Yes"));
    expect(onSelectOption).toHaveBeenCalledWith("Yes");
  });
});
//# sourceMappingURL=OptionsButtons.test.js.map
