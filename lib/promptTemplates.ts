import { AssetType, AssetTypeOption } from "./types";

export const ASSET_TYPES: AssetTypeOption[] = [
  { id: "app-icon", label: "App Icon" },
  { id: "feature-icon", label: "Feature Icon" },
  { id: "key-visual", label: "Key Visual" },
];

export function assetTypeLabel(assetType: AssetType): string {
  return ASSET_TYPES.find((a) => a.id === assetType)?.label ?? assetType;
}

// Per-asset-type composition/format scaffolding. This deliberately says
// nothing about rendering style (line work, fills, palette) — that comes
// from the selected Style's detected characteristics instead, so a custom
// style isn't fighting a hardcoded "flat vector" assumption baked in here.
const ASSET_TYPE_COMPOSITION: Record<AssetType, string> = {
  "app-icon": `App icon,
full-bleed square format,
the icon's background is white and fills the entire square canvas edge-to-edge, with no gaps or empty space in the corners.

Quality:
- centred composition
- legible at small sizes
- professional icon design
- crisp, sharp edges

Negative Prompt:
- no text
- no watermark
- no border
- no clutter`,

  "feature-icon": `UI feature icon,
single centred glyph,
generous padding,
no background scene.

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

export function assetTypeComposition(assetType: AssetType): string {
  return ASSET_TYPE_COMPOSITION[assetType];
}

export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function colorConstraintBlock(colors: string[]): string {
  const valid = colors.filter((c) => HEX_COLOR_RE.test(c)).slice(0, 3);
  if (valid.length === 0) return "";
  const list = valid.join(", ");
  return `

Colour Constraint:
- Use ONLY this colour palette for every shape, line, and fill in this artwork: ${list}.
- Do not introduce any other hue, gradient, or shading colour outside this palette.
- Match the colour proportions of the reference image's palette — a colour used only for thin outlines should stay a thin outline, not expand into a large fill area.`;
}

const PROMPT_PLACEHOLDER =
  "Describe the Subject — what the main object or scene is; and the Composition — where it sits in the frame (centred, on top, underneath, beside or scattered).";

export function assetPromptPlaceholder(): string {
  return PROMPT_PLACEHOLDER;
}
