import React from "react";
import { fontFamilyCss } from "../../styles/fonts";
import { backOut, expoOut } from "../../utils/ease";
import { seededChoice } from "../../utils/prng";
import { EDITORIAL_PALETTE, EDITORIAL_TOKENS } from "./preset";
import type { Quality } from "../../types";
import type { PlacedWord } from "../../template/word-layout";

type EditorialWordProps = {
  word: PlacedWord;
  chunkStartFrame: number;
  chunkEndFrame: number;
  frame: number;
  fps: number;
  unit: number;
  quality: Quality;
  energy?: number;
  decorBudget?: number;
  wordIndexInChunk: number;
  heroIndexInChunk: number;
  accentIndexInChunk: number;
  normalIndexInChunk: number;
};

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const EditorialWord: React.FC<EditorialWordProps> = ({
  word,
  chunkStartFrame,
  chunkEndFrame,
  frame,
  fps,
  unit,
  quality,
  heroIndexInChunk,
  accentIndexInChunk,
}) => {
  const paper = EDITORIAL_PALETTE.paper;
  const vermilion = EDITORIAL_PALETTE.vermilion;

  // Spoken timing
  const wordStartFrame = Math.round(word.start * fps);
  const wordEndFrame = Math.round(word.end * fps);
  const spokenDuration = Math.max(1, wordEndFrame - wordStartFrame);

  // Entrance timing
  const chunkDuration = Math.max(1, chunkEndFrame - chunkStartFrame);
  const defaultEntranceDur = word.role === "hero" ? 8 : 7;
  const maxAvailableEntrance = Math.max(3, chunkDuration - 12);
  const enterDuration = Math.min(defaultEntranceDur, maxAvailableEntrance);
  const enterStart = Math.min(wordStartFrame - 2, chunkEndFrame - 6 - enterDuration);

  if (frame < enterStart) return null;

  const rawEnterProg = clamp01((frame - enterStart) / enterDuration);
  const isSpoken = frame >= wordStartFrame && frame <= wordEndFrame + 2;
  const spokenProg = clamp01((frame - wordStartFrame) / spokenDuration);

  // 1. Entrance Motion by Role
  let enterTransY = 0;
  let enterTransYPercent = 0;
  let enterOpacity = word.opacity;
  let enterTrackingEm = word.trackingEm;
  let liveWeight = word.fontWeight;

  if (word.role === "hero") {
    // drop-through-mask: letters/word falls from -120% to 0 with 4% overshoot settle, weight 300 -> 800
    const spr = backOut(1.1)(rawEnterProg);
    enterTransYPercent = (1 - spr) * -120;
    liveWeight = Math.round(300 + spr * 500); // 300 -> 800
  } else if (word.role === "accent") {
    // rise-mask: from +100% to 0, expoOut, 7 frames
    const spr = expoOut(rawEnterProg);
    enterTransYPercent = (1 - spr) * 100;
  } else if (word.role === "connector") {
    // track-in: opacity 0 -> 0.85, letter-spacing 0.3em -> 0.12em
    enterOpacity = rawEnterProg * 0.85;
    enterTrackingEm = 0.3 - rawEnterProg * (0.3 - 0.12);
  } else {
    // normal: soft-drop translateY -14px * unit -> 0 with opacity 0 -> 1
    const spr = expoOut(rawEnterProg);
    enterTransY = -14 * unit * (1 - spr);
    enterOpacity = spr;
  }

  // 2. Emphasis
  let showRule = false;
  let ruleProgress = 0;
  let textColor = paper;
  let skewX = 0;

  if (word.role === "hero") {
    if (isSpoken) {
      // weight-swell: 600 -> 850 across duration
      liveWeight = Math.round(600 + spokenProg * 250);
      showRule = true;
      const ruleAge = frame - wordStartFrame;
      ruleProgress = clamp01(ruleAge / 8);
    } else if (frame > wordEndFrame) {
      liveWeight = 750;
      showRule = true;
      ruleProgress = 1;
    }
  } else if (word.role === "accent" && isSpoken) {
    const isLean = accentIndexInChunk % 2 === 1;
    if (isLean) {
      skewX = -10 * spokenProg;
    } else {
      // color-turn: paper -> vermilion in 3 frames
      const colorProg = clamp01((frame - wordStartFrame) / 3);
      textColor = colorProg > 0.5 ? vermilion : paper;
    }
  }

  const fontCss = fontFamilyCss(word.fontFamily);
  const textShadow = quality === "final" ? EDITORIAL_TOKENS.shadowFinal : EDITORIAL_TOKENS.shadowPreview;

  // If connector: small caps styling
  const isConnector = word.role === "connector";

  return (
    <div
      style={{
        position: "absolute",
        left: word.x,
        top: word.y,
        width: word.width,
        height: word.height,
        // Overflow hidden mask for gravity drop/rise entrance & exit!
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: word.role === "hero" ? 10 : 2,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateY(${enterTransYPercent}%) translateY(${enterTransY.toFixed(1)}px) skewX(${skewX}deg)`,
          opacity: enterOpacity,
        }}
      >
        {/* Letters or Text Block */}
        <span
          style={{
            fontFamily: fontCss,
            fontSize: `${word.fontSize}px`,
            fontWeight: liveWeight,
            fontStyle: word.fontStyle,
            fontVariant: isConnector ? "small-caps" : undefined,
            color: textColor,
            letterSpacing: `${enterTrackingEm}em`,
            textTransform: word.uppercase ? "uppercase" : "none",
            textShadow,
            lineHeight: 1,
            whiteSpace: "pre",
          }}
        >
          {word.text}
        </span>
      </div>

      {/* Hairline Vermilion Rule Underneath Hero */}
      {showRule && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: `${Math.max(1.5, 2 * unit)}px`,
            backgroundColor: vermilion,
            transformOrigin: "left center",
            transform: `scaleX(${ruleProgress})`,
            zIndex: 11,
          }}
        />
      )}
    </div>
  );
};
