import type { ButtonHTMLAttributes, HTMLAttributes, KeyboardEvent, ReactNode } from "react";

/** Shared native tab navigation: one tab stop, arrows, Home and End. */
export const TabList = ({ children, className = "", onKeyDown, ...props }: HTMLAttributes<HTMLDivElement>) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.target instanceof HTMLElement && event.target.closest('[role="tablist"]') !== event.currentTarget) return;
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
      .filter(tab => !tab.disabled && tab.getAttribute("aria-disabled") !== "true" && tab.closest('[role="tablist"]') === event.currentTarget);
    if (!tabs.length) return;
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
      : (Math.max(0, current) + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    tabs[next].focus();
    tabs[next].click();
    tabs[next].scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "auto" });
  };
  return <div {...props} role="tablist" className={`valoride-tabs ${className}`} onKeyDown={handleKeyDown}>{children}</div>;
};

export const TabButton = ({ isActive, children, className = "", ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { isActive: boolean; children: ReactNode }) => (
  <button {...props} type="button" role="tab" aria-selected={isActive} tabIndex={isActive ? 0 : -1} className={`valoride-tab ${className}`}>
    {children}
  </button>
);
