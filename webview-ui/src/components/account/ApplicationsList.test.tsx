import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import ApplicationsList, {
  getApplicationDeployUrl,
  getApplicationOpenUrl,
} from "./ApplicationsList";

const mockRefetch = vi.fn();
const mockUseGetApplicationsQuery = vi.fn();
const mockGenerateApplication = vi.fn();
const mockPostMessage = vi.fn();
let mockExtensionState: Record<string, unknown>;
let mockAclAccess: {
  permissions: unknown;
  isOwner: boolean;
  isAdmin: boolean;
};

vi.mock("../../redux/services/ApplicationService", () => ({
  useGetApplicationsQuery: (...args: any[]) =>
    mockUseGetApplicationsQuery(...args),
  useGenerateApplicationMutation: () => [
    mockGenerateApplication,
    { isLoading: false },
  ],
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
    mockGenerateApplication.mockReset();
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

  it("fails closed when ACL permissions are not an array", () => {
    mockExtensionState = {
      authenticatedUser: { id: "collaborator-1" },
      jwtToken: "token",
    };
    mockAclAccess = {
      permissions: { WRITE: true },
      isOwner: false,
      isAdmin: false,
    };
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
      screen.queryByRole("button", { name: "Open Blueprint" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Publish source" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the generation checklist open with the transport failure", async () => {
    mockUseGetApplicationsQuery.mockReturnValue({
      data: [
        {
          id: "app-1",
          name: "Sample App",
          status: "ready",
        },
      ],
      error: undefined,
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    });
    mockGenerateApplication.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: "TIMEOUT_ERROR",
        error: "ThorAPI request timed out after 600000 ms.",
      }),
    });

    render(<ApplicationsList />);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    expect(
      await screen.findByRole("alert", {
        name: "Application generation failed",
      }),
    ).toHaveTextContent("ThorAPI request timed out after 600000 ms.");
    expect(screen.getByText("Receiving Application")).toBeInTheDocument();
    expect(screen.getByText("Processing Data")).toBeInTheDocument();
    expect(screen.getByText("Extracting Files")).toBeInTheDocument();
    expect(screen.getByText("Finalizing Setup")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
  });

  it("keeps extension extraction failures visible after the archive arrives", async () => {
    mockUseGetApplicationsQuery.mockReturnValue({
      data: [
        {
          id: "app-1",
          name: "Sample App",
          status: "ready",
        },
      ],
      error: undefined,
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    });
    mockGenerateApplication.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        filename: "sample.zip",
        mimeType: "application/zip",
        blob: {
          type: "application/zip",
          arrayBuffer: vi
            .fn()
            .mockResolvedValue(new TextEncoder().encode("zip-data").buffer),
        },
      }),
    });

    render(<ApplicationsList />);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() =>
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "streamToThorapi",
          applicationId: "app-1",
          filename: "sample.zip",
        }),
      ),
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "streamToThorapiResult",
            streamToThorapiResult: {
              success: false,
              applicationId: "app-1",
              error: "Failed to extract archive: invalid central directory",
              step: "error",
            },
          },
        }),
      );
    });

    expect(
      await screen.findByRole("alert", {
        name: "Application generation failed",
      }),
    ).toHaveTextContent("Failed to extract archive: invalid central directory");
    expect(screen.getByText("Extracting Files")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
  });
});
