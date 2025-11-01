import { describe, expect, it } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import { useCommunicationService, CommunicationServiceProvider } from "../CommunicationServiceContext";

describe("CommunicationServiceContext resilience", () => {
  it("returns a safe no-op service when used without provider", () => {
    const { result } = renderHook(() => useCommunicationService());
    const svc = result.current as any;
    expect(svc).toBeDefined();
    expect(typeof svc.sendMessage).toBe("function");
    // Should not throw when calling methods
    expect(() => svc.connect()).not.toThrow();
    expect(() => svc.sendMessage("ping", { foo: "bar" })).not.toThrow();
    expect(() => svc.disconnect()).not.toThrow();
  });

  it("uses the real service when wrapped with provider", () => {
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <CommunicationServiceProvider role="worker">{children}</CommunicationServiceProvider>
    );
    const { result } = renderHook(() => useCommunicationService(), { wrapper });
    const svc = result.current as any;
    expect(svc).toBeDefined();
    expect(typeof svc.sendMessage).toBe("function");
    // Calling connect/disconnect should not throw
    expect(() => svc.connect()).not.toThrow();
    expect(() => svc.disconnect()).not.toThrow();
  });
});

