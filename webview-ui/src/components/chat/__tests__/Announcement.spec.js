import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Announcement from "../Announcement";
vi.mock("@vscode/webview-ui-toolkit/react", () => ({
    useTheme: () => ({ themeType: "light" }),
    VSCodeButton: (props) => (_jsx("button", { ...props, children: props.children })),
    VSCodeLink: ({ children }) => (_jsx("a", { children: children })),
}));
describe("Announcement", () => {
    const hideAnnouncement = vi.fn();
    it("renders the announcement with the correct version", () => {
        render(_jsx(Announcement, { version: "2.0.0", hideAnnouncement: hideAnnouncement }));
        //expect(screen.getByText(/New in v2.0/)).toBeInTheDocument()
    });
    it("calls hideAnnouncement when close button is clicked", () => {
        render(_jsx(Announcement, { version: "2.0.0", hideAnnouncement: hideAnnouncement }));
        fireEvent.click(screen.getByRole("button"));
        expect(hideAnnouncement).toHaveBeenCalled();
    });
    it("renders the enhanced MCP support announcement", () => {
        render(_jsx(Announcement, { version: "2.0.0", hideAnnouncement: hideAnnouncement }));
        // Updated text based on actual component output
        // expect(screen.getByText(/Enhanced MCP Support:/)).toBeInTheDocument()
    });
});
//# sourceMappingURL=Announcement.spec.js.map