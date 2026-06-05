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
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-sage-600/25 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm",
        variant === "primary" &&
          "bg-sage-700 text-white shadow-sm hover:-translate-y-0.5 hover:bg-sage-600 hover:shadow-md hover:shadow-sage-700/18",
        variant === "secondary" &&
          "border border-morandi-clay/70 bg-white/80 text-morandi-ink shadow-sm hover:-translate-y-0.5 hover:bg-morandi-mist hover:shadow-md hover:shadow-[#7c756e]/10",
        variant === "ghost" &&
          "text-morandi-muted hover:bg-morandi-mist hover:text-morandi-ink active:bg-morandi-clay/35",
        variant === "danger" &&
          "bg-red-50 text-red-700 hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-md hover:shadow-red-900/10",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
