import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { ThemeSwitcher } from "./index";

const managedStyleIds = [
  "valkyr-theme-valkyr",
  "valkyr-theme-dark",
  "valkyr-theme-fun",
  "valkyr-theme-overrides",
];

const thor_localStorageValues = new Map<string, string>();
const thor_localStorage = {
  clear: () => thor_localStorageValues.clear(),
  getItem: (key: string) => thor_localStorageValues.get(key) ?? null,
  key: (index: number) =>
    Array.from(thor_localStorageValues.keys())[index] ?? null,
  get length() {
    return thor_localStorageValues.size;
  },
  removeItem: (key: string) => thor_localStorageValues.delete(key),
  setItem: (key: string, value: string) =>
    thor_localStorageValues.set(key, value),
};

let themeSwitcher: ThemeSwitcher;

beforeAll(async () => {
  vi.stubGlobal("localStorage", thor_localStorage);
  ({ themeSwitcher } = await import("./index"));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  managedStyleIds.forEach((id) => document.getElementById(id)?.remove());
  thor_localStorage.clear();
});

describe("ThemeSwitcher", () => {
  it("keeps shared component styles after the active theme", () => {
    themeSwitcher.setTheme("dark", { persist: false });

    const managedLinks = Array.from(
      document.head.querySelectorAll<HTMLLinkElement>(
        'link[id^="valkyr-theme-"]',
      ),
    );

    expect(managedLinks.map(({ id }) => id)).toEqual([
      "valkyr-theme-dark",
      "valkyr-theme-overrides",
        ]);
    expect(managedLinks.every(({ rel }) => rel === "stylesheet")).toBe(true);
  });

  it("restores shared style precedence after switching themes", () => {
    themeSwitcher.setTheme("dark", { persist: false });
    themeSwitcher.setTheme("fun", { persist: false });

    const managedLinks = Array.from(
      document.head.querySelectorAll<HTMLLinkElement>(
        'link[id^="valkyr-theme-"]',
      ),
    );

    expect(managedLinks.map(({ id }) => id)).toEqual([
      "valkyr-theme-fun",
      "valkyr-theme-overrides",
        ]);
  });
});
