import { h, has } from "../../core/template.js";
import { ariaAttrs } from "../fields/field.template.js";

/** @typedef {import("../../core/template.js").TemplateNode} TemplateNode */
/** @typedef {import("../../core/template.js").TemplateContext} TemplateContext */

/**
 * Whether the error shows its accent: `error` is set, and neither `error-muted` nor `no-error-line` is.
 * @param {Record<string, string>} attrs
 * @returns {boolean}
 */
export function errorAccent(attrs) {
  return has(attrs, "error") && !has(attrs, "error-muted") && !has(attrs, "no-error-line");
}

/**
 * The attributes of a native checkbox: `name`, `value`, `checked`, `required`, `disabled` and `form` when present,
 * and the `ariaAttrs`. It needs no id, since its label wraps it.
 * @param {Record<string, string>} attrs
 * @param {TemplateContext} ctx
 * @returns {Record<string, string | true>}
 */
export function checkAttrs(attrs, ctx) {
  /** @type {Record<string, string | true>} */
  const props = {};
  if (has(attrs, "name")) props.name = attrs.name;
  if (has(attrs, "value")) props.value = attrs.value;
  for (const name of ["checked", "required", "disabled"]) if (has(attrs, name)) props[name] = true;
  if (has(attrs, "form")) props.form = attrs.form;
  return Object.assign(props, ariaAttrs(attrs, ctx));
}

/**
 * The shell of a selection control: the `neuwo-choice` root around the control's own block, then the reserved
 * error line, which `no-error-line` drops. `flush` keeps the line right under a block that spans the root.
 * @param {Record<string, string>} attrs
 * @param {TemplateContext} ctx
 * @param {TemplateNode} block
 * @param {{ flush?: boolean }} [options]
 * @returns {TemplateNode}
 */
export function choiceTemplate(attrs, ctx, block, { flush = false } = {}) {
  return h(
    "div",
    { class: flush ? "neuwo-choice neuwo-choice--flush" : "neuwo-choice" },
    block,
    !has(attrs, "no-error-line") && h("span", { class: "neuwo-choice__error", id: ctx.id("error") }, attrs.error),
  );
}
