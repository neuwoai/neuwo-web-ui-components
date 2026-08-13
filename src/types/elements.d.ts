// Hand-authored package type entry. Re-exports the generated class declarations
// and augments the global tag map. Keep the map in lockstep with src/index.js:
// a new neuwo-* tag with no entry here ships untyped.
export * from "../index.js";

import type { NeuwoButton } from "../components/button/neuwo-button.js";
import type { NeuwoDropdown } from "../components/dropdown/neuwo-dropdown.js";
import type { NeuwoInput } from "../components/fields/input/neuwo-input.js";
import type { NeuwoTextarea } from "../components/fields/textarea/neuwo-textarea.js";
import type { NeuwoCombobox } from "../components/fields/combobox/neuwo-combobox.js";
import type { NeuwoRange } from "../components/fields/range/neuwo-range.js";
import type { NeuwoCheckbox } from "../components/selection/checkbox/neuwo-checkbox.js";
import type { NeuwoToggle } from "../components/selection/toggle/neuwo-toggle.js";
import type { NeuwoRadio } from "../components/selection/radio/neuwo-radio.js";
import type { NeuwoRadioGroup } from "../components/selection/radio/neuwo-radio-group.js";
import type { NeuwoSegmented } from "../components/selection/segmented/neuwo-segmented.js";
import type { NeuwoBadge } from "../components/badge/neuwo-badge.js";
import type { NeuwoDealId } from "../components/deal-id/neuwo-deal-id.js";
import type { NeuwoStatusDot } from "../components/status-dot/neuwo-status-dot.js";
import type { NeuwoCta } from "../components/cta/neuwo-cta.js";
import type { NeuwoNotice } from "../components/notice/neuwo-notice.js";
import type { NeuwoLogo } from "../components/logo/neuwo-logo.js";

declare global {
  interface HTMLElementTagNameMap {
    "neuwo-button": NeuwoButton;
    "neuwo-dropdown": NeuwoDropdown;
    "neuwo-input": NeuwoInput;
    "neuwo-textarea": NeuwoTextarea;
    "neuwo-combobox": NeuwoCombobox;
    "neuwo-range": NeuwoRange;
    "neuwo-checkbox": NeuwoCheckbox;
    "neuwo-toggle": NeuwoToggle;
    "neuwo-radio": NeuwoRadio;
    "neuwo-radio-group": NeuwoRadioGroup;
    "neuwo-segmented": NeuwoSegmented;
    "neuwo-badge": NeuwoBadge;
    "neuwo-deal-id": NeuwoDealId;
    "neuwo-status-dot": NeuwoStatusDot;
    "neuwo-cta": NeuwoCta;
    "neuwo-notice": NeuwoNotice;
    "neuwo-logo": NeuwoLogo;
  }
}
