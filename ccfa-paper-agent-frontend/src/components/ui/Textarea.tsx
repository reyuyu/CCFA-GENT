import type { TextareaHTMLAttributes } from "react";
import clsx from "clsx";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        "w-full resize-none rounded-md border-morandi-clay/70 bg-[#fbfaf7] px-3 py-2 text-sm leading-6 text-morandi-ink shadow-sm placeholder:text-morandi-muted focus:border-sage-600 focus:ring-sage-600/20",
        className
      )}
      {...props}
    />
  );
}
