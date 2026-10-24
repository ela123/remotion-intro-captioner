import { createRng, seededChoice, seededInt } from "../utils/prng";
import type { ChunkData, LookId, LookPlanItem, LooksConfig } from "../types";

export type ChunkFeatures = {
  duration: number; // in seconds
  wordCount: number;
  heroCount: number;
  wordsPerSecond: number;
  hasNumber: boolean;
  endsSentence: boolean;
  pauseAfterMs: number;
};

const TERMINAL_PUNCTUATION_REGEX = /[.?!]$/;
const NUMBER_REGEX = /\b\d+\b/;
const YEAR_REGEX = /^(19\d\d|20\d\d)$/;
const ORDINAL_REGEX = /^\d+(st|nd|rd|th)$/i;
const PHONE_REGEX = /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;

export function isCountableNumber(text: string): boolean {
  const clean = text.trim().replace(/[,\s]/g, "");
  if (!NUMBER_REGEX.test(clean)) return false;
  if (YEAR_REGEX.test(clean)) return false;
  if (ORDINAL_REGEX.test(clean)) return false;
  if (PHONE_REGEX.test(clean) && clean.length >= 7) return false;
  return true;
}

export function extractChunkFeatures(chunk: ChunkData, nextChunk?: ChunkData): ChunkFeatures {
  const words = chunk.lines.flatMap((l) => l.words);
  const wordCount = words.length;
  const duration = Math.max(0.1, chunk.end - chunk.start);
  const wordsPerSecond = wordCount / duration;

  let heroCount = 0;
  let hasNumber = false;
  for (const w of words) {
    if (w.role === "hero") heroCount++;
    if (isCountableNumber(w.text)) hasNumber = true;
  }

  const pauseAfterMs = nextChunk ? Math.max(0, Math.round((nextChunk.start - chunk.end) * 1000)) : 1000;

  const lastWord = words[words.length - 1];
  const lastText = lastWord ? lastWord.text.trim() : "";
  const hasTerminalPunctuation = TERMINAL_PUNCTUATION_REGEX.test(lastText);
  const endsSentence = hasTerminalPunctuation || pauseAfterMs >= 350;

  return {
    duration,
    wordCount,
    heroCount,
    wordsPerSecond,
    hasNumber,
    endsSentence,
    pauseAfterMs,
  };
}

export function scoreChunkForLooks(features: ChunkFeatures): Record<LookId, number> {
  let popScore = 0;
  let editorialScore = 0;
  let posterScore = 0;

  // Pop scoring
  if (features.heroCount >= 2) popScore += 2;
  if (features.wordsPerSecond >= 3.2) popScore += 2;
  if (features.duration <= 1.2) popScore += 1;

  // Editorial scoring
  if (features.wordCount >= 5) editorialScore += 2;
  if (features.duration >= 1.8) editorialScore += 2;
  if (features.heroCount <= 1) editorialScore += 1;
  if (features.wordsPerSecond <= 2.6) editorialScore += 1;

  // Poster scoring
  if (features.wordCount <= 4) posterScore += 2;
  if (features.heroCount === 1) posterScore += 1;
  if (features.hasNumber) posterScore += 3;
  if (features.pauseAfterMs >= 500) posterScore += 2;

  return {
    pop: popScore,
    editorial: editorialScore,
    poster: posterScore,
  };
}

/**
 * Pure function: Chunks -> LookPlanItem[]
 * Computes deterministic look plan based on the 7 editor's judgment rules.
 */
export function computeLookPlan(
  chunks: ChunkData[],
  options?: Partial<LooksConfig>,
): LookPlanItem[] {
  if (chunks.length === 0) return [];

  const enabled = options?.enabled && options.enabled.length > 0
    ? options.enabled
    : (["pop", "editorial", "poster"] as LookId[]);

  const force = options?.force ?? null;
  const sequence = options?.sequence ?? null;
  const baseEnergy = options?.energy ?? 1.0;

  // If force is set: lock all to that single look
  if (force) {
    return chunks.map((_, i) => ({
      lookId: force,
      variant: (i % 3) as 0 | 1 | 2,
      energy: baseEnergy,
      decorBudget: 1.0,
    }));
  }

  // If sequence is hand-authored:
  if (sequence && sequence.length > 0) {
    return chunks.map((_, i) => ({
      lookId: sequence[i % sequence.length]!,
      variant: (i % 3) as 0 | 1 | 2,
      energy: baseEnergy,
      decorBudget: 1.0,
    }));
  }

  // Extract features for every chunk
  const featuresList = chunks.map((c, i) => extractChunkFeatures(c, chunks[i + 1]));

  const plan: LookPlanItem[] = [];
  let currentLook: LookId | null = null;
  let currentRunLength = 0;
  let lastHeroHeavy = false;
  let prevVariantPerLook: Record<LookId, number> = { pop: -1, editorial: -1, poster: -1 };

  // Track chunk appearances across time for the ~20s fairness rule
  let lastSeenChunk: Record<LookId, number> = { pop: -999, editorial: -999, poster: -999 };

  for (let i = 0; i < chunks.length; i++) {
    const features = featuresList[i]!;
    const scores = scoreChunkForLooks(features);

    // Rule 4: First chunk hook - prefer Poster if within 1 point of top score
    let bestLook: LookId = enabled[0]!;
    let bestScore = -999;

    for (const look of enabled) {
      const score = scores[look];
      if (score > bestScore) {
        bestScore = score;
        bestLook = look;
      }
    }

    if (i === 0 && enabled.includes("poster")) {
      const posterScore = scores.poster;
      if (posterScore >= bestScore - 1) {
        bestLook = "poster";
      }
    }

    // Determine candidate look based on run constraints:
    // Rule 1: A look holds for a run of 2-4 chunks before it may change.
    // Rule 2: Switch only at sentence boundaries (endsSentence), never mid-sentence.
    // Rule 3: No look may appear in more than 4 consecutive chunks.
    let chosenLook: LookId;

    if (currentLook === null) {
      chosenLook = bestLook;
      currentRunLength = 1;
    } else {
      const canSwitchRun = currentRunLength >= 2;
      const mustSwitchMax = currentRunLength >= 4;
      const prevEndedSentence = featuresList[i - 1]?.endsSentence ?? true;

      if (mustSwitchMax) {
        // Must switch to another enabled look!
        const alternatives = enabled.filter((l) => l !== currentLook);
        if (alternatives.length > 0) {
          // Choose highest scoring alternative
          let altBest = alternatives[0]!;
          let altBestScore = scores[altBest];
          for (const alt of alternatives) {
            if (scores[alt] > altBestScore) {
              altBestScore = scores[alt];
              altBest = alt;
            }
          }
          chosenLook = altBest;
          currentRunLength = 1;
        } else {
          chosenLook = currentLook;
          currentRunLength++;
        }
      } else if (canSwitchRun && prevEndedSentence && bestLook !== currentLook) {
        // Can switch at sentence boundary after run of 2-4
        // Check fairness rule: if another look has not appeared in ~20s (approx 6-8 chunks), favor it
        const starvationCandidate = enabled.find(
          (l) => l !== currentLook && i - lastSeenChunk[l] >= 7 && scores[l] >= 1,
        );
        chosenLook = starvationCandidate ?? bestLook;
        currentRunLength = 1;
      } else {
        // Continue current look
        chosenLook = currentLook;
        currentRunLength++;
      }
    }

    currentLook = chosenLook;
    lastSeenChunk[chosenLook] = i;

    // Rule 6: Variant rotation (0-2), never same twice in a row within a look
    const lastVar = prevVariantPerLook[chosenLook];
    const availableVariants: (0 | 1 | 2)[] = ([0, 1, 2] as (0 | 1 | 2)[]).filter((v) => v !== lastVar);
    const variant = seededChoice(`chunk-var-${i}-${chosenLook}`, availableVariants);
    prevVariantPerLook[chosenLook] = variant;

    // Rule 7: Breathing: chunk after hero-heavy chunk (heroCount >= 2) gets 50% decor budget
    const decorBudget = lastHeroHeavy ? 0.5 : 1.0;
    lastHeroHeavy = features.heroCount >= 2;

    // Energy scaling: auto-lower slightly for chunks with wps <= 2
    const energy = features.wordsPerSecond <= 2.0 ? baseEnergy * 0.75 : baseEnergy;

    plan.push({
      lookId: chosenLook,
      variant,
      energy,
      decorBudget,
      hasHook: i === 0,
    });
  }

  return plan;
}
