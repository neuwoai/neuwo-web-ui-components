import { h, has } from "../../core/template.js";

export const DEFAULT_LABEL = "Loading";

/**
 * The ring, shared with the button, which passes a class of its own as `extra`.
 * @param {Record<string, string>} attrs
 * @param {string} [extra]
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function spinner(attrs, extra) {
  const classes = ["neuwo-spinner"];
  if (attrs.size === "m" || attrs.size === "l") classes.push(`neuwo-spinner--${attrs.size}`);
  if (attrs.variant === "blue" || attrs.variant === "green") classes.push(`neuwo-spinner--${attrs.variant}`);
  if (extra) classes.push(extra);
  const label = has(attrs, "label") ? attrs.label : attrs["aria-label"] || DEFAULT_LABEL;
  const name = label === "" ? { "aria-hidden": "true" } : { role: "progressbar", "aria-label": label };
  return h("span", { class: classes.join(" "), ...name });
}

/**
 * @param {Record<string, string>} attrs
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function spinnerTemplate(attrs) {
  return spinner(attrs);
}
