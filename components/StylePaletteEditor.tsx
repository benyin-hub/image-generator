"use client";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export default function StylePaletteEditor({
  colors,
  defaultColors,
  onChange,
}: {
  colors: string[];
  defaultColors: string[];
  onChange: (colors: string[]) => void;
}) {
  const isModified = JSON.stringify(colors) !== JSON.stringify(defaultColors);

  function updateColor(index: number, hex: string) {
    const next = [...colors];
    next[index] = hex;
    onChange(next);
  }

  function removeColor(index: number) {
    onChange(colors.filter((_, i) => i !== index));
  }

  function addColor() {
    if (colors.length >= 3) return;
    onChange([...colors, "#000000"]);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">
          Colour Palette
          <span className="ml-1.5 text-xs font-normal text-slate-400">(one-time override)</span>
        </h2>
        {isModified && (
          <button
            type="button"
            onClick={() => onChange(defaultColors)}
            className="text-xs font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700"
          >
            Reset
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {colors.map((hex, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="group relative h-10 w-10">
              <input
                type="color"
                value={HEX_COLOR_RE.test(hex) ? hex : "#000000"}
                onChange={(e) => updateColor(i, e.target.value)}
                aria-label={`Colour ${i + 1}`}
                className="h-10 w-10 cursor-pointer rounded-lg border border-slate-200 p-0"
              />
              <button
                type="button"
                onClick={() => removeColor(i)}
                aria-label="Remove colour"
                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900/70 text-white opacity-0 transition group-hover:opacity-100"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <span className="text-[10px] text-slate-500">{hex}</span>
          </div>
        ))}
        {colors.length < 3 && (
          <button
            type="button"
            onClick={addColor}
            aria-label="Add colour"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 transition hover:border-brand-400 hover:text-brand-500"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
