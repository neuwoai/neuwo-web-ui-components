import { badgeTemplate } from "./components/badge/badge.template.js";
import { buttonTemplate } from "./components/button/button.template.js";
import { copyTemplate } from "./components/copy/copy.template.js";
import { ctaTemplate } from "./components/cta/cta.template.js";
import { dealIdTemplate } from "./components/deal-id/deal-id.template.js";
import { inputTemplate } from "./components/fields/input/input.template.js";
import { logoTemplate } from "./components/logo/logo.template.js";
import { noticeTemplate } from "./components/notice/notice.template.js";
import { statusDotTemplate } from "./components/status-dot/status-dot.template.js";

/** @type {Record<string, import("./core/template.js").Template>} */
export const templates = {
  "neuwo-badge": badgeTemplate,
  "neuwo-button": buttonTemplate,
  "neuwo-copy": copyTemplate,
  "neuwo-cta": ctaTemplate,
  "neuwo-deal-id": dealIdTemplate,
  "neuwo-input": inputTemplate,
  "neuwo-logo": logoTemplate,
  "neuwo-notice": noticeTemplate,
  "neuwo-status-dot": statusDotTemplate,
};
