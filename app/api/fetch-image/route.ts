import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface FetchImageBody {
  url: string;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FetchImageBody;
    const rawUrl = body.url?.trim();
    if (!rawUrl) {
      return NextResponse.json({ error: "An image URL is required." }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Only http:// or https:// URLs are supported." }, { status: 400 });
    }

    const res = await fetch(parsed.toString());
    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch image (${res.status}).` }, { status: 400 });
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "That URL did not return an image." }, { status: 400 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 10MB)." }, { status: 400 });
    }

    const base64 = buffer.toString("base64");
    return NextResponse.json({
      mimeType: contentType,
      data: base64,
      dataUrl: `data:${contentType};base64,${base64}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
