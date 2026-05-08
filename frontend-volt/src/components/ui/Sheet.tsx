import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const [prevOpen, setPrevOpen] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open && prevOpen) setIsClosing(true);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open && !isClosing) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm",
          isClosing ? "animate-sheet-fade-out" : "animate-sheet-fade-in",
        )}
      />
      <div
        onAnimationEnd={() => {
          if (isClosing) setIsClosing(false);
        }}
        className={cn(
          "absolute inset-x-0 bottom-0 bg-ink-900 rounded-t-2xl border-t border-white/5",
          "pb-[env(safe-area-inset-bottom)]",
          "will-change-transform",
          isClosing ? "animate-sheet-slide-down" : "animate-sheet-slide-up",
        )}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>
        {title && <div className="px-5 pt-2 pb-4 text-caption">{title}</div>}
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
