import React from "react";
import { interpolate, spring } from "remotion";
import { fontFamilyCss } from "../../styles/fonts";
import { POP_PALETTE, POP_TOKENS } from "./preset";
import type { Quality } from "../../types";
import { isWordVisibleAtFrame, type PlacedWord } from "../../template/word-layout";

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

  // Render only if currently visible
  if (!isWordVisibleAtFrame(word, frame, fps, chunkStartFrame, chunkEndFrame)) {
    return null;
  }

  const enterFrame = Math.max(0, frame - enterStart);
  const isSpoken = frame >= wordStartFrame && frame <= wordEndFrame + 2;
  const spokenProg = clamp01((frame - wordStartFrame) / spokenDuration);

  // Quantized frame on twos for hand-made feel
  const twosFrame = Math.floor(frame / 2) * 2;

  // 1. Entrance by Role using spring() and interpolate() on transform and opacity
  let enterScaleX = 1;
  let enterScaleY = 1;
  let enterRotOffset = 0;
  let enterTransY = 0;
  let enterOpacity = word.opacity;

  if (word.role === "hero") {
    const isSpin = heroIndexInChunk % 2 === 1;
    if (isSpin) {
      // spin-pop: rotate -180 -> 0, scale 0 -> 1.0
      const spinSpring = spring({
        frame: enterFrame,
        fps,
        config: { damping: 11, stiffness: 180, mass: 0.8 },
      });
      enterScaleX = spinSpring;
      enterScaleY = spinSpring;
      enterRotOffset = interpolate(enterFrame, [0, enterDuration], [-180, 0], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
      });
    } else {
      // sticker-slap: scale 1.8 -> 1.0, rotation snap, settle
      const slapSpring = spring({
        frame: enterFrame,
        fps,
        config: { damping: 12, stiffness: 220, mass: 0.9 },
      });
      enterScaleX = interpolate(slapSpring, [0, 1], [1.8, 1]);
      enterScaleY = enterScaleX;
      enterRotOffset = interpolate(enterFrame, [0, Math.max(1, enterDuration * 0.6)], [6 * energy, 0], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
      });
    }
  } else if (word.role === "accent") {
    const isBounce = accentIndexInChunk % 2 === 1;
    if (isBounce) {
      // drop-bounce: falls from -60px * unit, bounces into place
      const bounceSpring = spring({
        frame: enterFrame,
        fps,
        config: { damping: 8, stiffness: 160, mass: 0.7 },
      });
      enterTransY = interpolate(bounceSpring, [0, 1], [-60 * unit, 0]);
    } else {
      // jelly: squash-and-stretch settle
      const jellySpring = spring({
        frame: enterFrame,
        fps,
        config: { damping: 9, stiffness: 190, mass: 0.8 },
      });
      enterScaleX = interpolate(jellySpring, [0, 0.5, 1], [1.3, 0.9, 1]);
      enterScaleY = interpolate(jellySpring, [0, 0.5, 1], [0.7, 1.15, 1]);
    }
  } else if (word.role === "connector") {
    // fade-pop (4 frames)
    const connSpring = spring({
      frame: enterFrame,
      fps,
      config: { damping: 14, stiffness: 200 },
    });
    enterOpacity = interpolate(enterFrame, [0, enterDuration], [0, word.opacity * 0.9], {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
    });
    enterScaleX = interpolate(connSpring, [0, 1], [0.6, 0.66]);
    enterScaleY = enterScaleX;
  } else {
    // normal: pop, or every 3rd normal is wiggle-in
    const isWiggle = normalIndexInChunk % 3 === 2;
    if (isWiggle) {
      const wiggleSpring = spring({
        frame: enterFrame,
        fps,
        config: { damping: 12, stiffness: 180 },
      });
      enterScaleX = wiggleSpring;
      enterScaleY = wiggleSpring;
      enterRotOffset = interpolate(enterFrame, [0, enterDuration * 0.5, enterDuration], [0, 6 * energy, 0], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
      });
    } else {
      const popSpring = spring({
        frame: enterFrame,
        fps,
        config: { damping: 10, stiffness: 190, mass: 0.8 },
      });
      enterScaleX = popSpring;
      enterScaleY = popSpring;
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
      // squash-bounce using spring
      const squashSpring = spring({
        frame: Math.max(0, frame - wordStartFrame),
        fps,
        config: { damping: 9, stiffness: 170 },
      });
      empScaleX = interpolate(squashSpring, [0, 0.3, 0.7, 1], [1.0, 1.18, 0.95, 1.0]);
      empScaleY = interpolate(squashSpring, [0, 0.3, 0.7, 1], [1.0, 0.88, 1.06, 1.0]);
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
      {/* Hero Sticker Backing with crisp zero-blur hard shadow (no expensive filter) */}
      {word.role === "hero" && (
        <div
          style={{
            position: "absolute",
            inset: -pad,
            backgroundColor: stickerColor,
            borderRadius: `${16 * unit}px`,
            border: `${Math.max(2, 4 * unit)}px solid ${ink}`,
            transform: `rotate(${word.stickerRotation.toFixed(1)}deg)`,
            boxShadow: `${Math.round(3 * unit)}px ${Math.round(4 * unit)}px 0 ${ink}`,
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

      {/* Text Element with WebkitTextStroke outline (no expensive filter) */}
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