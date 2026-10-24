import React from "react";
import { EditorialWord } from "../looks/editorial/Word";
import { PopWord } from "../looks/pop/Word";
import { PosterWord } from "../looks/poster/Word";
import type { LookId, Quality } from "../types";
import type { PlacedWord } from "./word-layout";

type WordLayerProps = {
  word: PlacedWord;
  chunkStartFrame: number;
  chunkEndFrame: number;
  frame: number;
  fps: number;
  unit: number;
  quality: Quality;
  lookId: LookId;
  variant?: 0 | 1 | 2;
  energy?: number;
  decorBudget?: number;
  wordIndexInChunk: number;
  heroIndexInChunk: number;
  accentIndexInChunk: number;
  normalIndexInChunk: number;
  lineScaleX?: number;
};

export const WordLayer: React.FC<WordLayerProps> = ({
  word,
  chunkStartFrame,
  chunkEndFrame,
  frame,
  fps,
  unit,
  quality,
  lookId,
  energy = 1,
  decorBudget = 1,
  wordIndexInChunk,
  heroIndexInChunk,
  accentIndexInChunk,
  normalIndexInChunk,
  lineScaleX = 1.0,
}) => {
  if (lookId === "editorial") {
    return (
      <EditorialWord
        word={word}
        chunkStartFrame={chunkStartFrame}
        chunkEndFrame={chunkEndFrame}
        frame={frame}
        fps={fps}
        unit={unit}
        quality={quality}
        energy={energy}
        decorBudget={decorBudget}
        wordIndexInChunk={wordIndexInChunk}
        heroIndexInChunk={heroIndexInChunk}
        accentIndexInChunk={accentIndexInChunk}
        normalIndexInChunk={normalIndexInChunk}
      />
    );
  }

  if (lookId === "poster") {
    return (
      <PosterWord
        word={word}
        chunkStartFrame={chunkStartFrame}
        chunkEndFrame={chunkEndFrame}
        frame={frame}
        fps={fps}
        unit={unit}
        quality={quality}
        energy={energy}
        heroIndexInChunk={heroIndexInChunk}
        accentIndexInChunk={accentIndexInChunk}
        normalIndexInChunk={normalIndexInChunk}
        lineScaleX={lineScaleX}
      />
    );
  }

  // Default to Pop
  return (
    <PopWord
      word={word}
      chunkStartFrame={chunkStartFrame}
      chunkEndFrame={chunkEndFrame}
      frame={frame}
      fps={fps}
      unit={unit}
      quality={quality}
      energy={energy}
      decorBudget={decorBudget}
      wordIndexInChunk={wordIndexInChunk}
      heroIndexInChunk={heroIndexInChunk}
      accentIndexInChunk={accentIndexInChunk}
      normalIndexInChunk={normalIndexInChunk}
    />
  );
};
