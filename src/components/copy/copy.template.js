import { h, region } from "../../core/template.js";

/**
 * @param {Record<string, string>} attrs
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function copyTemplate(attrs) {
  return h(
    "div",
    { class: "neuwo-copy" },
    h("div", { class: "neuwo-copy__content" }, region()),
    h("button", { class: "neuwo-copy__button", type: "button", "aria-label": attrs.label || "Copy" }),
    h("span", { class: "neuwo-copy__status", role: "status", "aria-live": "polite" }, region("status")),
  );
}
