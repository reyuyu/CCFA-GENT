import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-[#b8afa4] bg-[#f7f3ee]/72 px-6 py-10 text-center shadow-soft">
      <h3 className="text-base font-semibold text-morandi-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-morandi-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
