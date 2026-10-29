export class BackgroundUsageQueue {
  private readonly inFlight = new Set<Promise<void>>();

  constructor(
    private readonly onError: (error: unknown) => void = () => undefined,
  ) {}

  enqueue(report: () => Promise<void>): void {
    let job: Promise<void>;
    job = Promise.resolve()
      .then(report)
      .catch((error) => this.onError(error))
      .finally(() => this.inFlight.delete(job));
    this.inFlight.add(job);
  }

  async onIdle(): Promise<void> {
    while (this.inFlight.size) {
      await Promise.all([...this.inFlight]);
    }
  }
}

export const backgroundUsageQueue = new BackgroundUsageQueue((error) => {
  console.error("Failed to report API usage in background:", error);
});
