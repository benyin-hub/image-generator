import { NextRequest, NextResponse } from "next/server";
import { generateImages, InlineImage } from "@/lib/gemini";
import { buildAssetPrompt } from "@/lib/promptTemplates";
import { AssetType } from "@/lib/types";

export const runtime = "nodejs";

interface GenerateAssetBody {
  assetType: AssetType;
  userPrompt: string;
  count: number;
  style?: {
    name: string;
    description: string;
    thumbnailBase64: string;
    thumbnailMimeType: string;
  } | null;
}

const VALID_ASSET_TYPES: AssetType[] = ["app-icon", "feature-icon", "key-visual"];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateAssetBody;

    if (!VALID_ASSET_TYPES.includes(body.assetType)) {
      return NextResponse.json({ error: "Invalid asset type." }, { status: 400 });
    }
    if (!body.userPrompt?.trim()) {
      return NextResponse.json({ error: "A generation prompt is required." }, { status: 400 });
    }

    const count = Math.min(Math.max(Number(body.count) || 1, 1), 3);

    let prompt = buildAssetPrompt(body.assetType, body.userPrompt);
    const referenceImages: InlineImage[] = [];

    if (body.style) {
      prompt += `\n\nApply this brand style ("${body.style.name}"): ${body.style.description}

Preserve:
- line work
- stroke thickness
- corner radius
- colour palette
- illustration style
- level of detail
- padding
- spacing
- icon proportions
- visual weight
- simplicity
- overall design language

Do NOT copy:
- the subject
- the composition
- the silhouette
- the pose
- any background elements`;
      if (body.style.thumbnailBase64 && body.style.thumbnailMimeType) {
        referenceImages.push({
          mimeType: body.style.thumbnailMimeType,
          data: body.style.thumbnailBase64,
        });
      }
    }

    console.log("=== Gemini prompt (generate-asset) ===\n" + prompt);
    const results = await generateImages(
      { prompt, referenceImages: referenceImages.length ? referenceImages : undefined },
      count
    );

    return NextResponse.json({
      images: results.map((r) => ({
        mimeType: r.mimeType,
        dataUrl: `data:${r.mimeType};base64,${r.data}`,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate images.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
