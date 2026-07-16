"use client";

import { useState } from "react";
import { AssetType } from "@/lib/types";
import { assetPromptPlaceholder } from "@/lib/promptTemplates";

export default function PromptInput({
  value,
  onChange,
  assetType,
}: {
  value: string;
  onChange: (value: string) => void;
  assetType: AssetType;
}) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-slate-700">Prompt</h2>
        <div
          className="relative"
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
        >
          <button
            type="button"
            onFocus={() => setShowTip(true)}
            onBlur={() => setShowTip(false)}
            aria-label="Prompt writing tips"
            className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-300"
          >
            i
          </button>
          {showTip && (
            <div className="absolute left-0 top-full z-10 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 shadow-popover">
              <p className="font-semibold text-slate-800">For a more predictable result, describe:</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                <li>
                  <span className="font-medium text-slate-700">Subject</span> — what the main
                  object or scene is.
                </li>
                <li>
                  <span className="font-medium text-slate-700">Composition</span> — where it sits
                  in the frame (centred, on top, underneath, beside, scattered...).
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={assetPromptPlaceholder(assetType)}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-card outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
      />
    </div>
  );
}
