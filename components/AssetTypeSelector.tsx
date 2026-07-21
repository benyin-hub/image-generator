"use client";

import type { ReactElement } from "react";
import { ASSET_TYPES } from "@/lib/promptTemplates";
import { AssetType } from "@/lib/types";

const ICONS: Record<AssetType, ReactElement> = {
  "app-icon": (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <rect x="3" y="3" width="18" height="18" rx="6" className="fill-brand-100 stroke-brand-500" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" className="fill-brand-500" />
    </svg>
  ),
  "feature-icon": (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <circle cx="12" cy="12" r="8" className="stroke-brand-500" strokeWidth="1.5" />
      <path d="M9 12h6M12 9v6" className="stroke-brand-500" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  "key-visual": (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <rect x="3" y="5" width="18" height="14" rx="2" className="fill-brand-100 stroke-brand-500" strokeWidth="1.5" />
      <circle cx="9" cy="10" r="1.6" className="fill-brand-500" />
      <path d="M4.5 17l5-5 3.5 3.5L18 10l1.5 1.5" className="stroke-brand-500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function AssetTypeSelector({
  value,
  onChange,
}: {
  value: AssetType;
  onChange: (type: AssetType) => void;
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Asset Type</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ASSET_TYPES.map((option) => {
          const selected = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${
                selected
                  ? "border-brand-500 bg-brand-50 shadow-card ring-1 ring-brand-500"
                  : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40"
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  selected ? "bg-white" : "bg-slate-50"
                }`}
              >
                {ICONS[option.id]}
              </span>
              <span className="text-sm font-semibold text-slate-800">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
