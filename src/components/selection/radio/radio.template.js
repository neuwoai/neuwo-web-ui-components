import { control, h, has, region } from "../../../core/template.js";
import { forwardedAttrs } from "../../fields/field.template.js";

/**
 * A native radio inside its label. In a `<neuwo-radio-group>` it takes the group's `name`, or its own when the group
 * has none, the group's `required` and `form`, is disabled with the group, and starts checked when the group's
 * `value` is its own, so the browser groups the radios. Outside a group it takes its own.
 * @param {Record<string, string>} attrs
 * @param {import("../../../core/template.js").TemplateContext} ctx
 * @returns {import("../../../core/template.js").TemplateNode}
 */
export function radioTemplate(attrs, ctx) {
  const group = ctx.within ?? null;
  const owner = group ?? attrs;
  /** @type {Record<string, string | true>} */
  const props = { class: "neuwo-form-check__input", type: "radio" };
  const name = group?.name || attrs.name;
  if (name !== undefined) props.name = name;
  if (has(attrs, "value")) props.value = attrs.value;
  if (group && has(group, "value") ? group.value === (attrs.value ?? "on") : has(attrs, "checked")) props.checked = true;
  if (has(owner, "required")) props.required = true;
  if (has(attrs, "disabled") || (group && has(group, "disabled"))) props.disabled = true;
  if (has(owner, "form")) props.form = owner.form;
  return h(
    "label",
    { class: "neuwo-form-check" },
    control(h("input", { ...props, ...forwardedAttrs(attrs) })),
    h("span", { class: "neuwo-form-check__label" }, region()),
  );
}
radioTemplate.within = "neuwo-radio-group";
