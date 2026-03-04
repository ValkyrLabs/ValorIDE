import { expect } from "chai";
import { MothershipService } from "../../services/communication/MothershipService";

describe("MothershipService reliability", () => {
  it("acks each inbound messageId only once", () => {
    const service = new MothershipService({ jwtToken: "token", instanceId: "self" }) as any;
    const sentTopics: string[] = [];
    service.sendAppTopic = (topic: string) => {
      sentTopics.push(topic);
    };

    const mk = (id: string) => ({
      type: "broadcast",
      payload: JSON.stringify({ topic: "tool:run", senderId: "peer", messageId: id }),
    });

    service.handleIncomingMessage(mk("m-1"));
    service.handleIncomingMessage(mk("m-1"));

    expect(sentTopics.filter((t) => t === "ack").length).to.equal(1);
  });

  it("replays buffered out-of-order sequence when gap closes", () => {
    const service = new MothershipService({ jwtToken: "token", instanceId: "self" }) as any;
    const seen: number[] = [];

    service.on("broadcast", (payload: any) => {
      seen.push(payload.sequence);
    });

    const msg = (sequence: number) => ({
      type: "broadcast",
      payload: JSON.stringify({ topic: "presence:here", senderId: `peer-${sequence}`, messageId: `m-${sequence}`, sequence }),
    });

    service.handleIncomingMessage(msg(1));
    service.handleIncomingMessage(msg(3));
    service.handleIncomingMessage(msg(2));

    expect(seen).to.deep.equal([1, 2, 3]);
  });

  it("tracks liveness snapshot from presence events", () => {
    const service = new MothershipService({ jwtToken: "token", instanceId: "self" }) as any;
    service.handleIncomingMessage({
      type: "broadcast",
      payload: JSON.stringify({ topic: "presence:here", senderId: "peer-a", messageId: "m-1", sequence: 1 }),
    });

    const snapshot = service.getPresenceSnapshot(Date.now(), 5 * 60 * 1000);
    expect(snapshot["peer-a"]).to.exist;
    expect(snapshot["peer-a"].online).to.equal(true);
  });
});
