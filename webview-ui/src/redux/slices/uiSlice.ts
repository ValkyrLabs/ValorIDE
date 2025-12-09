import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ViewMode = "design" | "code" | "split" | "preview";
export type PanelType =
  | "paths"
  | "components"
  | "servers"
  | "security"
  | "info";

interface UiState {
  viewMode: ViewMode;
  activePanel: PanelType;
  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  splitPaneSize: number;
  showMinimap: boolean;
  showLineNumbers: boolean;
  wordWrap: boolean;
  fontSize: number;
  notifications: Notification[];
  isFullscreen: boolean;
  searchVisible: boolean;
  validationPanelVisible: boolean;
  shortcuts: Record<string, string>;
}

interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  timestamp: number;
  autoClose?: boolean;
}

const initialState: UiState = {
  viewMode: "design",
  activePanel: "paths",
  sidebarCollapsed: false,
  rightPanelCollapsed: false,
  splitPaneSize: 50,
  showMinimap: true,
  showLineNumbers: true,
  wordWrap: true,
  fontSize: 14,
  notifications: [],
  isFullscreen: false,
  searchVisible: false,
  validationPanelVisible: false,
  shortcuts: {
    "ctrl+s": "Save",
    "ctrl+n": "New",
    "ctrl+o": "Open",
    "ctrl+f": "Find",
    "ctrl+shift+f": "Find and Replace",
    "ctrl+z": "Undo",
    "ctrl+y": "Redo",
    f11: "Toggle Fullscreen",
  },
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload;
    },
    setActivePanel: (state, action: PayloadAction<PanelType>) => {
      state.activePanel = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    toggleRightPanel: (state) => {
      state.rightPanelCollapsed = !state.rightPanelCollapsed;
    },
    setSplitPaneSize: (state, action: PayloadAction<number>) => {
      state.splitPaneSize = action.payload;
    },
    toggleMinimap: (state) => {
      state.showMinimap = !state.showMinimap;
    },
    toggleLineNumbers: (state) => {
      state.showLineNumbers = !state.showLineNumbers;
    },
    toggleWordWrap: (state) => {
      state.wordWrap = !state.wordWrap;
    },
    setFontSize: (state, action: PayloadAction<number>) => {
      state.fontSize = Math.max(8, Math.min(32, action.payload));
    },
    addNotification: (
      state,
      action: PayloadAction<Omit<Notification, "id" | "timestamp">>,
    ) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload,
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    toggleFullscreen: (state) => {
      state.isFullscreen = !state.isFullscreen;
    },
    toggleSearch: (state) => {
      state.searchVisible = !state.searchVisible;
    },
    toggleValidationPanel: (state) => {
      state.validationPanelVisible = !state.validationPanelVisible;
    },
    updateShortcut: (
      state,
      action: PayloadAction<{ key: string; description: string }>,
    ) => {
      state.shortcuts[action.payload.key] = action.payload.description;
    },
  },
});

export const {
  setViewMode,
  setActivePanel,
  toggleSidebar,
  setSidebarCollapsed,
  toggleRightPanel,
  setSplitPaneSize,
  toggleMinimap,
  toggleLineNumbers,
  toggleWordWrap,
  setFontSize,
  addNotification,
  removeNotification,
  clearNotifications,
  toggleFullscreen,
  toggleSearch,
  toggleValidationPanel,
  updateShortcut,
} = uiSlice.actions;

export default uiSlice.reducer;
