import { UserPreference, UserPreferencePreferenceTypeEnum } from "@thor/model"; // UserPreference";
import store from "../redux/store";
import {
  setThemeMode,
  ThemeMode,
  setBootswatchTheme,
  BootswatchTheme,
} from "../redux/slices/themeSlice";
import { UserPreferenceService as UserPreferenceApi } from "../thor/redux/services/UserPreferenceService";

export class UserPreferenceService {
  private static instance: UserPreferenceService;
  private preferences: Map<string, UserPreference> = new Map();

  private constructor() {}

  public static getInstance(): UserPreferenceService {
    if (!UserPreferenceService.instance) {
      UserPreferenceService.instance = new UserPreferenceService();
    }
    return UserPreferenceService.instance;
  }

  async loadUserPreferences(): Promise<void> {
    try {
      // Use RTK Query to fetch preferences from backend
      const result = await store.dispatch(
        UserPreferenceApi.endpoints.getUserPreferences.initiate(),
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
              store.dispatch(setThemeMode(pref.preference as ThemeMode));
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

  private loadDefaultPreferences(): void {
    // Load theme preference from localStorage as fallback
    const savedTheme = localStorage.getItem("theme-mode") as ThemeMode;
    if (savedTheme && ["light", "dark", "auto"].includes(savedTheme)) {
      store.dispatch(setThemeMode(savedTheme));
    }

    // Load Bootswatch theme preference
    const savedBootswatch = localStorage.getItem(
      "bootswatch-theme",
    ) as BootswatchTheme;
    if (savedBootswatch) {
      store.dispatch(setBootswatchTheme(savedBootswatch));
    }
  }

  async setThemePreference(mode: ThemeMode): Promise<void> {
    try {
      // Save to localStorage immediately for instant UI update
      localStorage.setItem("theme-mode", mode);

      // Update Redux store immediately
      store.dispatch(setThemeMode(mode));

      // Save to backend using RTK Query
      const existingPref = this.preferences.get(
        UserPreferencePreferenceTypeEnum.UXTHEME,
      );

      const preferenceData: Partial<UserPreference> = {
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
          }),
        );
      } else {
        // Create new preference
        result = await store.dispatch(
          UserPreferenceApi.endpoints.addUserPreference.initiate(
            preferenceData,
          ),
        );
      }

      // Update local preferences map with the saved preference
      if (result.data) {
        this.preferences.set(
          UserPreferencePreferenceTypeEnum.UXTHEME,
          result.data,
        );
      }
    } catch (error) {
      console.error("Failed to set theme preference:", error);
    }
  }

  async setBootswatchTheme(theme: BootswatchTheme): Promise<void> {
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

  async setLayoutPreference(layout: string): Promise<void> {
    try {
      // Save to localStorage immediately
      localStorage.setItem("layout-mode", layout);

      // Save to backend using RTK Query
      const existingPref = this.preferences.get(
        UserPreferencePreferenceTypeEnum.UXLAYOUT,
      );

      const currentJson = this.parseLayoutJson(existingPref?.preference);
      currentJson.layoutMode = layout;

      const preferenceData: Partial<UserPreference> = {
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
          }),
        );
      } else {
        // Create new preference
        result = await store.dispatch(
          UserPreferenceApi.endpoints.addUserPreference.initiate(
            preferenceData,
          ),
        );
      }

      // Update local preferences map with the saved preference
      if (result.data) {
        this.preferences.set(
          UserPreferencePreferenceTypeEnum.UXLAYOUT,
          result.data,
        );
      }
    } catch (error) {
      console.error("Failed to save layout preference:", error);
    }
  }

  getThemePreference(): ThemeMode {
    // First try to get from loaded preferences
    const backendPref = this.preferences.get(
      UserPreferencePreferenceTypeEnum.UXTHEME,
    );
    if (
      backendPref?.preference &&
      ["light", "dark", "auto"].includes(backendPref.preference)
    ) {
      return backendPref.preference as ThemeMode;
    }

    // Fall back to localStorage
    const saved = localStorage.getItem("theme-mode") as ThemeMode;
    return saved && ["light", "dark", "auto"].includes(saved) ? saved : "dark";
  }

  getLayoutPreference(): string {
    // First try to get from loaded preferences
    const backendPref = this.preferences.get(
      UserPreferencePreferenceTypeEnum.UXLAYOUT,
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
  private parseLayoutJson(pref?: string): {
    layoutMode?: string;
    grids?: Record<string, any>;
  } {
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

  async getGridPrefs(): Promise<{
    layoutMode?: string;
    grids?: Record<string, any>;
  }> {
    const existingPref = this.preferences.get(
      UserPreferencePreferenceTypeEnum.UXLAYOUT,
    );
    return this.parseLayoutJson(existingPref?.preference);
  }

  async setGridPrefsKey(storageKey: string, patch: any): Promise<void> {
    try {
      let existingPref = this.preferences.get(
        UserPreferencePreferenceTypeEnum.UXLAYOUT,
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
          UserPreferenceApi.endpoints.getUserPreferences.initiate(),
        );
        const items = res.data as UserPreference[] | undefined;
        if (items && items.length) {
          const found = items.find(
            (p) =>
              p.preferenceType === UserPreferencePreferenceTypeEnum.UXLAYOUT &&
              (!principalId || p.principalId === principalId),
          );
          if (found) {
            existingPref = found;
            this.preferences.set(
              UserPreferencePreferenceTypeEnum.UXLAYOUT,
              found,
            );
          }
        }
      }
      const base = this.parseLayoutJson(existingPref?.preference);
      base.grids = base.grids || {};
      const current = base.grids[storageKey] || {};
      // Merge shallow by default
      base.grids[storageKey] = { ...current, ...patch };
      const preferenceData: Partial<UserPreference> = {
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
          }),
        );
      } else {
        result = await store.dispatch(
          UserPreferenceApi.endpoints.addUserPreference.initiate(
            preferenceData,
          ),
        );
      }
      if (result.data) {
        this.preferences.set(
          UserPreferencePreferenceTypeEnum.UXLAYOUT,
          result.data,
        );
      }
    } catch (e) {
      console.error("Failed to save grid prefs", e);
    }
  }

  // Generic helpers for arbitrary key/value blobs stored under UXLAYOUT.grids
  async getCustomPrefsKey<T = any>(storageKey: string): Promise<T | null> {
    const prefs = await this.getGridPrefs();
    return (prefs.grids && (prefs.grids as any)[storageKey]) || null;
  }

  async setCustomPrefsKey(storageKey: string, value: any): Promise<void> {
    await this.setGridPrefsKey(storageKey, value);
  }
}

export const userPreferenceService = UserPreferenceService.getInstance();
