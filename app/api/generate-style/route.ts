import { NextRequest, NextResponse } from "next/server";
import { generateImage, InlineImage } from "@/lib/gemini";

export const runtime = "nodejs";

interface ReferenceImagePayload {
  mimeType: string;
  data: string;
}

interface GenerateStyleBody {
  mode: "upload" | "prompt" | "reference";
  name: string;
  prompt: string;
  referenceImages?: ReferenceImagePayload[];
  uploadedImage?: ReferenceImagePayload;
  colors?: string[];
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function colorConstraintBlock(colors: string[]): string {
  if (colors.length === 0) return "";
  const list = colors.join(", ");
  return `

Colour Constraint:
- Use ONLY this colour palette for every shape, line, and fill in this artwork: ${list}.
- The background must stay plain white — do not introduce any other hue, gradient, or shading colour outside this palette.`;
}

function buildStylePrompt(body: GenerateStyleBody, colors: string[]): string {
  if (body.mode === "reference") {
    return `You are creating a reusable brand visual style from the attached reference image(s).

Instructions from the user:
${body.prompt.trim() || "Combine these images into one cohesive visual style."}

Generate a single square sample artwork of a simple generic object (for example an abstract badge, a shape, or a small object) that clearly demonstrates this visual style: its colour palette, linework, texture, and rendering technique. The image should read as a style reference swatch, not a finished asset.${colorConstraintBlock(colors)}

Negative Prompt:
- no text
- no watermark
- no border`;
  }

  return `You are creating a reusable brand visual style sample thumbnail.

Style description:
${body.prompt.trim()}

Generate a single square sample artwork of a simple generic object (for example an abstract badge, a shape, or a small object) that clearly demonstrates this visual style: its colour palette, linework, texture, and rendering technique. The image should read as a style reference swatch, not a finished asset.${colorConstraintBlock(colors)}

Negative Prompt:
- no text
- no watermark
- no border`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateStyleBody;

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Style name is required." }, { status: 400 });
    }
    if (body.mode === "upload" && !body.uploadedImage?.data) {
      return NextResponse.json({ error: "An image is required." }, { status: 400 });
    }
    if (body.mode === "reference" && (!body.referenceImages || body.referenceImages.length === 0)) {
      return NextResponse.json(
        { error: "At least one reference image is required." },
        { status: 400 }
      );
    }
    if (body.mode === "prompt" && !body.prompt?.trim()) {
      return NextResponse.json({ error: "A style prompt is required." }, { status: 400 });
    }

    const colors = (body.colors ?? []).filter((c) => HEX_COLOR_RE.test(c)).slice(0, 3);

    if (body.mode === "upload") {
      const colorNote =
        colors.length > 0
          ? `Use only this colour palette for every shape, line, and fill — no other colours: ${colors.join(", ")}.`
          : "";
      return NextResponse.json({
        name: body.name.trim(),
        description: colorNote || "Custom uploaded style image.",
        thumbnail: `data:${body.uploadedImage!.mimeType};base64,${body.uploadedImage!.data}`,
        thumbnailBase64: body.uploadedImage!.data,
        thumbnailMimeType: body.uploadedImage!.mimeType,
      });
    }

    const referenceImages: InlineImage[] | undefined =
      body.mode === "reference"
        ? body.referenceImages?.slice(0, 3).map((img) => ({
            mimeType: img.mimeType,
            data: img.data,
          }))
        : undefined;

    const prompt = buildStylePrompt(body, colors);
    const result = await generateImage({ prompt, referenceImages });

    const colorNote =
      colors.length > 0
        ? `Use only this colour palette for every shape, line, and fill — no other colours: ${colors.join(", ")}.`
        : "";

    return NextResponse.json({
      name: body.name.trim(),
      description: [body.prompt.trim(), colorNote].filter(Boolean).join("\n\n"),
      thumbnail: `data:${result.mimeType};base64,${result.data}`,
      thumbnailBase64: result.data,
      thumbnailMimeType: result.mimeType,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate style.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
