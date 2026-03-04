import { vscode } from "./vscode";

const isModifiedClick = (event: MouseEvent) =>
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey ||
  event.button !== 0;

export function handleExternalLinkClick(event: MouseEvent, vscodeApi = vscode) {
  if (isModifiedClick(event)) return;

  const target = event.target as HTMLElement | null;
  const anchor = target?.closest?.("a");
  if (!anchor) return;

  const href = anchor.getAttribute("href") || "";
  if (!href) return;

  if (anchor.hasAttribute("data-allow-native")) return;

  if (/^javascript:/i.test(href)) return;

  // Allow hash/document-local anchors
  if (href.startsWith("#")) return;

  // Treat protocol-relative and bare https/http as external
  const normalized =
    href.startsWith("http") || href.startsWith("//")
      ? href.startsWith("//")
        ? `https:${href}`
        : href
      : href.startsWith("/")
        ? `${window.location.origin}${href}`
        : /^https?:\/\//i.test(`https://${href}`)
          ? `https://${href}`
          : href;

  if (/^https?:\/\//i.test(normalized)) {
    event.preventDefault();
    vscodeApi.postMessage({ type: "openInBrowser", url: normalized });
  }
}

export function registerExternalLinkInterceptor(vscodeApi = vscode) {
  const handler = (event: MouseEvent) =>
    handleExternalLinkClick(event, vscodeApi);
  document.addEventListener("click", handler);
  return () => document.removeEventListener("click", handler);
}
