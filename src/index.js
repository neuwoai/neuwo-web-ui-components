import { injectFonts } from "./core/fonts.js";
import "./components/button/neuwo-button.js"; // self-registers <neuwo-button>
import "./components/fields/input/neuwo-input.js"; // self-registers <neuwo-input>
import "./components/fields/textarea/neuwo-textarea.js"; // self-registers <neuwo-textarea>
import "./components/fields/select/neuwo-select.js"; // self-registers <neuwo-select>
import "./components/fields/combobox/neuwo-combobox.js"; // self-registers <neuwo-combobox>
import "./components/selection/checkbox/neuwo-checkbox.js"; // self-registers <neuwo-checkbox>
import "./components/selection/toggle/neuwo-toggle.js"; // self-registers <neuwo-toggle>

injectFonts();

export { NeuwoButton } from "./components/button/neuwo-button.js";
export { NeuwoInput } from "./components/fields/input/neuwo-input.js";
export { NeuwoTextarea } from "./components/fields/textarea/neuwo-textarea.js";
export { NeuwoSelect } from "./components/fields/select/neuwo-select.js";
export { NeuwoCombobox } from "./components/fields/combobox/neuwo-combobox.js";
export { NeuwoCheckbox } from "./components/selection/checkbox/neuwo-checkbox.js";
export { NeuwoToggle } from "./components/selection/toggle/neuwo-toggle.js";
