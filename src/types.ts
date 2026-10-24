export type LookId = "pop" | "editorial" | "poster";
export type StylePresetName = LookId;
export type StyleName = LookId;
export type StylePreset = LookId;

export type Quality = "preview" | "final";
export type SlotName = "A" | "B" | "C";
export type Direction = "top" | "bottom" | "left" | "right" | "none";
export type EaseName = "outExpo" | "outCubic" | "inCubic" | "inOutCubic" | "outBack";
export type SpringName = "soft" | "snappy" | "pop" | "bouncy";
export type MotionCurve = EaseName | SpringName;
export type VerticalAnchor = "top" | "center" | "bottom";
export type HorizontalAnchor = "left" | "center" | "right";
export type Align = "left" | "center" | "right";
export type AutoFlag = boolean | "auto";

export type FontFamily =
  | "Lilita One"
  | "Bagel Fat One"
  | "Fredoka"
  | "Fraunces"
  | "DM Sans"
  | "Anton"
  | "Space Mono";

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export type SrtWarning = {
  code:
    | "invalid-block"
    | "overlap"
    | "too-short"
    | "too-long"
    | "too-many-lines"
    | "line-too-long"
    | "beyond-video"
    | "reading-speed"
    | "unbalanced-marker"
    | "min-display-extended"
    | "fit";
  message: string;
  cueId?: number;
  line?: number;
};

/** Cue as written in the SRT: text lines keep their *emphasis* markers. */
export type RawCue = {
  id: number;
  startMs: number;
  endMs: number;
  lines: string[];
};

export type ParseResult = { cues: RawCue[]; warnings: SrtWarning[] };

export type AnnotatedWord = {
  text: string;
  emphasis?: boolean;
  startMs: number;
  endMs: number;
};

export type AnnotatedLine = { text: string; words: AnnotatedWord[] };

export type AnnotatedCue = {
  id: number;
  startMs: number;
  endMs: number;
  lines: AnnotatedLine[];
};

export type Enter = {
  from: Direction;
  distance: number | "offscreen";
  ease: MotionCurve;
  frames: number;
  delay: number;
  fade: boolean;
  scaleFrom?: number;
};

export type Exit = {
  to: Direction;
  ease: EaseName;
  frames: number;
  delay: number;
};

export type LineRecipe = {
  font: SlotName;
  enter: Enter;
  exit: Exit;
  motionBlur: boolean;
};

export type Recipe = {
  lines: [LineRecipe, LineRecipe, LineRecipe];
  anticipationFrames: number;
  exitOrder: "reverse" | "forward" | "together";
  settle: { overshoot: number; frames: number };
};

export type RecipeOverride = DeepPartial<Recipe>;

export type SlotTypography = {
  family: FontFamily;
  weight: number;
  sizeU: number;
  uppercase: boolean;
  trackingEm: number;
  color: string;
};

export type WordRole = "hero" | "accent" | "normal" | "connector";

export type RoleTypography = {
  family: FontFamily;
  weight: number;
  scale: number;
  uppercase: boolean;
  trackingEm: number;
  color: string;
  opacity?: number;
  fontStyle?: "normal" | "italic";
};

// Pop entrances
export type PopEntrance =
  | "sticker-slap"
  | "spin-pop"
  | "jelly"
  | "drop-bounce"
  | "pop"
  | "wiggle-in"
  | "fade-pop";

// Editorial entrances
export type EditorialEntrance =
  | "drop-through-mask"
  | "rise-mask"
  | "soft-drop"
  | "track-in";

// Poster entrances
export type PosterEntrance =
  | "stomp"
  | "bar-wipe-reveal"
  | "cut-in"
  | "type-on";

export type EntranceType =
  | PopEntrance
  | EditorialEntrance
  | PosterEntrance
  | "scale-pop"
  | "letter-stagger"
  | "rotate-in"
  | "mask-reveal"
  | "slide-up"
  | "blur-in"
  | "tracking-collapse"
  | "typewriter"
  | "slice-reveal"
  | "slide-left"
  | "slide-right"
  | (string & {});

export type PopEmphasis =
  | "marker-highlight"
  | "wobble"
  | "squash-bounce"
  | "doodle-underline"
  | "star-burst";

export type EditorialEmphasis =
  | "weight-swell"
  | "rule-draw"
  | "color-turn"
  | "italic-lean";

export type PosterEmphasis =
  | "invert-block"
  | "ghost-echo"
  | "karaoke-fill";

export type EmphasisEffect =
  | PopEmphasis
  | EditorialEmphasis
  | PosterEmphasis
  | "count-up"
  | "none"
  | "highlight-wipe"
  | "underline-draw"
  | "squiggle-draw"
  | "impact-punch"
  | "color-flash"
  | "glow-pulse"
  | "outline-fill"
  | "strike-through"
  | "float-breathe"
  | (string & {});

export type WordData = {
  text: string;
  start: number; // in seconds
  end: number;   // in seconds
  role: WordRole;
  effect?: EmphasisEffect | string;
  color?: string;
  fontKey?: FontFamily | string;
  scale?: number;
  entrance?: EntranceType | string;
};

export type LineData = {
  words: WordData[];
};

export type ChunkData = {
  start: number; // in seconds
  end: number;   // in seconds
  lines: LineData[];
};

export type CaptionsDoc = {
  chunks: ChunkData[];
};

export type EmphasisSpec = {
  pop: boolean;
  accentColor: string;
  underline: boolean;
  glowPulse: boolean;
};

export type StyleEffects = {
  scrim: boolean;
  shadow: boolean;
  depthLayer: boolean;
  glow: boolean;
  glitch: boolean;
  grain: boolean;
};

export type StyleTokens = {
  name: StyleName;
  slots: Record<SlotName, SlotTypography>;
  roles?: Record<WordRole, RoleTypography>;
  recipe: RecipeOverride;
  durationMultiplier: number;
  emphasis: EmphasisSpec;
  effects: StyleEffects;
};

export type ResolvedRecipe = Recipe & {
  style: StyleTokens;
  slotTypography: Record<SlotName, SlotTypography>;
};

export type Palette = {
  dominant: string;
  accent: string;
  dark: string;
  light: string;
};

export type LookPlanItem = {
  lookId: LookId;
  variant: 0 | 1 | 2;
  energy: number;
  decorBudget: number; // 1.0 or 0.5 (breathing)
  hasHook?: boolean;
};

export type LooksConfig = {
  enabled: LookId[];
  force: LookId | null;
  sequence: LookId[] | null;
  energy: number;
};

export type IntroConfig = {
  video: string;
  proxyVideo: string;
  srt: string;
  captionsJson?: string;
  srtOffsetMs: number;
  maxDurationSec: number;
  cueSource: "srt" | "json";
  looks: LooksConfig;
  debug: boolean;
  style: StylePreset;
  recipe: RecipeOverride;
  layout: {
    anchor: { vertical: VerticalAnchor; horizontal: HorizontalAnchor };
    align: Align;
    safeArea: { x: number; y: number };
    lineGap: number;
    offsetY?: number;
    maxWordsPerLine?: number;
    maxLinesPerChunk?: number;
  };
  palette: { enabled: boolean };
  effects: {
    scrim: boolean;
    shadow: boolean;
    depthLayer: AutoFlag;
    glow: AutoFlag;
    glitch: AutoFlag;
    grain: AutoFlag;
  };
  footageIsLight?: boolean;
  motionBlur: { enabled: boolean };
  drift: boolean;
  outputScale: number;
  render: { concurrency: number };
};

export type CaptionProps = {
  quality: Quality;
  style?: StylePreset;
  looks?: LooksConfig;
  debug?: boolean;
  safeMargin?: number;
  offsetY?: number;
  maxWordsPerLine?: number;
  maxLinesPerChunk?: number;
  cues: AnnotatedCue[];
  captionsDoc?: CaptionsDoc | null;
  error: string | null;
  warnings: string[];
  hasProxy: boolean;
};
