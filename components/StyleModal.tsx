"use client";

import { useRef, useState } from "react";
import { Style } from "@/lib/types";
import ColorWheel from "./ColorWheel";

type Mode = "upload" | "prompt" | "reference";

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

const TABS: { id: Mode; label: string }[] = [
  { id: "upload", label: "Upload Image" },
  { id: "prompt", label: "Prompt" },
  { id: "reference", label: "Reference Image" },
];

const MAX_REFERENCE_IMAGES = 2;

function emptyState() {
  return {
    name: "",
    mode: "upload" as Mode,
    uploadedImage: null as UploadedImage | null,
    stylePrompt: "",
    referenceImages: [] as UploadedImage[],
    referenceInstructions: "",
    colors: [] as string[],
    currentPick: null as string | null,
  };
}

export default function StyleModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (style: Style) => void;
}) {
  const initial = emptyState();
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [name, setName] = useState(initial.name);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(initial.uploadedImage);
  const [stylePrompt, setStylePrompt] = useState(initial.stylePrompt);
  const [referenceImages, setReferenceImages] = useState<UploadedImage[]>(initial.referenceImages);
  const [referenceInstructions, setReferenceInstructions] = useState(initial.referenceInstructions);
  const [colors, setColors] = useState<string[]>(initial.colors);
  const [currentPick, setCurrentPick] = useState<string | null>(initial.currentPick);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  const canGenerate =
    name.trim().length > 0 &&
    (mode === "upload"
      ? uploadedImage !== null
      : mode === "prompt"
        ? stylePrompt.trim().length > 0
        : referenceImages.length > 0);

  function resetAll() {
    const fresh = emptyState();
    setMode(fresh.mode);
    setName(fresh.name);
    setUploadedImage(fresh.uploadedImage);
    setStylePrompt(fresh.stylePrompt);
    setReferenceImages(fresh.referenceImages);
    setReferenceInstructions(fresh.referenceInstructions);
    setColors(fresh.colors);
    setCurrentPick(fresh.currentPick);
    setError(null);
    setPreview(null);
  }

  async function handleUploadImageSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const converted = await fileToUploadedImage(files[0]);
    setUploadedImage(converted);
  }

  async function handleReferenceImagesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_REFERENCE_IMAGES - referenceImages.length;
    const selected = Array.from(files).slice(0, remaining);
    const converted = await Promise.all(selected.map(fileToUploadedImage));
    setReferenceImages((prev) => [...prev, ...converted]);
  }

  function handleRemoveReferenceImage(index: number) {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddColor() {
    if (!currentPick || colors.length >= 3 || colors.includes(currentPick)) return;
    setColors((prev) => [...prev, currentPick]);
  }

  function handleRemoveColor(index: number) {
    setColors((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    setError(null);
    setGenerating(true);
    try {
      const body =
        mode === "upload"
          ? {
              mode: "upload",
              name,
              uploadedImage: { mimeType: uploadedImage!.mimeType, data: uploadedImage!.base64 },
              colors,
            }
          : mode === "prompt"
            ? {
                mode: "prompt",
                name,
                prompt: stylePrompt,
                colors,
              }
            : {
                mode: "reference",
                name,
                prompt: referenceInstructions,
                referenceImages: referenceImages.map((img) => ({
                  mimeType: img.mimeType,
                  data: img.base64,
                })),
                colors,
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
      source: mode,
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
                  Save to Library
                </button>
                <button
                  type="button"
                  onClick={resetAll}
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
                  placeholder="Pop culture"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Colour Palette
                  <span className="ml-1 text-xs font-normal text-slate-400">(optional, up to 3)</span>
                </label>
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <ColorWheel onPick={setCurrentPick} />

                  <div className="flex w-full items-center gap-2">
                    <div
                      className="h-8 w-8 shrink-0 rounded-full border border-slate-200"
                      style={{ background: currentPick ?? "transparent" }}
                    />
                    <span className="flex-1 font-mono text-xs text-slate-500">
                      {currentPick ?? "Pick a colour on the wheel"}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddColor}
                      disabled={!currentPick || colors.length >= 3 || colors.includes(currentPick)}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex w-full flex-wrap gap-2">
                    {colors.length === 0 ? (
                      <p className="text-xs text-slate-400">No colours selected yet.</p>
                    ) : (
                      colors.map((c, i) => (
                        <div
                          key={c}
                          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 text-xs"
                        >
                          <span
                            className="h-4 w-4 rounded-full border border-slate-200"
                            style={{ background: c }}
                          />
                          <span className="font-mono text-slate-600">{c}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveColor(i)}
                            aria-label={`Remove ${c}`}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Style Image Generation
                </label>

                <div className="mb-3 inline-flex w-full rounded-full bg-slate-100 p-1 text-xs font-semibold">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMode(tab.id)}
                      className={`flex-1 rounded-full px-2 py-1.5 transition ${
                        mode === tab.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {mode === "upload" && (
                  <div>
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
                )}

                {mode === "prompt" && (
                  <textarea
                    value={stylePrompt}
                    onChange={(e) => setStylePrompt(e.target.value)}
                    rows={4}
                    placeholder="Bright neon colours (#FF0088, #00FFFF), bold outlines, comic-inspired aesthetic..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                  />
                )}

                {mode === "reference" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-3">
                      {referenceImages.map((img, i) => (
                        <div
                          key={i}
                          className="relative h-28 w-28 overflow-hidden rounded-2xl border border-slate-200"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.dataUrl} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveReferenceImage(i)}
                            aria-label="Remove reference image"
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-white"
                          >
                            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                              <path
                                d="M6 6l12 12M18 6L6 18"
                                stroke="currentColor"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                      {referenceImages.length < MAX_REFERENCE_IMAGES && (
                        <button
                          type="button"
                          onClick={() => referenceInputRef.current?.click()}
                          className="flex h-28 w-28 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 text-slate-400 transition hover:border-brand-400 hover:text-brand-500"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                          <span className="text-[11px] font-medium">Add image</span>
                        </button>
                      )}
                    </div>
                    <input
                      ref={referenceInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleReferenceImagesSelected(e.target.files)}
                    />
                    <p className="text-[11px] text-slate-400">
                      Up to {MAX_REFERENCE_IMAGES} reference images.
                    </p>
                    <textarea
                      value={referenceInstructions}
                      onChange={(e) => setReferenceInstructions(e.target.value)}
                      rows={4}
                      placeholder={
                        "Describe how the AI should use these reference images. Examples: Combine these images into one style, Change the colour palette to blue, Keep the composition but simplify the illustration, Use the lighting style only"
                      }
                      className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {generating
                  ? "Generating..."
                  : mode === "upload"
                    ? "Add Style"
                    : "Generate Style"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
