"use client";

import { useEffect, type ReactNode } from "react";

export default function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="sm-fade fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`no-scrollbar max-h-[88vh] w-full overflow-y-auto rounded-t-2xl border border-ember-line bg-ash-raised p-5 sm-rise sm:rounded-2xl sm:p-6 ${
          wide ? "sm:max-w-lg" : "sm:max-w-sm"
        }`}
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="break-words text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="shrink-0 text-sm text-paper-dim hover:text-paper">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
