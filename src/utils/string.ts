/**
 * Fixes incorrectly escaped HTML entities in AI model outputs
 * @param text String potentially containing incorrectly escaped HTML entities from AI models
 * @returns String with HTML entities converted back to normal characters
 */
export function fixModelHtmlEscaping(text: string): string {
  return text
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'");
}

/** Repair XML-escaped shell syntax before approval; preserve quoted literal data. */
export function normalizeModelCommand(command: string): string {
  let quote: string | undefined;
  let encodedQuote = false;
  let result = "";
  for (let i = 0; i < command.length; i++) {
    let char = command[i];
    if (char === "\\" && quote !== "'") {
      result += command.slice(i, i + 2);
      i++;
      continue;
    }
    if (char === "&" && (!quote || encodedQuote)) {
      const entity = command.slice(i).match(/^&(amp|lt|gt|quot|apos);/);
      if (entity) {
        char = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[entity[1]]!;
        i += entity[0].length - 1;
        if (!quote && (char === '"' || char === "'")) encodedQuote = true;
      }
    }
    if (char === '"' || char === "'") {
      if (!quote) quote = char;
      else if (quote === char) {
        quote = undefined;
        encodedQuote = false;
      }
    }
    result += char;
  }
  return result;
}

/**
 * Removes invalid characters (like the replacement character �) from a string
 * @param text String potentially containing invalid characters
 * @returns String with invalid characters removed
 */
export function removeInvalidChars(text: string): string {
  return text.replace(/\uFFFD/g, "");
}

/**
 * Normalises end-of-line characters to a single representation.
 * Useful when diff algorithms need consistent newlines before rewriting.
 */
export function normalizeEol(text: string, newline: string): string {
  const replacement = newline || "\n";
  return text.replace(/\r\n|\r|\n/g, replacement);
}
