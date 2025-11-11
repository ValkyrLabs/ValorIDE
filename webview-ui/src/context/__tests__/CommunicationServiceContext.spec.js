import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCommunicationService, CommunicationServiceProvider } from "../CommunicationServiceContext";
describe("CommunicationServiceContext resilience", () => {
    it("returns a safe no-op service when used without provider", () => {
        const { result } = renderHook(() => useCommunicationService());
        const svc = result.current;
        expect(svc).toBeDefined();
        expect(typeof svc.sendMessage).toBe("function");
        // Should not throw when calling methods
        expect(() => svc.connect()).not.toThrow();
        expect(() => svc.sendMessage("ping", { foo: "bar" })).not.toThrow();
        expect(() => svc.disconnect()).not.toThrow();
    });
    it("uses the real service when wrapped with provider", () => {
        const wrapper = ({ children }) => (_jsx(CommunicationServiceProvider, { role: "worker", children: children }));
        const { result } = renderHook(() => useCommunicationService(), { wrapper });
        const svc = result.current;
        expect(svc).toBeDefined();
        expect(typeof svc.sendMessage).toBe("function");
        // Calling connect/disconnect should not throw
        expect(() => svc.connect()).not.toThrow();
        expect(() => svc.disconnect()).not.toThrow();
    });
});
//# sourceMappingURL=CommunicationServiceContext.spec.js.map