import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./Button";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  widthClass?: string;
  bodyClassName?: string;
};

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  widthClass = "max-w-2xl",
  bodyClassName = "p-5"
}: ModalProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2f2d2a]/45 px-4 py-6 backdrop-blur-sm animate-paper-fade-up">
      <div
        className={`max-h-[92vh] w-full ${widthClass} overflow-hidden rounded-xl border border-white/70 bg-paper-50 shadow-panel ring-1 ring-morandi-clay/40`}
      >
        <div className="flex items-start justify-between border-b border-morandi-clay/70 bg-morandi-blue/50 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-morandi-ink">{title}</h2>
            {description ? <p className="mt-1 text-sm text-morandi-muted">{description}</p> : null}
          </div>
          <Button
            variant="ghost"
            className="h-8 w-8 shrink-0 px-0"
            onClick={onClose}
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className={`max-h-[calc(92vh-72px)] overflow-y-auto ${bodyClassName}`}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
