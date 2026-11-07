import React, { useMemo } from "react";
import { fontFamilyCss } from "../../styles/fonts";
import { backOut, expoOut } from "../../utils/ease";
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

type CyberSpark = {
  x: number;
  y: number;
  size: number;
  color: string;
  delayFrames: number;
  floatSeed: string;
  type: "diamond" | "cross" | "dot";
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

  // Active spoken word detection
  const isSpeechActive = useMemo(() => {
    for (const line of chunkLayout.lines) {
      for (const w of line.words) {
        const wStart = Math.round(w.start * fps);
        const wEnd = Math.round(w.end * fps);
        if (frame >= wStart && frame <= wEnd + 1) return true;
      }
    }
    return false;
  }, [chunkLayout, frame, fps]);

  // Entrance progress of the chunk graphics
  const age = frame - startFrame;
  const chunkDuration = Math.max(1, endFrame - startFrame);
  const enterProg = clamp01(age / 8);
  const enterEase = expoOut(enterProg);

  // Text exclusion zone to ensure no decoration overlaps text
  const pad = 50 * unit;
  const exclusionBox = useMemo(() => ({
    minX: bounds.x - pad,
    maxX: bounds.x + bounds.width + pad,
    minY: bounds.y - pad,
    maxY: bounds.y + bounds.height + pad,
  }), [bounds, pad]);

  // Ambient floating cyber sparks outside text zone
  const sparks = useMemo((): CyberSpark[] => {
    const count = Math.round(seededInt(`pop-sparks-${startFrame}`, 3, 5) * decorBudget);
    const result: CyberSpark[] = [];
    const types: CyberSpark["type"][] = ["diamond", "cross", "dot"];

    for (let i = 0; i < count; i++) {
      const seed = `pop-spark-${startFrame}-${i}`;
      for (let attempt = 0; attempt < 8; attempt++) {
        const attemptSeed = `${seed}-att-${attempt}`;
        const candX = seededFloat(`${attemptSeed}-x`, 80 * unit, 1840 * unit);
        const candY = seededFloat(`${attemptSeed}-y`, 140 * unit, 940 * unit);
        const size = seededFloat(`${attemptSeed}-sz`, 8 * unit, 16 * unit);

        const overlaps =
          candX + size >= exclusionBox.minX &&
          candX - size <= exclusionBox.maxX &&
          candY + size >= exclusionBox.minY &&
          candY - size <= exclusionBox.maxY;

        if (!overlaps) {
          result.push({
            x: candX,
            y: candY,
            size,
            color: seededChoice(`${attemptSeed}-c`, palette),
            delayFrames: Math.round(seededFloat(`${attemptSeed}-del`, 0, 8)),
            floatSeed: `${attemptSeed}-fl`,
            type: seededChoice(`${attemptSeed}-typ`, types),
          });
          break;
        }
      }
    }
    return result;
  }, [startFrame, decorBudget, exclusionBox, unit, palette]);

  // Equalizer bar heights
  const numBars = 16;
  const barWidth = 3 * unit;
  const barGap = 3.5 * unit;
  const totalEqWidth = numBars * barWidth + (numBars - 1) * barGap;

  // Viewfinder bracket dimensions
  const bracketSize = 18 * unit;
  const bracketPad = 20 * unit;
  const bracketLeft = bounds.x - bracketPad;
  const bracketTop = bounds.y - bracketPad;
  const bracketRight = bounds.x + bounds.width + bracketPad;
  const bracketBottom = bounds.y + bounds.height + bracketPad;

  const monoFont = fontFamilyCss("Space Mono");

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* 1. Dynamic Audio Equalizer Visualizer */}
      <div
        style={{
          position: "absolute",
          left: `${bounds.x + (bounds.width - totalEqWidth) / 2}px`,
          top: `${bounds.y - 48 * unit}px`,
          display: "flex",
          alignItems: "flex-end",
          gap: `${barGap}px`,
          height: `${24 * unit}px`,
          opacity: enterEase * (isSpeechActive ? 0.95 : 0.45),
          transform: `scale(${enterEase})`,
          transformOrigin: "bottom center",
          transition: "opacity 0.15s ease",
          zIndex: 2,
        }}
      >
        {Array.from({ length: numBars }).map((_, bi) => {
          // Harmonic wave animation
          const freq = 0.35 + (bi % 4) * 0.15;
          const phase = bi * 0.5;
          const wave = Math.sin(frame * freq + phase);
          const rawHeight = isSpeechActive
            ? (6 + Math.abs(wave) * 16 * energy) * unit
            : (4 + Math.abs(wave) * 4) * unit;
          const barColor = bi % 2 === 0 ? POP_PALETTE.cyan : POP_PALETTE.mint;

          return (
            <div
              key={`eq-bar-${bi}`}
              style={{
                width: `${barWidth}px`,
                height: `${Math.max(3 * unit, rawHeight)}px`,
                background: `linear-gradient(to top, ${barColor}, #FFFFFF)`,
                borderRadius: `${2 * unit}px`,
                boxShadow: isSpeechActive ? `0 0 ${6 * unit}px ${barColor}` : undefined,
              }}
            />
          );
        })}
      </div>

      {/* 2. Sleek Telemetry Badge: "SPEECH // AUDIO ACTIVE" */}
      <div
        style={{
          position: "absolute",
          left: `${bounds.x + bounds.width / 2}px`,
          top: `${bounds.y - 70 * unit}px`,
          transform: `translateX(-50%) scale(${enterEase})`,
          display: "flex",
          alignItems: "center",
          gap: `${6 * unit}px`,
          padding: `${2 * unit}px ${10 * unit}px`,
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(8px)",
          borderRadius: `${999 * unit}px`,
          border: `1px solid rgba(255, 255, 255, 0.12)`,
          opacity: enterEase * 0.85,
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: `${5 * unit}px`,
            height: `${5 * unit}px`,
            borderRadius: "50%",
            backgroundColor: isSpeechActive ? POP_PALETTE.mint : POP_PALETTE.yellow,
            boxShadow: `0 0 ${6 * unit}px ${isSpeechActive ? POP_PALETTE.mint : POP_PALETTE.yellow}`,
          }}
        />
        <span
          style={{
            fontFamily: monoFont,
            fontSize: `${11 * unit}px`,
            fontWeight: 700,
            color: "rgba(255, 255, 255, 0.85)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          {isSpeechActive ? "ON AIR // DIALOGUE" : "TRANSCRIPTION"}
        </span>
      </div>

      {/* 3. Minimalist Kinetic Viewfinder Corner Reticles */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: enterEase * 0.6,
          zIndex: 1,
        }}
      >
        {/* Top-Left Bracket */}
        <div
          style={{
            position: "absolute",
            left: `${bracketLeft}px`,
            top: `${bracketTop}px`,
            width: `${bracketSize}px`,
            height: `${bracketSize}px`,
            borderLeft: `${1.5 * unit}px solid ${POP_PALETTE.cyan}`,
            borderTop: `${1.5 * unit}px solid ${POP_PALETTE.cyan}`,
          }}
        />
        {/* Top-Right Bracket */}
        <div
          style={{
            position: "absolute",
            left: `${bracketRight - bracketSize}px`,
            top: `${bracketTop}px`,
            width: `${bracketSize}px`,
            height: `${bracketSize}px`,
            borderRight: `${1.5 * unit}px solid ${POP_PALETTE.cyan}`,
            borderTop: `${1.5 * unit}px solid ${POP_PALETTE.cyan}`,
          }}
        />
        {/* Bottom-Left Bracket */}
        <div
          style={{
            position: "absolute",
            left: `${bracketLeft}px`,
            top: `${bracketBottom - bracketSize}px`,
            width: `${bracketSize}px`,
            height: `${bracketSize}px`,
            borderLeft: `${1.5 * unit}px solid ${POP_PALETTE.cyan}`,
            borderBottom: `${1.5 * unit}px solid ${POP_PALETTE.cyan}`,
          }}
        />
        {/* Bottom-Right Bracket */}
        <div
          style={{
            position: "absolute",
            left: `${bracketRight - bracketSize}px`,
            top: `${bracketBottom - bracketSize}px`,
            width: `${bracketSize}px`,
            height: `${bracketSize}px`,
            borderRight: `${1.5 * unit}px solid ${POP_PALETTE.cyan}`,
            borderBottom: `${1.5 * unit}px solid ${POP_PALETTE.cyan}`,
          }}
        />
      </div>

      {/* 4. Floating Cyber Sparks Outside Text Box */}
      {sparks.map((spark, idx) => {
        const sparkAge = frame - (startFrame + spark.delayFrames);
        if (sparkAge < 0) return null;
        const sparkEnter = clamp01(sparkAge / 8);
        const floatY = Math.sin(frame * 0.08 + idx) * 8 * unit;
        const floatX = Math.cos(frame * 0.06 + idx) * 6 * unit;

        return (
          <div
            key={`spark-${idx}`}
            style={{
              position: "absolute",
              left: `${spark.x + floatX}px`,
              top: `${spark.y + floatY}px`,
              transform: `scale(${sparkEnter})`,
              opacity: sparkEnter * 0.7,
              zIndex: 1,
            }}
          >
            {spark.type === "diamond" ? (
              <div
                style={{
                  width: `${spark.size}px`,
                  height: `${spark.size}px`,
                  backgroundColor: spark.color,
                  transform: "rotate(45deg)",
                  boxShadow: `0 0 ${8 * unit}px ${spark.color}`,
                }}
              />
            ) : spark.type === "cross" ? (
              <div style={{ position: "relative", width: `${spark.size}px`, height: `${spark.size}px` }}>
                <div
                  style={{
                    position: "absolute",
                    left: "40%",
                    top: 0,
                    width: "20%",
                    height: "100%",
                    backgroundColor: spark.color,
                    boxShadow: `0 0 ${6 * unit}px ${spark.color}`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "40%",
                    width: "100%",
                    height: "20%",
                    backgroundColor: spark.color,
                    boxShadow: `0 0 ${6 * unit}px ${spark.color}`,
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: `${spark.size * 0.7}px`,
                  height: `${spark.size * 0.7}px`,
                  borderRadius: "50%",
                  backgroundColor: spark.color,
                  boxShadow: `0 0 ${8 * unit}px ${spark.color}`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
