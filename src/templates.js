import { badgeTemplate } from "./components/badge/badge.template.js";
import { buttonTemplate } from "./components/button/button.template.js";
import { checkboxTemplate } from "./components/selection/checkbox/checkbox.template.js";
import { comboboxTemplate } from "./components/fields/combobox/combobox.template.js";
import { copyTemplate } from "./components/copy/copy.template.js";
import { ctaTemplate } from "./components/cta/cta.template.js";
import { dealIdTemplate } from "./components/deal-id/deal-id.template.js";
import { inputTemplate } from "./components/fields/input/input.template.js";
import { logoTemplate } from "./components/logo/logo.template.js";
import { menuGroupTemplate } from "./components/menu/menu-group.template.js";
import { menuItemTemplate } from "./components/menu/menu-item.template.js";
import { menuTemplate } from "./components/menu/menu.template.js";
import { navItemTemplate } from "./components/sidebar/nav-item.template.js";
import { navSectionTemplate } from "./components/sidebar/nav-section.template.js";
import { noticeTemplate } from "./components/notice/notice.template.js";
import { radioGroupTemplate } from "./components/selection/radio/radio-group.template.js";
import { radioTemplate } from "./components/selection/radio/radio.template.js";
import { rangeTemplate } from "./components/fields/range/range.template.js";
import { segmentedTemplate } from "./components/selection/segmented/segmented.template.js";
import { sidebarTemplate } from "./components/sidebar/sidebar.template.js";
import { statusDotTemplate } from "./components/status-dot/status-dot.template.js";
import { textareaTemplate } from "./components/fields/textarea/textarea.template.js";
import { toggleTemplate } from "./components/selection/toggle/toggle.template.js";

/** @type {Record<string, import("./core/template.js").Template>} */
export const templates = {
  "neuwo-badge": badgeTemplate,
  "neuwo-button": buttonTemplate,
  "neuwo-checkbox": checkboxTemplate,
  "neuwo-combobox": comboboxTemplate,
  "neuwo-copy": copyTemplate,
  "neuwo-cta": ctaTemplate,
  "neuwo-deal-id": dealIdTemplate,
  "neuwo-input": inputTemplate,
  "neuwo-logo": logoTemplate,
  "neuwo-menu": menuTemplate,
  "neuwo-menu-group": menuGroupTemplate,
  "neuwo-menu-item": menuItemTemplate,
  "neuwo-nav-item": navItemTemplate,
  "neuwo-nav-section": navSectionTemplate,
  "neuwo-notice": noticeTemplate,
  "neuwo-radio": radioTemplate,
  "neuwo-radio-group": radioGroupTemplate,
  "neuwo-range": rangeTemplate,
  "neuwo-segmented": segmentedTemplate,
  "neuwo-sidebar": sidebarTemplate,
  "neuwo-status-dot": statusDotTemplate,
  "neuwo-textarea": textareaTemplate,
  "neuwo-toggle": toggleTemplate,
};
