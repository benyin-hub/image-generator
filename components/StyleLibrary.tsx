"use client";

import { useState } from "react";
import { Style } from "@/lib/types";
import StyleCard from "./StyleCard";

export default function StyleLibrary({
  styles,
  selectedStyleId,
  assetTypeLabel,
  onSelect,
  onDelete,
  onAddStyle,
}: {
  styles: Style[];
  selectedStyleId: string | null;
  assetTypeLabel: string;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  onAddStyle: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">
          Style Library
          <span className="ml-1.5 text-xs font-normal text-slate-400">· {assetTypeLabel}</span>
        </h2>
        <div className="flex items-center gap-2">
          {styles.length > 0 && (
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              {editing ? "Done" : "Edit"}
            </button>
          )}
          <button
            type="button"
            onClick={onAddStyle}
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            Add Style
          </button>
        </div>
      </div>

      {styles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          No {assetTypeLabel} styles yet, please proceed to create one.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {styles.map((style) => (
            <StyleCard
              key={style.id}
              style={style}
              selected={selectedStyleId === style.id}
              editing={editing}
              onSelect={() => onSelect(style.id)}
              onDelete={() => onDelete(style.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
