import React, { useMemo } from "react";
import { fontFamilyCss } from "../../styles/fonts";
import { expoOut } from "../../utils/ease";
import { EDITORIAL_PALETTE } from "./preset";
import type { Quality } from "../../types";
import type { ChunkLayout } from "../../template/word-layout";

type EditorialGraphicsProps = {
  chunkLayout: ChunkLayout;
  frame: number;
  fps: number;
  unit: number;
  quality: Quality;
  chunkIndexInRun?: number;
};

export const EditorialGraphics: React.FC<EditorialGraphicsProps> = ({
  chunkLayout,
  frame,
  fps,
  unit,
  chunkIndexInRun = 1,
}) => {
  const { startFrame, bounds } = chunkLayout;
  const paper = EDITORIAL_PALETTE.paper;
  const gold = EDITORIAL_PALETTE.gold;
  const vermilion = EDITORIAL_PALETTE.vermilion;

  // Entrance timing
  const age = frame - startFrame;
  const enterProg = Math.min(1, Math.max(0, age / 10));
  const enterEase = expoOut(enterProg);

  const indexStr = String(chunkIndexInRun).padStart(2, "0");
  const monoFont = fontFamilyCss("Space Mono");

  // Floating card dimensions
  const cardPadX = 24 * unit;
  const cardPadY = 18 * unit;
  const cardLeft = bounds.x - cardPadX;
  const cardTop = bounds.y - cardPadY;
  const cardWidth = bounds.width + cardPadX * 2;
  const cardHeight = bounds.height + cardPadY * 2;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* 1. Frosted Acrylic Glass Studio Backplate */}
      <div
        style={{
          position: "absolute",
          left: `${cardLeft}px`,
          top: `${cardTop}px`,
          width: `${cardWidth}px`,
          height: `${cardHeight}px`,
          background: "linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(10, 15, 26, 0.85) 100%)",
          backdropFilter: "blur(14px)",
          borderRadius: `${14 * unit}px`,
          border: "1px solid rgba(255, 255, 255, 0.14)",
          boxShadow: `0 20px 45px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.18)`,
          opacity: enterEase * 0.95,
          transform: `scale(${0.96 + enterEase * 0.04})`,
          transformOrigin: "center center",
          zIndex: 0,
        }}
      />

      {/* 2. Soft Ambient Warm Spotlight behind the caption */}
      <div
        style={{
          position: "absolute",
          left: `${bounds.x + bounds.width / 2}px`,
          top: `${bounds.y + bounds.height / 2}px`,
          width: `${bounds.width * 1.2}px`,
          height: `${bounds.height * 1.5}px`,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(ellipse at center, rgba(243, 206, 114, 0.12) 0%, transparent 70%)",
          opacity: enterEase,
          zIndex: 0,
        }}
      />

      {/* 3. Elegant Hairline Rule Above the Block */}
      <div
        style={{
          position: "absolute",
          left: `${cardLeft + 16 * unit}px`,
          top: `${cardTop - 12 * unit}px`,
          width: `${Math.min(cardWidth - 32 * unit, 280 * unit)}px`,
          height: `${Math.max(1, 1.5 * unit)}px`,
          background: `linear-gradient(90deg, ${gold}, ${vermilion})`,
          transformOrigin: "left center",
          transform: `scaleX(${enterEase})`,
          boxShadow: `0 0 ${8 * unit}px rgba(243, 206, 114, 0.5)`,
          opacity: 0.9,
          zIndex: 1,
        }}
      />

      {/* 4. Minimalist Studio Chapter Index Marker */}
      <div
        style={{
          position: "absolute",
          left: `${cardLeft + 16 * unit}px`,
          top: `${cardTop - 32 * unit}px`,
          display: "flex",
          alignItems: "center",
          gap: `${8 * unit}px`,
          fontFamily: monoFont,
          fontSize: `${11 * unit}px`,
          fontWeight: 700,
          color: gold,
          letterSpacing: "0.18em",
          opacity: enterEase * 0.85,
          zIndex: 1,
        }}
      >
        <span style={{ color: vermilion }}>//</span>
        <span>{`INSIGHT ${indexStr}`}</span>
      </div>
    </div>
  );
};
