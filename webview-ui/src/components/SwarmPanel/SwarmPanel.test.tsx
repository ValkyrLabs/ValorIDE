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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
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
    mockFetchWithBilling({ ...activeBilling, billingStatus: "SUSPENDED", remainingQuota: 0 });
    render(<SwarmPanel />);

    fireEvent.click(screen.getByText("💰 Billing"));
    await waitFor(() => {
      expect(screen.getByText("💳 Upgrade Quota")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("💳 Upgrade Quota"));
    expect(
      screen.getByText(/Billing is suspended\. Update payment method/i),
    ).toBeInTheDocument();
  });
});
