export function dataUrlToParts(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:(.*);base64,(.*)$/s);
  if (!match) {
    return { mimeType: "image/png", base64: dataUrl };
  }
  return { mimeType: match[1], base64: match[2] };
}
