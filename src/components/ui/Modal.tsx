import { useEffect, type ReactNode } from "react";
import { Button } from "./Button";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ open, title, onClose, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-surface p-6 shadow-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="modal-title" className="text-lg font-bold text-white">
            {title}
          </h2>
          <Button variant="ghost" type="button" className="!px-2 !py-1 text-zinc-500" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="text-sm text-zinc-300">{children}</div>
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">{footer}</div> : null}
      </div>
    </div>
  );
}
