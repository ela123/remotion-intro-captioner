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
  const paper     = EDITORIAL_PALETTE.paper;
  const champagne = EDITORIAL_PALETTE.champagne;
  const sapphire  = EDITORIAL_PALETTE.sapphire;

  // ── Timing ────────────────────────────────────────────────────────────────
  const wordStartFrame  = Math.round(word.start * fps);
  const wordEndFrame    = Math.round(word.end * fps);
  const spokenDuration  = Math.max(1, wordEndFrame - wordStartFrame);
  const chunkDuration   = Math.max(1, chunkEndFrame - chunkStartFrame);

  const defaultEntranceDur   = word.role === "hero" ? 9 : word.role === "connector" ? 5 : 7;
  const maxAvailableEntrance = Math.max(3, chunkDuration - 12);
  const enterDuration        = Math.min(defaultEntranceDur, maxAvailableEntrance);
  const enterStart           = Math.min(wordStartFrame - 2, chunkEndFrame - 6 - enterDuration);

  if (frame < enterStart) return null;

  const rawEnterProg = clamp01((frame - enterStart) / enterDuration);
  const isSpoken     = frame >= wordStartFrame && frame <= wordEndFrame + 2;
  const isPast       = frame > wordEndFrame + 2;
  const spokenProg   = clamp01((frame - wordStartFrame) / spokenDuration);

  // ── 1. Entrance by role ────────────────────────────────────────────────────
  let enterTransY         = 0;
  let enterTransYPercent  = 0;
  let enterOpacity        = word.opacity;
  let enterTrackingEm     = word.trackingEm;
  let liveWeight          = word.fontWeight;

  if (word.role === "hero") {
    // Drop through mask from -110% with spring overshoot — weight blooms 400→800
    const spr          = backOut(1.08)(rawEnterProg);
    enterTransYPercent = (1 - spr) * -110;
    enterOpacity       = rawEnterProg;
    liveWeight         = Math.round(400 + spr * 400);
  } else if (word.role === "accent") {
    // Rise mask from +90%
    const spr          = expoOut(rawEnterProg);
    enterTransYPercent = (1 - spr) * 90;
    enterOpacity       = spr;
  } else if (word.role === "connector") {
    // Track-in: fade with letter-spacing collapse
    enterOpacity    = rawEnterProg * (word.opacity ?? 0.72);
    enterTrackingEm = 0.28 - rawEnterProg * (0.28 - 0.14);
  } else {
    // Normal: soft drop with opacity
    const spr    = expoOut(rawEnterProg);
    enterTransY  = -12 * unit * (1 - spr);
    enterOpacity = spr;
  }

  // ── 2. Spoken emphasis ─────────────────────────────────────────────────────
  let showRule    = false;
  let ruleProgress = 0;
  let textColor   = paper;

  if (word.role === "hero") {
    if (isSpoken) {
      // Weight swell: 600 → 900, colour shifts to champagne
      liveWeight  = Math.round(600 + spokenProg * 300);
      textColor   = champagne;
      showRule    = true;
      const ruleAge = frame - wordStartFrame;
      ruleProgress  = clamp01(ruleAge / 7);
    } else if (isPast) {
      liveWeight  = 750;
      textColor   = champagne;
      showRule    = true;
      ruleProgress = 1;
    } else {
      textColor   = paper;
    }
  } else if (word.role === "accent") {
    if (isSpoken) {
      // Even accents: colour-turn to sapphire; Odd: subtle skew
      if (accentIndexInChunk % 2 === 0) {
        textColor = sapphire;
      } else {
        textColor = paper;
      }
    } else if (isPast) {
      textColor = paper;
    } else {
      textColor = paper;
      enterOpacity = Math.min(enterOpacity, 0.65);
    }
  } else {
    if (!isSpoken && !isPast) enterOpacity = Math.min(enterOpacity, 0.65);
    textColor = paper;
  }

  const fontCss    = fontFamilyCss(word.fontFamily);
  const textShadow = isSpoken
    ? `0 0 ${18 * unit}px rgba(232,200,122,0.35), ${quality === "final" ? EDITORIAL_TOKENS.shadowFinal : EDITORIAL_TOKENS.shadowPreview}`
    : quality === "final"
      ? EDITORIAL_TOKENS.shadowFinal
      : EDITORIAL_TOKENS.shadowPreview;

  const isConnector = word.role === "connector";

  // ── Determine top-level opacity ────────────────────────────────────────────
  const finalOpacity = isPast ? 1.0 : enterOpacity;

  return (
    <div
      style={{
        position:     "absolute",
        left:         word.x,
        top:          word.y,
        width:        word.width,
        height:       word.height,
        pointerEvents: "none",
        zIndex:       isSpoken ? 15 : word.role === "hero" ? 10 : 2,
      }}
    >
      <div
        style={{
          width:          "100%",
          height:         "100%",
          display:        "inline-flex",
          alignItems:     "center",
          justifyContent: "center",
          transform:      `translateY(${enterTransYPercent}%) translateY(${enterTransY.toFixed(1)}px)`,
          opacity:        finalOpacity,
        }}
      >
        <span
          style={{
            fontFamily:    fontCss,
            fontSize:      `${word.fontSize}px`,
            fontWeight:    liveWeight,
            fontStyle:     word.fontStyle,
            fontVariant:   isConnector ? "small-caps" : undefined,
            color:         textColor,
            letterSpacing: `${enterTrackingEm}em`,
            textTransform: word.uppercase ? "uppercase" : "none",
            textShadow,
            lineHeight:    1,
            whiteSpace:    "pre",
            transition:    "color 0.12s ease",
          }}
        >
          {word.text}
        </span>
      </div>

      {/* ── Sapphire-to-champagne underline rule (hero spoken & past) ── */}
      {showRule && (
        <div
          style={{
            position:        "absolute",
            bottom:          `${-3 * unit}px`,
            left:            0,
            right:           0,
            height:          `${Math.max(1.5, 2 * unit)}px`,
            background:      `linear-gradient(90deg, ${sapphire}, ${champagne})`,
            transformOrigin: "left center",
            transform:       `scaleX(${ruleProgress})`,
            boxShadow:       `0 0 ${8 * unit}px rgba(232,200,122,0.65)`,
            zIndex:          11,
          }}
        />
      )}
    </div>
  );
};
