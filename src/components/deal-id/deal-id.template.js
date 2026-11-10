import { h, region } from "../../core/template.js";

/**
 * @param {Record<string, string>} attrs
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function dealIdTemplate(attrs) {
  const classes = ["neuwo-deal-id"];
  if (attrs.size === "s" || attrs.size === "l") classes.push(`neuwo-deal-id--${attrs.size}`);
  return h("span", { class: classes.join(" ") }, region());
}
