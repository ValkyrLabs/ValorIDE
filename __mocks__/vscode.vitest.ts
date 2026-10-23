import { vi } from "vitest";
export const workspace = {
  workspaceFolders: undefined,
  getConfiguration: vi.fn(() => ({
    get: vi.fn((_key, defaultValue) => defaultValue),
  })),
  onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
};
export const window = {
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
};
export const commands = { executeCommand: vi.fn() };
export const env = { openExternal: vi.fn() };
export const Uri = { parse: (value: string) => value };
