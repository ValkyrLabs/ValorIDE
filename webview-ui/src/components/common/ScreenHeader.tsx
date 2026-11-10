import type { ReactNode } from "react";

/** Shared hierarchy for sidebar destinations. Actions wrap rather than pushing the title offscreen. */
export function ScreenHeader({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="valoride-screen-header">
      <h2>{title}</h2>
      <div className="valoride-screen-actions">{children}</div>
    </header>
  );
}
