import React, { useMemo } from "react";
import { EditorialGraphics } from "../looks/editorial/Graphics";
import { getEditorialLineExit } from "../looks/editorial/exit";
import { PopGraphics } from "../looks/pop/Graphics";
import { getPopLineExit } from "../looks/pop/exit";
import { PosterGraphics } from "../looks/poster/Graphics";
import { getPosterExit } from "../looks/poster/exit";
import { computeJustifiedPosterScales } from "../looks/poster/layout-adapter";
import { seededFloat } from "../utils/prng";
import type { LookId, Quality, StyleTokens } from "../types";
import { WordLayer } from "./WordLayer";
import type { ChunkLayout, PlacedWord } from "./word-layout";

type CaptionBlockProps = {
  chunkLayout: ChunkLayout;
  frame: number;
  fps: number;
  unit: number;
  quality: Quality;
  style: StyleTokens;
  frameSize: { width: number; height: number };
  offsetY?: number;
  lookId: LookId;
  variant?: 0 | 1 | 2;
  energy?: number;
  decorBudget?: number;
  chunkIndex?: number;
  debug?: boolean;
};

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const CaptionBlock: React.FC<CaptionBlockProps> = ({
  chunkLayout,
  frame,
  fps,
  unit,
  quality,
  frameSize,
  offsetY = 0,
  lookId,
  variant = 0,
  energy = 1,
  decorBudget = 1,
  chunkIndex = 1,
  debug = false,
}) => {
  const { startFrame, endFrame, bounds } = chunkLayout;

  // Don't render outside chunk active bounds
  if (frame < startFrame - 4 || frame > endFrame + 4) return null;

  // Find all words in chunk and count by role
  const allWords = useMemo(() => {
    const list: PlacedWord[] = [];
    chunkLayout.lines.forEach((l) => {
      l.words.forEach((w) => list.push(w));
    });
    return list;
  }, [chunkLayout]);

  const heroWords = useMemo(() => allWords.filter((w) => w.role === "hero"), [allWords]);

  // Find the latest entrance finish frame across all words
  const latestEntranceFrame = useMemo(() => {
    let latest = startFrame;
    for (const w of allWords) {
      const wStart = Math.round(w.start * fps);
      const enterDur = w.role === "connector" ? 4 : 7;
      latest = Math.max(latest, wStart + enterDur);
    }
    return latest;
  }, [allWords, startFrame, fps]);

  // Exit duration: 6 frames for Pop/Editorial, 5 frames for Poster
  const exitFrames = lookId === "poster" ? 5 : 6;
  // Ensure at least 6 frames of rest between last entrance and exit start
  const exitStart = Math.max(latestEntranceFrame + 6, endFrame - exitFrames);
  const isExiting = frame >= exitStart;

  // 1. Camera Shake (Pop: 4-frame 6px*unit exponential decay on hero; Poster: on hero word; Editorial: none)
  let shakeX = 0;
  let shakeY = 0;

  if (lookId === "pop") {
    let lastShakeStart = -999;
    for (const hw of heroWords) {
      const hwStart = Math.round(hw.start * fps);
      if (hwStart - lastShakeStart >= 20) {
        lastShakeStart = hwStart;
        const shakeAge = frame - hwStart;
        if (shakeAge >= 0 && shakeAge < 4) {
          const decay = Math.exp(-shakeAge * 0.8);
          const amp = 6 * unit * decay * energy;
          const angle = seededFloat(`pop-shake-dir-${hwStart}`, 0, Math.PI * 2);
          shakeX = Math.cos(angle) * amp;
          shakeY = Math.sin(angle) * amp;
          break;
        }
      }
    }
  }

  // 2. Parallax scale
  const chunkDuration = Math.max(1, endFrame - startFrame);
  const chunkProgress = clamp01((frame - startFrame) / chunkDuration);

  let textCameraScale = 1.0;
  let graphicsCameraScale = 1.0;

  if (lookId === "pop") {
    textCameraScale = 1.0 + 0.04 * chunkProgress;
    graphicsCameraScale = 1.0 + 0.02 * chunkProgress;
  } else if (lookId === "editorial") {
    textCameraScale = 1.0 + 0.03 * chunkProgress;
    graphicsCameraScale = 1.0 + 0.015 * chunkProgress;
  } else {
    // poster
    textCameraScale = 1.0 + 0.03 * chunkProgress;
  }

  // 3. Variant Positioning Offsets
  // Editorial variants: (0) bottom-left; (1) centered lower-third; (2) two-tier
  // Poster variants: (0) center-screen; (1) pushed right; (2) split
  let variantOffsetX = 0;
  let variantOffsetY = 0;

  if (lookId === "editorial") {
    if (variant === 0) {
      variantOffsetX = -frameSize.width * 0.12;
    } else if (variant === 1) {
      variantOffsetX = 0;
    } else if (variant === 2) {
      variantOffsetY = -20 * unit;
    }
  } else if (lookId === "poster") {
    if (variant === 0) {
      variantOffsetY = -frameSize.height * 0.1; // centered
    } else if (variant === 1) {
      variantOffsetX = frameSize.width * 0.08; // pushed right
    }
  }

  const originX = frameSize.width / 2 + variantOffsetX;
  const originY = frameSize.height / 2 + offsetY + variantOffsetY;

  // Poster line scales (justified flush blocks)
  const posterLineScales = useMemo(() => {
    return lookId === "poster" ? computeJustifiedPosterScales(chunkLayout) : new Map<number, number>();
  }, [chunkLayout, lookId]);

  // Poster bar-wipe exit progress
  const posterExit = lookId === "poster" && isExiting ? getPosterExit(frame, exitStart) : null;

  let globalWordCounter = 0;
  let heroCounter = 0;
  let accentCounter = 0;
  let normalCounter = 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        transform: `translate(${shakeX.toFixed(1)}px, ${shakeY.toFixed(1)}px) translate(${variantOffsetX.toFixed(1)}px, ${variantOffsetY.toFixed(1)}px)`,
      }}
    >
      {/* Decorative Graphics Layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${graphicsCameraScale})`,
          transformOrigin: `${originX}px ${originY}px`,
          zIndex: 1,
        }}
      >
        {lookId === "pop" && (
          <PopGraphics
            chunkLayout={chunkLayout}
            frame={frame}
            fps={fps}
            unit={unit}
            quality={quality}
            energy={energy}
            decorBudget={decorBudget}
          />
        )}
        {lookId === "editorial" && (
          <EditorialGraphics
            chunkLayout={chunkLayout}
            frame={frame}
            fps={fps}
            unit={unit}
            quality={quality}
            chunkIndexInRun={chunkIndex}
          />
        )}
        {lookId === "poster" && (
          <PosterGraphics
            chunkLayout={chunkLayout}
            frame={frame}
            fps={fps}
            unit={unit}
            quality={quality}
          />
        )}
      </div>

      {/* Caption Text Layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${textCameraScale})`,
          transformOrigin: `${originX}px ${originY}px`,
          zIndex: 2,
        }}
      >
        {chunkLayout.lines.map((line, lIdx) => {
          // Line Exit Calculation
          let lineExitScale = 1;
          let lineExitRot = 0;
          let lineExitOpacity = 1;
          let lineExitTransYPercent = 0;

          if (isExiting) {
            if (lookId === "pop") {
              const popEx = getPopLineExit(
                frame,
                exitStart,
                lIdx,
                chunkLayout.lines.length,
                `pop-chunk-${startFrame}`,
              );
              lineExitScale = popEx.scale;
              lineExitRot = popEx.rotation;
              lineExitOpacity = popEx.opacity;
            } else if (lookId === "editorial") {
              const edEx = getEditorialLineExit(
                frame,
                exitStart,
                lIdx,
                chunkLayout.lines.length,
              );
              lineExitTransYPercent = edEx.translateYPercent;
              lineExitOpacity = edEx.opacity;
            } else if (lookId === "poster" && posterExit) {
              lineExitOpacity = posterExit.opacity;
            }
          }

          const lineScaleX = posterLineScales.get(lIdx) ?? 1.0;

          return (
            <div
              key={`line-${lIdx}-${line.y}`}
              style={{
                position: "absolute",
                inset: 0,
                transform: `rotate(${lineExitRot.toFixed(2)}deg) scale(${lineExitScale.toFixed(3)}) translateY(${lineExitTransYPercent}%)`,
                transformOrigin: "center center",
                opacity: lineExitOpacity,
              }}
            >
              {line.words.map((word) => {
                const wIdx = globalWordCounter++;
                const hIdx = word.role === "hero" ? heroCounter++ : 0;
                const aIdx = word.role === "accent" ? accentCounter++ : 0;
                const nIdx = word.role === "normal" ? normalCounter++ : 0;

                return (
                  <WordLayer
                    key={`w-${word.lineIndex}-${word.wordIndexInLine}-${word.text}`}
                    word={word}
                    chunkStartFrame={startFrame}
                    chunkEndFrame={endFrame}
                    frame={frame}
                    fps={fps}
                    unit={unit}
                    quality={quality}
                    lookId={lookId}
                    variant={variant}
                    energy={energy}
                    decorBudget={decorBudget}
                    wordIndexInChunk={wIdx}
                    heroIndexInChunk={hIdx}
                    accentIndexInChunk={aIdx}
                    normalIndexInChunk={nIdx}
                    lineScaleX={lineScaleX}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Poster Exit Wipe Bar */}
      {posterExit && posterExit.wipeProgress > 0 && (
        <div
          style={{
            position: "absolute",
            left: `${bounds.x - 20 * unit}px`,
            top: `${bounds.y - 20 * unit}px`,
            width: `${bounds.width + 40 * unit}px`,
            height: `${bounds.height + 40 * unit}px`,
            backgroundColor: "#FF3B1D",
            transformOrigin: "left center",
            transform: `scaleX(${posterExit.wipeProgress})`,
            zIndex: 30,
          }}
        />
      )}

      {/* Debug Overlay (Safe areas, exclusion boxes, and active look label) */}
      {debug && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 100 }}>
          {/* Safe Area Box */}
          <div
            style={{
              position: "absolute",
              left: `${frameSize.width * 0.08}px`,
              right: `${frameSize.width * 0.08}px`,
              top: `${frameSize.height * 0.12}px`,
              bottom: `${frameSize.height * 0.12}px`,
              border: "1px dashed rgba(0, 255, 255, 0.4)",
            }}
          />

          {/* Text Exclusion Box */}
          <div
            style={{
              position: "absolute",
              left: `${bounds.x - 65 * unit}px`,
              top: `${bounds.y - 65 * unit}px`,
              width: `${bounds.width + 130 * unit}px`,
              height: `${bounds.height + 130 * unit}px`,
              border: "1px solid rgba(255, 0, 100, 0.6)",
              backgroundColor: "rgba(255, 0, 100, 0.05)",
            }}
          />

          {/* Active Look Label */}
          <div
            style={{
              position: "absolute",
              left: `${bounds.x}px`,
              top: `${bounds.y - 80 * unit}px`,
              padding: "4px 8px",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              color: "#FFF",
              fontFamily: "monospace",
              fontSize: "14px",
              borderRadius: "4px",
            }}
          >
            {`Look: ${lookId.toUpperCase()} | Variant: ${variant} | Frame: ${frame} | Rest: ${exitStart - latestEntranceFrame}f`}
          </div>
        </div>
      )}
    </div>
  );
};
