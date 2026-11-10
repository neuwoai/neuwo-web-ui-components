import { h, has, region } from "../../core/template.js";

/**
 * @param {Record<string, string>} attrs
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function badgeTemplate(attrs) {
  const classes = ["neuwo-badge"];
  if (attrs.variant === "green") classes.push("neuwo-badge--green");
  if (attrs.size === "s" || attrs.size === "l") classes.push(`neuwo-badge--${attrs.size}`);
  if (has(attrs, "borderless")) classes.push("neuwo-badge--borderless");
  if (has(attrs, "glow")) classes.push("neuwo-badge--glow");
  if (attrs.motion === "pulse" || attrs.motion === "shimmer") {
    classes.push(`neuwo-badge--${attrs.motion}`);
    if (attrs.intensity === "s" || attrs.intensity === "l") classes.push(`neuwo-badge--intensity-${attrs.intensity}`);
  }
  return h("span", { class: classes.join(" ") }, region());
}
