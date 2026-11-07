import React from "react";
import { fontFamilyCss } from "../../styles/fonts";
import { backOut, expoOut } from "../../utils/ease";
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
  const gold = EDITORIAL_PALETTE.gold;
  const vermilion = EDITORIAL_PALETTE.vermilion;

  // Spoken timing
  const wordStartFrame = Math.round(word.start * fps);
  const wordEndFrame = Math.round(word.end * fps);
  const spokenDuration = Math.max(1, wordEndFrame - wordStartFrame);

  // Entrance timing
  const chunkDuration = Math.max(1, chunkEndFrame - chunkStartFrame);
  const defaultEntranceDur = word.role === "hero" ? 8 : 6;
  const maxAvailableEntrance = Math.max(3, chunkDuration - 10);
  const enterDuration = Math.min(defaultEntranceDur, maxAvailableEntrance);
  const enterStart = Math.min(wordStartFrame - 2, chunkEndFrame - 5 - enterDuration);

  if (frame < enterStart) return null;

  const rawEnterProg = clamp01((frame - enterStart) / enterDuration);
  const isSpoken = frame >= wordStartFrame && frame <= wordEndFrame + 1;
  const isPast = frame > wordEndFrame + 1;
  const spokenProg = clamp01((frame - wordStartFrame) / spokenDuration);

  // 1. Entrance Motion by Role
  let enterTransY = 0;
  let enterTransYPercent = 0;
  let enterOpacity = word.opacity;
  let enterTrackingEm = word.trackingEm;
  let liveWeight = word.fontWeight;

  if (word.role === "hero") {
    // Drop-through-mask with subtle overshoot settle
    const spr = backOut(1.1)(rawEnterProg);
    enterTransYPercent = (1 - spr) * -100;
    liveWeight = Math.round(600 + spr * 200);
  } else if (word.role === "accent") {
    // Rise-mask
    const spr = expoOut(rawEnterProg);
    enterTransYPercent = (1 - spr) * 100;
  } else if (word.role === "connector") {
    // Track-in
    enterOpacity = rawEnterProg * 0.8;
    enterTrackingEm = 0.25 - rawEnterProg * (0.25 - 0.12);
  } else {
    // Soft-drop
    const spr = expoOut(rawEnterProg);
    enterTransY = -12 * unit * (1 - spr);
    enterOpacity = spr;
  }

  // 2. Spoken State Highlighting
  let showRule = false;
  let ruleProgress = 0;
  let textColor = paper;

  if (isSpoken) {
    if (word.role === "hero") {
      textColor = gold;
      liveWeight = Math.round(700 + spokenProg * 150);
      showRule = true;
      ruleProgress = clamp01((frame - wordStartFrame) / 6);
    } else if (word.role === "accent") {
      textColor = gold;
    } else {
      textColor = paper;
    }
  } else if (isPast) {
    textColor = word.role === "hero" ? gold : paper;
    if (word.role === "hero") {
      showRule = true;
      ruleProgress = 1;
    }
  } else {
    // Future word in chunk
    textColor = paper;
    enterOpacity = Math.min(enterOpacity, 0.68);
  }

  const fontCss = fontFamilyCss(word.fontFamily);
  const textShadow = isSpoken
    ? `0 0 ${16 * unit}px rgba(243, 206, 114, 0.4), ${quality === "final" ? EDITORIAL_TOKENS.shadowFinal : EDITORIAL_TOKENS.shadowPreview}`
    : quality === "final"
      ? EDITORIAL_TOKENS.shadowFinal
      : EDITORIAL_TOKENS.shadowPreview;

  const isConnector = word.role === "connector";

  return (
    <div
      style={{
        position: "absolute",
        left: word.x,
        top: word.y,
        width: word.width,
        height: word.height,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: isSpoken ? 15 : word.role === "hero" ? 10 : 2,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateY(${enterTransYPercent}%) translateY(${enterTransY.toFixed(1)}px)`,
          opacity: isPast ? 1.0 : enterOpacity,
        }}
      >
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
            transition: "color 0.15s ease",
          }}
        >
          {word.text}
        </span>
      </div>

      {/* Elegant Hairline Champagne-to-Vermilion Rule */}
      {showRule && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: `${Math.max(1.5, 2 * unit)}px`,
            background: `linear-gradient(90deg, ${gold}, ${vermilion})`,
            transformOrigin: "left center",
            transform: `scaleX(${ruleProgress})`,
            boxShadow: `0 0 ${6 * unit}px rgba(243, 206, 114, 0.6)`,
            zIndex: 11,
          }}
        />
      )}
    </div>
  );
};
