import { control, h } from "../../../core/template.js";
import { controlAttrs, controlClass, fieldTemplate } from "../field.template.js";

const TYPES = ["text", "email", "url", "password", "number", "search", "tel"];
const FORWARDED = [
  "name",
  "placeholder",
  "required",
  "readonly",
  "autocomplete",
  "min",
  "max",
  "step",
  "pattern",
  "minlength",
  "maxlength",
  "inputmode",
  "value",
];

/**
 * @param {Record<string, string>} attrs
 * @param {import("../../../core/template.js").TemplateContext} ctx
 * @returns {import("../../../core/template.js").TemplateNode}
 */
export function inputTemplate(attrs, ctx) {
  const type = TYPES.includes(attrs.type) ? attrs.type : "text";
  return fieldTemplate(attrs, ctx, control(h("input", { class: controlClass(attrs), type, ...controlAttrs(attrs, ctx, FORWARDED) })));
}
