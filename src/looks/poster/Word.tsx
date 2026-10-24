import React from "react";
import { fontFamilyCss } from "../../styles/fonts";
import { quartInOut } from "../../utils/ease";
import { POSTER_PALETTE } from "./preset";
import type { Quality } from "../../types";
import type { PlacedWord } from "../../template/word-layout";

type PosterWordProps = {
  word: PlacedWord;
  chunkStartFrame: number;
  chunkEndFrame: number;
  frame: number;
  fps: number;
  unit: number;
  quality: Quality;
  energy?: number;
  heroIndexInChunk: number;
  accentIndexInChunk: number;
  normalIndexInChunk: number;
  lineScaleX?: number;
};

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const PosterWord: React.FC<PosterWordProps> = ({
  word,
  chunkStartFrame,
  chunkEndFrame,
  frame,
  fps,
  unit,
  quality,
  energy = 1,
  heroIndexInChunk,
  lineScaleX = 1.0,
}) => {
  const bone = POSTER_PALETTE.bone;
  const black = POSTER_PALETTE.black;
  const heroColors = POSTER_PALETTE.heroCycle;
  const blockColor = heroColors[heroIndexInChunk % heroColors.length]!;

  // Timing
  const wordStartFrame = Math.round(word.start * fps);
  const wordEndFrame = Math.round(word.end * fps);
  const spokenDuration = Math.max(1, wordEndFrame - wordStartFrame);

  // Entrance starts at word start (cut-in/stomp), no anticipation on normal cut
  const enterStart = word.role === "hero" ? Math.max(chunkStartFrame, wordStartFrame - 2) : wordStartFrame;
  if (frame < enterStart) return null;

  const isSpoken = frame >= wordStartFrame && frame <= wordEndFrame + 2;
  const spokenProg = clamp01((frame - wordStartFrame) / spokenDuration);

  // 1. Entrances
  let enterScale = 1.0;
  let showColorBarWipe = false;
  let barWipeProgress = 0;
  let barRevealProgress = 0;
  let visibleChars = word.text.length;

  if (word.role === "hero") {
    // stomp: scale 1.35 -> 0.96 (1-frame hold) -> 1.0 in 5 frames
    const stompAge = frame - enterStart;
    if (stompAge <= 2) {
      const t = stompAge / 2;
      enterScale = 1.35 - t * (1.35 - 0.96);
    } else if (stompAge === 3) {
      enterScale = 0.96; // 1-frame hold
    } else if (stompAge <= 5) {
      const t = (stompAge - 3) / 2;
      enterScale = 0.96 + t * 0.04;
    } else {
      enterScale = 1.0;
    }

    // Color bar wiping in behind (4 frames, trailing by 1 frame)
    const wipeAge = frame - (enterStart + 1);
    showColorBarWipe = true;
    barWipeProgress = clamp01(wipeAge / 4);
  } else if (word.role === "accent") {
    // bar-wipe-reveal: colored bar sweeps L->R across word, reveals word behind (6 frames)
    const wipeAge = frame - wordStartFrame;
    barRevealProgress = clamp01(wipeAge / 6);
  } else if (word.role === "connector") {
    // type-on: 1 char per frame up to 6 frames
    const typeAge = frame - wordStartFrame;
    visibleChars = Math.min(word.text.length, Math.max(1, typeAge + 1));
  } else {
    // normal: cut-in: 2-frame 8% scale settle
    const cutAge = frame - wordStartFrame;
    if (cutAge === 0) enterScale = 1.08;
    else if (cutAge === 1) enterScale = 1.04;
    else enterScale = 1.0;
  }

  // 2. Emphasis
  let isBlockInverted = false;
  if (word.role === "hero" && isSpoken) {
    isBlockInverted = true;
  }

  const fontCss = fontFamilyCss(word.fontFamily);
  const pad = 8 * unit;

  // Stomp hero shake on hero element only (3 frames of 4px*unit on hero start)
  let heroShakeX = 0;
  if (word.role === "hero") {
    const shakeAge = frame - wordStartFrame;
    if (shakeAge >= 0 && shakeAge < 3) {
      heroShakeX = ((shakeAge % 2 === 0 ? 1 : -1) * 4 * unit * energy);
    }
  }

  const displayedText = word.role === "connector" ? word.text.slice(0, visibleChars) : word.text;

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
        transform: `translate(${heroShakeX.toFixed(1)}px, 0px) scale(${enterScale.toFixed(3)}) scaleX(${lineScaleX.toFixed(3)})`,
        transformOrigin: "center center",
        pointerEvents: "none",
        zIndex: word.role === "hero" ? 10 : word.role === "accent" ? 6 : 2,
      }}
    >
      {/* Hero Sharp Color Block (Ink-free, sharp corners) */}
      {word.role === "hero" && (
        <div
          style={{
            position: "absolute",
            inset: -pad,
            backgroundColor: isBlockInverted ? bone : blockColor,
            transformOrigin: "left center",
            transform: `scaleX(${barWipeProgress})`,
            zIndex: -1,
          }}
        />
      )}

      {/* Accent Bar-Wipe Reveal Cover Bar */}
      {word.role === "accent" && barRevealProgress < 1 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: blockColor,
            transformOrigin: "right center",
            transform: `scaleX(${1 - barRevealProgress})`,
            zIndex: 5,
          }}
        />
      )}

      {/* Text Element */}
      <span
        style={{
          position: "relative",
          zIndex: 1,
          fontFamily: fontCss,
          fontSize: `${word.fontSize}px`,
          fontWeight: word.fontWeight,
          fontStyle: word.fontStyle,
          color:
            word.role === "hero"
              ? isBlockInverted ? black : bone
              : word.role === "accent"
                ? "transparent" // hollow outline
                : bone,
          WebkitTextStroke: word.role === "accent" ? `${Math.max(1.5, 2.5 * unit)}px ${bone}` : undefined,
          letterSpacing: `${word.trackingEm}em`,
          textTransform: "uppercase",
          lineHeight: 0.9,
          whiteSpace: "pre",
        }}
      >
        {displayedText}
      </span>

      {/* Accent Karaoke Fill during Spoken Duration */}
      {word.role === "accent" && isSpoken && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            fontFamily: fontCss,
            fontSize: `${word.fontSize}px`,
            fontWeight: word.fontWeight,
            color: blockColor,
            letterSpacing: `${word.trackingEm}em`,
            textTransform: "uppercase",
            lineHeight: 0.9,
            whiteSpace: "pre",
            clipPath: `inset(0 ${(1 - spokenProg) * 100}% 0 0)`,
          }}
        >
          {displayedText}
        </span>
      )}
    </div>
  );
};
