import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ApplicationsList, { getApplicationOpenUrl } from "./ApplicationsList";

const mockRefetch = vi.fn();
const mockUseGetApplicationsQuery = vi.fn();

vi.mock("../../redux/services/ApplicationService", () => ({
  useGetApplicationsQuery: (...args: any[]) =>
    mockUseGetApplicationsQuery(...args),
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
    vi.unstubAllEnvs();
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

    render(<ApplicationsList />);

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    expect(refreshButton).toBeInTheDocument();
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    fireEvent.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalledTimes(2);
  });

  it("uses the hosted application detail URL instead of localhost", () => {
    vi.stubEnv("VITE_VALKYRAI_WEB_BASE_URL", "https://valkyrlabs.com");

    expect(getApplicationOpenUrl({ id: "app-1" } as any)).toBe(
      "https://valkyrlabs.com/application-detail/app-1",
    );
  });

  it("prefers API-provided application entrypoint URLs", () => {
    expect(
      getApplicationOpenUrl({
        id: "app-1",
        entrypointUrl: "https://api-0.valkyrlabs.com/v1/apps/app-1",
      } as any),
    ).toBe("https://api-0.valkyrlabs.com/v1/apps/app-1");
  });
});
