import { h, has, raw } from "../../core/template.js";
import bgLight from "../../foundation/logos/neuwo-logo--bg-light.svg?raw";
import bgDark from "../../foundation/logos/neuwo-logo--bg-dark.svg?raw";
import bgDarkAlt from "../../foundation/logos/neuwo-logo--bg-dark-alt.svg?raw";
import bgColour from "../../foundation/logos/neuwo-logo--bg-colour.svg?raw";

const DEFAULT_VARIANT = "bg-dark";
const DEFAULT_LABEL = "Neuwo";

/**
 * @param {string} svg
 * @returns {{ rootProps: Record<string, string>, inner: string }}
 */
function split(svg) {
  const [, rootAttrs = "", inner = ""] = /^<svg([^>]*)>([\s\S]*)<\/svg>\s*$/.exec(svg) ?? [];
  /** @type {Record<string, string>} */
  const rootProps = {};
  for (const [, name, value] of rootAttrs.matchAll(/([\w:-]+)="([^"]*)"/g)) rootProps[name] = value;
  return { rootProps, inner };
}

const DRAWINGS = {
  "bg-light": split(bgLight),
  "bg-dark": split(bgDark),
  "bg-dark-alt": split(bgDarkAlt),
  "bg-colour": split(bgColour),
};

/**
 * @param {Record<string, string>} attrs
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function logoTemplate(attrs) {
  const variant = Object.hasOwn(DRAWINGS, attrs.variant) ? attrs.variant : DEFAULT_VARIANT;
  const { rootProps, inner } = DRAWINGS[/** @type {keyof typeof DRAWINGS} */ (variant)];
  const label = has(attrs, "label") ? attrs.label : DEFAULT_LABEL;
  const name = label === "" ? { "aria-hidden": "true" } : { role: "img", "aria-label": label };
  return h("svg", { ...rootProps, class: `neuwo-logo neuwo-logo--${variant}`, ...name }, raw(inner));
}
