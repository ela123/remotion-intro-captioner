import { fontFamily as antonFamily, loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { fontFamily as dmSansFamily, loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
import { fontFamily as frauncesFamily, loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { fontFamily as fredokaFamily, loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { fontFamily as lilitaOneFamily, loadFont as loadLilitaOne } from "@remotion/google-fonts/LilitaOne";
import { fontFamily as spaceMonoFamily, loadFont as loadSpaceMono } from "@remotion/google-fonts/SpaceMono";
import type { FontFamily } from "../types";

type Loaded = { fontFamily: string; waitUntilDone: () => Promise<unknown> };

export const FAMILIES: Record<FontFamily, { name: string; fallback: string; load: (weights: number[], fontStyle?: "normal" | "italic") => Loaded }> = {
  "Lilita One": {
    name: lilitaOneFamily,
    fallback: `"Impact", "Arial Black", sans-serif`,
    load: (weights) => loadLilitaOne("normal", { weights: weights.map(String) as any, subsets: ["latin"] }),
  },
  "Bagel Fat One": {
    name: lilitaOneFamily,
    fallback: `"Impact", "Arial Black", sans-serif`,
    load: (weights) => loadLilitaOne("normal", { weights: weights.map(String) as any, subsets: ["latin"] }),
  },
  Fredoka: {
    name: fredokaFamily,
    fallback: `"Arial Rounded MT Bold", "Nunito", sans-serif`,
    load: (weights) => loadFredoka("normal", { weights: weights.map(String) as any, subsets: ["latin"] }),
  },
  Fraunces: {
    name: frauncesFamily,
    fallback: `"Georgia", "Times New Roman", serif`,
    load: (weights, fontStyle = "normal") => loadFraunces(fontStyle as any, { weights: weights.map(String) as any, subsets: ["latin"] }),
  },
  "DM Sans": {
    name: dmSansFamily,
    fallback: `"Helvetica Neue", Arial, sans-serif`,
    load: (weights) => loadDMSans("normal", { weights: weights.map(String) as any, subsets: ["latin"] }),
  },
  Anton: {
    name: antonFamily,
    fallback: `"Impact", "Arial Black", "Trebuchet MS", sans-serif`,
    load: (weights) => loadAnton("normal", { weights: weights.map(String) as any, subsets: ["latin"] }),
  },
  "Space Mono": {
    name: spaceMonoFamily,
    fallback: `"Courier New", Courier, monospace`,
    load: (weights) => loadSpaceMono("normal", { weights: weights.map(String) as any, subsets: ["latin"] }),
  },
};

export async function loadAllProjectFonts(): Promise<void> {
  const loads: Loaded[] = [
    FAMILIES["Lilita One"].load([400]),
    FAMILIES.Fredoka.load([500, 600, 700]),
    FAMILIES.Fraunces.load([400, 600], "normal"),
    FAMILIES.Fraunces.load([700, 900], "italic"),
    FAMILIES["DM Sans"].load([500]),
    FAMILIES.Anton.load([400]),
    FAMILIES["Space Mono"].load([400]),
  ];

  await Promise.all(
    loads.map((loaded) =>
      loaded.waitUntilDone().catch((err) => {
        console.warn(`Font load fallback warning: ${(err as Error)?.message ?? err}`);
      }),
    ),
  );
}

export function fontFamilyCss(family: FontFamily): string {
  const info = FAMILIES[family] ?? FAMILIES["Lilita One"];
  return `"${info.name}", ${info.fallback}`;
}
