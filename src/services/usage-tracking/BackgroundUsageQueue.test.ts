import { BackgroundUsageQueue } from "./BackgroundUsageQueue";

const flushMicrotasks = async () => {
  for (let index = 0; index < 4; index++) {
    await Promise.resolve();
  }
};

describe("BackgroundUsageQueue", () => {
  it("returns immediately and starts every accounting write without queue lag", async () => {
    let release!: () => void;
    const first = new Promise<void>((resolve) => {
      release = resolve;
    });
    const events: string[] = [];
    const queue = new BackgroundUsageQueue();

    const firstResult = queue.enqueue(async () => {
      events.push("first:start");
      await first;
      events.push("first:end");
    });
    queue.enqueue(async () => {
      events.push("second");
    });

    expect(firstResult).toBeUndefined();
    await flushMicrotasks();
    expect(events).toEqual(["first:start", "second"]);

    release();
    await queue.onIdle();
    expect(events).toEqual(["first:start", "second", "first:end"]);
  });

  it("continues after an accounting failure", async () => {
    const onError = jest.fn();
    const report = jest.fn(async () => undefined);
    const queue = new BackgroundUsageQueue(onError);
    queue.enqueue(async () => {
      throw new Error("usage endpoint timed out");
    });
    queue.enqueue(report);

    await queue.onIdle();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledTimes(1);
  });
});
