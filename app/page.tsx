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
import { DEFAULT_STYLE_SEEDS } from "@/lib/defaultStyles";
import { dataUrlToParts } from "@/lib/dataUrl";
import {
  hasSeededDefaultStyles,
  loadHistory,
  loadStyles,
  markDefaultStylesSeeded,
  saveHistory,
  saveStyles,
} from "@/lib/storage";

function pickDefaultStyleId(list: Style[]): string | null {
  if (list.length === 0) return null;
  const minimal = list.find((s) => s.name.trim().toLowerCase() === "minimal");
  return (minimal ?? list[0]).id;
}

export default function Home() {
  const [assetType, setAssetType] = useState<AssetType>("app-icon");
  const [styles, setStyles] = useState<Style[]>([]);
  const [stylesLoading, setStylesLoading] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const seedAttempted = useRef(false);

  useEffect(() => {
    const loadedStyles = loadStyles();
    setStyles(loadedStyles);
    setHistory(loadHistory());
    setSelectedStyleId((prev) => prev ?? pickDefaultStyleId(loadedStyles));
  }, []);

  useEffect(() => {
    if (seedAttempted.current) return;
    if (styles.length > 0) return;
    if (hasSeededDefaultStyles()) return;
    seedAttempted.current = true;
    seedDefaultStyles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styles]);

  async function seedDefaultStyles() {
    setStylesLoading(true);
    try {
      const created: Style[] = [];
      for (const seed of DEFAULT_STYLE_SEEDS) {
        try {
          const res = await fetch("/api/generate-style", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "prompt", name: seed.name, prompt: seed.prompt }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          created.push({
            id: `style-${seed.name.toLowerCase()}-${Date.now()}`,
            name: seed.name,
            description: seed.prompt,
            thumbnail: data.thumbnail,
            createdAt: new Date().toISOString(),
            source: "default",
          });
        } catch (err) {
          console.error(`Failed to seed style ${seed.name}`, err);
        }
      }
      if (created.length > 0) {
        setStyles((prev) => {
          const next = [...prev, ...created];
          saveStyles(next);
          return next;
        });
        setSelectedStyleId((prev) => prev ?? pickDefaultStyleId(created));
      }
    } finally {
      markDefaultStylesSeeded();
      setStylesLoading(false);
    }
  }

  function handleSaveStyle(style: Style) {
    setStyles((prev) => {
      const next = [...prev, style];
      saveStyles(next);
      return next;
    });
    setSelectedStyleId(style.id);
    setModalOpen(false);
  }

  function handleDeleteStyle(id: string) {
    const next = styles.filter((s) => s.id !== id);
    setStyles(next);
    saveStyles(next);
    if (selectedStyleId === id) {
      setSelectedStyleId(pickDefaultStyleId(next));
    }
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

    const selectedStyle = styles.find((s) => s.id === selectedStyleId) ?? null;

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
    setSelectedStyleId(item.styleId);
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
            styles={styles}
            selectedStyleId={selectedStyleId}
            loading={stylesLoading}
            onSelect={setSelectedStyleId}
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

        <aside>
          <HistoryPanel history={history} activeId={activeHistoryId} onSelect={handleSelectHistory} />
        </aside>
      </div>

      {modalOpen && (
        <StyleModal onClose={() => setModalOpen(false)} onSave={handleSaveStyle} />
      )}
    </main>
  );
}
