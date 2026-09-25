"use client";

import { Archive, Settings as Cog, FileText, NotepadText, X, Zap } from "lucide-react";

export default function Sidebar({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (what: "add" | "archive" | "settings") => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="sm-fade absolute inset-0 bg-black/70" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="no-scrollbar relative ml-auto flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-l border-ember-line bg-ash-raised p-5 sm-rise"
      >
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-xl"
            />
            <div>
              <p className="text-sm font-bold tracking-tight">STREAKMENT</p>
              <p className="text-[10px] text-paper-dim">Streak + Commitment</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-paper-dim hover:text-paper">
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {[
            { key: "add" as const, icon: Zap, label: "Add Streakment" },
            { key: "archive" as const, icon: Archive, label: "Archive" },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => {
                onOpen(key);
                onClose();
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-paper-dim transition-colors hover:bg-ash hover:text-paper"
            >
              <Icon size={16} /> {label}
            </button>
          ))}
          <a
            href="https://app.notion.com/p/arnabsahawrk/COMMITMENT-3aeb14a91aeb80c5b8d8cd3fa66023ee"
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-paper-dim transition-colors hover:bg-ash hover:text-paper"
          >
            <FileText size={16} /> Read Commitment
          </a>
          <a
            href="https://app.notion.com/p/arnabsahawrk/NOTE-3bfb14a91aeb80548a99cfd97fe42abc"
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-paper-dim transition-colors hover:bg-ash hover:text-paper"
          >
            <NotepadText size={16} />
            Read Note
          </a>
          <button
            onClick={() => {
              onOpen("settings");
              onClose();
            }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-paper-dim transition-colors hover:bg-ash hover:text-paper"
          >
            <Cog size={16} /> Settings
          </button>
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
