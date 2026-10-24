import { getRemotionEnvironment, type CalculateMetadataFunction } from "remotion";
import { config } from "../intro.config";
import { resolveActiveStyle } from "../template/active-style";
import { scheduleCues } from "../template/schedule";
import type { CaptionProps, SrtWarning } from "../types";
import { loadCues } from "./cues";
import { InputError } from "./errors";
import { checkProxy, readVideo, type VideoInfo } from "./media";

const FALLBACK = { width: 1920, height: 1080, fps: 30, durationInFrames: 150 } as const;

const formatWarning = (w: SrtWarning): string => `[${w.code}] ${w.message}`;

function cappedDuration(video: VideoInfo, maxDurationSec: number): { durationInFrames: number; warning: string | null } {
  const videoFrames = Math.round(video.durationInSeconds * video.fps);
  const capFrames = Math.floor(maxDurationSec * video.fps);
  const warning =
    videoFrames > capFrames
      ? `The video is ${video.durationInSeconds.toFixed(2)} s long; trimmed to maxDurationSec (${maxDurationSec} s).`
      : null;
  return { durationInFrames: Math.max(1, Math.min(videoFrames, capFrames)), warning };
}

export const calculateCaptionMetadata: CalculateMetadataFunction<CaptionProps> = async ({ props, abortSignal }) => {
  const warnings: string[] = [];
  try {
    const video = await readVideo(abortSignal);
    const { fps } = video;
    const { durationInFrames, warning: trimWarning } = cappedDuration(video, config.maxDurationSec);
    if (trimWarning) warnings.push(trimWarning);

    const { cues, captionsDoc, warnings: cueWarnings } = await loadCues((durationInFrames / fps) * 1000, abortSignal);
    const styleName = props.style ?? config.style;
    const active = resolveActiveStyle({ ...config, style: styleName });
    if (active.warning) warnings.push(active.warning);
    const scheduled = scheduleCues(cues, active.recipe, fps);
    warnings.push(...[...cueWarnings, ...scheduled.warnings].map(formatWarning));

    const proxy = props.quality === "final" ? { hasProxy: false, warning: null } : await checkProxy(video, abortSignal);
    if (proxy.warning) warnings.push(proxy.warning);
    warnings.forEach((w) => console.warn(w));

    return {
      width: video.width,
      height: video.height,
      fps,
      durationInFrames,
      props: {
        ...props,
        cues,
        captionsDoc: props.captionsDoc ?? captionsDoc ?? null,
        style: styleName,
        looks: props.looks ?? config.looks,
        debug: props.debug ?? config.debug,
        safeMargin: props.safeMargin ?? config.layout.safeArea.x,
        offsetY: props.offsetY ?? config.layout.offsetY ?? 0,
        maxWordsPerLine: props.maxWordsPerLine ?? config.layout.maxWordsPerLine ?? 5,
        maxLinesPerChunk: props.maxLinesPerChunk ?? config.layout.maxLinesPerChunk ?? 3,
        error: null,
        warnings,
        hasProxy: proxy.hasProxy,
      },
    };
  } catch (err) {
    if (!(err instanceof InputError)) throw err;
    if (getRemotionEnvironment().isRendering) throw new Error(`${err.message.replace(/\.$/, "")}, then render again.`);
    return {
      ...FALLBACK,
      props: {
        ...props,
        cues: [],
        captionsDoc: null,
        error: err.message,
        warnings,
        hasProxy: false,
      },
    };
  }
};
