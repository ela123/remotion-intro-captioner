import React, { useMemo } from "react";
import { fontFamilyCss } from "../../styles/fonts";
import { expoOut } from "../../utils/ease";
import { POSTER_PALETTE } from "./preset";
import type { Quality } from "../../types";
import type { ChunkLayout } from "../../template/word-layout";

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
}) => {
  const { startFrame, endFrame, bounds } = chunkLayout;
  const bone = POSTER_PALETTE.bone;
  const acid = POSTER_PALETTE.acid;
  const cyan = POSTER_PALETTE.electricBlue;
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
  const lineProgress = Math.min(1, Math.max(0, age / 7));
  const lineEase = expoOut(lineProgress);

  const duration = Math.max(1, endFrame - startFrame);
  const chunkProgress = Math.min(1, Math.max(0, age / duration));
  const ghostScale = 1.45 + 0.08 * chunkProgress;

  const monoFont = fontFamilyCss("Space Mono");

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* 1. Monumental Outlined Cyber Ghost-Echo */}
      {heroWord && (
        <div
          style={{
            position: "absolute",
            left: `${bounds.x + bounds.width / 2}px`,
            top: `${bounds.y + bounds.height / 2}px`,
            transform: `translate(-50%, -50%) scale(${ghostScale.toFixed(3)})`,
            zIndex: 0,
            opacity: 0.1,
            fontFamily: fontFamilyCss("Anton"),
            fontSize: `${160 * unit}px`,
            fontWeight: 700,
            textTransform: "uppercase",
            WebkitTextStroke: `${2 * unit}px ${cyan}`,
            color: "transparent",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
          }}
        >
          {heroWord.text}
        </div>
      )}

      {/* 2. Cyber HUD Laser Framing Lines Above and Below */}
      <div
        style={{
          position: "absolute",
          left: `${bounds.x}px`,
          top: `${bounds.y - 14 * unit}px`,
          width: `${bounds.width}px`,
          height: `${Math.max(1, 2 * unit)}px`,
          background: `linear-gradient(90deg, ${acid}, ${cyan})`,
          transformOrigin: "left center",
          transform: `scaleX(${lineEase})`,
          boxShadow: `0 0 ${8 * unit}px ${cyan}`,
          opacity: 0.85,
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
          background: `linear-gradient(90deg, ${cyan}, ${red})`,
          transformOrigin: "right center",
          transform: `scaleX(${lineEase})`,
          boxShadow: `0 0 ${8 * unit}px ${cyan}`,
          opacity: 0.85,
          zIndex: 1,
        }}
      />

      {/* 3. Tech HUD Metadata Badge */}
      <div
        style={{
          position: "absolute",
          left: `${bounds.x}px`,
          top: `${bounds.y - 34 * unit}px`,
          display: "flex",
          alignItems: "center",
          gap: `${8 * unit}px`,
          fontFamily: monoFont,
          fontSize: `${10 * unit}px`,
          fontWeight: 700,
          color: acid,
          letterSpacing: "0.2em",
          opacity: lineEase * 0.9,
          zIndex: 2,
        }}
      >
        <span style={{ color: red }}>[REC]</span>
        <span>HUD // HIGH-IMPACT</span>
      </div>

      {/* 4. Left Flank Tech Frequency Ticks */}
      <div
        style={{
          position: "absolute",
          left: `${bounds.x - 22 * unit}px`,
          top: `${bounds.y}px`,
          height: `${bounds.height}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          opacity: lineEase * 0.7,
          zIndex: 2,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`flank-${i}`}
            style={{
              width: `${12 * unit}px`,
              height: `${1.5 * unit}px`,
              backgroundColor: i % 2 === 0 ? acid : cyan,
            }}
          />
        ))}
      </div>

      {/* 5. Right Corner Crosshair '+' */}
      <div
        style={{
          position: "absolute",
          left: `${bounds.x + bounds.width + 12 * unit}px`,
          top: `${bounds.y - 18 * unit}px`,
          fontFamily: monoFont,
          fontSize: `${16 * unit}px`,
          color: cyan,
          fontWeight: 700,
          opacity: lineEase,
          zIndex: 2,
        }}
      >
        +
      </div>
    </div>
  );
};
