"use client";

import { GeneratedImage } from "@/lib/types";

function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function GeneratedImageGrid({
  images,
  loading,
  count,
}: {
  images: GeneratedImage[];
  loading: boolean;
  count: number;
}) {
  if (!loading && images.length === 0) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center text-sm text-slate-400">
        Generated images will appear here.
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {loading
        ? Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="aspect-square w-56 flex-none animate-pulse rounded-2xl bg-slate-200"
            />
          ))
        : images.map((image, i) => (
            <div
              key={image.id}
              className="flex w-56 flex-none flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
            >
              <div className="aspect-square w-full bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.dataUrl} alt={`Generated ${i + 1}`} className="h-full w-full object-contain" />
              </div>
              <button
                type="button"
                onClick={() => downloadImage(image.dataUrl, `asset-${i + 1}.png`)}
                className="flex items-center justify-center gap-1.5 border-t border-slate-100 py-2.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                  <path
                    d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Download
              </button>
            </div>
          ))}
    </div>
  );
}
