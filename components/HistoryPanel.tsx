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
}: {
  history: HistoryItem[];
  activeId: string | null;
  onSelect: (item: HistoryItem) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">History</h2>
      {history.length === 0 ? (
        <p className="text-sm text-slate-400">Your past generations will show up here.</p>
      ) : (
        <ul className="flex max-h-[540px] flex-col gap-2 overflow-y-auto pr-1">
          {history.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
