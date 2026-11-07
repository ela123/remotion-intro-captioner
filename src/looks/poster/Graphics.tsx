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

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const PosterGraphics: React.FC<PosterGraphicsProps> = ({
  chunkLayout,
  frame,
  fps,
  unit,
}) => {
  const { startFrame, endFrame, bounds } = chunkLayout;
  const bone   = POSTER_PALETTE.bone;
  const amber  = POSTER_PALETTE.amber;
  const coral  = POSTER_PALETTE.coral;
  const lime   = POSTER_PALETTE.lime;

  const heroWord = useMemo(() => {
    for (const line of chunkLayout.lines) {
      for (const w of line.words) {
        if (w.role === "hero") return w;
      }
    }
    return null;
  }, [chunkLayout]);

  // ── Entrance easing ────────────────────────────────────────────────────────
  const age       = frame - startFrame;
  const lineProgress = clamp01(age / 8);
  const lineEase  = expoOut(lineProgress);

  // ── Ghost echo scale (slow drift) ─────────────────────────────────────────
  const duration   = Math.max(1, endFrame - startFrame);
  const chunkProg  = clamp01(age / duration);
  const ghostScale = 1.42 + 0.07 * chunkProg;

  const antonFont  = fontFamilyCss("Anton");

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>

      {/* ── 1. Outlined ghost-echo of hero word (slowlooms in background) ── */}
      {heroWord && (
        <div
          style={{
            position:       "absolute",
            left:           `${bounds.x + bounds.width / 2}px`,
            top:            `${bounds.y + bounds.height / 2}px`,
            transform:      `translate(-50%, -50%) scale(${ghostScale.toFixed(3)})`,
            fontFamily:     antonFont,
            fontSize:       `${168 * unit}px`,
            fontWeight:     400,
            textTransform:  "uppercase",
            WebkitTextStroke:`${2.5 * unit}px ${amber}`,
            color:          "transparent",
            letterSpacing:  "0.04em",
            whiteSpace:     "nowrap",
            opacity:        0.07,
            zIndex:         0,
          }}
        >
          {heroWord.text}
        </div>
      )}

      {/* ── 2. Amber rule line above text block (wipes left→right) ── */}
      <div
        style={{
          position:        "absolute",
          left:            `${bounds.x}px`,
          top:             `${bounds.y - 13 * unit}px`,
          width:           `${bounds.width}px`,
          height:          `${Math.max(1.5, 2 * unit)}px`,
          background:      `linear-gradient(90deg, ${amber}, ${coral})`,
          transformOrigin: "left center",
          transform:       `scaleX(${lineEase})`,
          boxShadow:       `0 0 ${7 * unit}px ${amber}88`,
          opacity:         0.85,
          zIndex:          1,
        }}
      />

      {/* ── 3. Lime rule line below text block (wipes right→left) ── */}
      <div
        style={{
          position:        "absolute",
          left:            `${bounds.x}px`,
          top:             `${bounds.y + bounds.height + 13 * unit}px`,
          width:           `${bounds.width}px`,
          height:          `${Math.max(1.5, 2 * unit)}px`,
          background:      `linear-gradient(90deg, ${lime}, ${coral})`,
          transformOrigin: "right center",
          transform:       `scaleX(${lineEase})`,
          boxShadow:       `0 0 ${7 * unit}px ${lime}66`,
          opacity:         0.75,
          zIndex:          1,
        }}
      />

      {/* ── 4. Flanking left column of tick marks ── */}
      <div
        style={{
          position:        "absolute",
          left:            `${bounds.x - 20 * unit}px`,
          top:             `${bounds.y}px`,
          height:          `${bounds.height}px`,
          display:         "flex",
          flexDirection:   "column",
          justifyContent:  "space-between",
          opacity:         lineEase * 0.65,
          zIndex:          2,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`tick-${i}`}
            style={{
              width:           `${10 * unit}px`,
              height:          `${Math.max(1, 1.5 * unit)}px`,
              backgroundColor: i % 2 === 0 ? amber : lime,
            }}
          />
        ))}
      </div>

      {/* ── 5. HUD metadata label (top-left of block) ── */}
      <div
        style={{
          position:      "absolute",
          left:          `${bounds.x}px`,
          top:           `${bounds.y - 32 * unit}px`,
          display:       "flex",
          alignItems:    "center",
          gap:           `${7 * unit}px`,
          fontFamily:    `"DM Sans", sans-serif`,
          fontSize:      `${10 * unit}px`,
          fontWeight:    700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color:         amber,
          opacity:       lineEase * 0.88,
          zIndex:        2,
        }}
      >
        <span style={{ color: coral }}>▶</span>
        <span>High Impact</span>
      </div>

      {/* ── 6. Crosshair at top-right corner ── */}
      <div
        style={{
          position:    "absolute",
          left:        `${bounds.x + bounds.width + 10 * unit}px`,
          top:         `${bounds.y - 16 * unit}px`,
          fontFamily:  `"DM Sans", monospace`,
          fontSize:    `${18 * unit}px`,
          color:       lime,
          fontWeight:  700,
          opacity:     lineEase * 0.9,
          lineHeight:  1,
          zIndex:      2,
        }}
      >
        +
      </div>

    </div>
  );
};
