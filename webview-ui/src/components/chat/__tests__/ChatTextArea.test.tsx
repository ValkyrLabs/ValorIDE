import React, { useEffect, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseExtensionState = vi.fn();
const mockUseMetaKeyDetection = vi.fn();
const mockUseShortcut = vi.fn();
const mockUseWindowSize = vi.fn();

vi.mock("@thorapi/context/ExtensionStateContext", () => ({
  useExtensionState: () => mockUseExtensionState(),
}));

vi.mock("@thorapi/utils/hooks", () => ({
  useMetaKeyDetection: (...args: unknown[]) => mockUseMetaKeyDetection(...args),
  useShortcut: (...args: unknown[]) => mockUseShortcut(...args),
}));

vi.mock("react-use", () => ({
  useClickAway: vi.fn(),
  useEvent: vi.fn(),
  useWindowSize: (...args: unknown[]) => mockUseWindowSize(...args),
}));

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

vi.mock("@thorapi/utils/validate", () => ({
  validateApiConfiguration: vi.fn(() => false),
  validateModelId: vi.fn(() => false),
}));

vi.mock("@thorapi/utils/context-mentions", () => ({
  ContextMenuOptionType: {
    Git: "Git",
    File: "File",
    Folder: "Folder",
    URL: "URL",
    Problems: "Problems",
    Terminal: "Terminal",
    NoResults: "NoResults",
  },
  getContextMenuOptions: vi.fn(() => []),
  insertMention: vi.fn((value: string) => ({
    newValue: value,
    mentionIndex: 0,
  })),
  insertMentionDirectly: vi.fn((value: string) => ({
    newValue: value,
    mentionIndex: 0,
  })),
  removeMention: vi.fn((value: string) => ({
    newText: value,
    newPosition: 0,
  })),
  shouldShowContextMenu: vi.fn(() => false),
}));

vi.mock("@thorapi/utils/slash-commands", () => ({
  SlashCommand: {},
  slashCommandDeleteRegex: /.^/,
  shouldShowSlashCommandsMenu: vi.fn(() => false),
  getMatchingSlashCommands: vi.fn(() => []),
  insertSlashCommand: vi.fn((value: string) => ({
    newValue: value,
    commandIndex: 0,
  })),
  removeSlashCommand: vi.fn((value: string) => ({
    newText: value,
    newPosition: 0,
  })),
  validateSlashCommand: vi.fn(() => false),
}));

vi.mock("@thorapi/components/chat/ChatView", () => ({
  MAX_IMAGES_PER_MESSAGE: 20,
}));

vi.mock("@thorapi/components/chat/ContextMenu", () => ({
  default: () => null,
}));

vi.mock("@thorapi/components/chat/SlashCommandMenu", () => ({
  default: () => null,
}));

vi.mock("@thorapi/components/common/Thumbnails", () => ({
  default: () => null,
}));

vi.mock("@thorapi/components/common/Tooltip", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@thorapi/components/settings/ApiOptions", () => ({
  default: () => null,
  normalizeApiConfiguration: () => ({
    selectedProvider: "valoride",
    selectedModelId: "test-model",
  }),
}));

vi.mock("@thorapi/components/common/CodeBlock", () => ({
  CODE_BLOCK_BG_COLOR: "#111111",
}));

vi.mock("../ServersToggleModal", () => ({
  default: () => null,
}));

vi.mock("../valoride-rules/ValorIDERulesToggleModal", () => ({
  default: () => null,
}));

vi.mock("../CoolButton", () => ({
  default: () => null,
}));

vi.mock("@vscode/webview-ui-toolkit/react", () => ({
  VSCodeButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{props.children}</button>
  ),
}));

vi.mock("@thorapi/components/chat/GlowingTextArea", () => ({
  default: React.forwardRef<HTMLTextAreaElement, any>((props, ref) => (
    <textarea ref={ref} {...props} />
  )),
}));

import ChatTextArea from "../ChatTextArea";

class MockFileReader {
  result: string | ArrayBuffer | null = null;
  error: DOMException | null = null;
  onloadend: null | ((this: FileReader, ev: ProgressEvent<FileReader>) => any) =
    null;

  readAsDataURL() {
    this.result = "data:image/png;base64,ZmFrZS1pbWFnZS1kYXRh";
    setTimeout(() => {
      this.onloadend?.call(this as any, new ProgressEvent("loadend") as any);
    }, 0);
  }
}

describe("ChatTextArea drag and drop", () => {
  beforeEach(() => {
    mockUseExtensionState.mockReturnValue({
      filePaths: [],
      chatSettings: { mode: "act", stubbornMode: false },
      apiConfiguration: {},
      openRouterModels: [],
      platform: "web",
      valorideMessages: [],
    });
    mockUseMetaKeyDetection.mockReturnValue([false, "Ctrl"]);
    mockUseShortcut.mockReturnValue(undefined);
    mockUseWindowSize.mockReturnValue({ width: 1280, height: 800 });

    (globalThis as any).FileReader = MockFileReader;
  });

  it("adds dropped image files to the selected images list", async () => {
    const Wrapper = () => {
      const [inputValue, setInputValue] = useState("");
      const [selectedImages, setSelectedImages] = useState<string[]>([]);

      useEffect(() => {
        // no-op; keeps wrapper state mounted for assertions
      }, []);

      return (
        <div>
          <ChatTextArea
            inputValue={inputValue}
            setInputValue={setInputValue}
            textAreaDisabled={false}
            placeholderText="Type a message..."
            selectedImages={selectedImages}
            setSelectedImages={setSelectedImages}
            onSend={vi.fn()}
            onSelectImages={vi.fn()}
            shouldDisableImages={false}
          />
          <div data-testid="selected-images">{selectedImages.join("|")}</div>
        </div>
      );
    };

    render(<Wrapper />);

    const imageFile = new File(["fake-image"], "drop.png", {
      type: "image/png",
    });

    fireEvent.drop(screen.getByTestId("chat-textarea-dropzone"), {
      dataTransfer: {
        files: [imageFile],
        items: [],
        getData: () => "",
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("selected-images").textContent).toContain(
        "data:image/png;base64,ZmFrZS1pbWFnZS1kYXRh",
      );
    });
  });
});