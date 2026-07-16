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
  source: "upload" | "prompt" | "reference" | "default";
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
