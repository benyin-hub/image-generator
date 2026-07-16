"use client";

import { useEffect, useRef, useState } from "react";
import { hslToHex } from "@/lib/color";

const SIZE = 160;
const RADIUS = SIZE / 2;

export default function ColorWheel({
  onPick,
}: {
  onPick: (hex: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  const [lightness, setLightness] = useState(50);
  const [pick, setPick] = useState<{ x: number; y: number; hue: number; sat: number } | null>(
    null
  );

  // Paint the hue/saturation wheel; repaints whenever lightness changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const image = ctx.createImageData(SIZE, SIZE);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx = x - RADIUS;
        const dy = y - RADIUS;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * SIZE + x) * 4;
        if (dist <= RADIUS) {
          let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          if (angle < 0) angle += 360;
          const sat = Math.min((dist / RADIUS) * 100, 100);
          const hex = hslToHex(angle, sat, lightness);
          image.data[idx] = parseInt(hex.slice(1, 3), 16);
          image.data[idx + 1] = parseInt(hex.slice(3, 5), 16);
          image.data[idx + 2] = parseInt(hex.slice(5, 7), 16);
          image.data[idx + 3] = 255;
        } else {
          image.data[idx + 3] = 0;
        }
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [lightness]);

  useEffect(() => {
    if (!pick) return;
    onPick(hslToHex(pick.hue, pick.sat, lightness));
    // onPick intentionally excluded: re-fires only when the pick or lightness actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick, lightness]);

  function pickAt(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const dx = x - RADIUS;
    const dy = y - RADIUS;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), RADIUS);
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    const sat = (dist / RADIUS) * 100;
    const clampedX = RADIUS + Math.cos((angle * Math.PI) / 180) * dist;
    const clampedY = RADIUS + Math.sin((angle * Math.PI) / 180) * dist;
    setPick({ x: clampedX, y: clampedY, hue: angle, sat });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="cursor-crosshair rounded-full shadow-inner ring-1 ring-slate-200"
          onPointerDown={(e) => {
            draggingRef.current = true;
            (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
            pickAt(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!draggingRef.current) return;
            pickAt(e.clientX, e.clientY);
          }}
          onPointerUp={() => {
            draggingRef.current = false;
          }}
        />
        {pick && (
          <div
            className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
            style={{
              left: pick.x,
              top: pick.y,
              background: hslToHex(pick.hue, pick.sat, lightness),
            }}
          />
        )}
      </div>
      <div className="w-full max-w-[160px]">
        <label className="mb-1 block text-[11px] font-medium text-slate-500">Lightness</label>
        <input
          type="range"
          min={10}
          max={90}
          value={lightness}
          onChange={(e) => setLightness(Number(e.target.value))}
          className="w-full accent-brand-600"
        />
      </div>
    </div>
  );
}
