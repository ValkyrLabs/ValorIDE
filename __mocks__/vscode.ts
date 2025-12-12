export const commands = { executeCommand: jest.fn() };
export const env = { openExternal: jest.fn() };
export const Uri = { parse: (val: string) => `uri:${val}` } as any;
export type Disposable = { dispose: () => void };
export const window = {
  showInputBox: jest.fn(),
  createWebviewPanel: jest.fn(),
  showErrorMessage: jest.fn(),
};
export const workspace = { getConfiguration: jest.fn() };
