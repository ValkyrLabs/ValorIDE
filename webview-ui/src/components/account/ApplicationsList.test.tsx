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
import { loadApplicationPages } from "../../redux/services/applicationPaging";

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

  it("renders the same owned production Clipping draft fetched from page two", async () => {
    const ownerId = "0c339b19-a9eb-475a-8501-0c272c0c2f0b";
    const clipping = {
      id: "4b2a4dc5-e9f6-45c4-aaaa-0bb187ee386c",
      name: "John Social Video Clipping",
      ownerId,
      status: "disabled",
    };
    const read = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 20 }, (_, i) => ({
          id: `first-${i}`,
          name: `Shared ${i}`,
        })),
      })
      .mockResolvedValueOnce({ data: [clipping] });
    const catalog = await loadApplicationPages(read);
    mockExtensionState = {
      authenticatedUser: { id: ownerId },
      jwtToken: "not-a-cache-key",
    };
    mockAclAccess = { permissions: [], isOwner: true, isAdmin: false };
    mockUseGetApplicationsQuery.mockReturnValue({
      ...catalog,
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    });
    render(<ApplicationsList />);
    expect(screen.getByText("John Social Video Clipping")).toBeInTheDocument();
    expect(read).toHaveBeenCalledTimes(2);
    const scope = mockUseGetApplicationsQuery.mock.calls[0][0];
    expect(scope).toContain(ownerId);
    expect(scope).not.toContain("not-a-cache-key");
  });

  it("changes its catalog cache key when the signed-in owner changes", () => {
    mockUseGetApplicationsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    });
    mockExtensionState = {
      authenticatedUser: { id: "owner-one" },
      jwtToken: "first-token",
    };
    const view = render(<ApplicationsList />);
    const first = mockUseGetApplicationsQuery.mock.calls.at(-1)?.[0];
    mockExtensionState = {
      authenticatedUser: { id: "owner-two" },
      jwtToken: "second-token",
    };
    view.rerender(<ApplicationsList />);
    const second = mockUseGetApplicationsQuery.mock.calls.at(-1)?.[0];
    expect(first).not.toEqual(second);
    expect(second).toContain("owner-two");
    expect(second).not.toContain("second-token");
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

    render(<ApplicationsList />);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    const request = mockPostMessage.mock.calls.at(-1)![0];
    act(() =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "streamToThorapiResult",
            streamToThorapiResult: {
              applicationId: "app-1",
              requestId: request.requestId,
              success: false,
              step: "error",
              error: "ThorAPI request timed out after 600000 ms.",
            },
          },
        }),
      ),
    );

    expect(
      await screen.findByRole("alert", {
        name: "Application generation failed",
      }),
    ).toHaveTextContent("ThorAPI request timed out after 600000 ms.");
    expect(screen.getByText("Generate application")).toBeInTheDocument();
    expect(screen.getByText("Check archive")).toBeInTheDocument();
    expect(screen.getByText("Extract project")).toBeInTheDocument();
    expect(screen.getByText("Prepare workspace")).toBeInTheDocument();
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

    render(<ApplicationsList />);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() =>
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "generateApplicationArtifact",
          applicationId: "app-1",
          requestId: expect.any(String),
        }),
      ),
    );

    const request = mockPostMessage.mock.calls.at(-1)![0];
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "streamToThorapiResult",
            streamToThorapiResult: {
              success: false,
              applicationId: "app-1",
              requestId: request.requestId,
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
    expect(screen.getByText("Extract project")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled(),
    );
  });
  const generationResult = (request: any, overrides: any = {}) => {
    act(() =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "streamToThorapiResult",
            streamToThorapiResult: {
              applicationId: request.applicationId,
              requestId: request.requestId,
              success: true,
              step: "completed",
              ...overrides,
            },
          },
        }),
      ),
    );
  };

  const prepareGeneration = () => {
    mockUseGetApplicationsQuery.mockReturnValue({
      data: [{ id: "app-1", name: "Sample App", status: "ready" }],
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    });
    const rendered = render(<ApplicationsList />);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    return { ...rendered, request: mockPostMessage.mock.calls.at(-1)![0] };
  };

  it("shows a completion error even when the result also reports success", async () => {
    const { request } = prepareGeneration();
    generationResult(request, { error: "Generated archive failed validation" });
    expect(
      screen.getByRole("alert", { name: "Application generation failed" }),
    ).toHaveTextContent("Generated archive failed validation");
    expect(
      screen.queryByText(/generated successfully/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Generation completed successfully/i),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled(),
    );
  });

  it("sends only references to the host and prevents duplicate paid requests", () => {
    const { request } = prepareGeneration();
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    expect(mockGenerateApplication).not.toHaveBeenCalled();
    expect(request).toEqual({
      type: "generateApplicationArtifact",
      applicationId: "app-1",
      applicationName: "Sample App",
      requestId: expect.any(String),
    });
  });

  it("ignores unrelated and late results after retry", async () => {
    const { request } = prepareGeneration();
    generationResult({ ...request, requestId: "unrelated" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled(),
    );
    generationResult(request, {
      success: false,
      step: "error",
      error: "Service unavailable",
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    const retry = mockPostMessage.mock.calls.at(-1)![0];
    expect(retry.requestId).not.toBe(request.requestId);
    generationResult(request);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled(),
    );
    generationResult(retry, {
      success: false,
      step: "error",
      error: "Retry failed",
    });
    expect(
      screen.getByRole("alert", { name: "Application generation failed" }),
    ).toHaveTextContent("Retry failed");
  });

  it("discards an old account's generation progress", () => {
    const { request, rerender } = prepareGeneration();
    mockExtensionState = {
      ...mockExtensionState,
      authenticatedPrincipal: {
        id: "different-user",
        organizationId: "another-org",
      },
    };
    rerender(<ApplicationsList />);
    generationResult(request, {
      success: false,
      step: "error",
      error: "Old account error",
    });
    expect(screen.queryByText("Old account error")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
  });
});
