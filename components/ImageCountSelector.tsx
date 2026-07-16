"use client";

export default function ImageCountSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (count: number) => void;
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Number of Images</h2>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-card outline-none transition focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
      >
        <option value={1}>1</option>
        <option value={2}>2</option>
        <option value={3}>3</option>
      </select>
    </div>
  );
}
