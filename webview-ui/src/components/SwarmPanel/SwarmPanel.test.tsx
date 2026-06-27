import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SwarmPanel from "./SwarmPanel";

const activeBilling = {
  activeAgentCount: 8,
  quotaAgents: 10,
  totalCharges: 11.5,
  billingStatus: "ACTIVE",
  remainingQuota: 2,
};

function mockFetchWithBilling(status: any) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.includes("/billing/status")) {
        return Promise.resolve({ ok: true, json: async () => status });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    }) as any,
  );
}

describe("SwarmPanel billing conversion flow", () => {
  beforeEach(() => {
    vi.stubGlobal("open", vi.fn());
    (window as any).__valkyr_organizationId = "org-123";
    (window as any).__valoride_workspaceId = "workspace-456";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as any).__valkyr_organizationId;
    delete (window as any).__valoride_workspaceId;
  });

  it("opens upgrade flow from Upgrade Quota", async () => {
    mockFetchWithBilling(activeBilling);
    render(<SwarmPanel />);

    fireEvent.click(screen.getByText("💰 Billing"));

    await waitFor(() => {
      expect(screen.getByText("💳 Upgrade Quota")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("💳 Upgrade Quota"));
    expect(screen.getByText("Upgrade quota")).toBeInTheDocument();
  });

  it("starts checkout with organization and workspace attribution", async () => {
    mockFetchWithBilling({
      ...activeBilling,
      activeAgentCount: 10,
      remainingQuota: 0,
    });
    render(<SwarmPanel />);

    fireEvent.click(screen.getByText("💰 Billing"));
    await waitFor(() => {
      expect(screen.getByText("💳 Upgrade Quota")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("💳 Upgrade Quota"));
    fireEvent.click(screen.getByText("Start checkout"));

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("source=valoride-swarm-quota"),
      "_blank",
    );
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("organizationId=org-123"),
      "_blank",
    );
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("workspaceId=workspace-456"),
      "_blank",
    );
  });

  it("opens billing history from Billing History", async () => {
    mockFetchWithBilling(activeBilling);
    render(<SwarmPanel />);

    fireEvent.click(screen.getByText("💰 Billing"));
    await waitFor(() => {
      expect(screen.getByText("📋 View Billing History")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("📋 View Billing History"));
    expect(screen.getByText("Billing history")).toBeInTheDocument();
  });

  it("shows suspended recovery copy in upgrade flow", async () => {
    mockFetchWithBilling({
      ...activeBilling,
      billingStatus: "SUSPENDED",
      remainingQuota: 0,
    });
    render(<SwarmPanel />);

    fireEvent.click(screen.getByText("💰 Billing"));
    await waitFor(() => {
      expect(screen.getByText("💳 Upgrade Quota")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("💳 Upgrade Quota"));
    expect(
      screen.getByText(
        /Billing is suspended\. Update payment method, buy credits/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Update payment method")).toBeInTheDocument();
    expect(screen.getByText("Buy credits")).toBeInTheDocument();
    expect(screen.getByText("Contact admin")).toBeInTheDocument();
    expect(screen.getByText("Contact support")).toBeInTheDocument();
  });

  it("tracks quota warning analytics once", async () => {
    const analyticsSpy = vi.fn();
    window.addEventListener("valoride-analytics", analyticsSpy);
    mockFetchWithBilling({
      ...activeBilling,
      activeAgentCount: 8,
      quotaAgents: 10,
    });

    render(<SwarmPanel />);
    await waitFor(() => {
      expect(analyticsSpy).toHaveBeenCalled();
    });

    const warningEvents = analyticsSpy.mock.calls.filter((call) => {
      const event = call[0] as CustomEvent;
      return event.detail.eventName === "valoride.quota_warning_seen";
    });
    expect(warningEvents).toHaveLength(1);
    expect(warningEvents[0][0].detail).toEqual(
      expect.objectContaining({
        organizationId: "org-123",
        workspaceId: "workspace-456",
      }),
    );

    window.removeEventListener("valoride-analytics", analyticsSpy);
  });
});
