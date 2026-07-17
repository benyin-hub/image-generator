export type AssetType = "app-icon" | "feature-icon" | "key-visual";

export interface AssetTypeOption {
  id: AssetType;
  label: string;
  description: string;
}

export interface StyleReferenceImage {
  mimeType: string;
  data: string; // base64, no data URL prefix
}

export interface Style {
  id: string;
  name: string;
  description: string;
  thumbnail: string; // data URL
  createdAt: string;
  source: "upload" | "prompt" | "reference";
  // Which asset type this style belongs to. Absent on styles saved before
  // per-asset-type libraries existed — those are treated as visible under
  // every asset type rather than orphaned.
  assetType?: AssetType;
}

export interface GeneratedImage {
  id: string;
  dataUrl: string;
  mimeType: string;
}

export interface HistoryItem {
  id: string;
  images: GeneratedImage[];
  prompt: string;
  assetType: AssetType;
  styleId: string | null;
  styleName: string | null;
  timestamp: string;
}
