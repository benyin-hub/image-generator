"use client";

import { HistoryItem } from "@/lib/types";
import { assetTypeLabel } from "@/lib/promptTemplates";

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryPanel({
  history,
  activeId,
  onSelect,
  onDelete,
}: {
  history: HistoryItem[];
  activeId: string | null;
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">History</h2>
      {history.length === 0 ? (
        <p className="text-sm text-slate-400">Your past generations will show up here.</p>
      ) : (
        <ul className="flex max-h-[540px] flex-col gap-2 overflow-y-auto pr-1">
          {history.map((item) => (
            <li key={item.id} className="group relative">
              <button
                type="button"
                onClick={() => onSelect(item)}
                className={`flex w-full items-center gap-3 rounded-xl border p-2 pr-9 text-left transition ${
                  activeId === item.id
                    ? "border-brand-500 bg-brand-50"
                    : "border-transparent hover:bg-slate-50"
                }`}
              >
                <div className="h-12 w-12 flex-none overflow-hidden rounded-lg bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.images[0]?.dataUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-700">
                    {assetTypeLabel(item.assetType)}
                    {item.styleName ? ` · ${item.styleName}` : ""}
                  </p>
                  <p className="truncate text-xs text-slate-500">{item.prompt}</p>
                  <p className="text-[11px] text-slate-400">{formatTimestamp(item.timestamp)}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                aria-label="Delete this history entry"
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
