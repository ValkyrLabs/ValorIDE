import { it } from "@jest/globals";
import {
  credentialOrigin,
  registerCredentialOrigin,
  assertCredentialDestination,
  assertCredentialHeaders,
  assertSafeWebSocketUrl,
  clearCredentialOrigins,
} from "./CredentialOrigin";

describe("exact credential destination", () => {
  beforeEach(clearCredentialOrigins);
  it("normalizes only scheme, host and effective port, including STOMP origins", () => {
    expect(credentialOrigin("https://ISSUER.invalid:443/v1")).toBe(
      "https://issuer.invalid",
    );
    expect(credentialOrigin("wss://issuer.invalid/swarm")).toBe(
      "https://issuer.invalid",
    );
    expect(credentialOrigin("ws://127.0.0.1:8080/swarm")).toBe(
      "http://127.0.0.1:8080",
    );
  });
  it.each([
    "http://issuer.invalid",
    "http://localhost.attacker.invalid",
    "ftp://localhost",
    "https://user:password@issuer.invalid",
    "https://issuer.invalid?token=x",
    "https://issuer.invalid#x",
  ])("rejects unsafe origin %s", (value) =>
    expect(() => credentialOrigin(value)).toThrow(),
  );
  it("allows same-origin REST paths, pagination and STOMP CONNECT", () => {
    registerCredentialOrigin("SYNTHETIC-A", "https://issuer.invalid/v1");
    assertCredentialDestination(
      "SYNTHETIC-A",
      "https://issuer.invalid/v1/items?page=2",
    );
    assertCredentialDestination(
      "SYNTHETIC-A",
      "wss://issuer.invalid/swarm?instanceId=fixture",
    );
  });
  it.each([
    "https://other.invalid/v1",
    "https://issuer.invalid:444/v1",
    "http://issuer.invalid/v1",
    "https://issuer.invalid.attacker.invalid",
    "https://issuer.invalid/v1?token=SYNTHETIC-A",
  ])("blocks credential transfer to %s", (destination) => {
    registerCredentialOrigin("SYNTHETIC-A", "https://issuer.invalid/v1");
    expect(() =>
      assertCredentialDestination("SYNTHETIC-A", destination),
    ).toThrow();
  });
  it("cannot rebind or reuse an unknown or logged-out credential", () => {
    expect(() =>
      assertCredentialDestination("SYNTHETIC-A", "https://issuer.invalid"),
    ).toThrow();
    registerCredentialOrigin("SYNTHETIC-A", "https://issuer.invalid");
    expect(() =>
      registerCredentialOrigin("SYNTHETIC-A", "https://other.invalid"),
    ).toThrow();
    clearCredentialOrigins();
    expect(() =>
      assertCredentialDestination("SYNTHETIC-A", "https://issuer.invalid"),
    ).toThrow();
  });
  it("guards both Bearer and legacy jwtSession even when Authorization is omitted", () => {
    registerCredentialOrigin("SYNTHETIC-A", "https://issuer.invalid");
    expect(() =>
      assertCredentialHeaders(
        "https://other.invalid",
        new Headers({ jwtSession: "SYNTHETIC-A" }),
      ),
    ).toThrow();
    expect(() =>
      assertCredentialHeaders(
        "https://issuer.invalid",
        new Headers({ Authorization: "Bearer SYNTHETIC-UNKNOWN" }),
      ),
    ).toThrow();
  });
  it.each([
    "wss://other.invalid/swarm",
    "ws://issuer.invalid/swarm",
    "wss://issuer.invalid/swarm?token=SYNTHETIC-A",
    "wss://issuer.invalid/swarm?access_token=fixture",
    "wss://issuer.invalid/swarm?jwt=fixture",
  ])("rejects unsafe WebSocket URL %s", (url) => {
    expect(() =>
      assertSafeWebSocketUrl(url, "https://issuer.invalid/v1"),
    ).toThrow();
  });
});
