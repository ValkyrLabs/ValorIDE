/**
 * Keeps extension-host streaming responsive by allowing at most one webview
 * post at a time and retaining only the newest pending partial update.
 */
export class PartialMessageCoalescer<T> {
  private inFlight?: Promise<void>;
  private pending?: T;
  private timer?: NodeJS.Timeout;
  private finalizing = false;

  constructor(
    private readonly send: (value: T) => Promise<unknown>,
    private readonly intervalMs = 32,
    private readonly onError: (error: unknown) => void = () => undefined,
  ) {}

  enqueue(value: T): void {
    if (this.finalizing) {
      return;
    }
    this.pending = value;
    if (!this.timer && !this.inFlight) {
      this.timer = setTimeout(() => this.dispatch(), this.intervalMs);
    }
  }

  async discardPendingAndWait(): Promise<void> {
    this.finalizing = true;
    this.pending = undefined;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    await this.inFlight;
    // Ignore anything that raced with the in-flight post while a newer full
    // state was waiting to be published.
    this.pending = undefined;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.finalizing = false;
  }

  dispose(): void {
    this.finalizing = true;
    this.pending = undefined;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private dispatch(): void {
    this.timer = undefined;
    const value = this.pending;
    this.pending = undefined;
    if (value === undefined) {
      return;
    }

    this.inFlight = Promise.resolve(this.send(value))
      .then(() => undefined)
      .catch((error) => this.onError(error))
      .finally(() => {
        this.inFlight = undefined;
        if (this.pending !== undefined && !this.timer) {
          this.timer = setTimeout(() => this.dispatch(), this.intervalMs);
        }
      });
  }
}
