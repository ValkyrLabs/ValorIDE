import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ApplicationsList, {
  getApplicationDeployUrl,
  getApplicationOpenUrl,
} from "./ApplicationsList";

const mockRefetch = vi.fn();
const mockUseGetApplicationsQuery = vi.fn();
const mockPostMessage = vi.fn();
let mockExtensionState: Record<string, unknown>;
let mockAclAccess: {
  permissions: string[];
  isOwner: boolean;
  isAdmin: boolean;
};

vi.mock("../../redux/services/ApplicationService", () => ({
  useGetApplicationsQuery: (...args: any[]) =>
    mockUseGetApplicationsQuery(...args),
  useGenerateApplicationMutation: () => [vi.fn(), { isLoading: false }],
  useDeployApplicationMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("../../context/ExtensionStateContext", () => ({
  useExtensionState: () => mockExtensionState,
}));

vi.mock("../../redux/services/AclService", () => ({
  useGetObjectPermissionsQuery: () => ({ data: mockAclAccess }),
}));

vi.mock("../../utils/vscode", () => ({
  vscode: { postMessage: (...args: unknown[]) => mockPostMessage(...args) },
}));

describe("ApplicationsList", () => {
  beforeEach(() => {
    mockRefetch.mockReset();
    mockUseGetApplicationsQuery.mockReset();
    mockPostMessage.mockReset();
    mockExtensionState = {
      userInfo: null,
      jwtToken: null,
      authenticatedPrincipal: null,
      authenticatedUser: null,
    };
    mockAclAccess = { permissions: [], isOwner: false, isAdmin: false };
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

  it("always opens hosted application detail URLs instead of API entrypoints", () => {
    expect(
      getApplicationOpenUrl({
        id: "app-1",
        entrypointUrl: "https://api-0.valkyrlabs.com/v1/apps/app-1",
      } as any),
    ).toBe("https://valkyrlabs.com/application-detail/app-1");
  });

  it("builds hosted deploy URLs", () => {
    expect(getApplicationDeployUrl("app-1", "Sample App", "sample-app")).toBe(
      "https://valkyrlabs.com/dashboard?open=deployment&applicationId=app-1&applicationName=Sample+App&applicationSlug=sample-app",
    );
  });

  it("routes open and deploy actions through the editor browser", () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("button", { name: "Deploy" }));

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "openInBrowser",
      url: "https://valkyrlabs.com/application-detail/app-1",
    });
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "openInBrowser",
      url: "https://valkyrlabs.com/dashboard?open=deployment&applicationId=app-1&applicationName=Sample+App",
    });
  });

  it("opens an owned application in the Blueprint webview", () => {
    mockExtensionState = {
      authenticatedUser: { id: "owner-1" },
      jwtToken: "token",
    };
    mockUseGetApplicationsQuery.mockReturnValue({
      data: [
        {
          id: "app-1",
          ownerId: "owner-1",
          name: "Sample App",
          slug: "sample-app",
          status: "ready",
        },
      ],
      error: undefined,
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    });

    render(<ApplicationsList />);
    fireEvent.click(screen.getByRole("button", { name: "Open Blueprint" }));

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "openOpenAPIEditor",
      applicationId: "app-1",
      applicationName: "Sample App",
      deploymentUrl:
        "https://valkyrlabs.com/dashboard?open=deployment&applicationId=app-1&applicationName=Sample+App&applicationSlug=sample-app",
    });
  });

  it("publishes developer source for an owned application", () => {
    mockExtensionState = {
      authenticatedUser: { id: "owner-1" },
      jwtToken: "token",
    };
    mockUseGetApplicationsQuery.mockReturnValue({
      data: [
        {
          id: "app-1",
          ownerId: "owner-1",
          name: "Sample App",
          status: "ready",
        },
      ],
      error: undefined,
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    });

    render(<ApplicationsList />);
    fireEvent.click(screen.getByRole("button", { name: "Publish source" }));

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "publishApplicationSource",
      applicationId: "app-1",
      applicationName: "Sample App",
    });
    expect(
      screen.getByText("Preparing developer source..."),
    ).toBeInTheDocument();
  });

  it("allows an ACL write collaborator to publish source", () => {
    mockExtensionState = {
      authenticatedUser: { id: "collaborator-1" },
      jwtToken: "token",
    };
    mockAclAccess = { permissions: ["WRITE"], isOwner: false, isAdmin: false };
    mockUseGetApplicationsQuery.mockReturnValue({
      data: [
        {
          id: "app-1",
          ownerId: "owner-1",
          name: "Shared App",
          status: "ready",
        },
      ],
      error: undefined,
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    });

    render(<ApplicationsList />);

    expect(
      screen.getByRole("button", { name: "Publish source" }),
    ).toBeInTheDocument();
  });
});
