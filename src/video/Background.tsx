import type React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { config } from "../intro.config";
import type { Quality } from "../types";

export const Background: React.FC<{ quality: Quality; hasProxy: boolean }> = ({ quality, hasProxy }) => {
  const file = quality === "preview" && hasProxy ? config.proxyVideo : config.video;
  return (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile(file)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
};
