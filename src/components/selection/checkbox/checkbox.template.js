import { control, h, region } from "../../../core/template.js";
import { checkAttrs, choiceTemplate, errorAccent } from "../choice.template.js";

/**
 * @param {Record<string, string>} attrs
 * @param {import("../../../core/template.js").TemplateContext} ctx
 * @returns {import("../../../core/template.js").TemplateNode}
 */
export function checkboxTemplate(attrs, ctx) {
  return choiceTemplate(
    attrs,
    ctx,
    h(
      "label",
      { class: errorAccent(attrs) ? "neuwo-form-check neuwo-form-check--error" : "neuwo-form-check" },
      control(h("input", { class: "neuwo-form-check__input", type: "checkbox", ...checkAttrs(attrs, ctx) })),
      h("span", { class: "neuwo-form-check__label" }, region()),
    ),
  );
}
