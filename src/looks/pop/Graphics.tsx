import React, { useMemo } from "react";
import { expoOut } from "../../utils/ease";
import { seededChoice, seededFloat, seededInt } from "../../utils/prng";
import { POP_PALETTE } from "./preset";
import type { Quality } from "../../types";
import type { ChunkLayout } from "../../template/word-layout";

type PopGraphicsProps = {
  chunkLayout: ChunkLayout;
  frame: number;
  fps: number;
  unit: number;
  quality: Quality;
  energy?: number;
  decorBudget?: number;
};

type OrbitDot = {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  phase: number;
};

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const PopGraphics: React.FC<PopGraphicsProps> = ({
  chunkLayout,
  frame,
  fps,
  unit,
  quality,
  energy = 1,
  decorBudget = 1,
}) => {
  const { startFrame, endFrame, bounds } = chunkLayout;
  const palette = POP_PALETTE.cycle;

  // ── Speech detection ───────────────────────────────────────────────────────
  const isSpeechActive = useMemo(() => {
    for (const line of chunkLayout.lines) {
      for (const w of line.words) {
        const wS = Math.round(w.start * fps);
        const wE = Math.round(w.end * fps);
        if (frame >= wS && frame <= wE + 1) return true;
      }
    }
    return false;
  }, [chunkLayout, frame, fps]);

  // ── Entrance easing ────────────────────────────────────────────────────────
  const age       = frame - startFrame;
  const enterProg = clamp01(age / 10);
  const enterEase = expoOut(enterProg);

  // ── Chunk progress (for subtle pulse) ─────────────────────────────────────
  const chunkDuration = Math.max(1, endFrame - startFrame);
  const chunkProg     = clamp01(age / chunkDuration);

  // ── Exclusion zone ─────────────────────────────────────────────────────────
  const exclusionBox = useMemo(() => {
    const pad = 55 * unit;
    return {
      minX: bounds.x - pad,
      maxX: bounds.x + bounds.width + pad,
      minY: bounds.y - pad,
      maxY: bounds.y + bounds.height + pad,
    };
  }, [bounds, unit]);

  // ── Ambient orbit dots ─────────────────────────────────────────────────────
  const orbitDots = useMemo((): OrbitDot[] => {
    const count  = Math.round(seededInt(`pop-od-${startFrame}`, 2, 4) * decorBudget);
    const result: OrbitDot[] = [];

    for (let i = 0; i < count; i++) {
      const seed = `pop-od-${startFrame}-${i}`;
      for (let attempt = 0; attempt < 10; attempt++) {
        const aSeed = `${seed}-a${attempt}`;
        const candX = seededFloat(`${aSeed}-x`, 60 * unit, 1860 * unit);
        const candY = seededFloat(`${aSeed}-y`, 100 * unit, 980 * unit);
        const size  = seededFloat(`${aSeed}-s`, 5 * unit, 11 * unit);
        const overlaps =
          candX + size >= exclusionBox.minX &&
          candX - size <= exclusionBox.maxX &&
          candY + size >= exclusionBox.minY &&
          candY - size <= exclusionBox.maxY;
        if (!overlaps) {
          result.push({
            x:     candX,
            y:     candY,
            size,
            color: seededChoice(`${aSeed}-c`, palette),
            delay: Math.round(seededFloat(`${aSeed}-d`, 0, 8)),
            phase: seededFloat(`${aSeed}-ph`, 0, Math.PI * 2),
          });
          break;
        }
      }
    }
    return result;
  }, [startFrame, decorBudget, exclusionBox, unit, palette]);

  // ── Bracket dims ───────────────────────────────────────────────────────────
  const bPad    = 18 * unit;
  const bSize   = 16 * unit;
  const bLeft   = bounds.x - bPad;
  const bTop    = bounds.y - bPad;
  const bRight  = bounds.x + bounds.width + bPad;
  const bBottom = bounds.y + bounds.height + bPad;
  const bColor  = POP_PALETTE.amber;
  const bW      = `${1.5 * unit}px solid ${bColor}`;

  // ── Waveform geometry ──────────────────────────────────────────────────────
  const numBars     = 14;
  const barW        = 2.5 * unit;
  const barGap      = 3 * unit;
  const totalEqW    = numBars * barW + (numBars - 1) * barGap;
  const eqLeft      = bounds.x + (bounds.width - totalEqW) / 2;
  const eqTop       = bounds.y - 44 * unit;

  // ── Live speech pulse for bracket border ──────────────────────────────────
  const pulseProg   = isSpeechActive ? 0.5 + 0.5 * Math.sin(frame * 0.4) : 0;
  const bracketOpacity = 0.45 + enterEase * 0.35 + pulseProg * 0.2;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>

      {/* ── 1. Warm ambient radial glow behind text block ── */}
      <div
        style={{
          position:   "absolute",
          left:       `${bounds.x + bounds.width / 2}px`,
          top:        `${bounds.y + bounds.height / 2}px`,
          width:      `${bounds.width * 2.2}px`,
          height:     `${bounds.height * 2.4}px`,
          transform:  "translate(-50%, -50%)",
          background: `radial-gradient(ellipse at center,
            rgba(245,158,11,0.09) 0%,
            rgba(255,107,107,0.05) 45%,
            transparent 72%)`,
          opacity:    enterEase,
          zIndex:     0,
        }}
      />

      {/* ── 2. Corner bracket reticles ── */}
      <div
        style={{
          position: "absolute",
          inset:    0,
          opacity:  bracketOpacity,
          zIndex:   1,
        }}
      >
        {/* Top-Left */}
        <div style={{ position: "absolute", left: `${bLeft}px`, top: `${bTop}px`, width: `${bSize}px`, height: `${bSize}px`, borderLeft: bW, borderTop: bW }} />
        {/* Top-Right */}
        <div style={{ position: "absolute", left: `${bRight - bSize}px`, top: `${bTop}px`, width: `${bSize}px`, height: `${bSize}px`, borderRight: bW, borderTop: bW }} />
        {/* Bottom-Left */}
        <div style={{ position: "absolute", left: `${bLeft}px`, top: `${bBottom - bSize}px`, width: `${bSize}px`, height: `${bSize}px`, borderLeft: bW, borderBottom: bW }} />
        {/* Bottom-Right */}
        <div style={{ position: "absolute", left: `${bRight - bSize}px`, top: `${bBottom - bSize}px`, width: `${bSize}px`, height: `${bSize}px`, borderRight: bW, borderBottom: bW }} />
      </div>

      {/* ── 3. Audio waveform bars above text ── */}
      <div
        style={{
          position:        "absolute",
          left:            `${eqLeft}px`,
          top:             `${eqTop}px`,
          display:         "flex",
          alignItems:      "flex-end",
          gap:             `${barGap}px`,
          height:          `${22 * unit}px`,
          opacity:         enterEase * (isSpeechActive ? 0.9 : 0.4),
          transform:       `scaleX(${enterEase})`,
          transformOrigin: "center bottom",
          zIndex:          2,
        }}
      >
        {Array.from({ length: numBars }).map((_, bi) => {
          const freq    = 0.3 + (bi % 5) * 0.14;
          const phase   = bi * 0.6;
          const wave    = Math.sin(frame * freq + phase);
          const rawH    = isSpeechActive
            ? (5 + Math.abs(wave) * 15 * energy) * unit
            : (3 + Math.abs(wave) * 3.5) * unit;
          const barCol  = bi % 3 === 0 ? POP_PALETTE.amber : bi % 3 === 1 ? POP_PALETTE.coral : POP_PALETTE.lime;

          return (
            <div
              key={`wb-${bi}`}
              style={{
                width:        `${barW}px`,
                height:       `${Math.max(2.5 * unit, rawH)}px`,
                background:   `linear-gradient(to top, ${barCol}, ${barCol}66)`,
                borderRadius: `${1.5 * unit}px`,
                boxShadow:    isSpeechActive ? `0 0 ${5 * unit}px ${barCol}88` : undefined,
              }}
            />
          );
        })}
      </div>

      {/* ── 4. Live indicator pill ── */}
      <div
        style={{
          position:        "absolute",
          left:            `${bounds.x + bounds.width / 2}px`,
          top:             `${bounds.y - 68 * unit}px`,
          transform:       `translateX(-50%) scale(${enterEase})`,
          transformOrigin: "bottom center",
          display:         "flex",
          alignItems:      "center",
          gap:             `${5 * unit}px`,
          padding:         `${2 * unit}px ${10 * unit}px`,
          background:      "rgba(13,15,20,0.78)",
          backdropFilter:  "blur(8px)",
          borderRadius:    `${999}px`,
          border:          `1px solid rgba(245,158,11,0.25)`,
          opacity:         enterEase * 0.9,
          zIndex:          2,
        }}
      >
        <div
          style={{
            width:           `${5 * unit}px`,
            height:          `${5 * unit}px`,
            borderRadius:    "50%",
            backgroundColor: isSpeechActive ? POP_PALETTE.lime : POP_PALETTE.amber,
            boxShadow:       `0 0 ${7 * unit}px ${isSpeechActive ? POP_PALETTE.lime : POP_PALETTE.amber}`,
          }}
        />
        <span
          style={{
            fontFamily:    `"DM Sans", sans-serif`,
            fontSize:      `${10 * unit}px`,
            fontWeight:    700,
            color:         "rgba(254,252,232,0.82)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {isSpeechActive ? "On Air" : "Captioned"}
        </span>
      </div>

      {/* ── 5. Ambient orbit dots outside text zone ── */}
      {orbitDots.map((dot, idx) => {
        const dotAge = frame - (startFrame + dot.delay);
        if (dotAge < 0) return null;
        const dotEnter  = clamp01(dotAge / 8);
        const floatY    = Math.sin(frame * 0.07 + dot.phase) * 7 * unit;
        const floatX    = Math.cos(frame * 0.055 + dot.phase) * 5 * unit;

        return (
          <div
            key={`od-${idx}`}
            style={{
              position:     "absolute",
              left:         `${dot.x + floatX}px`,
              top:          `${dot.y + floatY}px`,
              width:        `${dot.size}px`,
              height:       `${dot.size}px`,
              borderRadius: "50%",
              backgroundColor: dot.color,
              boxShadow:    `0 0 ${dot.size * 1.2}px ${dot.color}88`,
              transform:    `scale(${dotEnter.toFixed(3)})`,
              opacity:      dotEnter * 0.65,
              zIndex:       1,
            }}
          />
        );
      })}

    </div>
  );
};
