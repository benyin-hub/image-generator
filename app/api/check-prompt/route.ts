import { NextRequest, NextResponse } from "next/server";
import { evaluatePrompt } from "@/lib/gemini";

export const runtime = "nodejs";

interface CheckPromptBody {
  prompt: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckPromptBody;

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
    }

    const evaluation = await evaluatePrompt(body.prompt);
    return NextResponse.json(evaluation);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to evaluate prompt.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
