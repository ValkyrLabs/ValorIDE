/**
 * VALKYR DESIGN SYSTEM - THEME SYSTEM
 * Main theme export and switching utility
 */
import funTheme from "./fun";
import darkTheme from "./dark";
import valkyrTheme from "./valkyr";
// Available themes
export const themes = {
    fun: funTheme,
    dark: darkTheme,
    valkyr: valkyrTheme,
};
// Default theme
export const DEFAULT_THEME = "valkyr";
const ACTIVE_THEMES = ["valkyr", "dark", "fun"];
const LEGACY_THEME_ALIASES = {
    crm: "dark",
    cms: "fun",
    operations: "fun",
};
const themeStylesheets = {
    fun: new URL("./fun/bootstrap.css", import.meta.url).href,
    dark: new URL("./dark/bootstrap.css", import.meta.url).href,
    valkyr: new URL("./valkyr/bootstrap.css", import.meta.url).href,
};
const componentOverridesHref = new URL("./components.css", import.meta.url)
    .href;
// Theme switcher class
export class ThemeSwitcher {
    static instance;
    currentTheme = DEFAULT_THEME;
    themeChangeCallbacks = [];
    hasExplicitPreference = false;
    systemThemeMediaQuery = null;
    constructor() {
        const rawSavedTheme = localStorage.getItem("valkyr-theme");
        const normalized = this.normalizeThemeName(rawSavedTheme);
        if (normalized) {
            if (normalized !== rawSavedTheme) {
                this.removeLegacyThemeStylesheet(rawSavedTheme);
                localStorage.setItem("valkyr-theme", normalized);
            }
            this.currentTheme = normalized;
            this.hasExplicitPreference = true;
        }
        else {
            const prefersDark = typeof window !== "undefined" && "matchMedia" in window
                ? window.matchMedia("(prefers-color-scheme: dark)").matches
                : false;
            this.currentTheme = prefersDark ? "dark" : DEFAULT_THEME;
            if (typeof window !== "undefined" && "matchMedia" in window) {
                this.systemThemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
                this.systemThemeMediaQuery.addEventListener("change", this.handleSystemThemeChange);
            }
        }
    }
    static getInstance() {
        if (!ThemeSwitcher.instance) {
            ThemeSwitcher.instance = new ThemeSwitcher();
        }
        return ThemeSwitcher.instance;
    }
    getCurrentTheme() {
        return this.currentTheme;
    }
    getCurrentThemeInfo() {
        return themes[this.currentTheme];
    }
    setTheme(themeName, options) {
        const shouldPersist = options?.persist ?? true;
        const normalized = this.normalizeThemeName(themeName);
        if (!normalized) {
            console.error(`Theme "${themeName}" not found`);
            return;
        }
        if (!ACTIVE_THEMES.includes(normalized)) {
            console.warn(`Theme "${normalized}" is not production ready. Falling back to "${DEFAULT_THEME}".`);
            this.setTheme(DEFAULT_THEME, options);
            return;
        }
        if (typeof themeName === "string" && themeName !== normalized) {
            this.removeLegacyThemeStylesheet(themeName);
        }
        this.ensureComponentOverrides();
        // Remove previous theme stylesheet
        this.removeThemeStylesheet(this.currentTheme);
        // Load new theme stylesheet
        this.loadThemeStylesheet(normalized);
        // Update data attribute for CSS targeting
        document.documentElement.setAttribute("data-theme", normalized);
        // Save to localStorage if we have an explicit user preference
        if (shouldPersist) {
            localStorage.setItem("valkyr-theme", normalized);
            this.hasExplicitPreference = true;
        }
        else if (!this.hasExplicitPreference) {
            localStorage.removeItem("valkyr-theme");
        }
        // Update current theme
        this.currentTheme = normalized;
        // Notify callbacks
        this.themeChangeCallbacks.forEach((callback) => callback(normalized));
        console.log(`Theme switched to: ${themes[normalized].displayName}`);
    }
    normalizeThemeName(name) {
        if (!name)
            return null;
        if (typeof name === "string") {
            const lowered = name.toLowerCase();
            const mapped = LEGACY_THEME_ALIASES[lowered] ?? lowered;
            if (Object.prototype.hasOwnProperty.call(themes, mapped)) {
                return mapped;
            }
            return null;
        }
        return name;
    }
    loadThemeStylesheet(themeName) {
        const linkId = `valkyr-theme-${themeName}`;
        // Don't load if already exists
        if (document.getElementById(linkId)) {
            return;
        }
        const stylesheetHref = themeStylesheets[themeName];
        if (!stylesheetHref) {
            console.error(`Stylesheet for theme "${themeName}" not found`);
            return;
        }
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = stylesheetHref;
        document.head.appendChild(link);
    }
    removeThemeStylesheet(themeName) {
        const linkId = `valkyr-theme-${themeName}`;
        const existing = document.getElementById(linkId);
        if (existing) {
            existing.remove();
        }
    }
    removeLegacyThemeStylesheet(themeName) {
        if (!themeName)
            return;
        const linkId = `valkyr-theme-${themeName}`;
        const existing = document.getElementById(linkId);
        if (existing) {
            existing.remove();
        }
    }
    ensureComponentOverrides() {
        const overridesId = "valkyr-theme-overrides";
        if (document.getElementById(overridesId)) {
            return;
        }
        const link = document.createElement("link");
        link.id = overridesId;
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = componentOverridesHref;
        document.head.appendChild(link);
    }
    onThemeChange(callback) {
        this.themeChangeCallbacks.push(callback);
        // Return unsubscribe function
        return () => {
            const index = this.themeChangeCallbacks.indexOf(callback);
            if (index > -1) {
                this.themeChangeCallbacks.splice(index, 1);
            }
        };
    }
    cycleTheme() {
        const themeNames = [...ACTIVE_THEMES];
        const currentIndex = themeNames.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themeNames.length;
        this.setTheme(themeNames[nextIndex]);
    }
    getAvailableThemes() {
        return ACTIVE_THEMES.map((themeName) => themes[themeName]);
    }
    init() {
        // Initialize theme on app startup
        this.setTheme(this.currentTheme, { persist: this.hasExplicitPreference });
        // Add keyboard shortcut for theme cycling (Ctrl+Shift+T)
        document.addEventListener("keydown", (event) => {
            if (event.ctrlKey && event.shiftKey && event.key === "T") {
                event.preventDefault();
                this.cycleTheme();
            }
        });
    }
    handleSystemThemeChange = (event) => {
        if (this.hasExplicitPreference) {
            return;
        }
        const nextTheme = event.matches ? "dark" : DEFAULT_THEME;
        this.setTheme(nextTheme, { persist: false });
    };
}
// Create singleton instance
export const themeSwitcher = ThemeSwitcher.getInstance();
// Export individual themes
export { funTheme, darkTheme, valkyrTheme };
// Utility functions
export const getTheme = (name) => themes[name];
export const getCurrentTheme = () => themeSwitcher.getCurrentThemeInfo();
export const setTheme = (name, options) => themeSwitcher.setTheme(name, options);
export const initThemes = () => themeSwitcher.init();
export default themeSwitcher;
//# sourceMappingURL=index.js.map