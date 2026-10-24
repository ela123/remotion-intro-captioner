import React from "react";
import { fontFamilyCss } from "../../styles/fonts";
import { backOut, expoOut } from "../../utils/ease";
import { seededChoice, seededFloat } from "../../utils/prng";
import { POP_PALETTE, POP_TOKENS } from "./preset";
import type { Quality, WordRole } from "../../types";
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
  const cream = POP_PALETTE.cream;

  // Real spoken frames
  const wordStartFrame = Math.round(word.start * fps);
  const wordEndFrame = Math.round(word.end * fps);
  const spokenDuration = Math.max(1, wordEndFrame - wordStartFrame);

  // Entrance timing: spoken start minus 2 frames anticipation, clamped
  const chunkDuration = Math.max(1, chunkEndFrame - chunkStartFrame);
  const defaultEntranceDur = word.role === "connector" ? 4 : 7;
  const maxAvailableEntrance = Math.max(3, chunkDuration - 12);
  const enterDuration = Math.min(defaultEntranceDur, maxAvailableEntrance);
  const enterStart = Math.min(wordStartFrame - 2, chunkEndFrame - 6 - enterDuration);

  if (frame < enterStart) return null;

  const rawEnterProg = clamp01((frame - enterStart) / enterDuration);
  const isSpoken = frame >= wordStartFrame && frame <= wordEndFrame + 2;
  const spokenProg = clamp01((frame - wordStartFrame) / spokenDuration);

  // Quantized frame on twos for hand-made feel
  const twosFrame = Math.floor(frame / 2) * 2;

  // 1. Entrance by Role
  let enterScaleX = 1;
  let enterScaleY = 1;
  let enterRotOffset = 0;
  let enterTransY = 0;
  let enterOpacity = word.opacity;

  if (word.role === "hero") {
    const isSpin = heroIndexInChunk % 2 === 1;
    if (isSpin) {
      // spin-pop: rotate -180 -> 0, scale 0 -> 1.1 -> 1.0
      const spr = backOut(1.4)(rawEnterProg);
      enterScaleX = spr;
      enterScaleY = spr;
      enterRotOffset = (1 - rawEnterProg) * -180;
    } else {
      // sticker-slap: scale 1.8 -> 1.0, 6deg rotation snap, overshoot to 0.92, settle
      if (rawEnterProg < 0.6) {
        const t = rawEnterProg / 0.6;
        const s = 1.8 - t * 0.88;
        enterScaleX = s;
        enterScaleY = s;
        enterRotOffset = (1 - t) * 6 * energy;
      } else {
        const t = (rawEnterProg - 0.6) / 0.4;
        const s = 0.92 + t * 0.08;
        enterScaleX = s;
        enterScaleY = s;
        enterRotOffset = 0;
      }
    }
  } else if (word.role === "accent") {
    const isBounce = accentIndexInChunk % 2 === 1;
    if (isBounce) {
      // drop-bounce: falls from -60px * unit, bounces twice
      if (rawEnterProg < 0.5) {
        const t = rawEnterProg / 0.5;
        enterTransY = -60 * unit * (1 - t * t);
      } else if (rawEnterProg < 0.8) {
        const t = (rawEnterProg - 0.5) / 0.3;
        enterTransY = -Math.sin(t * Math.PI) * 16 * unit;
      } else {
        const t = (rawEnterProg - 0.8) / 0.2;
        enterTransY = -Math.sin(t * Math.PI) * 6 * unit;
      }
    } else {
      // jelly: scaleX 1.3/scaleY 0.7 -> 0.9/1.15 -> 1.0
      if (rawEnterProg < 0.5) {
        const t = rawEnterProg / 0.5;
        enterScaleX = 1.3 - t * 0.4;
        enterScaleY = 0.7 + t * 0.45;
      } else {
        const t = (rawEnterProg - 0.5) / 0.5;
        enterScaleX = 0.9 + t * 0.1;
        enterScaleY = 1.15 - t * 0.15;
      }
    }
  } else if (word.role === "connector") {
    // fade-pop (4 frames)
    enterOpacity = rawEnterProg * 0.9;
    if (rawEnterProg < 0.5) {
      const t = rawEnterProg / 0.5;
      enterScaleX = 0.6 + t * 0.06;
      enterScaleY = enterScaleX;
    } else {
      const t = (rawEnterProg - 0.5) / 0.5;
      enterScaleX = 0.66 - t * 0.06;
      enterScaleY = enterScaleX;
    }
  } else {
    // normal: pop, or every 3rd normal is wiggle-in
    const isWiggle = normalIndexInChunk % 3 === 2;
    if (isWiggle) {
      const spr = expoOut(rawEnterProg);
      enterScaleX = spr;
      enterScaleY = spr;
      enterRotOffset = Math.sin(rawEnterProg * Math.PI * 4) * 6 * (1 - rawEnterProg);
    } else {
      const spr = backOut(1.4)(rawEnterProg);
      enterScaleX = spr;
      enterScaleY = spr;
    }
  }

  // 2. Emphasis Motion
  let empScaleX = 1;
  let empScaleY = 1;
  let empRot = 0;
  let empTransY = 0;
  let showHighlight = false;
  let highlightColor = POP_PALETTE.yellow;
  let showStars = false;

  const cycle = POP_PALETTE.cycle;
  const stickerColor = word.color ?? POP_PALETTE.yellow;
  const stickerIdx = cycle.indexOf(stickerColor as any);
  const nextPaletteColor = cycle[(stickerIdx + 1) % cycle.length] ?? POP_PALETTE.pink;

  if (word.role === "hero" && isSpoken) {
    showHighlight = true;
    highlightColor = nextPaletteColor;
    showStars = decorBudget > 0.6;
    empScaleX = 1.04;
    empScaleY = 1.04;
  } else if (word.role === "accent" && isSpoken) {
    const accentType = accentIndexInChunk % 3;
    if (accentType === 0) {
      // wobble on twos
      const decay = 1 - spokenProg;
      empRot = Math.sin((twosFrame - wordStartFrame) * 0.9) * 4 * decay * energy;
    } else if (accentType === 1) {
      // squash-bounce
      if (spokenProg < 0.3) {
        const t = spokenProg / 0.3;
        empScaleX = 1.0 + t * 0.18;
        empScaleY = 1.0 - t * 0.12;
      } else if (spokenProg < 0.7) {
        const t = (spokenProg - 0.3) / 0.4;
        empScaleX = 1.18 - t * 0.23;
        empScaleY = 0.88 + t * 0.18;
      } else {
        const t = (spokenProg - 0.7) / 0.3;
        empScaleX = 0.95 + t * 0.05;
        empScaleY = 1.06 - t * 0.06;
      }
    }
  }

  // 3. Resting Rotation
  const baseRot = word.rotation;
  const finalRot = baseRot + enterRotOffset + empRot;
  const finalScaleX = enterScaleX * empScaleX;
  const finalScaleY = enterScaleY * empScaleY;
  const finalTransY = enterTransY + empTransY;

  // Text Fill Contrast Rule
  const isBackingYellowOrMintOrSky =
    stickerColor === POP_PALETTE.yellow ||
    stickerColor === POP_PALETTE.mint ||
    stickerColor === POP_PALETTE.sky;
  const textFill = word.role === "hero"
    ? isBackingYellowOrMintOrSky ? ink : cream
    : word.role === "connector"
      ? cream
      : word.color ?? cream;

  const fontCss = fontFamilyCss(word.fontFamily);
  const pad = 12 * unit;

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
        transform: `translate(0px, ${finalTransY.toFixed(1)}px) rotate(${finalRot.toFixed(2)}deg) scale(${finalScaleX.toFixed(3)}, ${finalScaleY.toFixed(3)})`,
        transformOrigin: "center center",
        opacity: enterOpacity,
        pointerEvents: "none",
        zIndex: word.role === "hero" ? 10 : word.role === "accent" ? 5 : 1,
      }}
    >
      {/* Hero Sticker Backing */}
      {word.role === "hero" && (
        <div
          style={{
            position: "absolute",
            inset: -pad,
            backgroundColor: stickerColor,
            borderRadius: `${16 * unit}px`,
            border: `${Math.max(2, 4 * unit)}px solid ${ink}`,
            transform: `rotate(${word.stickerRotation.toFixed(1)}deg)`,
            filter: POP_TOKENS.dropShadow,
            zIndex: -1,
          }}
        />
      )}

      {/* Marker Highlight Wipe */}
      {showHighlight && (
        <div
          style={{
            position: "absolute",
            inset: -pad * 0.7,
            backgroundColor: highlightColor,
            borderRadius: `${10 * unit}px`,
            transformOrigin: "left center",
            transform: `scaleX(${Math.min(1, spokenProg * 2.5)})`,
            zIndex: 0,
            opacity: 0.9,
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
          color: showHighlight ? ink : textFill,
          letterSpacing: `${word.trackingEm}em`,
          textTransform: word.uppercase ? "uppercase" : "none",
          WebkitTextStroke: `${POP_TOKENS.strokeWidthEm}em ${ink}`,
          paintOrder: "stroke fill",
          filter: word.role === "hero" ? undefined : POP_TOKENS.dropShadow,
          lineHeight: 1,
          whiteSpace: "pre",
        }}
      >
        {word.text}
      </span>

      {/* Star Burst around Hero */}
      {showStars && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 12,
          }}
        >
          {Array.from({ length: quality === "final" ? 8 : 4 }).map((_, si) => {
            const angle = (si / (quality === "final" ? 8 : 4)) * Math.PI * 2;
            const starDist = (28 + spokenProg * 45) * unit;
            const sx = Math.cos(angle) * starDist;
            const sy = Math.sin(angle) * starDist;
            const starOpacity = Math.max(0, 1 - spokenProg * 1.5);
            return (
              <div
                key={`star-${si}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: `${8 * unit}px`,
                  height: `${8 * unit}px`,
                  backgroundColor: highlightColor,
                  borderRadius: "50%",
                  border: `${1.5 * unit}px solid ${ink}`,
                  transform: `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`,
                  opacity: starOpacity,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
