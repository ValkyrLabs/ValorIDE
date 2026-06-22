import {
  parseBuildModeConnectorReadCommand,
  serializeBuildModeConnectorReadArtifact,
  summarizeBuildModeConnectorRead,
} from "./BuildModeConnectorCommand";

const scope = {
  principalId: "principal-valhalla-operator",
  roles: ["Owner"],
  tenantId: "tenant-valkyr-demo",
  workspaceRoot: "/workspace/valor",
  policyRefs: ["policy:valhalla-build-mode"],
};

describe("BuildModeConnectorCommand", () => {
  it("parses connector read commands into receipt-safe metadata", () => {
    const descriptor = parseBuildModeConnectorReadCommand(
      "connector:gmail.read data:email.thread query:gmail:thread:digital-product-order receipt:connector_receipt:gmail-thread-dpp-001 records:2 trace:connector-trace-gmail-dpp-001",
      scope,
    );

    expect(descriptor).toEqual({
      action: "read",
      connectorId: "gmail",
      connectorName: "Gmail",
      dataClass: "email.thread",
      queryRef: "gmail:thread:digital-product-order",
      receiptRef: "connector_receipt:gmail-thread-dpp-001",
      recordCount: 2,
      resourceUri: "gmail://thread:digital-product-order",
      scopeRef: "tenant-valkyr-demo/principal-valhalla-operator",
      status: "authorized",
      traceId: "connector-trace-gmail-dpp-001",
    });
    expect(summarizeBuildModeConnectorRead(descriptor!)).toBe(
      "Gmail email.thread read is backed by connector receipt connector_receipt:gmail-thread-dpp-001.",
    );
  });

  it("serializes connector artifacts without connector record bodies", () => {
    const descriptor = parseBuildModeConnectorReadCommand(
      'connector:google-calendar.search data:calendar.events query:"google-calendar:events:today?token=secret-value" status:partial',
      scope,
    );

    const artifact = serializeBuildModeConnectorReadArtifact(
      descriptor!,
      "task-1",
      "cmd-calendar-read",
    );

    expect(artifact).toContain('"connectorName": "Google Calendar"');
    expect(artifact).toContain("token=[redacted]");
    expect(artifact).toContain("Record bodies are not persisted");
    expect(artifact).not.toContain("secret-value");
  });

  it("rejects connector mutation commands", () => {
    expect(
      parseBuildModeConnectorReadCommand(
        "connector:gmail.send data:email.message query:gmail:compose:abc",
        scope,
      ),
    ).toBeUndefined();
  });
});
