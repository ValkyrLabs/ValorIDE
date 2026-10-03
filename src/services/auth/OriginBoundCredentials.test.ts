import * as vscode from "vscode";
import {
  readBoundCredential,
  writeBoundCredential,
} from "./OriginBoundCredentials";
import {
  clearCredentialOrigins,
  assertCredentialDestination,
} from "@shared/CredentialOrigin";

let host: string;
const fixture = () => {
  const values = new Map<string, string>();
  const context = {
    secrets: {
      get: jest.fn(async (key: string) => values.get(key)),
      store: jest.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
      delete: jest.fn(async (key: string) => {
        values.delete(key);
      }),
    },
  } as any;
  return { context, values };
};

describe("origin-bound SecretStorage", () => {
  beforeEach(() => {
    host = "https://issuer.invalid/v1";
    clearCredentialOrigins();
    jest
      .spyOn(vscode.workspace, "getConfiguration")
      .mockImplementation(() => ({ get: () => host }) as any);
  });
  afterEach(() => jest.restoreAllMocks());
  it("quarantines existing unbound sessions without exporting or transmitting them", async () => {
    const { context, values } = fixture();
    values.set("jwtToken", "SYNTHETIC-A");
    expect(await readBoundCredential(context, "jwtToken")).toBeUndefined();
    expect(values.get("jwtToken")).toBe("SYNTHETIC-A");
    expect(context.secrets.store).not.toHaveBeenCalled();
  });
  it("restores only the same origin and survives repeated identical saves", async () => {
    const { context } = fixture();
    await writeBoundCredential(context, "jwtToken", "SYNTHETIC-A", host);
    clearCredentialOrigins();
    expect(await readBoundCredential(context, "jwtToken")).toBe("SYNTHETIC-A");
    await writeBoundCredential(context, "jwtToken", "SYNTHETIC-A");
    assertCredentialDestination("SYNTHETIC-A", host);
    host = "https://other.invalid/v1";
    expect(await readBoundCredential(context, "jwtToken")).toBeUndefined();
    await expect(
      writeBoundCredential(context, "jwtToken", "SYNTHETIC-A", host),
    ).rejects.toThrow("another backend");
  });
  it("cannot issue a new token through a settings save", async () => {
    const { context } = fixture();
    await expect(
      writeBoundCredential(context, "valkyraiJwt", "SYNTHETIC-A"),
    ).rejects.toThrow("destination-specific sign-in");
    expect(context.secrets.store).not.toHaveBeenCalled();
  });
  it("fails closed when setup is interrupted between binding and token writes", async () => {
    const { context, values } = fixture();
    await writeBoundCredential(context, "jwtToken", "SYNTHETIC-OLD", host);
    context.secrets.store.mockImplementation(
      async (key: string, value: string) => {
        if (key === "jwtToken") throw new Error("Fixture interruption");
        values.set(key, value);
      },
    );
    await expect(
      writeBoundCredential(context, "jwtToken", "SYNTHETIC-NEW", host),
    ).rejects.toThrow("interruption");
    clearCredentialOrigins();
    expect(await readBoundCredential(context, "jwtToken")).toBeUndefined();
  });
  it("requires a fresh local destination login and supports loopback without hosted signup", async () => {
    const { context } = fixture();
    host = "http://127.0.0.1:8080/v1";
    await writeBoundCredential(context, "jwtToken", "SYNTHETIC-LOCAL", host);
    expect(await readBoundCredential(context, "jwtToken")).toBe(
      "SYNTHETIC-LOCAL",
    );
    await writeBoundCredential(context, "jwtToken", undefined);
    expect(await readBoundCredential(context, "jwtToken")).toBeUndefined();
    await writeBoundCredential(
      context,
      "jwtToken",
      "SYNTHETIC-LOCAL-NEW",
      host,
    );
    expect(await readBoundCredential(context, "jwtToken")).toBe(
      "SYNTHETIC-LOCAL-NEW",
    );
  });
  it("does not let a pending secret read restore a credential after logout", async () => {
    const { context } = fixture();
    await writeBoundCredential(context, "jwtToken", "SYNTHETIC-A", host);
    let resume!: () => void;
    const blocked = new Promise<void>((resolve) => {
      resume = resolve;
    });
    const original = context.secrets.get.getMockImplementation();
    context.secrets.get.mockImplementation(async (key: string) => {
      await blocked;
      return original(key);
    });
    const read = readBoundCredential(context, "jwtToken");
    clearCredentialOrigins();
    resume();
    expect(await read).toBeUndefined();
  });
});
