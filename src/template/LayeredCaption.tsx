import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  getRemotionEnvironment,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { config } from "../intro.config";
import { computeLookPlan } from "../looks/director";
import { getLook, lookToStyleTokens, POP_PALETTE } from "../looks/index";
import { loadAllProjectFonts } from "../styles/fonts";
import { Background } from "../video/Background";
import type { AnnotatedCue, CaptionProps, CaptionsDoc, ChunkData, WordData, WordRole } from "../types";
import { CaptionBlock } from "./CaptionBlock";
import { ErrorScreen } from "./ErrorScreen";
import { referenceUnit } from "./units";
import { WarningsBadge } from "./WarningsBadge";
import { computeChunkLayout, type ChunkLayout } from "./word-layout";

type FontState = { ready: boolean; error: string | null };

function useAllFonts(): FontState {
  const [handle] = useState(() => delayRender("Loading project fonts for all looks"));
  const [state, setState] = useState<FontState>({ ready: false, error: null });

  useEffect(() => {
    let active = true;
    loadAllProjectFonts()
      .then(() => {
        if (active) setState({ ready: true, error: null });
        continueRender(handle);
      })
      .catch((err: unknown) => {
        const reason = err instanceof Error ? err.message : String(err);
        const message = `Could not load fonts: ${reason}. Check internet connection.`;
        if (getRemotionEnvironment().isRendering) {
          cancelRender(new Error(message));
          return;
        }
        if (active) setState({ ready: false, error: message });
        continueRender(handle);
      });
    return () => {
      active = false;
    };
  }, [handle]);

  return state;
}

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "up", "about", "into", "over", "after", "is", "are", "was", "were",
  "be", "been", "being", "have", "has", "had", "do", "does", "did", "you", "your",
  "i", "my", "we", "our", "it", "its", "that", "this", "me", "he", "she", "him", "her",
]);

function inferRole(wordText: string, indexInLine: number, totalInLine: number): WordRole {
  const clean = wordText.replace(/[^\w\s]/g, "");
  const lower = clean.toLowerCase();
  if (/\d/.test(wordText)) return "hero";
  if (clean.length >= 3 && clean === clean.toUpperCase()) return "hero";
  if (STOPWORDS.has(lower) && wordText.length <= 4 && indexInLine !== 0) return "connector";
  if (clean.length >= 7 || indexInLine === totalInLine - 1) return "hero";
  if (clean.length >= 5) return "accent";
  return "normal";
}

function cuesToDoc(cues: AnnotatedCue[], maxWordsPerLine = 4, maxLinesPerChunk = 2): CaptionsDoc {
  const chunks: ChunkData[] = [];

  for (const cue of cues) {
    const rawWords = cue.lines.flatMap((l) => l.words);
    if (rawWords.length === 0) continue;

    const wordsPerLine = Math.min(maxWordsPerLine, Math.max(3, Math.ceil(rawWords.length / maxLinesPerChunk)));
    const lines: { words: WordData[] }[] = [];
    let currentLineWords: WordData[] = [];

    for (let i = 0; i < rawWords.length; i++) {
      const rw = rawWords[i];
      if (!rw) continue;
      const role = inferRole(rw.text, currentLineWords.length, wordsPerLine);
      currentLineWords.push({
        text: rw.text,
        start: rw.startMs / 1000,
        end: rw.endMs / 1000,
        role,
      });

      if (currentLineWords.length >= wordsPerLine || i === rawWords.length - 1) {
        lines.push({ words: currentLineWords });
        currentLineWords = [];
      }
    }

    chunks.push({
      start: cue.startMs / 1000,
      end: cue.endMs / 1000,
      lines,
    });
  }

  return { chunks };
}

const Captions: React.FC<CaptionProps> = ({
  quality,
  cues,
  captionsDoc,
  hasProxy,
  warnings,
  looks: looksProp,
  debug: debugProp,
  safeMargin = 0.08,
  offsetY = 0,
  maxWordsPerLine = 4,
  maxLinesPerChunk = 2,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const unit = referenceUnit(width, height);
  const frameSize = useMemo(() => ({ width, height }), [width, height]);

  const fonts = useAllFonts();

  // Convert cues to document if captionsDoc is not directly provided
  const doc: CaptionsDoc = useMemo(() => {
    if (captionsDoc && captionsDoc.chunks && captionsDoc.chunks.length > 0) {
      return captionsDoc;
    }
    return cuesToDoc(cues, maxWordsPerLine, maxLinesPerChunk);
  }, [captionsDoc, cues, maxWordsPerLine, maxLinesPerChunk]);

  // Compute Look Plan using the Director (pure & memoized)
  const looksConfig = looksProp ?? config.looks;
  const lookPlan = useMemo(() => {
    return computeLookPlan(doc.chunks, looksConfig);
  }, [doc.chunks, looksConfig]);

  // Pre-compute chunk layouts with per-look font metrics
  const chunkLayouts = useMemo((): ChunkLayout[] | null => {
    if (!fonts.ready) return null;
    return doc.chunks.map((chunk, i) => {
      const planItem = lookPlan[i] ?? { lookId: "pop", variant: 0 };
      const lookTokens = getLook(planItem.lookId);
      const styleTokens = lookToStyleTokens(planItem.lookId);

      return computeChunkLayout(chunk, styleTokens, frameSize, {
        safeMargin,
        offsetY,
        unit,
        fps,
        baseFontSizeU: lookTokens.baseFontSizeU,
      });
    });
  }, [fonts.ready, doc, lookPlan, frameSize, safeMargin, offsetY, unit, fps]);

  const isDebug = debugProp ?? config.debug ?? false;

  if (fonts.error) return <ErrorScreen message={fonts.error} warnings={warnings} />;

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: POP_PALETTE.ink }}>
      <Background quality={quality} hasProxy={hasProxy} />

      {chunkLayouts
        ? chunkLayouts.map((layout, i) => {
            if (frame < layout.startFrame - 4 || frame > layout.endFrame + 4) return null;
            const planItem = lookPlan[i] ?? {
              lookId: "pop",
              variant: 0,
              energy: 1,
              decorBudget: 1,
            };
            const styleTokens = lookToStyleTokens(planItem.lookId);

            return (
              <CaptionBlock
                key={`chunk-${i}-${layout.startFrame}`}
                chunkLayout={layout}
                frame={frame}
                fps={fps}
                unit={unit}
                quality={quality}
                style={styleTokens}
                frameSize={frameSize}
                offsetY={offsetY}
                lookId={planItem.lookId}
                variant={planItem.variant}
                energy={planItem.energy}
                decorBudget={planItem.decorBudget}
                chunkIndex={i + 1}
                debug={isDebug}
              />
            );
          })
        : null}

      <WarningsBadge warnings={warnings} unit={unit} />
    </AbsoluteFill>
  );
};

export const LayeredCaption: React.FC<CaptionProps> = (props) =>
  props.error ? <ErrorScreen message={props.error} warnings={props.warnings} /> : <Captions {...props} />;
