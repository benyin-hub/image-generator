import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (see .env.local.example)."
    );
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export interface InlineImage {
  mimeType: string;
  data: string; // base64, no data URL prefix
}

export interface GenerateImageResult {
  mimeType: string;
  data: string; // base64
  text?: string;
}

/**
 * Calls Gemini 2.5 Flash Image (Nano Banana) with a text prompt and optional
 * reference images, and returns a single generated image.
 */
export async function generateImage(params: {
  prompt: string;
  referenceImages?: InlineImage[];
}): Promise<GenerateImageResult> {
  const ai = getClient();

  const parts: Record<string, unknown>[] = [];
  for (const image of params.referenceImages ?? []) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  }
  parts.push({ text: params.prompt });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
  });

  const candidateParts = response.candidates?.[0]?.content?.parts ?? [];

  const imagePart = candidateParts.find(
    (part): part is { inlineData: { mimeType: string; data: string } } =>
      Boolean((part as { inlineData?: { data?: string } }).inlineData?.data)
  );
  const textPart = candidateParts.find(
    (part): part is { text: string } => typeof (part as { text?: string }).text === "string"
  );

  if (!imagePart) {
    const reason =
      textPart?.text ||
      response.candidates?.[0]?.finishReason ||
      "Gemini did not return an image for this request.";
    throw new Error(reason);
  }

  return {
    mimeType: imagePart.inlineData.mimeType || "image/png",
    data: imagePart.inlineData.data,
    text: textPart?.text,
  };
}

/**
 * Generates `count` images in parallel from the same prompt/reference set.
 */
export async function generateImages(
  params: { prompt: string; referenceImages?: InlineImage[] },
  count: number
): Promise<GenerateImageResult[]> {
  const clamped = Math.min(Math.max(count, 1), 3);
  const jobs = Array.from({ length: clamped }, () => generateImage(params));
  return Promise.all(jobs);
}
