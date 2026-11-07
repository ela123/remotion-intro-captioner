import React from "react";
import { fontFamilyCss } from "../../styles/fonts";
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
  accentIndexInChunk,
  lineScaleX = 1.0,
}) => {
  const bone = POSTER_PALETTE.bone;
  const black = POSTER_PALETTE.black;
  const heroColors = POSTER_PALETTE.heroCycle;
  const blockColor = heroColors[(heroIndexInChunk + accentIndexInChunk) % heroColors.length]!;

  // Timing
  const wordStartFrame = Math.round(word.start * fps);
  const wordEndFrame = Math.round(word.end * fps);
  const spokenDuration = Math.max(1, wordEndFrame - wordStartFrame);

  // Entrance starts at word start (cut-in/stomp)
  const enterStart = word.role === "hero" ? Math.max(chunkStartFrame, wordStartFrame - 2) : wordStartFrame;
  if (frame < enterStart) return null;

  const isSpoken = frame >= wordStartFrame && frame <= wordEndFrame + 1;
  const isPast = frame > wordEndFrame + 1;
  const spokenProg = clamp01((frame - wordStartFrame) / spokenDuration);

  // 1. Entrance Stomp / Cut-in
  let enterScale = 1.0;
  let visibleChars = word.text.length;

  if (word.role === "hero") {
    // Sharp high-velocity stomp
    const stompAge = frame - enterStart;
    if (stompAge <= 2) {
      enterScale = 1.25 - (stompAge / 2) * 0.28;
    } else if (stompAge === 3) {
      enterScale = 0.97;
    } else if (stompAge <= 5) {
      enterScale = 0.97 + ((stompAge - 3) / 2) * 0.03;
    } else {
      enterScale = 1.0;
    }
  } else if (word.role === "connector") {
    const typeAge = frame - wordStartFrame;
    visibleChars = Math.min(word.text.length, Math.max(1, typeAge + 1));
  } else {
    // Cut-in
    const cutAge = frame - wordStartFrame;
    if (cutAge === 0) enterScale = 1.06;
    else enterScale = 1.0;
  }

  // 2. High-Contrast Inverted Block Highlighting
  const showBlock = isSpoken;

  // Stomp micro-shake on hero start
  let heroShakeX = 0;
  if (word.role === "hero") {
    const shakeAge = frame - wordStartFrame;
    if (shakeAge >= 0 && shakeAge < 3) {
      heroShakeX = (shakeAge % 2 === 0 ? 1 : -1) * 3 * unit * energy;
    }
  }

  const fontCss = fontFamilyCss(word.fontFamily);
  const padX = 8 * unit;
  const padY = 4 * unit;
  const displayedText = word.role === "connector" ? word.text.slice(0, visibleChars) : word.text;

  let textColor = bone;
  if (showBlock) {
    textColor = black;
  } else if (isPast) {
    textColor = word.role === "hero" ? blockColor : bone;
  } else {
    // Future word in chunk
    textColor = bone;
  }

  const opacity = !isSpoken && !isPast ? 0.65 : 1.0;

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
        opacity,
        pointerEvents: "none",
        zIndex: isSpoken ? 15 : word.role === "hero" ? 10 : 2,
      }}
    >
      {/* High-Contrast Dynamic Inverted Cyber Block */}
      {showBlock && (
        <div
          style={{
            position: "absolute",
            left: -padX,
            right: -padX,
            top: -padY,
            bottom: -padY,
            backgroundColor: blockColor,
            borderRadius: `${4 * unit}px`,
            boxShadow: `0 0 ${16 * unit}px ${blockColor}`,
            zIndex: -1,
          }}
        />
      )}

      {/* Main Display Typography */}
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
          textTransform: "uppercase",
          lineHeight: 0.92,
          whiteSpace: "pre",
          textShadow: showBlock ? undefined : "0 3px 12px rgba(0, 0, 0, 0.9)",
          transition: "color 0.08s ease",
        }}
      >
        {displayedText}
      </span>
    </div>
  );
};
