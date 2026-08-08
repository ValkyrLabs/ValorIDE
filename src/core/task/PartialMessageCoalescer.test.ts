import { PartialMessageCoalescer } from "./PartialMessageCoalescer";

const flushMicrotasks = async () => {
  for (let index = 0; index < 6; index++) {
    await Promise.resolve();
  }
};

describe("PartialMessageCoalescer", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("posts only the newest partial value in each frame", async () => {
    const send = jest.fn(async () => undefined);
    const coalescer = new PartialMessageCoalescer(send, 32);

    coalescer.enqueue("a");
    coalescer.enqueue("ab");
    coalescer.enqueue("abc");
    expect(send).not.toHaveBeenCalled();

    jest.advanceTimersByTime(32);
    await flushMicrotasks();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenLastCalledWith("abc");
  });

  it("does not build a post backlog while the webview is busy", async () => {
    let release!: () => void;
    const firstPost = new Promise<void>((resolve) => {
      release = resolve;
    });
    const send = jest
      .fn<Promise<void>, [string]>()
      .mockReturnValueOnce(firstPost)
      .mockResolvedValue(undefined);
    const coalescer = new PartialMessageCoalescer(send, 32);

    coalescer.enqueue("first");
    jest.advanceTimersByTime(32);
    await flushMicrotasks();
    coalescer.enqueue("stale");
    coalescer.enqueue("latest");
    jest.advanceTimersByTime(320);
    await flushMicrotasks();
    expect(send).toHaveBeenCalledTimes(1);

    release();
    await flushMicrotasks();
    jest.advanceTimersByTime(32);
    await flushMicrotasks();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith("latest");
  });

  it("drops a queued partial before a final message is posted", async () => {
    const send = jest.fn(async () => undefined);
    const coalescer = new PartialMessageCoalescer(send, 32);
    coalescer.enqueue("partial");

    await coalescer.discardPendingAndWait();
    jest.advanceTimersByTime(64);
    await flushMicrotasks();
    expect(send).not.toHaveBeenCalled();
  });

  it("does not schedule a partial that races with finalization", async () => {
    let release!: () => void;
    const inFlight = new Promise<void>((resolve) => {
      release = resolve;
    });
    const send = jest.fn<Promise<void>, [string]>().mockReturnValue(inFlight);
    const coalescer = new PartialMessageCoalescer(send, 32);

    coalescer.enqueue("first");
    jest.advanceTimersByTime(32);
    await flushMicrotasks();
    const finalizing = coalescer.discardPendingAndWait();
    coalescer.enqueue("stale-during-finalize");

    release();
    await finalizing;
    jest.advanceTimersByTime(64);
    await flushMicrotasks();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("first");
  });
});
