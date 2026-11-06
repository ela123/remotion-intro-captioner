import { existsSync, mkdirSync, rmSync, writeFileSync, utimesSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  buildPropsJson,
  discoverVideos,
  isSourceUnchanged,
  loadOverride,
  printSummaryTable,
  readMeta,
  sanitizeStem,
  writeMeta,
  type VideoResult,
} from "../scripts/batch.js";

const TEST_DIR = path.resolve("work", "test-batch-suite");

describe("batch.ts unit tests", () => {
  beforeEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {}
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe("sanitizeStem", () => {
    it("handles plain alphanumeric filenames", () => {
      expect(sanitizeStem("clip1")).toBe("clip1");
      expect(sanitizeStem("intro_v2")).toBe("intro_v2");
    });

    it("replaces spaces and punctuation with underscores", () => {
      expect(sanitizeStem("my clip (2026)")).toBe("my_clip_2026");
      expect(sanitizeStem("video with  multiple   spaces")).toBe("video_with_multiple_spaces");
      expect(sanitizeStem("hello!@#$%^&*()world")).toBe("hello_world");
    });

    it("collapses consecutive underscores and trims leading/trailing", () => {
      expect(sanitizeStem("___test___file___")).toBe("test_file");
      expect(sanitizeStem(".hidden.file.")).toBe("hidden.file");
    });

    it("handles unicode characters safely", () => {
      const sanitized = sanitizeStem("vidéo café résumé");
      expect(sanitized).toBe("vid_o_caf_r_sum");
    });

    it("falls back to 'video' if all characters are stripped", () => {
      expect(sanitizeStem("")).toBe("video");
      expect(sanitizeStem("???")).toBe("video");
      expect(sanitizeStem("     ")).toBe("video");
    });

    it("caps length at 80 chars", () => {
      const longName = "a".repeat(120);
      expect(sanitizeStem(longName)).toHaveLength(80);
    });
  });

  describe("loadOverride", () => {
    it("returns empty object if no override file exists", () => {
      const result = loadOverride(TEST_DIR, "clip", "clip");
      expect(result).toEqual({});
    });

    it("loads valid keys and ignores unknown keys without crashing", () => {
      const overridePath = path.join(TEST_DIR, "clip.override.json");
      writeFileSync(
        overridePath,
        JSON.stringify({
          style: "editorial",
          energy: 0.8,
          unknownKey: "should be ignored",
          anotherBadKey: 1234,
        }),
        "utf8",
      );

      const result = loadOverride(TEST_DIR, "clip", "clip");
      expect(result).toEqual({
        style: "editorial",
        energy: 0.8,
      });
    });

    it("handles malformed JSON gracefully", () => {
      const overridePath = path.join(TEST_DIR, "bad.override.json");
      writeFileSync(overridePath, "{ this is not json }", "utf8");

      const result = loadOverride(TEST_DIR, "bad", "bad");
      expect(result).toEqual({});
    });

    it("handles non-object JSON gracefully", () => {
      const overridePath = path.join(TEST_DIR, "array.override.json");
      writeFileSync(overridePath, JSON.stringify(["not", "an", "object"]), "utf8");

      const result = loadOverride(TEST_DIR, "array", "array");
      expect(result).toEqual({});
    });

    it("supports both stem.override.json and baseName.override.json", () => {
      const baseName = "my video";
      const stem = "my_video";
      writeFileSync(
        path.join(TEST_DIR, `${stem}.override.json`),
        JSON.stringify({ energy: 0.5 }),
        "utf8",
      );

      const result = loadOverride(TEST_DIR, baseName, stem);
      expect(result.energy).toBe(0.5);
    });
  });

  describe("buildPropsJson", () => {
    it("merges defaults with override values", () => {
      const propsPath = buildPropsJson(TEST_DIR, {
        style: "minimal",
        energy: 0.9,
      });

      expect(existsSync(propsPath)).toBe(true);
      const parsed = JSON.parse(readFileSync(propsPath, "utf8"));
      expect(parsed.style).toBe("minimal");
      expect(parsed.looks.energy).toBe(0.9);
    });
  });

  describe("meta and stage-level resume detection", () => {
    it("correctly records and detects unchanged source", () => {
      const dummyVideo = path.join(TEST_DIR, "source.mp4");
      writeFileSync(dummyVideo, "dummy content 123456789", "utf8");

      writeMeta(TEST_DIR, dummyVideo, "small.en");
      const meta = readMeta(TEST_DIR);
      expect(meta).not.toBeNull();
      expect(meta?.model).toBe("small.en");
      expect(meta?.source.sizeByte).toBe(23);

      expect(isSourceUnchanged(TEST_DIR, dummyVideo, "small.en")).toBe(true);
      // Different model triggers re-run
      expect(isSourceUnchanged(TEST_DIR, dummyVideo, "base.en")).toBe(false);

      // Modified size triggers re-run
      writeFileSync(dummyVideo, "modified content with different size", "utf8");
      expect(isSourceUnchanged(TEST_DIR, dummyVideo, "small.en")).toBe(false);
    });
  });

  describe("discoverVideos", () => {
    it("discovers valid video extensions and filters out others", () => {
      writeFileSync(path.join(TEST_DIR, "clip1.mp4"), "data");
      writeFileSync(path.join(TEST_DIR, "clip 2 with spaces.mov"), "data");
      writeFileSync(path.join(TEST_DIR, "notes.txt"), "text");
      writeFileSync(path.join(TEST_DIR, "image.png"), "png");

      const { videos, collisionErrors } = discoverVideos(TEST_DIR);
      expect(collisionErrors).toHaveLength(0);
      expect(videos).toHaveLength(2);

      expect(videos[0]?.baseName).toBe("clip 2 with spaces");
      expect(videos[0]?.stem).toBe("clip_2_with_spaces");
      expect(videos[0]?.outputFileName).toBe("clip 2 with spaces.mp4");

      expect(videos[1]?.baseName).toBe("clip1");
      expect(videos[1]?.stem).toBe("clip1");
      expect(videos[1]?.outputFileName).toBe("clip1.mp4");
    });

    it("detects and flags stem collisions", () => {
      // Both "clip a.mp4" and "clip_a.mp4" sanitize to "clip_a"
      writeFileSync(path.join(TEST_DIR, "clip a.mp4"), "data1");
      writeFileSync(path.join(TEST_DIR, "clip_a.mp4"), "data2");

      const { videos, collisionErrors } = discoverVideos(TEST_DIR);
      expect(collisionErrors).toHaveLength(1);
      expect(collisionErrors[0]).toContain("Stem collision");
      expect(videos).toHaveLength(1);
    });
  });

  describe("printSummaryTable and exit codes", () => {
    it("returns 0 when all items succeed", () => {
      const results: VideoResult[] = [
        {
          inputFile: "a.mp4",
          duration: "3.0s",
          transcribeStatus: "DONE",
          renderStatus: "DONE",
          totalTime: "10s",
          outputOrError: "out/a.mp4",
          kind: "done",
        },
        {
          inputFile: "b.mp4",
          duration: "-",
          transcribeStatus: "CACHED",
          renderStatus: "CACHED",
          totalTime: "0s",
          outputOrError: "out/b.mp4 (skipped)",
          kind: "skip",
        },
      ];

      const exitCode = printSummaryTable(results, []);
      expect(exitCode).toBe(0);
    });

    it("returns 1 when some items succeed and some fail", () => {
      const results: VideoResult[] = [
        {
          inputFile: "good.mp4",
          duration: "3.0s",
          transcribeStatus: "DONE",
          renderStatus: "DONE",
          totalTime: "10s",
          outputOrError: "out/good.mp4",
          kind: "done",
        },
        {
          inputFile: "bad.mp4",
          duration: "-",
          transcribeStatus: "FAIL",
          renderStatus: "-",
          totalTime: "1s",
          outputOrError: "probe failed",
          kind: "fail",
        },
      ];

      const exitCode = printSummaryTable(results, []);
      expect(exitCode).toBe(1);
    });

    it("returns 2 when all items fail", () => {
      const results: VideoResult[] = [
        {
          inputFile: "bad1.mp4",
          duration: "-",
          transcribeStatus: "FAIL",
          renderStatus: "-",
          totalTime: "1s",
          outputOrError: "corrupt file",
          kind: "fail",
        },
      ];

      const exitCode = printSummaryTable(results, []);
      expect(exitCode).toBe(2);
    });

    it("returns 2 on collisions with no successes", () => {
      const exitCode = printSummaryTable([], ["Stem collision between clip-a and clip_a"]);
      expect(exitCode).toBe(2);
    });
  });
});

import { readFileSync } from "node:fs";
