// Deterministic, client-side pre-checks for uploaded/fetched style reference
// images — resolution and corruption can be verified directly from the
// decoded image, so these don't need a Gemini round-trip the way blur/crop
// detection (see StyleAnalysis["quality"] in lib/gemini.ts) does.

export const MIN_SHORTEST_SIDE = 1024;

function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Image is corrupted or could not be read."));
    img.src = dataUrl;
  });
}

/**
 * Rejects images that fail to decode (corrupted) or whose shortest side is
 * below MIN_SHORTEST_SIDE. Throws with a user-facing message on failure.
 */
export async function ensureImageResolution(dataUrl: string): Promise<void> {
  const { width, height } = await loadImageDimensions(dataUrl);
  const shortestSide = Math.min(width, height);
  if (shortestSide < MIN_SHORTEST_SIDE) {
    throw new Error(
      `Image resolution is too low (${width}×${height}px) — the shortest side must be at least ${MIN_SHORTEST_SIDE}px.`
    );
  }
}
