import { control, h, has, region } from "../../../core/template.js";
import { checkAttrs, choiceTemplate, errorAccent } from "../choice.template.js";

/**
 * @param {Record<string, string>} attrs
 * @param {import("../../../core/template.js").TemplateContext} ctx
 * @returns {import("../../../core/template.js").TemplateNode}
 */
export function toggleTemplate(attrs, ctx) {
  const classes = ["neuwo-form-toggle"];
  if (has(attrs, "pulse")) classes.push("neuwo-form-toggle--pulse");
  if (errorAccent(attrs)) classes.push("neuwo-form-toggle--error");
  return choiceTemplate(
    attrs,
    ctx,
    h(
      "label",
      { class: classes.join(" ") },
      control(h("input", { class: "neuwo-form-toggle__input", type: "checkbox", role: "switch", ...checkAttrs(attrs, ctx) })),
      h("span", { class: "neuwo-form-toggle__track", "aria-hidden": "true" }),
      h("span", { class: "neuwo-form-toggle__label" }, region()),
    ),
  );
}
