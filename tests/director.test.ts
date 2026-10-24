import { describe, expect, it } from "vitest";
import { computeLookPlan, extractChunkFeatures, scoreChunkForLooks } from "../src/looks/director";
import type { ChunkData, LookId } from "../src/types";

function createMockChunk(options: {
  start: number;
  end: number;
  words: { text: string; role?: "hero" | "accent" | "normal" | "connector" }[];
}): ChunkData {
  const duration = options.end - options.start;
  const wordCount = options.words.length;
  const wordDuration = duration / Math.max(1, wordCount);

  return {
    start: options.start,
    end: options.end,
    lines: [
      {
        words: options.words.map((w, idx) => ({
          text: w.text,
          start: options.start + idx * wordDuration,
          end: options.start + (idx + 1) * wordDuration,
          role: w.role ?? "normal",
        })),
      },
    ],
  };
}

describe("Director - pure function tests", () => {
  it("detects features: sentence ends with punctuation or long gap", () => {
    const chunk1 = createMockChunk({
      start: 0,
      end: 2,
      words: [{ text: "Hello" }, { text: "world." }],
    });
    const chunk2 = createMockChunk({
      start: 2.1,
      end: 4,
      words: [{ text: "Next" }, { text: "sentence" }],
    });
    const f1 = extractChunkFeatures(chunk1, chunk2);
    expect(f1.endsSentence).toBe(true);

    const chunk3 = createMockChunk({
      start: 0,
      end: 1,
      words: [{ text: "and" }, { text: "then" }],
    });
    const chunk4 = createMockChunk({
      start: 1.1, // only 100ms gap, no punctuation
      end: 2,
      words: [{ text: "we" }, { text: "go" }],
    });
    const f3 = extractChunkFeatures(chunk3, chunk4);
    expect(f3.endsSentence).toBe(false);
  });

  it("Rule 4: Hook rule - first chunk prefers Poster if within 1 point of top score", () => {
    const hookChunk = createMockChunk({
      start: 0,
      end: 1.5,
      words: [{ text: "BIG" }, { text: "DEAL", role: "hero" }, { text: "42" }],
    });
    const plan = computeLookPlan([hookChunk], { enabled: ["pop", "editorial", "poster"] });
    expect(plan[0]?.lookId).toBe("poster");
  });

  it("Rule 1 & 2: Runs of 2-4 chunks and switches only at sentence boundaries", () => {
    // Generate 12 chunks with varying characteristics
    const chunks: ChunkData[] = [];
    for (let i = 0; i < 12; i++) {
      const isSentenceEnd = i % 2 === 1; // ends sentence on odd indices (0-1, 2-3, etc)
      const punctuation = isSentenceEnd ? "." : "";
      chunks.push(
        createMockChunk({
          start: i * 2,
          end: i * 2 + 1.8,
          words: [
            { text: `WordA${i}` },
            { text: `WordB${i}`, role: i % 3 === 0 ? "hero" : "normal" },
            { text: `WordC${i}${punctuation}` },
          ],
        }),
      );
    }

    const plan = computeLookPlan(chunks, { enabled: ["pop", "editorial", "poster"] });
    expect(plan.length).toBe(12);

    // Verify runs of 2-4
    let currentLook = plan[0]!.lookId;
    let runLen = 1;
    for (let i = 1; i < plan.length; i++) {
      if (plan[i]!.lookId === currentLook) {
        runLen++;
      } else {
        expect(runLen).toBeGreaterThanOrEqual(2);
        expect(runLen).toBeLessThanOrEqual(4);
        currentLook = plan[i]!.lookId;
        runLen = 1;
      }
    }
  });

  it("Rule 3: No look appears more than 4 times consecutively", () => {
    const chunks: ChunkData[] = [];
    for (let i = 0; i < 20; i++) {
      chunks.push(
        createMockChunk({
          start: i * 2,
          end: i * 2 + 1.8,
          words: [{ text: "Fast", role: "hero" }, { text: "laugh.", role: "hero" }], // Pop biased
        }),
      );
    }

    const plan = computeLookPlan(chunks, { enabled: ["pop", "editorial", "poster"] });
    let maxRun = 0;
    let currentRun = 1;
    for (let i = 1; i < plan.length; i++) {
      if (plan[i]!.lookId === plan[i - 1]!.lookId) {
        currentRun++;
      } else {
        maxRun = Math.max(maxRun, currentRun);
        currentRun = 1;
      }
    }
    maxRun = Math.max(maxRun, currentRun);
    expect(maxRun).toBeLessThanOrEqual(4);
  });

  it("Rule 6: Variant (0-2) never repeats twice in a row within the same look", () => {
    const chunks: ChunkData[] = [];
    for (let i = 0; i < 15; i++) {
      chunks.push(
        createMockChunk({
          start: i * 2,
          end: i * 2 + 1.8,
          words: [{ text: `Word${i}.` }],
        }),
      );
    }

    const plan = computeLookPlan(chunks, { force: "pop" });
    for (let i = 1; i < plan.length; i++) {
      if (plan[i]!.lookId === plan[i - 1]!.lookId) {
        expect(plan[i]!.variant).not.toBe(plan[i - 1]!.variant);
      }
    }
  });

  it("Variety requirement: Over a 30s sample with 2+ looks enabled, at least 2 looks appear", () => {
    // 30s of video = ~15 chunks of 2s each
    const chunks: ChunkData[] = [];
    for (let i = 0; i < 15; i++) {
      const isEditorial = i >= 4 && i <= 8;
      chunks.push(
        createMockChunk({
          start: i * 2,
          end: i * 2 + (isEditorial ? 1.9 : 1.2),
          words: isEditorial
            ? [
                { text: "Long" },
                { text: "thoughtful" },
                { text: "storytelling" },
                { text: "magazine" },
                { text: "statement." },
              ]
            : [{ text: "Quick" }, { text: "punchy!" }],
        }),
      );
    }

    const plan = computeLookPlan(chunks, { enabled: ["pop", "editorial", "poster"] });
    const uniqueLooks = new Set(plan.map((p) => p.lookId));
    expect(uniqueLooks.size).toBeGreaterThanOrEqual(2);
  });

  it("Rule 7: Breathing decor budget: chunk after hero-heavy chunk gets 0.5 budget", () => {
    const chunk1 = createMockChunk({
      start: 0,
      end: 1.5,
      words: [{ text: "HERO1", role: "hero" }, { text: "HERO2.", role: "hero" }],
    });
    const chunk2 = createMockChunk({
      start: 2,
      end: 3.5,
      words: [{ text: "Calm." }],
    });

    const plan = computeLookPlan([chunk1, chunk2]);
    expect(plan[1]!.decorBudget).toBe(0.5);
  });
});
