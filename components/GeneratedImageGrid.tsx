"use client";

import { GeneratedImage } from "@/lib/types";

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
              className="w-56 flex-none overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
            >
              <div className="aspect-square w-full bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.dataUrl} alt={`Generated ${i + 1}`} className="h-full w-full object-contain" />
              </div>
            </div>
          ))}
    </div>
  );
}
