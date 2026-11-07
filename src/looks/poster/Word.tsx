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
  const bone       = POSTER_PALETTE.bone;
  const black      = POSTER_PALETTE.black;
  const heroColors = POSTER_PALETTE.heroCycle;
  const fillColor  = heroColors[(heroIndexInChunk + accentIndexInChunk) % heroColors.length]!;

  // ── Timing ────────────────────────────────────────────────────────────────
  const wordStartFrame  = Math.round(word.start * fps);
  const wordEndFrame    = Math.round(word.end * fps);
  const spokenDuration  = Math.max(1, wordEndFrame - wordStartFrame);

  // Heroes enter 2 frames early for the stomp
  const enterStart = word.role === "hero"
    ? Math.max(chunkStartFrame, wordStartFrame - 2)
    : wordStartFrame;

  if (frame < enterStart) return null;

  const isSpoken   = frame >= wordStartFrame && frame <= wordEndFrame + 2;
  const isPast     = frame > wordEndFrame + 2;
  const spokenProg = clamp01((frame - wordStartFrame) / spokenDuration);

  // ── 1. Entrance ───────────────────────────────────────────────────────────
  let enterScale = 1.0;
  let visibleChars = word.text.length;
  // Block fill wipe-in behind hero (scales left-to-right, 5 frames after enter)
  let blockWipeProgress = 0;

  if (word.role === "hero") {
    // Stomp: quick scale slam 1.28 → 0.97 → 1.0 over 5 frames
    const stompAge = frame - enterStart;
    if (stompAge <= 2) {
      enterScale = 1.28 - (stompAge / 2) * (1.28 - 0.97);
    } else if (stompAge === 3) {
      enterScale = 0.97;
    } else if (stompAge <= 5) {
      enterScale = 0.97 + ((stompAge - 3) / 2) * 0.03;
    } else {
      enterScale = 1.0;
    }
    // Block fill wipes in from left, starts 1 frame after stomp
    blockWipeProgress = clamp01((frame - (enterStart + 1)) / 5);
  } else if (word.role === "connector") {
    // Type-on: 1 char per frame
    const typeAge = frame - wordStartFrame;
    visibleChars  = Math.min(word.text.length, Math.max(1, typeAge + 1));
  } else {
    // Cut-in: 2-frame scale settle
    const cutAge = frame - wordStartFrame;
    if (cutAge === 0) enterScale = 1.08;
    else if (cutAge === 1) enterScale = 1.03;
    else enterScale = 1.0;
  }

  // ── 2. Spoken emphasis ─────────────────────────────────────────────────────
  const showFill   = isSpoken; // Active fill on any spoken word
  const padX       = 9 * unit;
  const padY       = 4 * unit;

  // ── 3. Stomp micro-shake ───────────────────────────────────────────────────
  let heroShakeX = 0;
  if (word.role === "hero") {
    const shakeAge = frame - wordStartFrame;
    if (shakeAge >= 0 && shakeAge < 3) {
      heroShakeX = (shakeAge % 2 === 0 ? 1 : -1) * 3.5 * unit * energy;
    }
  }

  // ── 4. Colour logic ────────────────────────────────────────────────────────
  let textColor = bone;
  if (word.role === "hero") {
    // During block fill: invert to black; before fill visible: bone; past: use fill color
    if (isSpoken) {
      textColor = black;
    } else if (isPast) {
      textColor = fillColor;
    } else {
      textColor = bone;
    }
  } else if (isSpoken) {
    textColor = black;
  } else if (isPast) {
    textColor = bone;
  } else {
    textColor = "rgba(249,247,241,0.6)";
  }

  const opacity        = !isSpoken && !isPast ? 0.6 : 1.0;
  const fontCss        = fontFamilyCss(word.fontFamily);
  const displayedText  = word.role === "connector" ? word.text.slice(0, visibleChars) : word.text;

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
        transform:       `translate(${heroShakeX.toFixed(1)}px, 0px) scale(${enterScale.toFixed(3)}) scaleX(${lineScaleX.toFixed(3)})`,
        transformOrigin: "center center",
        opacity,
        pointerEvents:   "none",
        zIndex:          isSpoken ? 15 : word.role === "hero" ? 10 : 2,
      }}
    >
      {/* ── Neon fill block (hero: active spoken highlight) ── */}
      {word.role === "hero" && isSpoken && (
        <div
          style={{
            position:        "absolute",
            left:            -padX,
            right:           -padX,
            top:             -padY,
            bottom:          -padY,
            backgroundColor: fillColor,
            transformOrigin: "left center",
            transform:       `scaleX(1)`,
            borderRadius:    `${2 * unit}px`,
            boxShadow:       `0 0 ${14 * unit}px ${fillColor}77`,
            zIndex:          -1,
          }}
        />
      )}

      {/* ── Fill block for non-hero spoken words ── */}
      {word.role !== "hero" && showFill && (
        <div
          style={{
            position:        "absolute",
            left:            -padX * 0.7,
            right:           -padX * 0.7,
            top:             -padY * 0.7,
            bottom:          -padY * 0.7,
            backgroundColor: fillColor,
            transformOrigin: "left center",
            transform:       `scaleX(${Math.min(1, spokenProg * 2.0)})`,
            borderRadius:    `${2 * unit}px`,
            zIndex:          -1,
          }}
        />
      )}

      {/* ── Karaoke fill for accent words ── */}
      {word.role === "accent" && isSpoken && (
        <span
          style={{
            position:      "absolute",
            inset:         0,
            display:       "flex",
            alignItems:    "center",
            justifyContent:"center",
            zIndex:        2,
            fontFamily:    fontCss,
            fontSize:      `${word.fontSize}px`,
            fontWeight:    word.fontWeight,
            color:         black,
            letterSpacing: `${word.trackingEm}em`,
            textTransform: "uppercase",
            lineHeight:    0.91,
            whiteSpace:    "pre",
            clipPath:      `inset(0 ${((1 - spokenProg) * 100).toFixed(1)}% 0 0)`,
          }}
        >
          {displayedText}
        </span>
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
          textTransform: "uppercase",
          lineHeight:    0.91,
          whiteSpace:    "pre",
          textShadow:    showFill ? undefined : "0 3px 14px rgba(0,0,0,0.9)",
          transition:    "color 0.06s ease",
        }}
      >
        {displayedText}
      </span>
    </div>
  );
};
