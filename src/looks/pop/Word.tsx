import React from "react";
import { fontFamilyCss } from "../../styles/fonts";
import { backOut, expoOut } from "../../utils/ease";
import { POP_PALETTE } from "./preset";
import type { Quality } from "../../types";
import type { PlacedWord } from "../../template/word-layout";

type PopWordProps = {
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

export const PopWord: React.FC<PopWordProps> = ({
  word,
  chunkStartFrame,
  chunkEndFrame,
  frame,
  fps,
  unit,
  quality,
  energy = 1,
  decorBudget = 1,
  heroIndexInChunk,
  accentIndexInChunk,
  normalIndexInChunk,
}) => {
  const ink   = POP_PALETTE.ink;
  const cream = POP_PALETTE.cream;

  // ── Timing ────────────────────────────────────────────────────────────────
  const wordStartFrame  = Math.round(word.start * fps);
  const wordEndFrame    = Math.round(word.end * fps);
  const spokenDuration  = Math.max(1, wordEndFrame - wordStartFrame);
  const chunkDuration   = Math.max(1, chunkEndFrame - chunkStartFrame);

  const defaultEntranceDur   = word.role === "connector" ? 4 : 7;
  const maxAvailableEntrance = Math.max(3, chunkDuration - 12);
  const enterDuration        = Math.min(defaultEntranceDur, maxAvailableEntrance);
  const enterStart           = Math.min(wordStartFrame - 2, chunkEndFrame - 6 - enterDuration);

  if (frame < enterStart) return null;

  const rawEnterProg = clamp01((frame - enterStart) / enterDuration);
  const isSpoken     = frame >= wordStartFrame && frame <= wordEndFrame + 2;
  const isPast       = frame > wordEndFrame + 2;
  const spokenProg   = clamp01((frame - wordStartFrame) / spokenDuration);

  // ── Active colour for this word slot ──────────────────────────────────────
  const cycle = POP_PALETTE.cycle;
  const colorIndex = (heroIndexInChunk + accentIndexInChunk + word.lineIndex) % cycle.length;
  const accentColor = word.color && word.color !== cream ? word.color : cycle[colorIndex]!;

  // ── 1. Entrance Animation ─────────────────────────────────────────────────
  let enterTransY = 0;
  let enterScale  = 1;
  let enterRot    = 0;
  let enterOpacity = word.opacity;

  if (word.role === "hero") {
    // Smooth spring rise from below with gentle overshoot
    const spr    = backOut(1.15)(rawEnterProg);
    enterScale   = 0.6 + spr * 0.4;
    enterTransY  = (1 - rawEnterProg) * 22 * unit;
    enterOpacity = rawEnterProg;
  } else if (word.role === "accent") {
    // Clean expo-out scale-up from origin
    const spr    = expoOut(rawEnterProg);
    enterScale   = 0.72 + spr * 0.28;
    enterTransY  = (1 - spr) * 14 * unit;
    enterOpacity = rawEnterProg;
  } else if (word.role === "connector") {
    // Fade + subtle drift
    enterOpacity = rawEnterProg * (word.opacity ?? 0.75);
    enterTransY  = (1 - rawEnterProg) * 6 * unit;
  } else {
    // Normal: snappy expo
    const spr    = expoOut(rawEnterProg);
    enterScale   = 0.82 + spr * 0.18;
    enterTransY  = (1 - spr) * 10 * unit;
    enterOpacity = spr;
  }

  // ── 2. Active Spoken State ────────────────────────────────────────────────
  let activeScale = 1.0;
  let showCard    = false;

  if (isSpoken && (word.role === "hero" || word.role === "accent")) {
    // Smooth punch peak at ~30%, settle back to 1
    const punch  = Math.sin(Math.min(1, spokenProg * 1.5) * Math.PI);
    activeScale  = 1.0 + punch * 0.08 * energy;
    showCard     = true;
  } else if (isSpoken) {
    showCard = true;
  }

  // ── 3. Opacity ────────────────────────────────────────────────────────────
  let finalOpacity = enterOpacity;
  if (!isSpoken && !isPast) {
    finalOpacity = Math.min(enterOpacity, 0.65);
  } else if (isPast) {
    finalOpacity = 1.0;
  }

  // ── 4. Text Colour ────────────────────────────────────────────────────────
  let textColor = cream;
  if (isSpoken) {
    if (word.role === "hero" || word.role === "accent") {
      textColor = accentColor;
    } else {
      textColor = cream;
    }
  } else if (isPast) {
    textColor = word.role === "hero" ? accentColor : cream;
  } else {
    textColor = cream;
  }

  // ── 5. Text Shadow ────────────────────────────────────────────────────────
  const textShadow = isSpoken
    ? `0 0 ${20 * unit}px ${accentColor}99, 0 0 ${42 * unit}px ${accentColor}33, 0 3px 18px rgba(0,0,0,0.95)`
    : isPast
      ? `0 2px 14px rgba(0,0,0,0.9)`
      : `0 2px 8px rgba(0,0,0,0.7)`;

  const fontCss     = fontFamilyCss(word.fontFamily);
  const totalScale  = enterScale * activeScale;
  const padX        = 12 * unit;
  const padY        = 6 * unit;

  return (
    <div
      style={{
        position:        "absolute",
        left:            word.x,
        top:             word.y,
        width:           word.width,
        height:          word.height,
        display:         "inline-flex",
        alignItems:      "center",
        justifyContent:  "center",
        transform:       `translate(0px, ${enterTransY.toFixed(1)}px) rotate(${enterRot.toFixed(2)}deg) scale(${totalScale.toFixed(3)})`,
        transformOrigin: "center bottom",
        opacity:         finalOpacity,
        pointerEvents:   "none",
        zIndex:          isSpoken ? 20 : word.role === "hero" ? 10 : 5,
      }}
    >
      {/* ── Warm Glassmorphic Card (spoken state) ── */}
      {showCard && (
        <div
          style={{
            position:       "absolute",
            left:           -padX,
            right:          -padX,
            top:            -padY,
            bottom:         -padY,
            background:     `linear-gradient(135deg, rgba(18,15,12,0.92) 0%, rgba(32,24,14,0.85) 100%)`,
            backdropFilter: "blur(12px)",
            borderRadius:   `${9 * unit}px`,
            border:         `1.5px solid ${accentColor}88`,
            boxShadow:      `0 8px 30px rgba(0,0,0,0.80), 0 0 ${16 * unit}px ${accentColor}33, inset 0 1px 0 rgba(255,255,255,0.14)`,
            zIndex:         -1,
            pointerEvents:  "none",
          }}
        />
      )}

      {/* ── Progress bar beneath spoken word ── */}
      {isSpoken && (
        <div
          style={{
            position:        "absolute",
            left:            0,
            right:           0,
            bottom:          `${-4 * unit}px`,
            height:          `${Math.max(2, 2.5 * unit)}px`,
            background:      `linear-gradient(90deg, ${accentColor}, ${accentColor}00)`,
            borderRadius:    `${999}px`,
            transformOrigin: "left center",
            transform:       `scaleX(${spokenProg.toFixed(3)})`,
            boxShadow:       `0 0 ${8 * unit}px ${accentColor}`,
            zIndex:          2,
          }}
        />
      )}

      {/* ── Main text ── */}
      <span
        style={{
          position:      "relative",
          zIndex:        1,
          fontFamily:    fontCss,
          fontSize:      `${word.fontSize}px`,
          fontWeight:    word.fontWeight,
          fontStyle:     word.fontStyle,
          color:         textColor,
          letterSpacing: `${word.trackingEm}em`,
          textTransform: word.uppercase ? "uppercase" : "none",
          textShadow,
          lineHeight:    1,
          whiteSpace:    "pre",
          transition:    "color 0.08s ease",
        }}
      >
        {word.text}
      </span>

      {/* ── Particle burst on hero activation ── */}
      {isSpoken && word.role === "hero" && decorBudget > 0.5 && (
        <div
          style={{
            position:     "absolute",
            inset:        0,
            pointerEvents: "none",
            zIndex:       15,
          }}
        >
          {Array.from({ length: quality === "final" ? 6 : 3 }).map((_, si) => {
            const angle      = (si / (quality === "final" ? 6 : 3)) * Math.PI * 2;
            const dist       = (20 + spokenProg * 38) * unit;
            const sx         = Math.cos(angle) * dist;
            const sy         = Math.sin(angle) * dist;
            const pOpacity   = Math.max(0, 1 - spokenProg * 1.8);
            const pSize      = (3.5 + (si % 2) * 1.5) * unit;
            return (
              <div
                key={`p-${si}`}
                style={{
                  position:     "absolute",
                  left:         "50%",
                  top:          "50%",
                  width:        `${pSize}px`,
                  height:       `${pSize}px`,
                  borderRadius: si % 2 === 0 ? "50%" : `${1 * unit}px`,
                  backgroundColor: accentColor,
                  transform:    `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) rotate(${si * 60}deg)`,
                  boxShadow:    `0 0 ${5 * unit}px ${accentColor}`,
                  opacity:      pOpacity,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
