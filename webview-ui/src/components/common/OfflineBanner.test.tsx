import { EventEmitter } from "node:events";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCommunicationService } from "@thorapi/context/CommunicationServiceContext";
import OfflineBanner from "./OfflineBanner";

vi.mock("@thorapi/context/CommunicationServiceContext", () => ({ useCommunicationService: vi.fn() }));
vi.mock("@vscode/webview-ui-toolkit/react", () => ({
  VSCodeButton: ({ appearance: _appearance, children, ...props }: any) => <button {...props}>{children}</button>,
}));

let service: EventEmitter & { isNoop: boolean; ready: boolean; error: Error | null };
beforeEach(() => {
  service = Object.assign(new EventEmitter(), { isNoop: false, ready: true, error: null });
  vi.mocked(useCommunicationService).mockReturnValue(service as any);
  vi.useFakeTimers();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

describe("persistent shared connection feedback", () => {
  it("renders no warning for a ready communication service", () => {
    render(<OfflineBanner />); expect(screen.queryByRole("status")).toBeNull();
  });
  it("keeps an unavailable connection visible past the old five-second timeout", () => {
    service.isNoop = true; service.ready = false;
    render(<OfflineBanner />);
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByRole("status")).toHaveTextContent("Shared connections are unavailable. Local editing remains available.");
  });
  it("follows connecting, restored, and interrupted events without remounting", () => {
    service.ready = false; render(<OfflineBanner />);
    act(() => service.emit("status", { phase: "connecting" }));
    expect(screen.getByRole("status")).toHaveTextContent("Connecting shared features");
    act(() => { service.ready = true; service.emit("status", { phase: "connected" }); });
    expect(screen.queryByRole("status")).toBeNull();
    act(() => { service.ready = false; service.error = new Error("fixture interrupted"); service.emit("error", service.error); });
    expect(screen.getByRole("status")).toHaveTextContent("Shared connections are unavailable");
    act(() => { service.error = null; service.ready = true; service.emit("status", { phase: "connected" }); });
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("offers the supplied recovery action without expanding permissions or reconnecting implicitly", () => {
    service.ready = false; const open = vi.fn();
    render(<OfflineBanner onOpenSettings={open} />);
    expect(open).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Connection settings" }));
    expect(open).toHaveBeenCalledTimes(1);
  });
  it("releases both live listeners on unmount", () => {
    const view = render(<OfflineBanner />);
    expect(service.listenerCount("status")).toBe(1); expect(service.listenerCount("error")).toBe(1);
    view.unmount();
    expect(service.listenerCount("status")).toBe(0); expect(service.listenerCount("error")).toBe(0);
  });
});
