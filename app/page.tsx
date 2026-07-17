"use client";

import { useEffect, useRef, useState } from "react";
import AssetTypeSelector from "@/components/AssetTypeSelector";
import StyleLibrary from "@/components/StyleLibrary";
import StyleModal from "@/components/StyleModal";
import PromptInput from "@/components/PromptInput";
import ImageCountSelector from "@/components/ImageCountSelector";
import GenerateButton from "@/components/GenerateButton";
import GeneratedImageGrid from "@/components/GeneratedImageGrid";
import HistoryPanel from "@/components/HistoryPanel";
import { AssetType, GeneratedImage, HistoryItem, Style } from "@/lib/types";
import { assetTypeLabel } from "@/lib/promptTemplates";
import { dataUrlToParts } from "@/lib/dataUrl";
import { loadHistory, loadStyles, saveHistory, saveStyles } from "@/lib/storage";

function pickDefaultStyleId(list: Style[]): string | null {
  if (list.length === 0) return null;
  const minimal = list.find((s) => s.name.trim().toLowerCase() === "minimal");
  return (minimal ?? list[0]).id;
}

function stylesForAssetType(all: Style[], type: AssetType): Style[] {
  return all.filter((s) => !s.assetType || s.assetType === type);
}

export default function Home() {
  const [assetType, setAssetType] = useState<AssetType>("app-icon");
  const [styles, setStyles] = useState<Style[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<Record<AssetType, string | null>>({
    "app-icon": null,
    "feature-icon": null,
    "key-visual": null,
  });
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const historyPanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const loadedStyles = loadStyles();
    setStyles(loadedStyles);
    setHistory(loadHistory());
    setSelectedStyleId({
      "app-icon": pickDefaultStyleId(stylesForAssetType(loadedStyles, "app-icon")),
      "feature-icon": pickDefaultStyleId(stylesForAssetType(loadedStyles, "feature-icon")),
      "key-visual": pickDefaultStyleId(stylesForAssetType(loadedStyles, "key-visual")),
    });
  }, []);

  useEffect(() => {
    if (activeHistoryId === null) return;
    function handleClickOutside(e: MouseEvent) {
      if (historyPanelRef.current && !historyPanelRef.current.contains(e.target as Node)) {
        setActiveHistoryId(null);
        setImages([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeHistoryId]);

  function handleSaveStyle(style: Style) {
    const tagged: Style = { ...style, assetType };
    setStyles((prev) => {
      const next = [...prev, tagged];
      saveStyles(next);
      return next;
    });
    setSelectedStyleId((prev) => ({ ...prev, [assetType]: tagged.id }));
    setModalOpen(false);
  }

  function handleDeleteStyle(id: string) {
    const next = styles.filter((s) => s.id !== id);
    setStyles(next);
    saveStyles(next);
    setSelectedStyleId((prev) => {
      if (prev[assetType] !== id) return prev;
      return { ...prev, [assetType]: pickDefaultStyleId(stylesForAssetType(next, assetType)) };
    });
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      setGenerateError("Please enter a prompt.");
      return;
    }
    setGenerateError(null);
    setGenerating(true);
    setActiveHistoryId(null);
    setImages([]);

    const selectedStyle = styles.find((s) => s.id === selectedStyleId[assetType]) ?? null;

    try {
      const stylePayload = selectedStyle
        ? (() => {
            const { mimeType, base64 } = dataUrlToParts(selectedStyle.thumbnail);
            return {
              name: selectedStyle.name,
              description: selectedStyle.description,
              thumbnailBase64: base64,
              thumbnailMimeType: mimeType,
            };
          })()
        : null;

      const res = await fetch("/api/generate-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetType,
          userPrompt: prompt,
          count,
          style: stylePayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate images.");

      const generatedImages: GeneratedImage[] = data.images.map(
        (img: { dataUrl: string; mimeType: string }, i: number) => ({
          id: `img-${Date.now()}-${i}`,
          dataUrl: img.dataUrl,
          mimeType: img.mimeType,
        })
      );

      setImages(generatedImages);

      const historyItem: HistoryItem = {
        id: `history-${Date.now()}`,
        images: generatedImages,
        prompt,
        assetType,
        styleId: selectedStyle?.id ?? null,
        styleName: selectedStyle?.name ?? null,
        timestamp: new Date().toISOString(),
      };
      setHistory((prev) => {
        const next = [historyItem, ...prev];
        saveHistory(next);
        return next;
      });
      setActiveHistoryId(historyItem.id);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate images.");
    } finally {
      setGenerating(false);
    }
  }

  function handleSelectHistory(item: HistoryItem) {
    setActiveHistoryId(item.id);
    setImages(item.images);
    setPrompt(item.prompt);
    setAssetType(item.assetType);
    setSelectedStyleId((prev) => ({ ...prev, [item.assetType]: item.styleId }));
  }

  function handleDeleteHistory(id: string) {
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    saveHistory(next);
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
      setImages([]);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Image Asset Generator</h1>
        <p className="mt-1 text-sm text-slate-500">
          Generate brand-compliant marketing assets with Gemini 2.5 Flash Image (Nano Banana).
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-8">
          <AssetTypeSelector value={assetType} onChange={setAssetType} />

          <StyleLibrary
            styles={stylesForAssetType(styles, assetType)}
            selectedStyleId={selectedStyleId[assetType]}
            assetTypeLabel={assetTypeLabel(assetType)}
            onSelect={(id) => setSelectedStyleId((prev) => ({ ...prev, [assetType]: id }))}
            onDelete={handleDeleteStyle}
            onAddStyle={() => setModalOpen(true)}
          />

          <PromptInput value={prompt} onChange={setPrompt} assetType={assetType} />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full sm:w-40">
              <ImageCountSelector value={count} onChange={setCount} />
            </div>
            <div className="flex-1">
              <GenerateButton loading={generating} onClick={handleGenerate} />
            </div>
          </div>

          {generateError && (
            <p className="-mt-4 text-sm text-red-600">{generateError}</p>
          )}

          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              Generated Images
              {activeHistoryId && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {assetTypeLabel(assetType)}
                </span>
              )}
            </h2>
            <GeneratedImageGrid images={images} loading={generating} count={count} />
          </div>
        </div>

        <aside ref={historyPanelRef}>
          <HistoryPanel
            history={history}
            activeId={activeHistoryId}
            onSelect={handleSelectHistory}
            onDelete={handleDeleteHistory}
          />
        </aside>
      </div>

      {modalOpen && (
        <StyleModal onClose={() => setModalOpen(false)} onSave={handleSaveStyle} />
      )}
    </main>
  );
}
