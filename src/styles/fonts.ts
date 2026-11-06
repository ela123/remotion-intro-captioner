import { loadFont } from "@remotion/fonts";
import { cancelRender, staticFile } from "remotion";
import type { FontFamily } from "../types";

export type Loaded = { fontFamily: string; waitUntilDone: () => Promise<unknown> };

export const FAMILIES: Record<
  FontFamily,
  {
    name: string;
    fallback: string;
    load: (weights: number[], fontStyle?: "normal" | "italic") => Loaded;
  }
> = {
  "Lilita One": {
    name: "Lilita One",
    fallback: `"Impact", "Arial Black", sans-serif`,
    load: () => {
      const promise = loadFont({
        family: "Lilita One",
        url: staticFile("fonts/LilitaOne-Regular.woff2"),
        weight: "400",
        style: "normal",
      });
      return { fontFamily: "Lilita One", waitUntilDone: () => promise };
    },
  },
  "Bagel Fat One": {
    name: "Lilita One",
    fallback: `"Impact", "Arial Black", sans-serif`,
    load: () => {
      const promise = loadFont({
        family: "Lilita One",
        url: staticFile("fonts/LilitaOne-Regular.woff2"),
        weight: "400",
        style: "normal",
      });
      return { fontFamily: "Lilita One", waitUntilDone: () => promise };
    },
  },
  Fredoka: {
    name: "Fredoka",
    fallback: `"Arial Rounded MT Bold", "Nunito", sans-serif`,
    load: () => {
      const promise = loadFont({
        family: "Fredoka",
        url: staticFile("fonts/Fredoka-Variable.woff2"),
        weight: "300 700",
        style: "normal",
      });
      return { fontFamily: "Fredoka", waitUntilDone: () => promise };
    },
  },
  Fraunces: {
    name: "Fraunces",
    fallback: `"Georgia", "Times New Roman", serif`,
    load: (_weights, fontStyle = "normal") => {
      const isItalic = fontStyle === "italic";
      const promise = loadFont({
        family: "Fraunces",
        url: staticFile(
          isItalic ? "fonts/Fraunces-Italic-Variable.woff2" : "fonts/Fraunces-Normal-Variable.woff2",
        ),
        style: isItalic ? "italic" : "normal",
        weight: "100 900",
      });
      return { fontFamily: "Fraunces", waitUntilDone: () => promise };
    },
  },
  "DM Sans": {
    name: "DM Sans",
    fallback: `"Helvetica Neue", Arial, sans-serif`,
    load: () => {
      const promise = loadFont({
        family: "DM Sans",
        url: staticFile("fonts/DMSans-Variable.woff2"),
        weight: "100 900",
        style: "normal",
      });
      return { fontFamily: "DM Sans", waitUntilDone: () => promise };
    },
  },
  Anton: {
    name: "Anton",
    fallback: `"Impact", "Arial Black", "Trebuchet MS", sans-serif`,
    load: () => {
      const promise = loadFont({
        family: "Anton",
        url: staticFile("fonts/Anton-Regular.woff2"),
        weight: "400",
        style: "normal",
      });
      return { fontFamily: "Anton", waitUntilDone: () => promise };
    },
  },
  "Space Mono": {
    name: "Space Mono",
    fallback: `"Courier New", Courier, monospace`,
    load: (weights) => {
      const promises: Promise<void>[] = [
        loadFont({
          family: "Space Mono",
          url: staticFile("fonts/SpaceMono-Regular.woff2"),
          weight: "400",
          style: "normal",
        }),
      ];
      if (weights.includes(700)) {
        promises.push(
          loadFont({
            family: "Space Mono",
            url: staticFile("fonts/SpaceMono-Bold.woff2"),
            weight: "700",
            style: "normal",
          }),
        );
      }
      return {
        fontFamily: "Space Mono",
        waitUntilDone: () => Promise.all(promises),
      };
    },
  },
  Montserrat: {
    name: "Montserrat",
    fallback: `"Helvetica Neue", Arial, sans-serif`,
    load: (weights) => {
      const promises: Promise<void>[] = [];
      if (weights.includes(300)) {
        promises.push(loadFont({ family: "Montserrat", url: staticFile("fonts/Montserrat-Light.woff2"), weight: "300", style: "normal" }));
      }
      if (weights.includes(800)) {
        promises.push(loadFont({ family: "Montserrat", url: staticFile("fonts/Montserrat-ExtraBold.woff2"), weight: "800", style: "normal" }));
      }
      if (promises.length === 0 || weights.includes(400)) {
        promises.push(loadFont({ family: "Montserrat", url: staticFile("fonts/Montserrat-Regular.woff2"), weight: "400", style: "normal" }));
      }
      return { fontFamily: "Montserrat", waitUntilDone: () => Promise.all(promises) };
    },
  },
  Poppins: {
    name: "Poppins",
    fallback: `"Arial Rounded MT Bold", sans-serif`,
    load: (weights) => {
      const promises: Promise<void>[] = [];
      if (weights.includes(600)) {
        promises.push(loadFont({ family: "Poppins", url: staticFile("fonts/Poppins-SemiBold.woff2"), weight: "600", style: "normal" }));
      }
      if (promises.length === 0 || weights.includes(400)) {
        promises.push(loadFont({ family: "Poppins", url: staticFile("fonts/Poppins-Regular.woff2"), weight: "400", style: "normal" }));
      }
      return { fontFamily: "Poppins", waitUntilDone: () => Promise.all(promises) };
    },
  },
  Inter: {
    name: "Inter",
    fallback: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
    load: (weights) => {
      const promises: Promise<void>[] = [];
      if (weights.includes(300)) {
        promises.push(loadFont({ family: "Inter", url: staticFile("fonts/Inter-Light.woff2"), weight: "300", style: "normal" }));
      }
      if (weights.includes(500)) {
        promises.push(loadFont({ family: "Inter", url: staticFile("fonts/Inter-Medium.woff2"), weight: "500", style: "normal" }));
      }
      if (weights.includes(600)) {
        promises.push(loadFont({ family: "Inter", url: staticFile("fonts/Inter-SemiBold.woff2"), weight: "600", style: "normal" }));
      }
      if (promises.length === 0 || weights.includes(400)) {
        promises.push(loadFont({ family: "Inter", url: staticFile("fonts/Inter-Regular.woff2"), weight: "400", style: "normal" }));
      }
      return { fontFamily: "Inter", waitUntilDone: () => Promise.all(promises) };
    },
  },
  "Space Grotesk": {
    name: "Space Grotesk",
    fallback: `"Trebuchet MS", sans-serif`,
    load: (weights) => {
      const promises: Promise<void>[] = [];
      if (weights.includes(700)) {
        promises.push(loadFont({ family: "Space Grotesk", url: staticFile("fonts/SpaceGrotesk-Bold.woff2"), weight: "700", style: "normal" }));
      }
      if (promises.length === 0 || weights.includes(500)) {
        promises.push(loadFont({ family: "Space Grotesk", url: staticFile("fonts/SpaceGrotesk-Medium.woff2"), weight: "500", style: "normal" }));
      }
      return { fontFamily: "Space Grotesk", waitUntilDone: () => Promise.all(promises) };
    },
  },
  "JetBrains Mono": {
    name: "JetBrains Mono",
    fallback: `"Courier New", Courier, monospace`,
    load: (weights) => {
      const promises: Promise<void>[] = [];
      if (weights.includes(500)) {
        promises.push(loadFont({ family: "JetBrains Mono", url: staticFile("fonts/JetBrainsMono-Medium.woff2"), weight: "500", style: "normal" }));
      }
      if (promises.length === 0 || weights.includes(400)) {
        promises.push(loadFont({ family: "JetBrains Mono", url: staticFile("fonts/JetBrainsMono-Regular.woff2"), weight: "400", style: "normal" }));
      }
      return { fontFamily: "JetBrains Mono", waitUntilDone: () => Promise.all(promises) };
    },
  },
  "Playfair Display": {
    name: "Playfair Display",
    fallback: `"Georgia", "Times New Roman", serif`,
    load: (weights, fontStyle = "normal") => {
      const promises: Promise<void>[] = [];
      if (fontStyle === "italic") {
        promises.push(loadFont({ family: "Playfair Display", url: staticFile("fonts/PlayfairDisplay-Italic.woff2"), weight: "400", style: "italic" }));
      } else {
        if (weights.includes(700)) {
          promises.push(loadFont({ family: "Playfair Display", url: staticFile("fonts/PlayfairDisplay-Bold.woff2"), weight: "700", style: "normal" }));
        }
        if (promises.length === 0 || weights.includes(400)) {
          promises.push(loadFont({ family: "Playfair Display", url: staticFile("fonts/PlayfairDisplay-Regular.woff2"), weight: "400", style: "normal" }));
        }
      }
      return { fontFamily: "Playfair Display", waitUntilDone: () => Promise.all(promises) };
    },
  },
};

let fontLoadingPromise: Promise<void> | null = null;

export async function loadAllProjectFonts(): Promise<void> {
  if (typeof document === "undefined") return;
  if (fontLoadingPromise) return fontLoadingPromise;

  fontLoadingPromise = (async () => {
    try {
      await Promise.all([
        loadFont({
          family: "Lilita One",
          url: staticFile("fonts/LilitaOne-Regular.woff2"),
          weight: "400",
          style: "normal",
        }),
        loadFont({
          family: "Fredoka",
          url: staticFile("fonts/Fredoka-Variable.woff2"),
          weight: "300 700",
          style: "normal",
        }),
        loadFont({
          family: "Fraunces",
          url: staticFile("fonts/Fraunces-Normal-Variable.woff2"),
          weight: "100 900",
          style: "normal",
        }),
        loadFont({
          family: "Fraunces",
          url: staticFile("fonts/Fraunces-Italic-Variable.woff2"),
          weight: "100 900",
          style: "italic",
        }),
        loadFont({
          family: "DM Sans",
          url: staticFile("fonts/DMSans-Variable.woff2"),
          weight: "100 900",
          style: "normal",
        }),
        loadFont({
          family: "Anton",
          url: staticFile("fonts/Anton-Regular.woff2"),
          weight: "400",
          style: "normal",
        }),
        loadFont({
          family: "Space Mono",
          url: staticFile("fonts/SpaceMono-Regular.woff2"),
          weight: "400",
          style: "normal",
        }),
        loadFont({
          family: "Space Mono",
          url: staticFile("fonts/SpaceMono-Bold.woff2"),
          weight: "700",
          style: "normal",
        }),
        loadFont({
          family: "Montserrat",
          url: staticFile("fonts/Montserrat-Light.woff2"),
          weight: "300",
          style: "normal",
        }),
        loadFont({
          family: "Montserrat",
          url: staticFile("fonts/Montserrat-Regular.woff2"),
          weight: "400",
          style: "normal",
        }),
        loadFont({
          family: "Montserrat",
          url: staticFile("fonts/Montserrat-ExtraBold.woff2"),
          weight: "800",
          style: "normal",
        }),
        loadFont({
          family: "Poppins",
          url: staticFile("fonts/Poppins-Regular.woff2"),
          weight: "400",
          style: "normal",
        }),
        loadFont({
          family: "Poppins",
          url: staticFile("fonts/Poppins-SemiBold.woff2"),
          weight: "600",
          style: "normal",
        }),
        loadFont({
          family: "Inter",
          url: staticFile("fonts/Inter-Light.woff2"),
          weight: "300",
          style: "normal",
        }),
        loadFont({
          family: "Inter",
          url: staticFile("fonts/Inter-Regular.woff2"),
          weight: "400",
          style: "normal",
        }),
        loadFont({
          family: "Inter",
          url: staticFile("fonts/Inter-Medium.woff2"),
          weight: "500",
          style: "normal",
        }),
        loadFont({
          family: "Inter",
          url: staticFile("fonts/Inter-SemiBold.woff2"),
          weight: "600",
          style: "normal",
        }),
        loadFont({
          family: "Space Grotesk",
          url: staticFile("fonts/SpaceGrotesk-Medium.woff2"),
          weight: "500",
          style: "normal",
        }),
        loadFont({
          family: "Space Grotesk",
          url: staticFile("fonts/SpaceGrotesk-Bold.woff2"),
          weight: "700",
          style: "normal",
        }),
        loadFont({
          family: "JetBrains Mono",
          url: staticFile("fonts/JetBrainsMono-Regular.woff2"),
          weight: "400",
          style: "normal",
        }),
        loadFont({
          family: "JetBrains Mono",
          url: staticFile("fonts/JetBrainsMono-Medium.woff2"),
          weight: "500",
          style: "normal",
        }),
        loadFont({
          family: "Playfair Display",
          url: staticFile("fonts/PlayfairDisplay-Regular.woff2"),
          weight: "400",
          style: "normal",
        }),
        loadFont({
          family: "Playfair Display",
          url: staticFile("fonts/PlayfairDisplay-Bold.woff2"),
          weight: "700",
          style: "normal",
        }),
        loadFont({
          family: "Playfair Display",
          url: staticFile("fonts/PlayfairDisplay-Italic.woff2"),
          weight: "400",
          style: "italic",
        }),
      ]);

      if (typeof document !== "undefined" && document.fonts?.ready) {
        await document.fonts.ready;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      cancelRender(err);
      throw err;
    }
  })();

  return fontLoadingPromise;
}

export function fontFamilyCss(family: FontFamily): string {
  const info = FAMILIES[family] ?? FAMILIES["Lilita One"];
  return `"${info.name}", ${info.fallback}`;
}
