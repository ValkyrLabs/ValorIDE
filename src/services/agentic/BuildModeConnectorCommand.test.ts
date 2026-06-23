import {
  parseBuildModeConnectorIntent,
  parseBuildModeConnectorReadCommand,
  serializeBuildModeConnectorReadArtifact,
  summarizeBlockedConnectorMutation,
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
    expect(artifact).toContain("token=<redacted>");
    expect(artifact).toContain("Record bodies are not persisted");
    expect(artifact).not.toContain("secret-value");
  });

  it("redacts sensitive connector query, scope, and trace metadata", () => {
    const descriptor = parseBuildModeConnectorReadCommand(
      [
        "connector:gmail.get data:email.thread",
        'query:"gmail:thread:digital-product-order?token=connector-secret-token"',
        'resource:"gmail://thread/digital-product-order?token=connector-resource-token"',
        'scope:"tenant/principal?token=connector-scope-token"',
        'trace:"Authorization: Bearer trace-secret-token"',
        "receipt:connector_receipt:gmail-thread-dpp-001 records:1",
      ].join(" "),
    );

    const artifact = serializeBuildModeConnectorReadArtifact(
      descriptor!,
      "task-1",
      "cmd-gmail-read",
    );
    const serializedDescriptor = JSON.stringify(descriptor);

    expect(serializedDescriptor).toContain("token=<redacted>");
    expect(serializedDescriptor).toContain("Bearer <redacted-secret>");
    expect(artifact).toContain("Record bodies are not persisted");
    expect(artifact).not.toContain("connector-secret-token");
    expect(artifact).not.toContain("connector-resource-token");
    expect(artifact).not.toContain("connector-scope-token");
    expect(artifact).not.toContain("trace-secret-token");
  });

  it("rejects connector mutation commands", () => {
    expect(
      parseBuildModeConnectorReadCommand(
        "connector:gmail.send data:email.message query:gmail:compose:abc",
        scope,
      ),
    ).toBeUndefined();
  });

  it("captures connector mutation intents as blocked metadata without bodies", () => {
    const descriptor = parseBuildModeConnectorIntent(
      [
        "connector:gmail.send data:email.message",
        'query:"gmail:compose:customer?token=connector-token"',
        'resource:"gmail://compose/customer?token=resource-token"',
        'trace:"Authorization: Bearer connector-trace-secret"',
        'body:"private email body"',
      ].join(" "),
      scope,
    );

    expect(descriptor).toEqual(
      expect.objectContaining({
        action: "send",
        connectorId: "gmail",
        connectorName: "Gmail",
        dataClass: "email.message",
        intent: "mutation",
        queryRef: "gmail:compose:customer?token=<redacted>",
        resourceUri: "gmail://compose/customer?token=<redacted>",
        scopeRef: "tenant-valkyr-demo/principal-valhalla-operator",
        status: "blocked",
        traceId: "Authorization: Bearer <redacted-secret>",
      }),
    );
    expect(summarizeBlockedConnectorMutation(descriptor!)).toBe(
      "Gmail send was blocked in Build Mode. Connector mutations require an external approved connector workflow and are not executed by the connector read lane.",
    );
    expect(JSON.stringify(descriptor)).not.toContain("private email body");
    expect(JSON.stringify(descriptor)).not.toContain("connector-token");
    expect(JSON.stringify(descriptor)).not.toContain("resource-token");
    expect(JSON.stringify(descriptor)).not.toContain("connector-trace-secret");
  });
});
