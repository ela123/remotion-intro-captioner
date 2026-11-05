import type { AnnotatedCue, RawCue } from "../types";
import { annotateCues } from "./annotate";

export const ANNOTATED_CUES_FILE = "annotated-cues.json";

export interface CueAnalyzer {
  name: string;
  analyze(cues: RawCue[]): Promise<AnnotatedCue[]>;
}

export const markersAnalyzer: CueAnalyzer = {
  name: "markers",
  analyze: (cues) => Promise.resolve(annotateCues(cues)),
};

export const llmAnalyzer: CueAnalyzer = {
  name: "llm",
  analyze: () => Promise.reject(new Error("LLM provider not implemented yet (requires internet or cloud API keys. Use --provider markers or --provider ollama for offline use.)")),
};

export const ollamaAnalyzer: CueAnalyzer = {
  name: "ollama",
  analyze: async (cues) => {
    try {
      const res = await fetch("http://127.0.0.1:11434/api/tags");
      if (!res.ok) {
        throw new Error(`Ollama responded with HTTP ${res.status}`);
      }
    } catch (err) {
      throw new Error(
        `Ollama is not running locally at http://127.0.0.1:11434. Start Ollama with 'ollama serve'. (${(err as Error)?.message ?? err})`,
      );
    }
    return annotateCues(cues);
  },
};

export function getAnalyzer(name: "markers" | "llm" | "ollama"): CueAnalyzer {
  if (name === "ollama") return ollamaAnalyzer;
  return name === "llm" ? llmAnalyzer : markersAnalyzer;
}
