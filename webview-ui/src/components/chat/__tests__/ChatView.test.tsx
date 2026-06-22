import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatView from "../ChatView";

const mockUseExtensionState = vi.fn();
const mockUseChatInputPersistence = vi.fn();
const mockUseWebSocketConnection = vi.fn();
const mockUsePeerCommunication = vi.fn();
const mockUseChatState = vi.fn();
const mockUseMessageHandling = vi.fn();
const mockUseGetBalanceResponsesQuery = vi.fn();

vi.mock("@thorapi/context/ExtensionStateContext", () => ({
  useExtensionState: () => mockUseExtensionState(),
}));

vi.mock("@thorapi/context/CommunicationServiceContext", () => ({
  useCommunicationService: () => ({}),
}));

vi.mock("@thorapi/redux/services/BalanceResponseService", () => ({
  useGetBalanceResponsesQuery: (...args: unknown[]) =>
    mockUseGetBalanceResponsesQuery(...args),
}));

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

vi.mock("@thorapi/utils/useSessionStorage", () => ({
  useChatInputPersistence: () => mockUseChatInputPersistence(),
}));

vi.mock("../hooks/useWebSocketConnection", () => ({
  useWebSocketConnection: (...args: unknown[]) =>
    mockUseWebSocketConnection(...args),
}));

vi.mock("../hooks/usePeerCommunication", () => ({
  usePeerCommunication: () => mockUsePeerCommunication(),
}));

vi.mock("../hooks/useChatState", () => ({
  useChatState: (...args: unknown[]) => mockUseChatState(...args),
}));

vi.mock("../hooks/useMessageHandling", () => ({
  useMessageHandling: (...args: unknown[]) => mockUseMessageHandling(...args),
}));

vi.mock("@thorapi/components/agentic/CapabilityCommandCenter", () => ({
  default: () => <div data-testid="capability-command-center" />,
}));

vi.mock("@thorapi/components/chat/WelcomeScreen", () => ({
  default: () => <div data-testid="welcome-screen" />,
}));

vi.mock("@thorapi/components/chat/TaskView", () => ({
  default: () => <div data-testid="task-view" />,
}));

vi.mock("@thorapi/components/chat/ChatTextArea", () => ({
  default: () => <div data-testid="chat-text-area" />,
}));

const renderChatView = () =>
  render(
    <ChatView
      hideAnnouncement={vi.fn()}
      isHidden={false}
      showAnnouncement={false}
      showHistoryView={vi.fn()}
    />,
  );

describe("ChatView", () => {
  beforeEach(() => {
    mockUseExtensionState.mockReset();
    mockUseChatInputPersistence.mockReset();
    mockUseWebSocketConnection.mockReset();
    mockUsePeerCommunication.mockReset();
    mockUseChatState.mockReset();
    mockUseMessageHandling.mockReset();
    mockUseGetBalanceResponsesQuery.mockReset();

    mockUseExtensionState.mockReturnValue({
      version: "0.0.0-test",
      valorideMessages: [],
      taskHistory: [],
      apiConfiguration: {},
      telemetrySetting: "enabled",
      chatSettings: {},
      jwtToken: undefined,
    });
    mockUseChatInputPersistence.mockReturnValue({
      inputValue: "",
      setInputValue: vi.fn(),
      selectedImages: [],
      setSelectedImages: vi.fn(),
      clearChatInput: vi.fn(),
    });
    mockUseWebSocketConnection.mockReturnValue({
      wsConnected: false,
      wsInstanceCount: 0,
      isConnectingMothership: false,
      ourSenderId: "local",
      pendingRemoteReplyRef: { current: false },
      broadcastLLMResponse: vi.fn(),
      connectToMothership: vi.fn(),
    });
    mockUsePeerCommunication.mockReturnValue({
      peerCount: 0,
      p2pOpen: false,
      isConnectingPeers: false,
      multipleInstances: false,
      handleRobotIconClick: vi.fn(),
      connectToPeers: vi.fn(),
    });
    mockUseChatState.mockReturnValue({
      valorideAsk: undefined,
      enableButtons: false,
      primaryButtonText: undefined,
      secondaryButtonText: undefined,
      textAreaDisabled: false,
      isChatLoading: false,
      lastMessage: undefined,
      handlePrimaryButtonClick: vi.fn(),
      handleSecondaryButtonClick: vi.fn(),
      handleCancelClick: vi.fn(),
      handleTaskCloseButtonClick: vi.fn(),
      setTextAreaDisabled: vi.fn(),
      setValorIDEAsk: vi.fn(),
      setEnableButtons: vi.fn(),
    });
    mockUseMessageHandling.mockReturnValue({
      handleSendMessage: vi.fn(),
    });
    mockUseGetBalanceResponsesQuery.mockReturnValue({ data: undefined });
  });

  it("shows the capability notifications on the home screen", () => {
    renderChatView();

    expect(screen.getByTestId("capability-command-center")).toBeInTheDocument();
    expect(screen.getByTestId("welcome-screen")).toBeInTheDocument();
  });

  it("hides the capability notifications while a task screen is active", () => {
    mockUseExtensionState.mockReturnValue({
      version: "0.0.0-test",
      valorideMessages: [
        {
          ts: Date.now(),
          type: "ask",
          ask: "followup",
          text: "continue",
        },
      ],
      taskHistory: [],
      apiConfiguration: {},
      telemetrySetting: "enabled",
      chatSettings: {},
      jwtToken: undefined,
    });

    renderChatView();

    expect(
      screen.queryByTestId("capability-command-center"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("task-view")).toBeInTheDocument();
  });
});
