"use client";

import { useRef, useState } from "react";
import { AssetType, Style } from "@/lib/types";

interface UploadedImage {
  dataUrl: string;
  base64: string;
  mimeType: string;
}

interface StyleAnalysis {
  characteristics: string[];
  colors: string[];
  description: string;
}

function fileToUploadedImage(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [meta, base64] = dataUrl.split(",");
      const mimeType = meta.match(/data:(.*);base64/)?.[1] ?? file.type;
      resolve({ dataUrl, base64, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function StyleModal({
  onClose,
  onSave,
  assetType,
}: {
  onClose: () => void;
  onSave: (style: Style) => void;
  assetType: AssetType;
}) {
  const [name, setName] = useState("");
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const canAdd = name.trim().length > 0 && uploadedImage !== null;

  async function analyzeImage(image: UploadedImage) {
    setAnalysis(null);
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: image.base64, imageMimeType: image.mimeType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyse image.");
      setAnalysis(data);
    } catch {
      // Analysis is a non-blocking enhancement — saving the style still works without it.
      setAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleUploadImageSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const converted = await fileToUploadedImage(files[0]);
    setUploadedImage(converted);
    analyzeImage(converted);
  }

  async function handleUseImageUrl() {
    const url = imageUrl.trim();
    if (!url) return;
    setUrlError(null);
    setFetchingUrl(true);
    try {
      const res = await fetch("/api/fetch-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch image.");
      const converted = { dataUrl: data.dataUrl, base64: data.data, mimeType: data.mimeType };
      setUploadedImage(converted);
      setImageUrl("");
      analyzeImage(converted);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Failed to fetch image.");
    } finally {
      setFetchingUrl(false);
    }
  }

  function handleRemoveImage() {
    setUploadedImage(null);
    setAnalysis(null);
    setAnalyzing(false);
  }

  function handleAdd() {
    if (!canAdd || !uploadedImage) return;
    const style: Style = {
      id: `style-${Date.now()}`,
      name: name.trim(),
      description: analysis?.description ?? "Custom uploaded style image.",
      thumbnail: uploadedImage.dataUrl,
      createdAt: new Date().toISOString(),
      source: "upload",
      colors: analysis?.colors,
      characteristics: analysis?.characteristics,
    };
    onSave(style);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-popover">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Add Style</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                Style Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pop culture"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <label className="block text-sm font-semibold text-slate-800">Reference Image</label>
              </div>

              {uploadedImage ? (
                <>
                  <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-2xl border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedImage.dataUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      aria-label="Remove image"
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-white"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                        <path
                          d="M6 6l12 12M18 6L6 18"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                    {analyzing && (
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-slate-900/70 py-1.5 text-xs font-medium text-white">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Analysing...
                      </div>
                    )}
                  </div>

                  {analysis && !analyzing && (
                    <div className="mx-auto mt-3 w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                      <p className="font-semibold text-slate-800">Visual characteristics:</p>
                      <ul className="mt-1 space-y-0.5">
                        {analysis.characteristics.map((c) => (
                          <li key={c}>☑ {c}</li>
                        ))}
                      </ul>
                      {analysis.colors.length > 0 && (
                        <>
                          <p className="mt-2 font-semibold text-slate-800">Color palette:</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {analysis.colors.map((hex) => (
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
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-slate-400 transition hover:border-brand-400 hover:text-brand-500"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <div className="text-left text-xs font-medium leading-relaxed">
                      <p className="mb-1 font-semibold">For best results, use:</p>
                      {assetType === "key-visual" ? (
                        <>
                          <p>✓ High-resolution images with clear details</p>
                          <p>✓ Consistent colors, shapes, and illustration style</p>
                        </>
                      ) : (
                        <>
                          <p>✓ A set of 3–10 icons in the same style</p>
                          <p>✓ High-resolution images with clear details</p>
                          <p>✓ Consistent colors, shapes, and illustration style</p>
                        </>
                      )}
                    </div>
                  </button>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[11px] font-medium text-slate-400">or</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleUseImageUrl();
                        }
                      }}
                      placeholder="Paste an image link"
                      className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                    />
                    <button
                      type="button"
                      onClick={handleUseImageUrl}
                      disabled={!imageUrl.trim() || fetchingUrl}
                      className="shrink-0 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      {fetchingUrl ? "Fetching..." : "Use link"}
                    </button>
                  </div>
                  {urlError && <p className="mt-1.5 text-xs text-red-600">{urlError}</p>}
                </>
              )}
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadImageSelected(e.target.files)}
              />
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
