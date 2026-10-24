import { measureText } from "@remotion/layout-utils";
import { fontFamilyCss } from "../styles/fonts";
import { POP_PALETTE, POP_ROLES } from "../styles/pop";
import { seededFloat } from "../motion/prng";
import type {
  ChunkData,
  EntranceType,
  FontFamily,
  StyleTokens,
  WordData,
  WordRole,
} from "../types";

export type PlacedWord = {
  text: string;
  start: number; // in seconds
  end: number;   // in seconds
  role: WordRole;
  effect: string;
  color: string;
  fontFamily: FontFamily;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  fontSize: number;
  trackingEm: number;
  uppercase: boolean;
  opacity: number;
  entrance: EntranceType;
  rotation: number;
  stickerRotation: number;
  width: number;
  height: number;
  spaceWidth: number;
  x: number;
  y: number;
  lineIndex: number;
  wordIndexInLine: number;
  globalIndex: number;
};

export type PlacedLine = {
  words: PlacedWord[];
  width: number;
  height: number;
  y: number;
  lineIndex: number;
};

export type ChunkLayout = {
  chunk: ChunkData;
  startFrame: number;
  endFrame: number;
  lines: PlacedLine[];
  bounds: { x: number; y: number; width: number; height: number };
  scale: number;
};

export type LayoutOptions = {
  safeMargin?: number;
  offsetY?: number;
  unit: number;
  fps: number;
  baseFontSizeU?: number;
};

export function computeChunkLayout(
  chunk: ChunkData,
  style: StyleTokens,
  frameSize: { width: number; height: number },
  options: LayoutOptions,
): ChunkLayout {
  const { unit, fps } = options;
  const safeMargin = options.safeMargin ?? 0.08;
  const baseFontSize = (options.baseFontSizeU ?? 78) * unit;

  type MeasuredRawWord = {
    word: WordData;
    role: WordRole;
    fontFamily: FontFamily;
    fontWeight: number;
    fontStyle: "normal" | "italic";
    fontSize: number;
    trackingEm: number;
    uppercase: boolean;
    color: string;
    opacity: number;
    entrance: EntranceType;
    rotation: number;
    stickerRotation: number;
    effect: string;
    width: number;
    height: number;
    spaceWidth: number;
    lineIndex: number;
    wordIndexInLine: number;
    globalIndex: number;
  };

  const rawLines: MeasuredRawWord[][] = [];
  let globalWordIndex = 0;
  let heroCount = 0;
  let accentCount = 0;
  let normalCount = 0;
  let prevCycleColor: string | null = null;
  const cyclePalette = POP_PALETTE.cycle;
  let cycleIdx = 0;

  for (let l = 0; l < chunk.lines.length; l++) {
    const line = chunk.lines[l];
    if (!line) continue;
    const measuredWordsInLine: MeasuredRawWord[] = [];

    for (let w = 0; w < line.words.length; w++) {
      const word = line.words[w];
      if (!word) continue;
      const role: WordRole = word.role ?? "normal";
      const typo = style.roles?.[role] ?? POP_ROLES[role];

      const scaleMult = (typo.scale ?? 1.0) * (word.scale ?? 1.0);
      const fontSize = Math.round(baseFontSize * scaleMult);
      const uppercase = typo.uppercase;
      const family: FontFamily = (word.fontKey as FontFamily) ?? typo.family;
      const weight = typo.weight;
      const fontStyle = typo.fontStyle ?? "normal";
      const trackingEm = typo.trackingEm;
      const opacity = typo.opacity ?? 1;

      // Assign non-repeating color cycle for hero & accent within chunk
      let color: string;
      if (word.color) {
        color = word.color;
      } else if (role === "hero" || role === "accent") {
        let chosenColor = cyclePalette[cycleIdx % cyclePalette.length]!;
        if (chosenColor === prevCycleColor) {
          cycleIdx++;
          chosenColor = cyclePalette[cycleIdx % cyclePalette.length]!;
        }
        color = chosenColor;
        prevCycleColor = color;
        cycleIdx++;
      } else {
        color = POP_PALETTE.cream;
      }

      // Assign entrance strictly by role
      let entrance: EntranceType;
      if (word.entrance) {
        entrance = word.entrance as EntranceType;
      } else if (role === "hero") {
        entrance = heroCount % 2 === 0 ? "sticker-slap" : "spin-pop";
        heroCount++;
      } else if (role === "accent") {
        entrance = accentCount % 2 === 0 ? "jelly" : "drop-bounce";
        accentCount++;
      } else if (role === "connector") {
        entrance = "fade-pop";
      } else {
        entrance = normalCount % 3 === 2 ? "wiggle-in" : "pop";
        normalCount++;
      }

      // Fixed seeded resting rotation
      const rotSeed = `chunk-${chunk.start}-word-${globalWordIndex}-${word.text}`;
      const rotation = role === "hero"
        ? seededFloat(rotSeed, -5.5, 5.5)
        : seededFloat(rotSeed, -3.5, 3.5);
      const stickerRotation = rotation * -0.65;

      const effect = word.effect ?? (role === "hero" ? "marker-highlight" : role === "accent" ? "wobble" : "none");

      const text = uppercase ? word.text.toUpperCase() : word.text;
      const fontCss = fontFamilyCss(family);

      const wordMeas = measureText({
        text,
        fontFamily: fontCss,
        fontWeight: weight,
        fontSize,
        letterSpacing: `${trackingEm}em`,
      });

      const spaceMeas = measureText({
        text: " ",
        fontFamily: fontCss,
        fontWeight: weight,
        fontSize,
        letterSpacing: `${trackingEm}em`,
      });

      const trackingPx = trackingEm * fontSize;
      const cleanWidth = Math.max(1, wordMeas.width - (text.length > 0 ? trackingPx : 0));
      const wordHeight = Math.max(1, fontSize * 1.25);

      measuredWordsInLine.push({
        word,
        role,
        fontFamily: family,
        fontWeight: weight,
        fontStyle,
        fontSize,
        trackingEm,
        uppercase,
        color,
        opacity,
        entrance,
        rotation,
        stickerRotation,
        effect,
        width: cleanWidth,
        height: wordHeight,
        spaceWidth: Math.max(10 * unit, spaceMeas.width),
        lineIndex: l,
        wordIndexInLine: w,
        globalIndex: globalWordIndex++,
      });
    }

    rawLines.push(measuredWordsInLine);
  }

  // Calculate unscaled line widths and heights
  const unscaledLineWidths = rawLines.map((lineWords) => {
    let w = 0;
    lineWords.forEach((mw, i) => {
      w += mw.width;
      if (i < lineWords.length - 1) w += mw.spaceWidth;
    });
    return w;
  });

  const unscaledLineHeights = rawLines.map((lineWords) => {
    return Math.max(...lineWords.map((mw) => mw.height), 24 * unit);
  });

  const lineGap = 18 * unit;
  const unscaledTotalHeight =
    unscaledLineHeights.reduce((sum, h) => sum + h, 0) + Math.max(0, rawLines.length - 1) * lineGap;
  const unscaledMaxWidth = Math.max(0, ...unscaledLineWidths);

  // Check safe margin overflow and compute auto-shrink factor
  const safeWidth = frameSize.width * (1 - 2 * safeMargin);
  const safeHeight = frameSize.height * (1 - 2 * 0.12);

  let shrink = 1.0;
  if (unscaledMaxWidth > safeWidth || unscaledTotalHeight > safeHeight) {
    const shrinkW = safeWidth / Math.max(1, unscaledMaxWidth);
    const shrinkH = safeHeight / Math.max(1, unscaledTotalHeight);
    shrink = Math.max(0.7, Math.min(shrinkW, shrinkH) * 0.96);
  }

  // Apply shrink to all measurements
  const scaledLineHeights = unscaledLineHeights.map((h) => h * shrink);
  const scaledLineGap = lineGap * shrink;
  const scaledTotalHeight =
    scaledLineHeights.reduce((sum, h) => sum + h, 0) + Math.max(0, rawLines.length - 1) * scaledLineGap;

  const scaledLineWidths: number[] = [];
  rawLines.forEach((lineWords) => {
    let lw = 0;
    lineWords.forEach((mw, i) => {
      mw.fontSize *= shrink;
      mw.width *= shrink;
      mw.height *= shrink;
      mw.spaceWidth *= shrink;
      lw += mw.width;
      if (i < lineWords.length - 1) lw += mw.spaceWidth;
    });
    scaledLineWidths.push(lw);
  });

  const scaledMaxWidth = Math.max(0, ...scaledLineWidths);

  // Position: lower-center, bottom edge at least 12% of height from bottom
  const centerX = frameSize.width / 2;
  const bottomEdgeTarget = frameSize.height * (1 - 0.12);
  const blockTop = Math.max(
    frameSize.height * 0.12,
    bottomEdgeTarget - scaledTotalHeight + (options.offsetY ?? 0),
  );

  let currentLineY = blockTop;
  const placedLines: PlacedLine[] = [];

  for (let l = 0; l < rawLines.length; l++) {
    const lineWords = rawLines[l] ?? [];
    const lineWidth = scaledLineWidths[l] ?? 0;
    const lineHeight = scaledLineHeights[l] ?? 0;
    const lineStartX = centerX - lineWidth / 2;

    let currentWordX = lineStartX;
    const placedWords: PlacedWord[] = [];

    for (let w = 0; w < lineWords.length; w++) {
      const mw = lineWords[w];
      if (!mw) continue;

      const wordY = currentLineY + (lineHeight - mw.height) / 2;

      placedWords.push({
        text: mw.word.text,
        start: mw.word.start,
        end: mw.word.end,
        role: mw.role,
        effect: mw.effect,
        color: mw.color,
        fontFamily: mw.fontFamily,
        fontWeight: mw.fontWeight,
        fontStyle: mw.fontStyle,
        fontSize: mw.fontSize,
        trackingEm: mw.trackingEm,
        uppercase: mw.uppercase,
        opacity: mw.opacity,
        entrance: mw.entrance,
        rotation: mw.rotation,
        stickerRotation: mw.stickerRotation,
        width: mw.width,
        height: mw.height,
        spaceWidth: mw.spaceWidth,
        x: Math.round(currentWordX),
        y: Math.round(wordY),
        lineIndex: l,
        wordIndexInLine: w,
        globalIndex: mw.globalIndex,
      });

      currentWordX += mw.width + mw.spaceWidth;
    }

    placedLines.push({
      words: placedWords,
      width: lineWidth,
      height: lineHeight,
      y: currentLineY,
      lineIndex: l,
    });

    currentLineY += lineHeight + scaledLineGap;
  }

  const startFrame = Math.round(chunk.start * fps);
  const endFrame = Math.round(chunk.end * fps);

  return {
    chunk,
    startFrame,
    endFrame,
    lines: placedLines,
    bounds: {
      x: Math.round(centerX - scaledMaxWidth / 2),
      y: Math.round(blockTop),
      width: Math.round(scaledMaxWidth),
      height: Math.round(scaledTotalHeight),
    },
    scale: shrink,
  };
}
