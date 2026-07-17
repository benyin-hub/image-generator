import { AssetType, AssetTypeOption } from "./types";

export const ASSET_TYPES: AssetTypeOption[] = [
  {
    id: "app-icon",
    label: "App Icon",
    description: "Rounded square launcher tile, centred subject, crisp flat vector style.",
  },
  {
    id: "feature-icon",
    label: "Feature Icon",
    description: "Monoline outline glyph for UI features, no background.",
  },
  {
    id: "key-visual",
    label: "Key Visual",
    description: "Rich marketing scene with a strong focal point.",
  },
];

const TEMPLATES: Record<AssetType, string> = {
  "app-icon": `App icon, 
  rounded square format,
  subject centred and filling the frame,
  cohesive background treatment,
  recognisable as a launcher tile.

{{USER_PROMPT}}

Flat vector illustration style,
solid fills,
bold simple shapes,
limited colour palette,
no texture,
crisp geometric edges,
high contrast.

Quality:
- centred composition
- balanced negative space
- clean silhouette
- legible at small sizes
- professional icon design

Negative Prompt:
- no text
- no watermark
- no border
- no photorealism
- no clutter
- no multiple subjects
- no drop shadows`,

  "feature-icon": `UI feature icon, 
  Single centred glyph, 
  Generous padding, 
  No background scene.


{{USER_PROMPT}}

Monoline outline icon.
Uniform stroke weight.
Rounded stroke caps.
No fill.

Quality:
- centred
- readable at small sizes
- balanced

Negative Prompt:
- no text
- no watermark
- no border
- no background
- no clutter`,

  "key-visual": `Marketing key visual.

Rich composed scene.

Contextual background.

{{USER_PROMPT}}

Flat illustration.

Geometric shapes.

Limited harmonious palette.

Modern editorial illustration.

Quality:
- strong focal point
- balanced composition
- polished marketing artwork

Negative Prompt:
- no text
- no logos
- no borders
- no watermark`,
};

export function buildAssetPrompt(assetType: AssetType, userPrompt: string): string {
  const template = TEMPLATES[assetType];
  return template.replace("{{USER_PROMPT}}", userPrompt.trim());
}

export function assetTypeLabel(assetType: AssetType): string {
  return ASSET_TYPES.find((a) => a.id === assetType)?.label ?? assetType;
}

const PROMPT_PLACEHOLDERS: Record<AssetType, string> = {
  "app-icon": "A futuristic delivery drone flying above a modern city skyline at sunset.",
  "feature-icon": "A upload box with an arrow pointing upward",
  "key-visual":
    "A set of shapes in balanced composition scattered around canvas, unify the colour, text in the center in pacific font style",
};

export function assetPromptPlaceholder(assetType: AssetType): string {
  return PROMPT_PLACEHOLDERS[assetType];
}
