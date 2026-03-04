import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleExternalLinkClick } from "./linkInterceptor";

const createClickEvent = (target: Element) => {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "target", { value: target, writable: false });
  event.preventDefault = vi.fn();
  return event;
};

describe("handleExternalLinkClick", () => {
  const postMessage = vi.fn();
  const vscode = { postMessage } as any;

  beforeEach(() => {
    postMessage.mockReset();
  });

  it("routes external links through openInBrowser message", () => {
    const anchor = document.createElement("a");
    anchor.href = "https://stripe.com/pay";
    document.body.appendChild(anchor);

    const event = createClickEvent(anchor);
    handleExternalLinkClick(event, vscode);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledWith({
      type: "openInBrowser",
      url: "https://stripe.com/pay",
    });
  });

  it("allows native behavior when data-allow-native is present", () => {
    const anchor = document.createElement("a");
    anchor.href = "https://valkyrlabs.com";
    anchor.setAttribute("data-allow-native", "true");
    document.body.appendChild(anchor);

    const event = createClickEvent(anchor);
    handleExternalLinkClick(event, vscode);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
  });
});
