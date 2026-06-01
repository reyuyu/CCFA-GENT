import type { ReactNode } from "react";
import clsx from "clsx";

type BadgeTone = "neutral" | "green" | "amber" | "blue" | "red";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-morandi-mist text-morandi-muted",
        tone === "green" && "bg-morandi-green text-sage-700",
        tone === "amber" && "bg-[#eee2cf] text-[#8a6d3b]",
        tone === "blue" && "bg-morandi-blue text-[#536b73]",
        tone === "red" && "bg-red-50 text-red-700"
      )}
    >
      {children}
    </span>
  );
}
