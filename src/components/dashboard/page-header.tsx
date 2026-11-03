import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 text-silver-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PanelSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-white/[0.05]" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-[1.25rem] bg-white/[0.04]" />
      ))}
    </div>
  );
}
