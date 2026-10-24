import type React from "react";
import { Composition, Folder } from "remotion";
import { SampleComposition } from "./sample/SampleRoot";
import { LayeredCaption } from "./template/LayeredCaption";
import { calculateCaptionMetadata } from "./video/metadata";
import type { CaptionProps } from "./types";

import { config } from "./intro.config";

const defaultProps: CaptionProps = {
  quality: "preview",
  style: "pop",
  looks: config.looks,
  debug: config.debug,
  safeMargin: 0.08,
  offsetY: 0,
  maxWordsPerLine: 4,
  maxLinesPerChunk: 2,
  cues: [],
  captionsDoc: null,
  error: null,
  warnings: [],
  hasProxy: false,
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="LayeredCaption"
      component={LayeredCaption}
      defaultProps={defaultProps}
      calculateMetadata={calculateCaptionMetadata}
    />
    <Folder name="Tools">
      <SampleComposition />
    </Folder>
  </>
);
