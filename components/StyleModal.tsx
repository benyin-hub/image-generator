"use client";

import { useRef, useState } from "react";
import { Style } from "@/lib/types";

interface UploadedImage {
  dataUrl: string;
  base64: string;
  mimeType: string;
}

interface PreviewResult {
  thumbnail: string;
  thumbnailBase64: string;
  thumbnailMimeType: string;
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

function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function StyleModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (style: Style) => void;
}) {
  const [name, setName] = useState("");
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const canGenerate = name.trim().length > 0 && uploadedImage !== null;

  async function handleUploadImageSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const converted = await fileToUploadedImage(files[0]);
    setUploadedImage(converted);
  }

  async function handleGenerate() {
    if (!uploadedImage) return;
    setError(null);
    setGenerating(true);
    try {
      const body = {
        mode: "upload",
        name,
        uploadedImage: { mimeType: uploadedImage.mimeType, data: uploadedImage.base64 },
      };

      const res = await fetch("/api/generate-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate style.");

      setPreview({
        thumbnail: data.thumbnail,
        thumbnailBase64: data.thumbnailBase64,
        thumbnailMimeType: data.thumbnailMimeType,
        description: data.description,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate style.");
    } finally {
      setGenerating(false);
    }
  }

  function handleSave() {
    if (!preview) return;
    const style: Style = {
      id: `style-${Date.now()}`,
      name: name.trim(),
      description: preview.description,
      thumbnail: preview.thumbnail,
      createdAt: new Date().toISOString(),
      source: "upload",
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
          {preview ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-48 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.thumbnail} alt={name} className="h-48 w-48 object-cover" />
              </div>
              <p className="text-center text-sm font-semibold text-slate-700">{name}</p>

              <div className="flex w-full gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Save Style
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Restart
                </button>
                <button
                  type="button"
                  onClick={() => downloadImage(preview.thumbnail, `${name || "style"}.png`)}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Download
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Style Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Pop Culture"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Style Image
                </label>
                {uploadedImage ? (
                  <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-2xl border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedImage.dataUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setUploadedImage(null)}
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
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 text-slate-400 transition hover:border-brand-400 hover:text-brand-500"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <span className="text-xs font-medium">Click to upload an image</span>
                  </button>
                )}
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadImageSelected(e.target.files)}
                />
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {generating ? "Adding..." : "Add Style"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
