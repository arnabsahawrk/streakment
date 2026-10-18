"use client";

import { Archive, BookOpen, ChartColumn, Flame, Settings as Cog, X } from "lucide-react";
import { motion } from "motion/react";
import PathStrip from "./PathStrip";

const PHILOSOPHY_URL =
  "https://app.notion.com/p/arnabsahawrk/STREAKMENT-PHILOSOPHY-3aeb14a91aeb80c5b8d8cd3fa66023ee";

const ROW =
  "press flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-paper-dim transition-colors hover:bg-ash hover:text-paper";

export default function Sidebar({
  onClose,
  onOpen,
  onIntent,
}: {
  onClose: () => void;
  onOpen: (what: "add" | "archive" | "settings" | "stats") => void;
  /** Warm up a screen's code the moment a finger lands on its button. */
  onIntent?: (what: "archive" | "settings" | "stats") => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} />
      <motion.aside
        onClick={(e) => e.stopPropagation()}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 34, stiffness: 400 }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.6 }}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          if (info.offset.x > 80 || info.velocity.x > 500) onClose();
        }}
        style={{ touchAction: "pan-y" }}
        className="no-scrollbar contain-scroll relative ml-auto flex h-full w-[88vw] max-w-sm flex-col overflow-y-auto border-l border-ember-line bg-ash-raised p-5"
      >
        <div className="mb-3 flex items-start justify-between">
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
          <button onClick={onClose} aria-label="Close" className="press p-1 text-paper-dim hover:text-paper">
            <X size={18} />
          </button>
        </div>

        {/* The three layers, straight under the brand: one line when there is
            room, breaking at an arrow (never inside a name) when there isn't. */}
        <PathStrip className="mb-6 text-[10px] tracking-tight text-paper-dim" />

        <nav className="flex flex-col gap-1">
          {[
            { key: "add" as const, icon: Flame, label: "Add Streakment" },
            { key: "stats" as const, icon: ChartColumn, label: "Stats" },
            { key: "archive" as const, icon: Archive, label: "Archive" },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => {
                onOpen(key);
                onClose();
              }}
              onPointerDown={() => key !== "add" && onIntent?.(key)}
              className={ROW}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
          <a href={PHILOSOPHY_URL} target="_blank" rel="noopener noreferrer" className={ROW}>
            <BookOpen size={16} /> Streakment Philosophy
          </a>
          <button
            onClick={() => {
              onOpen("settings");
              onClose();
            }}
            onPointerDown={() => onIntent?.("settings")}
            className={ROW}
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
              rel="noopener noreferrer"
              className="text-flame hover:underline"
            >
              Arnab Saha
            </a>
          </p>
        </div>
      </motion.aside>
    </motion.div>
  );
}
