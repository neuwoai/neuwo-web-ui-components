import { injectFonts } from "./core/fonts.js";
import "./components/button/neuwo-button.js"; // self-registers <neuwo-button>
import "./components/fields/input/neuwo-input.js"; // self-registers <neuwo-input>

injectFonts();

export { NeuwoButton } from "./components/button/neuwo-button.js";
export { NeuwoInput } from "./components/fields/input/neuwo-input.js";
