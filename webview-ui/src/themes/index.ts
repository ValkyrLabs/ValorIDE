/**
 * VALKYR DESIGN SYSTEM - THEME SYSTEM
 * Main theme export and switching utility
 */

import funTheme from "./fun";
import darkTheme from "./dark";
import valkyrTheme from "./valkyr";

export interface Theme {
  name: string;
  displayName: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  type: "light" | "dark";
  usage: string[];
}

// Available themes
export const themes = {
  fun: funTheme,
  dark: darkTheme,
  valkyr: valkyrTheme,
} as const;

export type ThemeName = keyof typeof themes;

// Default theme
export const DEFAULT_THEME: ThemeName = "valkyr";

// Theme switcher class
export class ThemeSwitcher {
  private static instance: ThemeSwitcher;
  private currentTheme: ThemeName = DEFAULT_THEME;
  private themeChangeCallbacks: Array<(theme: ThemeName) => void> = [];

  private constructor() {
    // Load theme from localStorage or use default
    const savedTheme = localStorage.getItem("valkyr-theme") as ThemeName;
    if (savedTheme && themes[savedTheme]) {
      this.currentTheme = savedTheme;
    }
  }

  static getInstance(): ThemeSwitcher {
    if (!ThemeSwitcher.instance) {
      ThemeSwitcher.instance = new ThemeSwitcher();
    }
    return ThemeSwitcher.instance;
  }

  getCurrentTheme(): ThemeName {
    return this.currentTheme;
  }

  getCurrentThemeInfo(): Theme {
    return themes[this.currentTheme];
  }

  setTheme(themeName: ThemeName): void {
    if (!themes[themeName]) {
      console.error(`Theme "${themeName}" not found`);
      return;
    }

    // Remove previous theme stylesheet
    this.removeThemeStylesheet(this.currentTheme);

    // Load new theme stylesheet
    this.loadThemeStylesheet(themeName);

    // Update data attribute for CSS targeting
    document.documentElement.setAttribute("data-theme", themeName);

    // Save to localStorage
    localStorage.setItem("valkyr-theme", themeName);

    // Update current theme
    this.currentTheme = themeName;

    // Notify callbacks
    this.themeChangeCallbacks.forEach((callback) => callback(themeName));

    console.log(`Theme switched to: ${themes[themeName].displayName}`);
  }

  private loadThemeStylesheet(themeName: ThemeName): void {
    const linkId = `valkyr-theme-${themeName}`;

    // Don't load if already exists
    if (document.getElementById(linkId)) {
      return;
    }

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = `/src/themes/${themeName}/bootstrap.css`;

    document.head.appendChild(link);
  }

  private removeThemeStylesheet(themeName: ThemeName): void {
    const linkId = `valkyr-theme-${themeName}`;
    const existing = document.getElementById(linkId);

    if (existing) {
      existing.remove();
    }
  }

  onThemeChange(callback: (theme: ThemeName) => void): () => void {
    this.themeChangeCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.themeChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.themeChangeCallbacks.splice(index, 1);
      }
    };
  }

  cycleTheme(): void {
    const themeNames = Object.keys(themes) as ThemeName[];
    const currentIndex = themeNames.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themeNames.length;
    this.setTheme(themeNames[nextIndex]);
  }

  getAvailableThemes(): Theme[] {
    return Object.values(themes);
  }

  init(): void {
    // Initialize theme on app startup
    this.setTheme(this.currentTheme);

    // Add keyboard shortcut for theme cycling (Ctrl+Shift+T)
    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === "T") {
        event.preventDefault();
        this.cycleTheme();
      }
    });
  }
}

// Create singleton instance
export const themeSwitcher = ThemeSwitcher.getInstance();

// Export individual themes
export { funTheme, darkTheme, valkyrTheme };

// Utility functions
export const getTheme = (name: ThemeName): Theme => themes[name];
export const getCurrentTheme = (): Theme => themeSwitcher.getCurrentThemeInfo();
export const setTheme = (name: ThemeName): void => themeSwitcher.setTheme(name);
export const initThemes = (): void => themeSwitcher.init();

export default themeSwitcher;
