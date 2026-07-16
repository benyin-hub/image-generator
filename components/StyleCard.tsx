"use client";

import { Style } from "@/lib/types";

export default function StyleCard({
  style,
  selected,
  editing,
  onSelect,
  onDelete,
}: {
  style: Style;
  selected: boolean;
  editing: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onSelect}
        disabled={editing}
        className={`flex w-full flex-col overflow-hidden rounded-2xl border bg-white text-left transition ${
          selected
            ? "border-brand-500 ring-1 ring-brand-500 shadow-card"
            : "border-slate-200 hover:border-brand-300"
        }`}
      >
        <div className="aspect-square w-full overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={style.thumbnail} alt={style.name} className="h-full w-full object-cover" />
        </div>
        <div className="px-3 py-2">
          <p className="truncate text-xs font-semibold text-slate-700">{style.name}</p>
        </div>
      </button>
      {editing && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${style.name}`}
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition hover:bg-red-600"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
