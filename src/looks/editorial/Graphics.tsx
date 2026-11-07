import React, { useMemo } from "react";
import { fontFamilyCss } from "../../styles/fonts";
import { expoOut } from "../../utils/ease";
import { EDITORIAL_PALETTE } from "./preset";
import type { Quality } from "../../types";
import type { ChunkLayout } from "../../template/word-layout";

type EditorialGraphicsProps = {
  chunkLayout: ChunkLayout;
  frame: number;
  fps: number;
  unit: number;
  quality: Quality;
  chunkIndexInRun?: number;
};

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const EditorialGraphics: React.FC<EditorialGraphicsProps> = ({
  chunkLayout,
  frame,
  fps,
  unit,
  chunkIndexInRun = 1,
}) => {
  const { startFrame, bounds } = chunkLayout;
  const paper     = EDITORIAL_PALETTE.paper;
  const champagne = EDITORIAL_PALETTE.champagne;
  const sapphire  = EDITORIAL_PALETTE.sapphire;

  const heroWord = useMemo(() => {
    for (const line of chunkLayout.lines) {
      for (const w of line.words) {
        if (w.role === "hero") return w;
      }
    }
    return null;
  }, [chunkLayout]);

  // ── Entrance timing ────────────────────────────────────────────────────────
  const age       = frame - startFrame;
  const enterProg = clamp01(age / 12);
  const enterEase = expoOut(enterProg);

  // ── Backplate dimensions ───────────────────────────────────────────────────
  const padX     = 28 * unit;
  const padY     = 20 * unit;
  const cardLeft = bounds.x - padX;
  const cardTop  = bounds.y - padY;
  const cardW    = bounds.width + padX * 2;
  const cardH    = bounds.height + padY * 2;

  const indexStr    = String(chunkIndexInRun).padStart(2, "0");
  const monoFont    = fontFamilyCss("DM Sans");
  const serifFont   = fontFamilyCss("Fraunces");

  // ── Speech activity ────────────────────────────────────────────────────────
  const isSpeechActive = useMemo(() => {
    for (const line of chunkLayout.lines) {
      for (const w of line.words) {
        const wS = Math.round(w.start * fps);
        const wE = Math.round(w.end * fps);
        if (frame >= wS && frame <= wE + 1) return true;
      }
    }
    return false;
  }, [chunkLayout, frame, fps]);

  // ── Sapphire rule width — expands to fit longest line ─────────────────────
  const ruleW = Math.min(cardW - 32 * unit, 320 * unit);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>

      {/* ── 1. Obsidian glass backplate ── */}
      <div
        style={{
          position:        "absolute",
          left:            `${cardLeft}px`,
          top:             `${cardTop}px`,
          width:           `${cardW}px`,
          height:          `${cardH}px`,
          background:      "linear-gradient(160deg, rgba(10,12,18,0.82) 0%, rgba(14,16,24,0.90) 100%)",
          backdropFilter:  "blur(16px)",
          borderRadius:    `${13 * unit}px`,
          border:          "1px solid rgba(255,255,255,0.10)",
          boxShadow:       `0 24px 50px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.14)`,
          opacity:         enterEase * 0.96,
          transform:       `scale(${0.97 + enterEase * 0.03})`,
          transformOrigin: "center center",
          zIndex:          0,
        }}
      />

      {/* ── 2. Warm spotlight behind text ── */}
      <div
        style={{
          position:  "absolute",
          left:      `${bounds.x + bounds.width / 2}px`,
          top:       `${bounds.y + bounds.height / 2}px`,
          width:     `${bounds.width * 1.4}px`,
          height:    `${bounds.height * 1.6}px`,
          transform: "translate(-50%,-50%)",
          background:"radial-gradient(ellipse at center, rgba(232,200,122,0.10) 0%, transparent 68%)",
          opacity:   enterEase,
          zIndex:    0,
        }}
      />

      {/* ── 3. Sapphire-to-champagne hairline rule above card ── */}
      <div
        style={{
          position:        "absolute",
          left:            `${cardLeft + 16 * unit}px`,
          top:             `${cardTop - 10 * unit}px`,
          width:           `${ruleW}px`,
          height:          `${Math.max(1, 1.5 * unit)}px`,
          background:      `linear-gradient(90deg, ${sapphire}, ${champagne})`,
          transformOrigin: "left center",
          transform:       `scaleX(${enterEase})`,
          boxShadow:       `0 0 ${8 * unit}px rgba(59,130,246,0.45)`,
          opacity:         0.9,
          zIndex:          1,
        }}
      />

      {/* ── 4. Thin accent bar on left edge of card ── */}
      <div
        style={{
          position:        "absolute",
          left:            `${cardLeft}px`,
          top:             `${cardTop + 12 * unit}px`,
          width:           `${Math.max(1.5, 2 * unit)}px`,
          height:          `${(cardH - 24 * unit) * enterEase}px`,
          background:      `linear-gradient(to bottom, ${sapphire}, ${champagne})`,
          borderRadius:    `${1 * unit}px`,
          boxShadow:       `0 0 ${7 * unit}px rgba(59,130,246,0.4)`,
          opacity:         0.75,
          zIndex:          1,
        }}
      />

      {/* ── 5. Chapter index marker (e.g. "03") ── */}
      <div
        style={{
          position:      "absolute",
          left:          `${cardLeft + 16 * unit}px`,
          top:           `${cardTop - 34 * unit}px`,
          display:       "flex",
          alignItems:    "center",
          gap:           `${6 * unit}px`,
          fontFamily:    monoFont,
          fontSize:      `${11 * unit}px`,
          fontWeight:    600,
          color:         champagne,
          letterSpacing: "0.18em",
          opacity:       enterEase * 0.9,
          zIndex:        1,
        }}
      >
        <span style={{ color: sapphire }}>§</span>
        <span style={{ textTransform: "uppercase" }}>{`Beat ${indexStr}`}</span>
      </div>

      {/* ── 6. Live indicator dot (top-right of card) ── */}
      <div
        style={{
          position:  "absolute",
          left:      `${cardLeft + cardW - 22 * unit}px`,
          top:       `${cardTop + 10 * unit}px`,
          width:     `${6 * unit}px`,
          height:    `${6 * unit}px`,
          borderRadius: "50%",
          backgroundColor: isSpeechActive ? sapphire : champagne,
          boxShadow:  `0 0 ${8 * unit}px ${isSpeechActive ? sapphire : champagne}`,
          opacity:    enterEase * (isSpeechActive ? 1 : 0.5),
          zIndex:     2,
        }}
      />

    </div>
  );
};
