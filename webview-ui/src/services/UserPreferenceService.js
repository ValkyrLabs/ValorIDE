import { UserPreferencePreferenceTypeEnum } from "@thorapi/model"; // UserPreference";
import store from "../redux/store";
import { setThemeMode, setBootswatchTheme } from "../redux/slices/themeSlice";
import { UserPreferenceService as UserPreferenceApi } from "@thorapi/redux/services/UserPreferenceService";
export class UserPreferenceService {
  static instance;
  preferences = new Map();
  constructor() {}
  static getInstance() {
    if (!UserPreferenceService.instance) {
      UserPreferenceService.instance = new UserPreferenceService();
    }
    return UserPreferenceService.instance;
  }
  async loadUserPreferences() {
    try {
      // Use RTK Query to fetch preferences from backend
      const result = await store.dispatch(
        UserPreferenceApi.endpoints.getUserPreferences.initiate()
      );
      if (result.data) {
        // Store preferences in local map and update Redux store
        result.data.forEach((pref) => {
          if (pref.preferenceType) {
            this.preferences.set(pref.preferenceType, pref);
            // Update Redux store for theme preference
            if (
              pref.preferenceType ===
                UserPreferencePreferenceTypeEnum.UXTHEME &&
              pref.preference
            ) {
              store.dispatch(setThemeMode(pref.preference));
            }
          }
        });
      }
    } catch (error) {
      console.error("Failed to load user preferences:", error);
      // Fall back to localStorage if backend fails
      this.loadDefaultPreferences();
    }
  }
  loadDefaultPreferences() {
    // Load theme preference from localStorage as fallback
    const savedTheme = localStorage.getItem("theme-mode");
    if (savedTheme && ["light", "dark", "auto"].includes(savedTheme)) {
      store.dispatch(setThemeMode(savedTheme));
    }
    // Load Bootswatch theme preference
    const savedBootswatch = localStorage.getItem("bootswatch-theme");
    if (savedBootswatch) {
      store.dispatch(setBootswatchTheme(savedBootswatch));
    }
  }
  async setThemePreference(mode) {
    try {
      // Save to localStorage immediately for instant UI update
      localStorage.setItem("theme-mode", mode);
      // Update Redux store immediately
      store.dispatch(setThemeMode(mode));
      // Save to backend using RTK Query
      const existingPref = this.preferences.get(
        UserPreferencePreferenceTypeEnum.UXTHEME
      );
      const preferenceData = {
        preferenceType: UserPreferencePreferenceTypeEnum.UXTHEME,
        preference: mode,
        // WRAPPER: Extract ID only, sanitizing Symbol corruption
        principalId: (() => {
          try {
            const raw =
              sessionStorage.getItem("authenticatedPrincipal") || "{}";
            const parsed = JSON.parse(raw);
            return parsed?.id;
          } catch {
            return undefined;
          }
        })(),
      };
      let result;
      if (existingPref?.id) {
        // Update existing preference
        result = await store.dispatch(
          UserPreferenceApi.endpoints.updateUserPreference.initiate({
            id: existingPref.id,
            ...preferenceData,
          })
        );
      } else {
        // Create new preference
        result = await store.dispatch(
          UserPreferenceApi.endpoints.addUserPreference.initiate(preferenceData)
        );
      }
      // Update local preferences map with the saved preference
      if (result.data) {
        this.preferences.set(
          UserPreferencePreferenceTypeEnum.UXTHEME,
          result.data
        );
      }
    } catch (error) {
      console.error("Failed to set theme preference:", error);
    }
  }
  async setBootswatchTheme(theme) {
    try {
      // Save to localStorage immediately
      localStorage.setItem("bootswatch-theme", theme);
      // Update Redux store immediately
      store.dispatch(setBootswatchTheme(theme));
      // TODO: Save to backend when UserPreference supports custom theme field
      console.log(`Bootswatch theme set to: ${theme}`);
    } catch (error) {
      console.error("Failed to set Bootswatch theme:", error);
    }
  }
  async setLayoutPreference(layout) {
    try {
      // Save to localStorage immediately
      localStorage.setItem("layout-mode", layout);
      // Save to backend using RTK Query
      const existingPref = this.preferences.get(
        UserPreferencePreferenceTypeEnum.UXLAYOUT
      );
      const currentJson = this.parseLayoutJson(existingPref?.preference);
      currentJson.layoutMode = layout;
      const preferenceData = {
        preferenceType: UserPreferencePreferenceTypeEnum.UXLAYOUT,
        preference: JSON.stringify(currentJson),
        // WRAPPER: Extract ID only, sanitizing Symbol corruption
        principalId: (() => {
          try {
            const raw =
              sessionStorage.getItem("authenticatedPrincipal") || "{}";
            const parsed = JSON.parse(raw);
            return parsed?.id;
          } catch {
            return undefined;
          }
        })(),
      };
      let result;
      if (existingPref?.id) {
        // Update existing preference
        result = await store.dispatch(
          UserPreferenceApi.endpoints.updateUserPreference.initiate({
            id: existingPref.id,
            ...preferenceData,
          })
        );
      } else {
        // Create new preference
        result = await store.dispatch(
          UserPreferenceApi.endpoints.addUserPreference.initiate(preferenceData)
        );
      }
      // Update local preferences map with the saved preference
      if (result.data) {
        this.preferences.set(
          UserPreferencePreferenceTypeEnum.UXLAYOUT,
          result.data
        );
      }
    } catch (error) {
      console.error("Failed to save layout preference:", error);
    }
  }
  getThemePreference() {
    // First try to get from loaded preferences
    const backendPref = this.preferences.get(
      UserPreferencePreferenceTypeEnum.UXTHEME
    );
    if (
      backendPref?.preference &&
      ["light", "dark", "auto"].includes(backendPref.preference)
    ) {
      return backendPref.preference;
    }
    // Fall back to localStorage
    const saved = localStorage.getItem("theme-mode");
    return saved && ["light", "dark", "auto"].includes(saved) ? saved : "dark";
  }
  getLayoutPreference() {
    // First try to get from loaded preferences
    const backendPref = this.preferences.get(
      UserPreferencePreferenceTypeEnum.UXLAYOUT
    );
    if (backendPref?.preference) {
      const json = this.parseLayoutJson(backendPref.preference);
      if (json.layoutMode) {
        return json.layoutMode;
      }
      // fallback to raw string if older format
      if (typeof backendPref.preference === "string") {
        return backendPref.preference;
      }
    }
    // Fall back to localStorage
    return localStorage.getItem("layout-mode") || "default";
  }
  // ---- Grid preferences packed under UXLAYOUT JSON ----
  parseLayoutJson(pref) {
    if (!pref) {
      return { grids: {} };
    }
    try {
      const parsed = JSON.parse(pref);
      if (parsed && typeof parsed === "object") {
        if (!parsed.grids) {
          parsed.grids = {};
        }
        return parsed;
      }
    } catch {}
    // legacy: plain string stored previously
    return { layoutMode: pref, grids: {} };
  }
  async getGridPrefs() {
    const existingPref = this.preferences.get(
      UserPreferencePreferenceTypeEnum.UXLAYOUT
    );
    return this.parseLayoutJson(existingPref?.preference);
  }
  async setGridPrefsKey(storageKey, patch) {
    try {
      let existingPref = this.preferences.get(
        UserPreferencePreferenceTypeEnum.UXLAYOUT
      );
      const principalId = (() => {
        try {
          const raw = sessionStorage.getItem("authenticatedPrincipal") || "{}";
          const parsed = JSON.parse(raw);
          return parsed?.id;
        } catch {
          return undefined;
        }
      })();
      // If we don't have the preference loaded yet, fetch all and locate it to avoid duplicates.
      if (!existingPref) {
        const res = await store.dispatch(
          UserPreferenceApi.endpoints.getUserPreferences.initiate()
        );
        const items = res.data;
        if (items && items.length) {
          const found = items.find(
            (p) =>
              p.preferenceType === UserPreferencePreferenceTypeEnum.UXLAYOUT &&
              (!principalId || p.principalId === principalId)
          );
          if (found) {
            existingPref = found;
            this.preferences.set(
              UserPreferencePreferenceTypeEnum.UXLAYOUT,
              found
            );
          }
        }
      }
      const base = this.parseLayoutJson(existingPref?.preference);
      base.grids = base.grids || {};
      const current = base.grids[storageKey] || {};
      // Merge shallow by default
      base.grids[storageKey] = { ...current, ...patch };
      const preferenceData = {
        preferenceType: UserPreferencePreferenceTypeEnum.UXLAYOUT,
        preference: JSON.stringify(base),
        principalId,
      };
      let result;
      if (existingPref?.id) {
        result = await store.dispatch(
          UserPreferenceApi.endpoints.updateUserPreference.initiate({
            id: existingPref.id,
            ...preferenceData,
          })
        );
      } else {
        result = await store.dispatch(
          UserPreferenceApi.endpoints.addUserPreference.initiate(preferenceData)
        );
      }
      if (result.data) {
        this.preferences.set(
          UserPreferencePreferenceTypeEnum.UXLAYOUT,
          result.data
        );
      }
    } catch (e) {
      console.error("Failed to save grid prefs", e);
    }
  }
  // Generic helpers for arbitrary key/value blobs stored under UXLAYOUT.grids
  async getCustomPrefsKey(storageKey) {
    const prefs = await this.getGridPrefs();
    return (prefs.grids && prefs.grids[storageKey]) || null;
  }
  async setCustomPrefsKey(storageKey, value) {
    await this.setGridPrefsKey(storageKey, value);
  }
}
export const userPreferenceService = UserPreferenceService.getInstance();
//# sourceMappingURL=UserPreferenceService.js.map
