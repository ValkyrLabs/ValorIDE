import path from "path";

const active = new Set<string>();

/** A double click (or a concurrent pull) must not race staging, checkout or hosted handoff. */
export async function withProjectGitOperation<T>(root: string, run: () => Promise<T>): Promise<T> {
  const key = path.resolve(root);
  if (active.has(key)) throw new Error("A GitHub operation is already running for this app.");
  active.add(key);
  try {
    return await run();
  } finally {
    active.delete(key);
  }
}
