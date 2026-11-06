import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";
import { loadAllProjectFonts } from "./styles/fonts";

loadAllProjectFonts().catch(() => {});

registerRoot(RemotionRoot);
