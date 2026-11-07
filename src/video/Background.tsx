import type React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { config } from "../intro.config";
import type { Quality } from "../types";

export const Background: React.FC<{ quality: Quality; hasProxy: boolean }> = ({ quality, hasProxy }) => {
  const file = quality === "preview" && hasProxy ? config.proxyVideo : config.video;
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#080A12" }}>
      {/* Primary Footage Video Layer */}
      <OffthreadVideo src={staticFile(file)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />

      {/* 1. Cinematic Multi-Stop Bottom Depth Scrim for Ultra-Crisp Caption Contrast */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(8, 10, 18, 0.88) 0%, rgba(8, 10, 18, 0.62) 28%, rgba(8, 10, 18, 0.22) 52%, rgba(8, 10, 18, 0) 75%)",
          pointerEvents: "none",
        }}
      />

      {/* 2. Subtle Top Header Scrim */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "25%",
          background: "linear-gradient(to bottom, rgba(8, 10, 18, 0.42) 0%, rgba(8, 10, 18, 0) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* 3. Subtle Radial Studio Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.45) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* 4. Atmospheric Ambient Neon Glow Pool */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "15%",
          right: "15%",
          height: "35%",
          background: "radial-gradient(ellipse at 50% 100%, rgba(0, 240, 255, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
