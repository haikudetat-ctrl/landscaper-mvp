"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export function BottomSheetDialog({
  open,
  onClose,
  eyebrow,
  title,
  children,
  maxWidthClassName = "max-w-3xl",
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  maxWidthClassName?: string;
}) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return (
    <div className={`fixed inset-0 z-[80] transition-opacity duration-300 ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
      <button
        type="button"
        aria-label={`Close ${title}`}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute inset-x-0 bottom-0 mx-auto max-h-[85vh] w-full overflow-hidden rounded-t-3xl border border-emerald-100/90 bg-white shadow-2xl transition-transform duration-500 ease-out ${maxWidthClassName} ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/70 px-5 py-4">
          <div>
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#287b40]">{eyebrow}</p>
            ) : null}
            <h2 id={titleId} className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">
              {title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={`Close ${title}`}
            onClick={onClose}
            className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-emerald-50"
          >
            X
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
