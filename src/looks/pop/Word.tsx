import React from "react";
import { fontFamilyCss } from "../../styles/fonts";
import { backOut, expoOut } from "../../utils/ease";
import { POP_PALETTE, POP_TOKENS } from "./preset";
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
  const ink = POP_PALETTE.ink;
  const white = POP_PALETTE.cream;

  // Spoken timing
  const wordStartFrame = Math.round(word.start * fps);
  const wordEndFrame = Math.round(word.end * fps);
  const spokenDuration = Math.max(1, wordEndFrame - wordStartFrame);

  // Entrance timing
  const chunkDuration = Math.max(1, chunkEndFrame - chunkStartFrame);
  const defaultEntranceDur = word.role === "connector" ? 4 : 6;
  const maxAvailableEntrance = Math.max(3, chunkDuration - 10);
  const enterDuration = Math.min(defaultEntranceDur, maxAvailableEntrance);
  const enterStart = Math.min(wordStartFrame - 2, chunkEndFrame - 5 - enterDuration);

  if (frame < enterStart) return null;

  const rawEnterProg = clamp01((frame - enterStart) / enterDuration);
  const isSpoken = frame >= wordStartFrame && frame <= wordEndFrame + 1;
  const isPast = frame > wordEndFrame + 1;
  const spokenProg = clamp01((frame - wordStartFrame) / spokenDuration);

  // Active Neon Color selection
  const cycle = POP_PALETTE.cycle;
  const activeColorIndex = (heroIndexInChunk + accentIndexInChunk + word.lineIndex) % cycle.length;
  const activeNeon = word.color && word.color !== white ? word.color : cycle[activeColorIndex]!;

  // 1. Entrance Animation
  let enterScale = 1;
  let enterTransY = 0;
  let enterRot = 0;
  let enterBaseOpacity = word.opacity;

  if (word.role === "hero") {
    // Dynamic spring rise-pop
    const spr = backOut(1.2)(rawEnterProg);
    enterScale = spr;
    enterTransY = (1 - rawEnterProg) * 14 * unit;
    enterRot = (1 - rawEnterProg) * (heroIndexInChunk % 2 === 0 ? -2 : 2) * energy;
  } else if (word.role === "accent") {
    // Snappy scale-in
    const spr = expoOut(rawEnterProg);
    enterScale = 0.85 + spr * 0.15;
    enterTransY = (1 - spr) * 10 * unit;
  } else if (word.role === "connector") {
    // Clean fade drift
    enterBaseOpacity = rawEnterProg * 0.75;
    enterTransY = (1 - rawEnterProg) * 6 * unit;
  } else {
    // Smooth snap
    const spr = expoOut(rawEnterProg);
    enterScale = 0.9 + spr * 0.1;
    enterTransY = (1 - spr) * 8 * unit;
  }

  // 2. Active Spoken Punch & Kinetic Scale
  let activeScale = 1.0;
  let glowIntensity = 0;

  if (isSpoken) {
    // Punch curve: peaks at 30% through spoken duration, smoothly settles
    const punch = Math.sin(Math.min(1, spokenProg * 1.4) * Math.PI);
    activeScale = 1.0 + punch * 0.12 * energy;
    glowIntensity = 0.6 + punch * 0.4;
  }

  // 3. Opacity State
  let finalOpacity = enterBaseOpacity;
  if (!isSpoken && !isPast) {
    // Future word in chunk: subtle anticipation state
    finalOpacity = Math.min(enterBaseOpacity, 0.7);
  } else {
    finalOpacity = 1.0;
  }

  // 4. Color & Styling
  let textColor = white;
  let showPillBacking = false;

  if (isSpoken) {
    if (word.role === "hero" || word.role === "accent") {
      textColor = activeNeon;
      showPillBacking = true;
    } else {
      textColor = white;
      showPillBacking = true;
    }
  } else if (isPast) {
    textColor = word.role === "hero" ? activeNeon : white;
  } else {
    // Future word
    textColor = white;
  }

  const fontCss = fontFamilyCss(word.fontFamily);
  const totalScale = enterScale * activeScale;
  const padX = 10 * unit;
  const padY = 5 * unit;

  // Luminous text shadow
  const textShadowCss = isSpoken
    ? `0 0 ${18 * unit}px ${activeNeon}aa, 0 0 ${36 * unit}px ${activeNeon}55, 0 4px 16px rgba(0, 0, 0, 0.9)`
    : isPast
      ? `0 2px 12px rgba(0, 0, 0, 0.85)`
      : `0 2px 8px rgba(0, 0, 0, 0.6)`;

  return (
    <div
      style={{
        position: "absolute",
        left: word.x,
        top: word.y,
        width: word.width,
        height: word.height,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `translate(0px, ${enterTransY.toFixed(1)}px) rotate(${enterRot.toFixed(2)}deg) scale(${totalScale.toFixed(3)})`,
        transformOrigin: "center center",
        opacity: finalOpacity,
        pointerEvents: "none",
        zIndex: isSpoken ? 20 : word.role === "hero" ? 10 : 5,
      }}
    >
      {/* Modern Translucent Glassmorphic Pill Backing for Spoken State */}
      {showPillBacking && (
        <div
          style={{
            position: "absolute",
            left: -padX,
            right: -padX,
            top: -padY,
            bottom: -padY,
            background: "linear-gradient(145deg, rgba(15, 23, 42, 0.88) 0%, rgba(30, 41, 59, 0.78) 100%)",
            borderRadius: `${10 * unit}px`,
            border: `1.5px solid ${activeNeon}`,
            boxShadow: `0 8px 24px -4px rgba(0, 0, 0, 0.75), 0 0 ${20 * unit}px ${activeNeon}44, inset 0 1px 0 rgba(255, 255, 255, 0.25)`,
            zIndex: -1,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Spoken Word Animated Progress Underline Indicator */}
      {isSpoken && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: `${-3 * unit}px`,
            height: `${Math.max(2, 3 * unit)}px`,
            backgroundColor: activeNeon,
            borderRadius: `${999 * unit}px`,
            transformOrigin: "left center",
            transform: `scaleX(${spokenProg})`,
            boxShadow: `0 0 ${8 * unit}px ${activeNeon}`,
            zIndex: 2,
          }}
        />
      )}

      {/* Main Text Element */}
      <span
        style={{
          position: "relative",
          zIndex: 1,
          fontFamily: fontCss,
          fontSize: `${word.fontSize}px`,
          fontWeight: word.fontWeight,
          fontStyle: word.fontStyle,
          color: textColor,
          letterSpacing: `${word.trackingEm}em`,
          textTransform: word.uppercase ? "uppercase" : "none",
          textShadow: textShadowCss,
          lineHeight: 1,
          whiteSpace: "pre",
          transition: "color 0.1s ease",
        }}
      >
        {word.text}
      </span>

      {/* Subtle Radiant Neon Sparks on Hero Word Activation */}
      {isSpoken && word.role === "hero" && decorBudget > 0.5 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 15,
          }}
        >
          {Array.from({ length: quality === "final" ? 6 : 3 }).map((_, si) => {
            const angle = (si / (quality === "final" ? 6 : 3)) * Math.PI * 2;
            const sparkDist = (22 + spokenProg * 35) * unit;
            const sx = Math.cos(angle) * sparkDist;
            const sy = Math.sin(angle) * sparkDist;
            const sparkOpacity = Math.max(0, 1 - spokenProg * 1.6);
            return (
              <div
                key={`spark-${si}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: `${4 * unit}px`,
                  height: `${4 * unit}px`,
                  backgroundColor: activeNeon,
                  borderRadius: "50%",
                  transform: `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`,
                  boxShadow: `0 0 ${6 * unit}px ${activeNeon}`,
                  opacity: sparkOpacity,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
