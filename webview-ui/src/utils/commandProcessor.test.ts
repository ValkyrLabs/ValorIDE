import { FrontendCommandProcessor } from "./commandProcessor";

describe("FrontendCommandProcessor widget actions", () => {
  it("dispatches versioned widget open events and telemetry hook", async () => {
    const telemetryHook = jest.fn();
    const eventSpy = jest.fn();
    window.addEventListener(
      "valoride:widget-action",
      eventSpy as EventListener,
    );

    const processor = new FrontendCommandProcessor({ telemetryHook });

    const result = await processor.processCommands(
      '<widget_action><version>1</version><phase>open</phase><widget>integration-account</widget><payload>{"id":"acc_1"}</payload></widget_action>',
    );

    expect(result).toContain("[widget:open:integration-account]");
    expect(telemetryHook).toHaveBeenCalledTimes(1);
    expect(telemetryHook.mock.calls[0][0]).toMatchObject({
      kind: "widget_command",
      version: "1",
      phase: "open",
      widgetType: "integration-account",
      payload: { id: "acc_1" },
    });
    expect(eventSpy).toHaveBeenCalledTimes(1);

    window.removeEventListener(
      "valoride:widget-action",
      eventSpy as EventListener,
    );
  });

  it("keeps backward compatibility by rejecting unsupported version", async () => {
    const processor = new FrontendCommandProcessor({});

    const result = await processor.processCommands(
      "<widget_action><version>2</version><phase>open</phase><widget>form</widget></widget_action>",
    );

    expect(result).toContain(
      "[Widget action failed: Unsupported widget action version: 2]",
    );
  });
});
