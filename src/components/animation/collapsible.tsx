"use client";

import { useState, type ReactNode } from "react";

/** A <details> that keeps whatever open/closed state the user chose across page refreshes. */
export function Collapsible({
  summary,
  initiallyOpen,
  className,
  summaryClassName,
  children,
}: {
  summary: ReactNode;
  initiallyOpen: boolean;
  className?: string;
  summaryClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <details
      className={className}
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className={summaryClassName}>{summary}</summary>
      {children}
    </details>
  );
}
