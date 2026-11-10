import { control, h } from "../../../core/template.js";
import { controlAttrs, controlClass, fieldTemplate } from "../field.template.js";

const FORWARDED = ["name", "placeholder", "required", "readonly", "autocomplete", "rows", "minlength", "maxlength"];

/**
 * @param {Record<string, string>} attrs
 * @param {import("../../../core/template.js").TemplateContext} ctx
 * @returns {import("../../../core/template.js").TemplateNode}
 */
export function textareaTemplate(attrs, ctx) {
  return fieldTemplate(
    attrs,
    ctx,
    control(h("textarea", { class: `${controlClass(attrs)} neuwo-textarea`, ...controlAttrs(attrs, ctx, FORWARDED) }, attrs.value || undefined)),
  );
}
