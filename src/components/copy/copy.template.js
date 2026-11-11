import { h, region } from "../../core/template.js";
import { forwardedAttrs } from "../fields/field.template.js";

/**
 * @param {Record<string, string>} attrs
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function copyTemplate(attrs) {
  const forwarded = forwardedAttrs(attrs);
  // A reference outranks aria-label in the accessible name, so it would beat the label.
  if (attrs.label) delete forwarded["aria-labelledby"];
  return h(
    "div",
    { class: "neuwo-copy" },
    h("div", { class: "neuwo-copy__content" }, region()),
    h("button", { class: "neuwo-copy__button", type: "button", ...forwarded, "aria-label": attrs.label || attrs["aria-label"] || "Copy" }),
    h("span", { class: "neuwo-copy__status", role: "status", "aria-live": "polite" }, region("status")),
  );
}
