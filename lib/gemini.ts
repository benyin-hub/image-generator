import { GoogleGenAI, Type } from "@google/genai";

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";

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
    config: { imageConfig: { aspectRatio: "1:1", imageSize: "2K" } },
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

export interface PromptEvaluation {
  score: number; // 1 (very vague) - 5 (precise and unambiguous)
  feedback: string;
  suggestion: string;
}

/**
 * Uses a text model to score how clearly a prompt describes its SUBJECT and
 * COMPOSITION (e.g. abstract words like "enterprise" have no fixed visual
 * meaning), and proposes one concrete rewrite. Rendering style (colours,
 * line work, mood, artistic technique) is handled separately by the style
 * system, so this deliberately stays out of style territory.
 */
export async function evaluatePrompt(prompt: string): Promise<PromptEvaluation> {
  const ai = getClient();

  const instructions = `You help users describe the SUBJECT and COMPOSITION of an image prompt for an AI image generator. Visual rendering style (colours, line work, mood, artistic technique, adjectives like "modern", "professional", "vibrant", "minimalist", "elegant") is handled separately by a style system, so prompts should only describe WHAT the subject is and WHERE it sits in the frame — never how it's rendered.

Evaluate the following prompt for how clearly and concretely it describes a subject and composition, versus being vague or ambiguous.

Prompt to evaluate:
"""
${prompt.trim()}
"""

Respond with:
- score: 1 to 5, where 1 means the subject/composition is vague or ambiguous, 5 means it's precise and concrete.
- feedback: one short sentence explaining the score, calling out specific vague words if any.
- suggestion: one concise rewritten version of the prompt that describes the subject and composition more clearly and concretely. Do NOT add or keep any words describing visual style, rendering technique, mood, or aesthetic — only refine the subject/composition description. Keep it a single prompt, not a list of options.`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: instructions }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER },
          feedback: { type: Type.STRING },
          suggestion: { type: Type.STRING },
        },
        required: ["score", "feedback", "suggestion"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini did not return a prompt evaluation.");
  }

  const parsed = JSON.parse(text) as PromptEvaluation;
  return {
    score: Math.min(Math.max(Math.round(parsed.score), 1), 5),
    feedback: parsed.feedback,
    suggestion: parsed.suggestion,
  };
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export interface StyleAnalysis {
  characteristics: string[];
  colors: string[]; // hex codes
  description: string;
}

/**
 * Uses a vision-capable text model to inspect an uploaded style reference
 * image and extract: a short list of visual characteristics, a dominant
 * colour palette, and a style-only prose description (no subject, no
 * asset-type composition — those are supplied separately at generation time).
 */
export async function analyzeStyleImage(image: InlineImage): Promise<StyleAnalysis> {
  const ai = getClient();

  const instructions = `You analyse reference images to describe their visual/rendering style for an AI image generator's style library. Look only at HOW this image is rendered — not what its subject is.

Respond with:
- characteristics: 3 to 5 short phrases (2-4 words each) naming visual traits, e.g. "Rounded geometry", "Minimal line work", "Soft gradients", "Friendly tone".
- colors: up to 3 dominant hex colour codes from the image, formatted like "#0055FF".
- description: one concise paragraph (2-3 sentences) describing ONLY the rendering style — line work, shapes, edges, shading, and mood. Do not mention any subject, object, or scene content, and do not mention asset type or composition (centring, framing, etc.) — only the visual/rendering characteristics.`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: image.mimeType, data: image.data } },
          { text: instructions },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          characteristics: { type: Type.ARRAY, items: { type: Type.STRING } },
          colors: { type: Type.ARRAY, items: { type: Type.STRING } },
          description: { type: Type.STRING },
        },
        required: ["characteristics", "colors", "description"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini did not return a style analysis.");
  }

  const parsed = JSON.parse(text) as StyleAnalysis;
  return {
    characteristics: (parsed.characteristics ?? []).slice(0, 5),
    colors: (parsed.colors ?? []).filter((c) => HEX_COLOR_RE.test(c)).slice(0, 3),
    description: parsed.description,
  };
}
