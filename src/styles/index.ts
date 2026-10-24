import { getLook, lookToStyleTokens } from "../looks";
import type { LookId, StyleName, StyleTokens } from "../types";

export function getStyle(name: string): { style: StyleTokens; warning: string | null } {
  if (name === "pop" || name === "editorial" || name === "poster") {
    return { style: lookToStyleTokens(name as LookId), warning: null };
  }
  return { style: lookToStyleTokens("pop"), warning: `Unknown style "${name}"; falling back to "pop".` };
}

export const STYLES: Record<StyleName, StyleTokens> = {
  pop: lookToStyleTokens("pop"),
  editorial: lookToStyleTokens("editorial"),
  poster: lookToStyleTokens("poster"),
};
