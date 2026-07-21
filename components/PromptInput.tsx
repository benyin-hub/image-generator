"use client";

import { useState } from "react";
import { assetPromptPlaceholder } from "@/lib/promptTemplates";

interface PromptEvaluation {
  score: number;
  feedback: string;
  suggestion: string;
}

export default function PromptInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [checking, setChecking] = useState(false);
  const [evaluation, setEvaluation] = useState<PromptEvaluation | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  async function handleCheckPrompt() {
    if (!value.trim() || checking) return;
    setChecking(true);
    setCheckError(null);
    try {
      const res = await fetch("/api/check-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to evaluate prompt.");
      setEvaluation(data);
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : "Failed to evaluate prompt.");
      setEvaluation(null);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-slate-700">Prompt</h2>
      </div>
      <textarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setEvaluation(null);
          setCheckError(null);
        }}
        rows={4}
        placeholder={assetPromptPlaceholder()}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-card outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
      />

      <button
        type="button"
        onClick={handleCheckPrompt}
        disabled={!value.trim() || checking}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 transition hover:text-brand-600 hover:decoration-brand-400 disabled:cursor-not-allowed disabled:text-slate-300 disabled:decoration-slate-200 disabled:hover:text-slate-300"
      >
        {checking && (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
        )}
        {checking ? "Evaluating prompt…" : "Prompt checker"}
      </button>

      {checkError && <p className="mt-2 text-xs text-red-600">{checkError}</p>}

      {evaluation && !checking && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Clarity score: {evaluation.score}/5</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-4 rounded-full ${
                    i < evaluation.score ? "bg-brand-500" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-slate-600">{evaluation.feedback}</p>
          <div className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-white p-2">
            <p className="text-slate-700">
              <span className="font-semibold text-slate-800">Suggestion: </span>
              {evaluation.suggestion}
            </p>
            <button
              type="button"
              onClick={() => {
                onChange(evaluation.suggestion);
                setEvaluation(null);
              }}
              className="shrink-0 text-xs font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700"
            >
              Use this
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
