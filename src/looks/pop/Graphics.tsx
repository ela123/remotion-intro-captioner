import React, { useMemo } from "react";
import { backOut } from "../../utils/ease";
import { seededChoice, seededFloat, seededInt } from "../../utils/prng";
import { POP_PALETTE } from "./preset";
import type { Quality } from "../../types";
import type { ChunkLayout, PlacedWord } from "../../template/word-layout";

type PopGraphicsProps = {
  chunkLayout: ChunkLayout;
  frame: number;
  fps: number;
  unit: number;
  quality: Quality;
  energy?: number;
  decorBudget?: number;
};

type Doodle = {
  type: "star" | "sparkle" | "heart" | "squiggle" | "arrow" | "circle" | "zigzag";
  x: number;
  y: number;
  size: number;
  color: string;
  delayFrames: number;
  floatSeed: string;
};

type ConfettiPiece = {
  x: number;
  startY: number;
  vx: number;
  vy: number;
  rotationSpeed: number;
  color: string;
  size: number;
  shape: "rect" | "circle";
};

export const PopGraphics: React.FC<PopGraphicsProps> = ({
  chunkLayout,
  frame,
  fps,
  unit,
  quality,
  energy = 1,
  decorBudget = 1,
}) => {
  const { startFrame, bounds } = chunkLayout;
  const ink = POP_PALETTE.ink;
  const palette = POP_PALETTE.cycle;

  // Find hero words
  const heroWords = useMemo(() => {
    const list: PlacedWord[] = [];
    chunkLayout.lines.forEach((line) => {
      line.words.forEach((w) => {
        if (w.role === "hero") list.push(w);
      });
    });
    return list;
  }, [chunkLayout]);

  // Exclusion Box: text bounds + sticker backing + shadow + padding (>= 0.5 * baseFontSize) + shake/float
  const exclusionBox = useMemo(() => {
    const pad = 65 * unit;
    return {
      minX: bounds.x - pad,
      maxX: bounds.x + bounds.width + pad,
      minY: bounds.y - pad,
      maxY: bounds.y + bounds.height + pad,
    };
  }, [bounds, unit]);

  // Candidate generation with retry for Doodles outside exclusion box
  const doodles = useMemo((): Doodle[] => {
    const count = Math.round(seededInt(`pop-doodles-${startFrame}`, 3, 5) * decorBudget);
    const result: Doodle[] = [];
    const types: Doodle["type"][] = [
      "star",
      "sparkle",
      "heart",
      "squiggle",
      "arrow",
      "circle",
      "zigzag",
    ];

    for (let i = 0; i < count; i++) {
      let placed = false;
      const seed = `pop-doodle-${startFrame}-${i}`;
      for (let attempt = 0; attempt < 8; attempt++) {
        const attemptSeed = `${seed}-att-${attempt}`;
        const candX = seededFloat(`${attemptSeed}-x`, 80 * unit, 1840 * unit);
        const candY = seededFloat(`${attemptSeed}-y`, 120 * unit, 960 * unit);
        const size = seededFloat(`${attemptSeed}-sz`, 26 * unit, 44 * unit);

        // Check if overlaps exclusion box
        const inExclusion =
          candX + size >= exclusionBox.minX &&
          candX - size <= exclusionBox.maxX &&
          candY + size >= exclusionBox.minY &&
          candY - size <= exclusionBox.maxY;

        if (!inExclusion) {
          result.push({
            type: seededChoice(`${attemptSeed}-t`, types),
            x: candX,
            y: candY,
            size,
            color: seededChoice(`${attemptSeed}-c`, palette),
            delayFrames: seededInt(`${attemptSeed}-d`, 0, 4),
            floatSeed: attemptSeed,
          });
          placed = true;
          break;
        }
      }
    }
    return result;
  }, [startFrame, decorBudget, exclusionBox, unit, palette]);

  // Confetti on first hero beat: max 1 burst per chunk
  const firstHero = heroWords[0];
  const heroStartFrame = firstHero ? Math.round(firstHero.start * fps) : startFrame;
  const confettiPieces = useMemo((): ConfettiPiece[] => {
    if (!firstHero) return [];
    const count = quality === "final" ? Math.round(16 * decorBudget) : Math.round(6 * decorBudget);
    const pieces: ConfettiPiece[] = [];
    const seed = `confetti-${startFrame}`;
    for (let i = 0; i < count; i++) {
      const pSeed = `${seed}-${i}`;
      pieces.push({
        x: firstHero.x + firstHero.width / 2 + seededFloat(`${pSeed}-x`, -80 * unit, 80 * unit),
        startY: firstHero.y + firstHero.height / 2,
        vx: seededFloat(`${pSeed}-vx`, -6 * unit, 6 * unit) * energy,
        vy: seededFloat(`${pSeed}-vy`, -10 * unit, -2 * unit) * energy,
        rotationSpeed: seededFloat(`${pSeed}-r`, -12, 12),
        color: seededChoice(`${pSeed}-c`, palette),
        size: seededFloat(`${pSeed}-s`, 8 * unit, 16 * unit),
        shape: i % 3 === 0 ? "circle" : "rect",
      });
    }
    return pieces;
  }, [firstHero, startFrame, quality, decorBudget, unit, energy, palette, fps]);

  const twosFrame = Math.floor(frame / 2) * 2;

  // Render Halftone dot blob position (deterministic)
  const blobSeed = `halftone-${startFrame}`;
  const blobX = seededFloat(`${blobSeed}-x`, bounds.x - 120 * unit, bounds.x + bounds.width + 80 * unit);
  const blobY = seededFloat(`${blobSeed}-y`, bounds.y - 100 * unit, bounds.y + bounds.height + 40 * unit);
  const blobColor = seededChoice(`${blobSeed}-c`, palette);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* Halftone Dot Blob */}
      <div
        style={{
          position: "absolute",
          left: `${blobX}px`,
          top: `${blobY}px`,
          width: `${300 * unit}px`,
          height: `${300 * unit}px`,
          backgroundImage: `radial-gradient(${blobColor} 20%, transparent 22%)`,
          backgroundSize: `${16 * unit}px ${16 * unit}px`,
          WebkitMaskImage: "radial-gradient(circle, black 30%, transparent 70%)",
          maskImage: "radial-gradient(circle, black 30%, transparent 70%)",
          opacity: 0.18,
          zIndex: 0,
        }}
      />

      {/* Comic Explosion Burst behind Hero words */}
      {heroWords.map((hw, hIdx) => {
        const hwStart = Math.round(hw.start * fps);
        const burstAge = frame - hwStart;
        if (burstAge < 0 || burstAge > 18) return null;

        const burstProgress = Math.min(1, burstAge / 8);
        const burstSpring = backOut(1.4)(burstProgress);
        const burstOpacity = burstAge <= 12 ? 1 : 1 - (burstAge - 12) / 6 * 0.7; // fades to 30%

        return (
          <div
            key={`burst-${hIdx}`}
            style={{
              position: "absolute",
              left: `${hw.x + hw.width / 2}px`,
              top: `${hw.y + hw.height / 2}px`,
              width: `${hw.width * 1.6}px`,
              height: `${hw.height * 2.2}px`,
              transform: `translate(-50%, -50%) scale(${burstSpring.toFixed(2)}) rotate(${seededFloat(`burst-r-${hIdx}`, -10, 10)}deg)`,
              opacity: burstOpacity,
              zIndex: 1,
            }}
          >
            <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
              <polygon
                points="50,0 62,32 98,35 68,58 79,92 50,72 21,92 32,58 2,35 38,32"
                fill={POP_PALETTE.yellow}
                stroke={ink}
                strokeWidth="4"
              />
            </svg>
          </div>
        );
      })}

      {/* Procedural Doodles */}
      {doodles.map((d, i) => {
        const doodleAge = frame - (startFrame + d.delayFrames);
        if (doodleAge < 0) return null;

        const popInProg = Math.min(1, doodleAge / 6);
        const popScale = backOut(1.4)(popInProg);

        // Float +/- 4px * unit on twos
        const floatY = Math.sin((twosFrame + i * 5) * 0.1) * 4 * unit;
        const floatRot = Math.sin((twosFrame + i * 3) * 0.08) * 8;

        return (
          <div
            key={`doodle-${i}`}
            style={{
              position: "absolute",
              left: `${d.x}px`,
              top: `${d.y + floatY}px`,
              width: `${d.size}px`,
              height: `${d.size}px`,
              transform: `scale(${popScale.toFixed(2)}) rotate(${floatRot.toFixed(1)}deg)`,
              zIndex: 2,
            }}
          >
            <svg viewBox="0 0 32 32" style={{ width: "100%", height: "100%" }}>
              {d.type === "star" && (
                <polygon
                  points="16,2 20,11 30,12 22,19 25,29 16,23 7,29 10,19 2,12 12,11"
                  fill={d.color}
                  stroke={ink}
                  strokeWidth="2.5"
                />
              )}
              {d.type === "sparkle" && (
                <path
                  d="M16 2 Q16 16 30 16 Q16 16 16 30 Q16 16 2 16 Q16 16 16 2 Z"
                  fill={d.color}
                  stroke={ink}
                  strokeWidth="2"
                />
              )}
              {d.type === "heart" && (
                <path
                  d="M16 28 C8 20 2 14 2 8 A7 7 0 0 1 16 7 A7 7 0 0 1 30 8 C30 14 24 20 16 28 Z"
                  fill={d.color}
                  stroke={ink}
                  strokeWidth="2"
                />
              )}
              {d.type === "squiggle" && (
                <path
                  d="M4 16 Q10 4 16 16 T28 16"
                  fill="none"
                  stroke={d.color}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              )}
              {d.type === "zigzag" && (
                <path
                  d="M4 22 L10 10 L16 22 L22 10 L28 22"
                  fill="none"
                  stroke={d.color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {d.type === "circle" && (
                <circle cx="16" cy="16" r="12" fill={d.color} stroke={ink} strokeWidth="3" />
              )}
              {d.type === "arrow" && (
                <path
                  d="M6 16 L26 16 M18 8 L26 16 L18 24"
                  fill="none"
                  stroke={d.color}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </div>
        );
      })}

      {/* Confetti */}
      {frame >= heroStartFrame &&
        confettiPieces.map((cp, idx) => {
          const t = (frame - heroStartFrame) / fps;
          if (t > 1.2) return null;
          const currentX = cp.x + cp.vx * (t * 30);
          const currentY = cp.startY + cp.vy * (t * 30) + 0.5 * 18 * unit * Math.pow(t * 30, 2) * 0.04;
          const rot = cp.rotationSpeed * (t * 30);
          const opacity = Math.max(0, 1 - t / 1.1);

          return (
            <div
              key={`confetti-${idx}`}
              style={{
                position: "absolute",
                left: `${currentX}px`,
                top: `${currentY}px`,
                width: `${cp.size}px`,
                height: cp.shape === "circle" ? `${cp.size}px` : `${cp.size * 0.6}px`,
                backgroundColor: cp.color,
                borderRadius: cp.shape === "circle" ? "50%" : `${2 * unit}px`,
                border: `${1 * unit}px solid ${ink}`,
                transform: `rotate(${rot}deg)`,
                opacity,
                zIndex: 15,
              }}
            />
          );
        })}

      {/* Final Quality Halftone Overlay (6% opacity) */}
      {quality === "final" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `radial-gradient(${ink} 15%, transparent 16%)`,
            backgroundSize: `${6 * unit}px ${6 * unit}px`,
            opacity: 0.06,
            pointerEvents: "none",
            zIndex: 20,
          }}
        />
      )}
    </div>
  );
};
