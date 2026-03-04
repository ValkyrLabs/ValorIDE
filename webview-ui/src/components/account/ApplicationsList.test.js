import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ApplicationsList from "./ApplicationsList";
const mockRefetch = vi.fn();
const mockUseGetApplicationsQuery = vi.fn();
vi.mock("../../redux/services/ApplicationService", () => ({
    useGetApplicationsQuery: (...args) => mockUseGetApplicationsQuery(...args),
    useGenerateApplicationMutation: () => [vi.fn(), { isLoading: false }],
    useDeployApplicationMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock("../../context/ExtensionStateContext", () => ({
    useExtensionState: () => ({
        userInfo: null,
        jwtToken: null,
        authenticatedPrincipal: null,
    }),
}));
vi.mock("../../utils/vscode", () => ({
    vscode: { postMessage: vi.fn() },
}));
describe("ApplicationsList", () => {
    beforeEach(() => {
        mockRefetch.mockReset();
        mockUseGetApplicationsQuery.mockReset();
    });
    it("shows a refresh button that triggers refetch", () => {
        mockUseGetApplicationsQuery.mockReturnValue({
            data: [
                {
                    id: "app-1",
                    name: "Sample App",
                    description: "Demo app",
                    status: "ready",
                },
            ],
            error: undefined,
            isLoading: false,
            isFetching: false,
            refetch: mockRefetch,
        });
        render(_jsx(ApplicationsList, {}));
        const refreshButton = screen.getByRole("button", { name: /refresh/i });
        expect(refreshButton).toBeInTheDocument();
        fireEvent.click(refreshButton);
        expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
});
//# sourceMappingURL=ApplicationsList.test.js.map