import clsx from "clsx";
import { X } from "lucide-react";
import { Button } from "./button";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}) {
  if (!open) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8 overflow-y-auto">
      <div className={clsx("relative w-full rounded-2xl bg-white shadow-xl max-h-[calc(100vh-4rem)] flex flex-col", sizes[size])}>
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description && <p className="text-sm text-slate-500">{description}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-border px-6 py-4 flex-shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

