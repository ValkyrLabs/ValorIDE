const mockGetToken = jest.fn();
const mockRequest = jest.fn();
const mockGetBase = jest.fn();
const mockExecuteCommand = jest.fn();
const mockCommands = new Map<string, (...args: any[]) => Promise<unknown>>();
const mockReceive = jest.fn(
  (_callback: (message: unknown) => Promise<void>) => undefined,
);
const mockPanel = {
  webview: {
    html: "",
    onDidReceiveMessage: mockReceive,
    postMessage: jest.fn(),
  },
};
jest.mock("vscode", () => ({
  TreeItem: class {},
  EventEmitter: class {
    event = jest.fn();
    fire = jest.fn();
  },
  ProgressLocation: { Notification: 1 },
  ViewColumn: { One: 1 },
  window: {
    createTreeView: () => ({ dispose: jest.fn() }),
    withProgress: (_options: unknown, run: () => Promise<void>) => run(),
    createWebviewPanel: () => mockPanel,
    showErrorMessage: jest.fn(),
  },
  commands: {
    executeCommand: (...args: unknown[]) => mockExecuteCommand(...args),
    registerCommand: (
      name: string,
      run: (...args: any[]) => Promise<unknown>,
    ) => {
      mockCommands.set(name, run);
      return { dispose: jest.fn() };
    },
  },
}));
jest.mock("../../services/auth/TokenStorageService", () => ({
  TokenStorageService: { getInstance: () => ({ getJwtToken: mockGetToken }) },
}));
jest.mock("../../services/valkyrai/ValkyrLabsRtkApi", () => ({
  getValkyrLabsRtkApiClient: () => ({ request: mockRequest }),
}));
jest.mock("../../utils/serverValkyraiHost", () => ({
  getValkyraiBasePath: () => mockGetBase(),
}));
import {
  WorkflowEngineeringClient,
  registerWorkflowProjects,
} from "./WorkflowProjectProvider";
import { openWorkflowStudioTarget } from "./workflowStudioNavigation";

const backend = "https://api-0.valkyrlabs.com/v1";
const workflowId = "4d7b1763-71e6-4e8e-a1ee-b3cc39d6c671";
describe("authenticated Workflow Studio handoff", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockCommands.clear();
    mockGetToken.mockResolvedValue("canonical-session");
    mockGetBase.mockReturnValue(backend);
    mockRequest.mockResolvedValue({ data: { ticket: "opaque-ticket" } });
  });
  const client = () => new WorkflowEngineeringClient({} as any);
  it("binds an exact execution into the ticket request, launch and secure retry", async () => {
    const executionId = "6b5f4311-bf51-448a-83c8-e391c435314e";
    mockRequest.mockResolvedValue({
      data: { ticket: "opaque-ticket", executionId },
    });
    registerWorkflowProjects(
      { subscriptions: [] } as any,
      { appendLine: jest.fn() } as any,
    );
    mockExecuteCommand.mockImplementation(async (name, target) =>
      mockCommands.get(name)!(target),
    );
    await openWorkflowStudioTarget({ workflowId, backend, executionId });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ json: { workflowId, executionId } }),
    );
    expect(mockPanel.webview.html).toContain(`executionId=${executionId}`);
    mockRequest.mockClear();
    await mockReceive.mock.calls[0][0]({
      type: "valoride.workflowStudio.retry",
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ json: { workflowId, executionId } }),
    );
  });
  it("never silently opens a definition when the server fails to bind the requested run", async () => {
    const executionId = "6b5f4311-bf51-448a-83c8-e391c435314e";
    for (const returnedId of [undefined, workflowId]) {
      mockRequest.mockResolvedValue({
        data: { ticket: "opaque-ticket", executionId: returnedId },
      });
      await expect(
        client().createStudioHandoff(workflowId, backend, executionId),
      ).rejects.toThrow(/exact run/);
    }
    mockRequest.mockClear();
    await expect(
      client().createStudioHandoff(workflowId, backend, "../run"),
    ).rejects.toThrow(/execution reference/);
    expect(mockRequest).not.toHaveBeenCalled();
  });
  it("normalizes equivalent UUID casing before requesting and opening an exact run", async () => {
    const executionId = "6b5f4311-bf51-448a-83c8-e391c435314e";
    mockRequest.mockResolvedValue({
      data: { ticket: "opaque-ticket", executionId },
    });
    const url = await client().createStudioHandoff(
      workflowId.toUpperCase(),
      backend,
      executionId.toUpperCase(),
    );
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ json: { workflowId, executionId } }),
    );
    expect(new URL(url).searchParams.get("executionId")).toBe(executionId);
  });
  it("opens a real registered Studio handoff and keeps its retry on the original backend", async () => {
    registerWorkflowProjects(
      { subscriptions: [] } as any,
      { appendLine: jest.fn() } as any,
    );
    mockExecuteCommand.mockImplementation(async (name, target) =>
      mockCommands.get(name)!(target),
    );
    await openWorkflowStudioTarget({ workflowId, backend });
    expect(mockPanel.webview.html).toContain(workflowId);
    expect(mockPanel.webview.html).toContain("opaque-ticket");
    expect(mockPanel.webview.html).not.toContain("canonical-session");
    mockRequest.mockClear();
    mockGetBase.mockReturnValue("https://other.example/v1");
    await mockReceive.mock.calls[0][0]({
      type: "valoride.workflowStudio.retry",
    });
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
      type: "valoride.workflowStudio.retryFailed",
      message: expect.stringMatching(/backend/i),
    });
  });
  it("routes a validated webview target only through the existing Studio command", async () => {
    await openWorkflowStudioTarget({ workflowId, backend });
    expect(mockExecuteCommand).toHaveBeenCalledWith(
      "valoride.workflows.openStudio",
      { id: workflowId, backend },
    );
    expect(mockRequest).not.toHaveBeenCalled();
    mockExecuteCommand.mockClear();
    for (const target of [
      { workflowId, backend: "https://other.example/v1" },
      { workflowId: "../secret", backend },
      { workflowId, backend, url: "https://other.example" },
      undefined,
    ]) {
      await expect(openWorkflowStudioTarget(target)).rejects.toThrow();
    }
    expect(mockExecuteCommand).not.toHaveBeenCalled();
  });
  it("uses the existing fresh canonical session and sends only the workflow identity", async () => {
    const url = await client().createStudioHandoff(workflowId, backend);
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith({
      url: backend + "/auth/valoride/webview-ticket",
      method: "POST",
      json: { workflowId },
      headers: {
        Authorization: "Bearer canonical-session",
        jwtSession: "canonical-session",
      },
    });
    expect(new URL(url).searchParams.get("workflowId")).toBe(workflowId);
    expect(new URL(url).searchParams.get("ticket")).toBe("opaque-ticket");
    expect(url).not.toContain("canonical-session");
  });
  it("does not request a ticket for a stale card or malformed workflow reference", async () => {
    await expect(
      client().createStudioHandoff(workflowId, "https://other.example/v1"),
    ).rejects.toThrow(/backend/i);
    await expect(
      client().createStudioHandoff("../secret", backend),
    ).rejects.toThrow(/workflow/i);
    expect(mockRequest).not.toHaveBeenCalled();
  });
  it("rejects a backend change while awaiting authentication before transporting credentials", async () => {
    mockGetToken.mockImplementation(async () => {
      mockGetBase.mockReturnValue("https://other.example/v1");
      return "canonical-session";
    });
    await expect(
      client().createStudioHandoff(workflowId, backend),
    ).rejects.toThrow(/backend/i);
    expect(mockRequest).not.toHaveBeenCalled();
  });
  it("does not launch a ticket if the backend or session changes during its request", async () => {
    for (const change of ["backend", "session"]) {
      mockGetBase.mockReturnValue(backend);
      mockGetToken.mockResolvedValue("canonical-session");
      mockRequest.mockImplementation(async () => {
        if (change === "backend")
          mockGetBase.mockReturnValue("https://other.example/v1");
        else mockGetToken.mockResolvedValue("replacement-session");
        return { data: { ticket: "opaque-ticket" } };
      });
      await expect(
        client().createStudioHandoff(workflowId, backend),
      ).rejects.toThrow(/backend|session/i);
    }
  });
  it("preserves authentication failures and rejects malformed handoff receipts", async () => {
    mockGetToken.mockResolvedValue(undefined);
    await expect(
      client().createStudioHandoff(workflowId, backend),
    ).rejects.toThrow(/Sign in/);
    expect(mockRequest).not.toHaveBeenCalled();
    mockGetToken.mockResolvedValue("canonical-session");
    mockRequest.mockResolvedValue({ data: { ticket: { secret: "invalid" } } });
    await expect(
      client().createStudioHandoff(workflowId, backend),
    ).rejects.toThrow(/handoff/i);
  });
});
