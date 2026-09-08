export interface MinimalTextChange {
  endOffset: number;
  startOffset: number;
  text: string;
}

/**
 * Return only the completed-line prefix that is safe to render while a model
 * is still streaming. Token updates inside the current line are intentionally
 * coalesced until the line completes (or the final update arrives).
 */
export const getCompletedLineSnapshot = (
  accumulatedContent: string,
): string | undefined => {
  const lastNewline = accumulatedContent.lastIndexOf("\n");
  return lastNewline >= 0
    ? accumulatedContent.slice(0, lastNewline + 1)
    : undefined;
};

/**
 * Calculate the smallest replacement that turns currentContent into
 * nextContent. Applying this range avoids invalidating the entire VS Code
 * diff document for every streamed update.
 */
export const calculateMinimalTextChange = (
  currentContent: string,
  nextContent: string,
): MinimalTextChange | undefined => {
  if (currentContent === nextContent) {
    return undefined;
  }

  const sharedLimit = Math.min(currentContent.length, nextContent.length);
  let startOffset = 0;
  while (
    startOffset < sharedLimit &&
    currentContent.charCodeAt(startOffset) ===
      nextContent.charCodeAt(startOffset)
  ) {
    startOffset += 1;
  }

  let currentEnd = currentContent.length;
  let nextEnd = nextContent.length;
  while (
    currentEnd > startOffset &&
    nextEnd > startOffset &&
    currentContent.charCodeAt(currentEnd - 1) ===
      nextContent.charCodeAt(nextEnd - 1)
  ) {
    currentEnd -= 1;
    nextEnd -= 1;
  }

  return {
    endOffset: currentEnd,
    startOffset,
    text: nextContent.slice(startOffset, nextEnd),
  };
};

export const shouldRenderPartialSnapshot = (options: {
  chunkSize: number;
  currentContent: string;
  lastRenderAt: number;
  minimumIntervalMs: number;
  nextContent: string;
  now: number;
}): boolean => {
  if (options.currentContent === options.nextContent) {
    return false;
  }

  if (options.lastRenderAt === 0) {
    return true;
  }

  const changedBytes = Math.abs(
    options.nextContent.length - options.currentContent.length,
  );
  return (
    changedBytes >= options.chunkSize ||
    options.now - options.lastRenderAt >= options.minimumIntervalMs
  );
};
