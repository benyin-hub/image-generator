"use client";

import { GeneratedImage } from "@/lib/types";

function extensionFor(mimeType: string): string {
  const subtype = mimeType.split("/")[1];
  return subtype ? subtype.split("+")[0] : "png";
}

async function downloadImage(image: GeneratedImage, index: number) {
  // Safari ignores the `download` attribute on plain data: URIs and
  // navigates to the image instead — go through a blob: URL, which
  // every browser honors.
  const response = await fetch(image.dataUrl);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `asset-${index + 1}.${extensionFor(image.mimeType)}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
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
              className="group relative w-56 flex-none overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
            >
              <div className="aspect-square w-full bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.dataUrl} alt={`Generated ${i + 1}`} className="h-full w-full object-contain" />
              </div>
              <button
                type="button"
                onClick={() => void downloadImage(image, i)}
                aria-label={`Download generated image ${i + 1}`}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 opacity-0 shadow-sm transition hover:bg-white hover:text-brand-600 group-hover:opacity-100"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path
                    d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ))}
    </div>
  );
}
