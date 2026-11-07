import type React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { config } from "../intro.config";
import type { Quality } from "../types";

/**
 * Background — THERMAL visual identity
 *
 * Layers (bottom-to-top):
 *   1. Footage video
 *   2. Warm cinematic depth scrim (bottom-to-centre)
 *   3. Subtle cool-toned top header scrim
 *   4. Classic film-vignette radial gradient
 *   5. Warm amber light pool (bottom centre)
 *   6. Faint grain texture (final quality only)
 */
export const Background: React.FC<{ quality: Quality; hasProxy: boolean }> = ({ quality, hasProxy }) => {
  const file = quality === "preview" && hasProxy ? config.proxyVideo : config.video;

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#080A12" }}>

      {/* ── 1. Primary footage ── */}
      <OffthreadVideo
        src={staticFile(file)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* ── 2. Cinematic bottom depth scrim (warm-tinted dark gradient) ── */}
      <div
        style={{
          position:    "absolute",
          inset:       0,
          background:  `linear-gradient(to top,
            rgba(8, 6, 4, 0.92)   0%,
            rgba(10, 8, 5, 0.70)  22%,
            rgba(12, 9, 6, 0.38)  48%,
            rgba(0, 0, 0, 0)      70%)`,
          pointerEvents: "none",
        }}
      />

      {/* ── 3. Cool top header scrim (desaturated, keeps attention on content) ── */}
      <div
        style={{
          position:    "absolute",
          top:         0,
          left:        0,
          right:       0,
          height:      "22%",
          background:  "linear-gradient(to bottom, rgba(5,7,14,0.50) 0%, rgba(0,0,0,0) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* ── 4. Classic film vignette ── */}
      <div
        style={{
          position:    "absolute",
          inset:       0,
          background:  "radial-gradient(ellipse at 50% 50%, transparent 42%, rgba(0,0,0,0.52) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* ── 5. Warm amber glow pool at bottom centre ── */}
      <div
        style={{
          position:    "absolute",
          bottom:      0,
          left:        "10%",
          right:       "10%",
          height:      "40%",
          background:  "radial-gradient(ellipse at 50% 100%, rgba(245,158,11,0.07) 0%, rgba(255,107,107,0.03) 40%, transparent 72%)",
          pointerEvents: "none",
        }}
      />

      {/* ── 6. Film-grain overlay (final render only) ── */}
      {quality === "final" && (
        <div
          style={{
            position:          "absolute",
            inset:             0,
            backgroundImage:   "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
            backgroundRepeat:  "repeat",
            backgroundSize:    "128px 128px",
            opacity:           0.028,
            mixBlendMode:      "overlay",
            pointerEvents:     "none",
          }}
        />
      )}

    </AbsoluteFill>
  );
};
