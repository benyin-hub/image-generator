import { NextRequest, NextResponse } from "next/server";
import { analyzeStyleImage } from "@/lib/gemini";

export const runtime = "nodejs";

interface AnalyzeStyleBody {
  imageBase64: string;
  imageMimeType: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeStyleBody;

    if (!body.imageBase64 || !body.imageMimeType) {
      return NextResponse.json({ error: "An image is required." }, { status: 400 });
    }

    const analysis = await analyzeStyleImage({
      mimeType: body.imageMimeType,
      data: body.imageBase64,
    });

    return NextResponse.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to analyse style image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
