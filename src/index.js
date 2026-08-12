import { injectFonts } from "./core/fonts.js";
import "./components/button/neuwo-button.js"; // self-registers <neuwo-button>
import "./components/fields/input/neuwo-input.js"; // self-registers <neuwo-input>
import "./components/fields/textarea/neuwo-textarea.js"; // self-registers <neuwo-textarea>
import "./components/fields/select/neuwo-select.js"; // self-registers <neuwo-select>
import "./components/fields/combobox/neuwo-combobox.js"; // self-registers <neuwo-combobox>
import "./components/fields/range/neuwo-range.js"; // self-registers <neuwo-range>
import "./components/selection/checkbox/neuwo-checkbox.js"; // self-registers <neuwo-checkbox>
import "./components/selection/toggle/neuwo-toggle.js"; // self-registers <neuwo-toggle>
import "./components/selection/radio/neuwo-radio.js"; // self-registers <neuwo-radio>
import "./components/selection/radio/neuwo-radio-group.js"; // self-registers <neuwo-radio-group>
import "./components/selection/segmented/neuwo-segmented.js"; // self-registers <neuwo-segmented>
import "./components/badge/neuwo-badge.js"; // self-registers <neuwo-badge>
import "./components/deal-id/neuwo-deal-id.js"; // self-registers <neuwo-deal-id>
import "./components/status-dot/neuwo-status-dot.js"; // self-registers <neuwo-status-dot>
import "./components/cta/neuwo-cta.js"; // self-registers <neuwo-cta>
import "./components/notice/neuwo-notice.js"; // self-registers <neuwo-notice>

injectFonts();

export { NeuwoButton } from "./components/button/neuwo-button.js";
export { NeuwoInput } from "./components/fields/input/neuwo-input.js";
export { NeuwoTextarea } from "./components/fields/textarea/neuwo-textarea.js";
export { NeuwoSelect } from "./components/fields/select/neuwo-select.js";
export { NeuwoCombobox } from "./components/fields/combobox/neuwo-combobox.js";
export { NeuwoRange } from "./components/fields/range/neuwo-range.js";
export { NeuwoCheckbox } from "./components/selection/checkbox/neuwo-checkbox.js";
export { NeuwoToggle } from "./components/selection/toggle/neuwo-toggle.js";
export { NeuwoRadio } from "./components/selection/radio/neuwo-radio.js";
export { NeuwoRadioGroup } from "./components/selection/radio/neuwo-radio-group.js";
export { NeuwoSegmented } from "./components/selection/segmented/neuwo-segmented.js";
export { NeuwoBadge } from "./components/badge/neuwo-badge.js";
export { NeuwoDealId } from "./components/deal-id/neuwo-deal-id.js";
export { NeuwoStatusDot } from "./components/status-dot/neuwo-status-dot.js";
export { NeuwoCta } from "./components/cta/neuwo-cta.js";
export { NeuwoNotice } from "./components/notice/neuwo-notice.js";
