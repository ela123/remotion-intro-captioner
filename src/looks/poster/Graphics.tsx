import React, { useMemo } from "react";
import { fontFamilyCss } from "../../styles/fonts";
import { expoOut } from "../../utils/ease";
import { POSTER_PALETTE } from "./preset";
import type { Quality } from "../../types";
import type { ChunkLayout, PlacedWord } from "../../template/word-layout";

type PosterGraphicsProps = {
  chunkLayout: ChunkLayout;
  frame: number;
  fps: number;
  unit: number;
  quality: Quality;
};

export const PosterGraphics: React.FC<PosterGraphicsProps> = ({
  chunkLayout,
  frame,
  fps,
  unit,
  quality,
}) => {
  const { startFrame, endFrame, bounds } = chunkLayout;
  const bone = POSTER_PALETTE.bone;
  const red = POSTER_PALETTE.signalRed;

  const heroWord = useMemo(() => {
    for (const line of chunkLayout.lines) {
      for (const w of line.words) {
        if (w.role === "hero") return w;
      }
    }
    return null;
  }, [chunkLayout]);

  const age = frame - startFrame;
  const lineProgress = Math.min(1, Math.max(0, age / 8));
  const lineEase = expoOut(lineProgress);

  const duration = Math.max(1, endFrame - startFrame);
  const chunkProgress = Math.min(1, Math.max(0, age / duration));
  const ghostScale = 1.55 + 0.1 * chunkProgress;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* Ghost-Echo behind the block: huge outlined copy of hero word */}
      {heroWord && (
        <div
          style={{
            position: "absolute",
            left: `${bounds.x + bounds.width / 2}px`,
            top: `${bounds.y + bounds.height / 2}px`,
            transform: `translate(-50%, -50%) scale(${ghostScale.toFixed(3)})`,
            zIndex: 0,
            opacity: 0.08,
            fontFamily: fontFamilyCss("Anton"),
            fontSize: `${180 * unit}px`,
            fontWeight: 700,
            textTransform: "uppercase",
            WebkitTextStroke: `${3 * unit}px ${bone}`,
            color: "transparent",
            letterSpacing: "0.05em",
            whiteSpace: "nowrap",
          }}
        >
          {heroWord.text}
        </div>
      )}

      {/* Thin Framing Bars Above and Below the Block */}
      <div
        style={{
          position: "absolute",
          left: `${bounds.x}px`,
          top: `${bounds.y - 14 * unit}px`,
          width: `${bounds.width}px`,
          height: `${Math.max(1, 2 * unit)}px`,
          backgroundColor: bone,
          transformOrigin: "left center",
          transform: `scaleX(${lineEase})`,
          opacity: 0.75,
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `${bounds.x}px`,
          top: `${bounds.y + bounds.height + 14 * unit}px`,
          width: `${bounds.width}px`,
          height: `${Math.max(1, 2 * unit)}px`,
          backgroundColor: bone,
          transformOrigin: "right center",
          transform: `scaleX(${lineEase})`,
          opacity: 0.75,
          zIndex: 1,
        }}
      />

      {/* Small Plus and Arrow Glyphs */}
      <div
        style={{
          position: "absolute",
          left: `${bounds.x - 30 * unit}px`,
          top: `${bounds.y - 20 * unit}px`,
          fontFamily: fontFamilyCss("Space Mono"),
          fontSize: `${18 * unit}px`,
          color: red,
          fontWeight: 700,
          opacity: lineEase,
          zIndex: 2,
        }}
      >
        +
      </div>
      <div
        style={{
          position: "absolute",
          left: `${bounds.x + bounds.width + 16 * unit}px`,
          top: `${bounds.y + bounds.height}px`,
          fontFamily: fontFamilyCss("Space Mono"),
          fontSize: `${18 * unit}px`,
          color: bone,
          fontWeight: 700,
          opacity: lineEase,
          zIndex: 2,
        }}
      >
        →
      </div>

      {/* Masking Tape Strip Across Corner of Hero Block */}
      {heroWord && (
        <div
          style={{
            position: "absolute",
            left: `${heroWord.x - 12 * unit}px`,
            top: `${heroWord.y - 10 * unit}px`,
            width: `${42 * unit}px`,
            height: `${14 * unit}px`,
            backgroundColor: "rgba(242, 240, 235, 0.4)",
            transform: "rotate(-18deg)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
            zIndex: 12,
          }}
        />
      )}
    </div>
  );
};
