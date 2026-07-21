"use client";

import { useEffect, useState } from "react";
import { Style } from "@/lib/types";

export default function StyleCard({
  style,
  selected,
  editing,
  onSelect,
  onDelete,
  onRename,
}: {
  style: Style;
  selected: boolean;
  editing: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [name, setName] = useState(style.name);

  useEffect(() => {
    setName(style.name);
  }, [style.name, editing]);

  function commitRename() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== style.name) {
      onRename(trimmed);
    } else {
      setName(style.name);
    }
  }

  const hasAnalysis =
    (style.characteristics && style.characteristics.length > 0) ||
    (style.colors && style.colors.length > 0);

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border bg-white transition ${
        selected ? "border-brand-500 ring-1 ring-brand-500 shadow-card" : "border-slate-200 hover:border-brand-300"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={editing}
        className="flex w-full flex-col text-left"
      >
        <div className="aspect-square w-full overflow-hidden rounded-t-2xl bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={style.thumbnail} alt={style.name} className="h-full w-full object-cover" />
        </div>
        {!editing && (
          <div className="px-3 py-2">
            <p className="truncate text-xs font-semibold text-slate-700">{style.name}</p>
          </div>
        )}
      </button>
      {editing && (
        <div className="px-3 py-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                setName(style.name);
                e.currentTarget.blur();
              }
            }}
            aria-label={`Rename ${style.name}`}
            className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-xs font-semibold text-slate-700 focus:border-brand-400 focus:outline-none"
          />
        </div>
      )}
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
      {hasAnalysis && (
        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 opacity-0 shadow-popover transition group-hover:opacity-100">
          {style.characteristics && style.characteristics.length > 0 && (
            <>
              <p className="font-semibold text-slate-800">Visual characteristics:</p>
              <ul className="mt-1 space-y-0.5">
                {style.characteristics.map((c) => (
                  <li key={c}>☑ {c}</li>
                ))}
              </ul>
            </>
          )}
          {style.colors && style.colors.length > 0 && (
            <>
              <p className="mt-2 font-semibold text-slate-800">Color palette:</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {style.colors.map((hex) => (
                  <span key={hex} className="flex items-center gap-1">
                    <span
                      className="h-3 w-3 rounded-full border border-slate-300"
                      style={{ backgroundColor: hex }}
                    />
                    {hex}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
