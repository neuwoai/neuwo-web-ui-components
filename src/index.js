import { injectFonts } from "./core/fonts.js";
import "./components/button/neuwo-button.js"; // self-registers <neuwo-button>

injectFonts();

export { NeuwoButton } from "./components/button/neuwo-button.js";
