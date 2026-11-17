import { h } from "../../core/template.js";

/**
 * @param {Record<string, string>} attrs
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function statusDotTemplate(attrs) {
  const classes = ["neuwo-status-dot"];
  if (attrs.variant === "blue") classes.push("neuwo-status-dot--blue");
  if (attrs.size === "s") classes.push("neuwo-status-dot--s");
  if (attrs.motion === "pulse" || attrs.motion === "blink") classes.push(`neuwo-status-dot--${attrs.motion}`);
  if (attrs.halo === "none" || attrs.halo === "s" || attrs.halo === "l") classes.push(`neuwo-status-dot--halo-${attrs.halo}`);
  if (attrs.glow === "s" || attrs.glow === "m" || attrs.glow === "l") classes.push(`neuwo-status-dot--glow-${attrs.glow}`);
  return h("span", { class: classes.join(" ") });
}
