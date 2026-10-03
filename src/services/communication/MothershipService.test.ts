import { it } from "@jest/globals";
import * as vscode from "vscode";
import { Client } from "@stomp/stompjs";
import { MothershipService } from "./MothershipService";
import {
  clearCredentialOrigins,
  registerCredentialOrigin,
} from "@shared/CredentialOrigin";

jest.mock("@stomp/stompjs", () => ({
  Client: jest.fn().mockImplementation((options) => ({
    options,
    active: false,
    connected: false,
    activate: jest.fn(),
    deactivate: jest.fn(),
  })),
}));

describe("Mothership credential-safe CONNECT", () => {
  let host: string;
  beforeEach(() => {
    host = "https://issuer.invalid/v1";
    clearCredentialOrigins();
    jest.clearAllMocks();
    jest
      .spyOn(vscode.workspace, "getConfiguration")
      .mockImplementation(() => ({ get: () => host }) as any);
    registerCredentialOrigin("SYNTHETIC-A", host);
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  const service = (baseUrl?: string) => {
    const result = new MothershipService({ jwtToken: "SYNTHETIC-A", baseUrl });
    result.on("error", () => undefined);
    return result;
  };
  it("puts auth only in native CONNECT headers and emits no auth debug frames", async () => {
    const result = service();
    await result.connect();
    const options = (Client as unknown as jest.Mock).mock.calls[0][0];
    expect(options.brokerURL).toMatch(
      /^wss:\/\/issuer.invalid\/swarm\?instanceId=/,
    );
    expect(options.brokerURL).not.toContain("SYNTHETIC-A");
    expect(options.connectHeaders.Authorization).toBe("Bearer SYNTHETIC-A");
    options.beforeConnect();
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    options.debug("Authorization: Bearer SYNTHETIC-A");
    expect(log).not.toHaveBeenCalled();
    result.disconnect();
  });
  it.each([
    "wss://other.invalid/swarm",
    "ws://issuer.invalid/swarm",
    "wss://issuer.invalid/swarm?token=SYNTHETIC-A",
  ])(
    "refuses unsafe destination %s before constructing transport",
    async (baseUrl) => {
      await expect(service(baseUrl).connect()).rejects.toThrow(
        "connection refused",
      );
      expect(Client).not.toHaveBeenCalled();
    },
  );
  it("rechecks automatic reconnect after direct configuration edits and logout", async () => {
    const result = service();
    await result.connect();
    const options = (Client as unknown as jest.Mock).mock.calls[0][0];
    host = "https://other.invalid/v1";
    expect(() => options.beforeConnect()).toThrow();
    host = "https://issuer.invalid/v1";
    clearCredentialOrigins();
    expect(() => options.beforeConnect()).toThrow();
    result.disconnect();
  });
  it("cancels a scheduled token reconnect when the user disconnects", async () => {
    const result = service();
    await result.connect();
    (result as any).connected = true;
    registerCredentialOrigin("SYNTHETIC-A-NEW", host);
    result.updateJwtToken("SYNTHETIC-A-NEW");
    result.disconnect();
    jest.advanceTimersByTime(1000);
    expect(Client).toHaveBeenCalledTimes(1);
  });
});
