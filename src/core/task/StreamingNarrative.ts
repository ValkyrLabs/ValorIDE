import type { ValorIDEMessage } from "../../shared/ExtensionMessage";
import { PartialMessageCoalescer } from "./PartialMessageCoalescer";
import type {
  ApiStreamChunk,
  ApiStreamUsageChunk,
} from "../../api/transform/stream";

/** A tool may finish before the provider sends its final summary snapshots.
 * Consume those and billing without ever executing trailing answer/tool text. */
export async function drainRequestTail(
  it: AsyncIterator<ApiStreamChunk>,
  usage: (c: ApiStreamUsageChunk) => void,
  visible: (
    c: Extract<ApiStreamChunk, { type: "progress" | "reasoning" }>,
  ) => Promise<void>,
) {
  for (let next = await it.next(); !next.done; next = await it.next()) {
    const c = next.value;
    if (c?.type === "usage") usage(c);
    else if (c?.type === "reasoning" || c?.type === "progress")
      await visible(c);
  }
}

/** One row per provider request, identified by ts rather than "last message".
 * Some streams return more summary after answer text. Reopening that same row
 * must neither duplicate earlier thinking nor displace an in-progress answer. */
export class StreamingNarrative {
  private row?: ValorIDEMessage;
  private dirty = false;
  private readonly updates: PartialMessageCoalescer<ValorIDEMessage>;

  constructor(
    private readonly nextId: () => number,
    private readonly open: (row: ValorIDEMessage) => Promise<void>,
    private readonly post: (row: ValorIDEMessage) => Promise<unknown>,
    private readonly save: () => Promise<void>,
    private readonly kind: "reasoning" | "provider_status" = "reasoning",
  ) {
    this.updates = new PartialMessageCoalescer(post);
  }

  async append(delta: string) {
    if (!delta) return;
    this.dirty = true;
    if (!this.row) {
      this.row = {
        ts: this.nextId(),
        type: "say",
        say: this.kind,
        partial: true,
        text: delta,
      };
      await this.open(this.row);
    } else {
      this.row.partial = true;
      this.row.text =
        this.kind === "provider_status" ? delta : (this.row.text ?? "") + delta;
      this.updates.enqueue({ ...this.row });
    }
  }

  async seal() {
    if (!this.row || !this.dirty) return;
    this.dirty = false;
    await this.updates.discardPendingAndWait();
    this.row.partial = false;
    await this.save();
    await this.post({ ...this.row });
  }

  dispose() {
    this.updates.dispose();
  }
}
