"use client";

import { Flame, X, Archive, Settings as Cog } from "lucide-react";

export default function Sidebar({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (what: "archive" | "settings") => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="no-scrollbar relative ml-auto flex h-full w-72 flex-col overflow-y-auto border-l border-ember-line bg-ash-raised p-5 sm-rise"
      >
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-flame/15">
              <Flame size={18} className="text-flame" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight">STREAKMENT</p>
              <p className="text-[10px] text-paper-dim">Streak + Commitment</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close menu" className="text-paper-dim hover:text-paper">
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {[
            { key: "archive" as const, icon: Archive, label: "Archive" },
            { key: "settings" as const, icon: Cog, label: "Settings" },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => { onOpen(key); onClose(); }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-paper-dim transition-colors hover:bg-ash hover:text-paper"
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-ember-line pt-4 text-center">
          <p className="text-[11px] text-paper-dim">
            A project by{" "}
            <a
              href="https://arnabsaha.vercel.app"
              target="_blank"
              rel="noreferrer noopener"
              className="text-flame hover:underline"
            >
              Arnab Saha
            </a>
          </p>
        </div>
      </aside>
    </div>
  );
}
