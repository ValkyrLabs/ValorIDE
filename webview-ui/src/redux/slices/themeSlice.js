import { createSlice } from "@reduxjs/toolkit";
/**
 * Bootswatch Themes
 * Premium Bootstrap themes from https://bootswatch.com
 */
export const BOOTSWATCH_THEMES = [
  "default",
  "cerulean",
  "cosmo",
  "cyborg",
  "darkly",
  "flatly",
  "journal",
  "litera",
  "lumen",
  "lux",
  "materia",
  "minty",
  "morph",
  "pulse",
  "quartz",
  "sandstone",
  "simplex",
  "sketchy",
  "slate",
  "solar",
  "spacelab",
  "superhero",
  "united",
  "vapor",
  "yeti",
  "zephyr",
];
const getSystemTheme = () => {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
};
/**
 * Load Bootswatch theme CSS into the document
 */
const loadBootswatchTheme = (theme) => {
  if (typeof document !== "undefined") {
    const existingLink = document.getElementById("bootswatch-theme");
    if (existingLink) {
      existingLink.remove();
    }
    if (theme !== "default") {
      const link = document.createElement("link");
      link.id = "bootswatch-theme";
      link.rel = "stylesheet";
      link.href = `https://bootswatch.com/5/${theme}/bootstrap.min.css`;
      document.head.appendChild(link);
    }
  }
};
const initialState = {
  mode: "dark",
  effectiveMode: "dark",
  bootswatch: "default",
  isLoading: false,
};
const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setThemeMode: (state, action) => {
      state.mode = action.payload;
      if (action.payload === "auto") {
        state.effectiveMode = getSystemTheme();
      } else {
        state.effectiveMode = action.payload;
      }
    },
    updateSystemTheme: (state) => {
      if (state.mode === "auto") {
        state.effectiveMode = getSystemTheme();
      }
    },
    setBootswatchTheme: (state, action) => {
      state.bootswatch = action.payload;
      loadBootswatchTheme(action.payload);
    },
    setCustomThemeUrl: (state, action) => {
      state.customThemeUrl = action.payload;
      if (action.payload && typeof document !== "undefined") {
        const link = document.createElement("link");
        link.id = "custom-theme";
        link.rel = "stylesheet";
        link.href = action.payload;
        document.head.appendChild(link);
      }
    },
    setThemeLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});
export const {
  setThemeMode,
  updateSystemTheme,
  setBootswatchTheme,
  setCustomThemeUrl,
  setThemeLoading,
} = themeSlice.actions;
export default themeSlice.reducer;
//# sourceMappingURL=themeSlice.js.map
