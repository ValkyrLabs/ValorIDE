import { createSlice } from "@reduxjs/toolkit";
const initialState = {
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
    setViewMode: (state, action) => {
      state.viewMode = action.payload;
    },
    setActivePanel: (state, action) => {
      state.activePanel = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
    },
    toggleRightPanel: (state) => {
      state.rightPanelCollapsed = !state.rightPanelCollapsed;
    },
    setSplitPaneSize: (state, action) => {
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
    setFontSize: (state, action) => {
      state.fontSize = Math.max(8, Math.min(32, action.payload));
    },
    addNotification: (state, action) => {
      const notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action) => {
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
    updateShortcut: (state, action) => {
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
//# sourceMappingURL=uiSlice.js.map
