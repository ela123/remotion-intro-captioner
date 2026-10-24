import React, { useMemo } from "react";
import { fontFamilyCss } from "../../styles/fonts";
import { expoOut } from "../../utils/ease";
import { EDITORIAL_PALETTE } from "./preset";
import type { Quality } from "../../types";
import type { ChunkLayout, PlacedWord } from "../../template/word-layout";

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
  const vermilion = EDITORIAL_PALETTE.vermilion;

  const heroWord = useMemo(() => {
    for (const line of chunkLayout.lines) {
      for (const w of line.words) {
        if (w.role === "hero") return w;
      }
    }
    return null;
  }, [chunkLayout]);

  // Entrance timing for hairline rules and index marker
  const age = frame - startFrame;
  const ruleProgress = Math.min(1, Math.max(0, age / 12));
  const ruleEase = expoOut(ruleProgress);

  const indexStr = String(chunkIndexInRun).padStart(2, "0");
  const connectorFont = fontFamilyCss("DM Sans");

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* Soft Bottom Readability Gradient (ink, 0 -> 40% opacity) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "45%",
          background: "linear-gradient(to top, rgba(17, 17, 17, 0.42) 0%, rgba(17, 17, 17, 0) 100%)",
          zIndex: 0,
        }}
      />

      {/* Elegant Hairline Rule Above the Block */}
      <div
        style={{
          position: "absolute",
          left: `${bounds.x}px`,
          top: `${bounds.y - 24 * unit}px`,
          width: `${Math.min(bounds.width, 400 * unit)}px`,
          height: `${Math.max(1, 1.5 * unit)}px`,
          backgroundColor: vermilion,
          transformOrigin: "left center",
          transform: `scaleX(${ruleEase})`,
          opacity: 0.85,
          zIndex: 1,
        }}
      />

      {/* Small Index Numeral Marker ("01", "02") */}
      <div
        style={{
          position: "absolute",
          left: `${bounds.x}px`,
          top: `${bounds.y - 48 * unit}px`,
          fontFamily: connectorFont,
          fontSize: `${22 * unit}px`,
          fontWeight: 600,
          color: paper,
          letterSpacing: "0.15em",
          opacity: ruleEase * 0.7,
          zIndex: 1,
        }}
      >
        {indexStr}
      </div>

      {/* Single Asterisk Glyphs near Hero Word */}
      {heroWord && (
        <div
          style={{
            position: "absolute",
            left: `${heroWord.x + heroWord.width + 6 * unit}px`,
            top: `${heroWord.y - 6 * unit}px`,
            fontFamily: fontFamilyCss("Fraunces"),
            fontSize: `${28 * unit}px`,
            color: vermilion,
            opacity: ruleEase * 0.9,
            zIndex: 2,
          }}
        >
          *
        </div>
      )}
    </div>
  );
};
