import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

export function Button({
  children,
  className,
  variant = "secondary",
  icon,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sage-600/25 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-sage-700 text-white shadow-sm hover:bg-sage-600",
        variant === "secondary" &&
          "border border-morandi-clay/70 bg-white/80 text-morandi-ink shadow-sm hover:bg-morandi-mist",
        variant === "ghost" && "text-morandi-muted hover:bg-morandi-mist hover:text-morandi-ink",
        variant === "danger" && "bg-red-50 text-red-700 hover:bg-red-100",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
