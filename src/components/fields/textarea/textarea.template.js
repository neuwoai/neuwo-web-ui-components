import { control, h } from "../../../core/template.js";
import { controlAttrs, fieldTemplate, textControlClass } from "../field.template.js";

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
    control(
      h(
        "textarea",
        { class: `${textControlClass(attrs)} neuwo-textarea`, ...controlAttrs(attrs, ctx, FORWARDED) },
        // A parser reads CR as LF before it drops the LF after the tag, so markup must carry the LF form to keep it.
        attrs.value?.replace(/\r\n?/g, "\n") || undefined,
      ),
    ),
  );
}
