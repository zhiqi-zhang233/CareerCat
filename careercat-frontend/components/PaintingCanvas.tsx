"use client";

import type { CSSProperties } from "react";

export type PaintingCanvasProps = {
  /** Overall opacity of the textured layer. Kept for layout compatibility. */
  opacity?: number;
  /** Kept for backwards-compatible layout usage. */
  variant?: "brand" | "warm" | "cool";
  /** Kept for backwards-compatible layout usage. */
  seed?: number;
  /** Kept for backwards-compatible layout usage. */
  flowSpeed?: number;
};

export default function PaintingCanvas({ opacity = 1 }: PaintingCanvasProps) {
  return (
    <div
      aria-hidden="true"
      className="cc-textured-bg"
      style={{ "--cc-textured-bg-opacity": opacity } as CSSProperties}
    />
  );
}
