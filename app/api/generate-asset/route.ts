import { NextRequest, NextResponse } from "next/server";
import { generateImages, InlineImage } from "@/lib/gemini";
import { assetTypeComposition, colorConstraintBlock } from "@/lib/promptTemplates";
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
    colors?: string[];
    characteristics?: string[];
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

    let prompt = assetTypeComposition(body.assetType);
    const referenceImages: InlineImage[] = [];

    if (body.style) {
      prompt += `\n\nStyle characteristics ("${body.style.name}"): ${body.style.description}${colorConstraintBlock(body.style.colors ?? [])}

Preserve:
- line work
- stroke thickness
- corner radius
- colour palette
- visual weight
- illustration style
- level of detail
- padding
- spacing
- overall design language

Do NOT copy:
- the subject matter
- exact objects
- exact composition`;

      if (body.style.thumbnailBase64 && body.style.thumbnailMimeType) {
        referenceImages.push({
          mimeType: body.style.thumbnailMimeType,
          data: body.style.thumbnailBase64,
        });
      }
    }

    prompt += `\n\n${body.userPrompt.trim()}`;

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
