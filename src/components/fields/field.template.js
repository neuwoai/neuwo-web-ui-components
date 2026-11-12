import { h, has, region } from "../../core/template.js";

/** @typedef {import("../../core/template.js").TemplateNode} TemplateNode */
/** @typedef {import("../../core/template.js").TemplateContext} TemplateContext */

const BOOLEAN = new Set(["required", "readonly"]);

/**
 * The classes of a field's control: `neuwo-input`, with `--sm` for `size="sm"` and `--error` while an error
 * shows unmuted on a field that keeps its error line.
 * @param {Record<string, string>} attrs
 * @returns {string}
 */
export function controlClass(attrs) {
  const classes = ["neuwo-input"];
  if (attrs.size === "sm") classes.push("neuwo-input--sm");
  if (has(attrs, "error") && !has(attrs, "error-muted") && !has(attrs, "no-error-line")) classes.push("neuwo-input--error");
  return classes.join(" ");
}

/**
 * The host attributes a native control carries as they are: every `aria-*` and `title`.
 * @param {Record<string, string>} attrs
 * @returns {Record<string, string>}
 */
export function forwardedAttrs(attrs) {
  /** @type {Record<string, string>} */
  const props = {};
  for (const [name, value] of Object.entries(attrs)) {
    if (name === "title" || name.startsWith("aria-")) props[name] = value;
  }
  return props;
}

/**
 * The host attributes a native control carries for assistive technology: the `forwardedAttrs`, and the error's
 * `aria-invalid` and `aria-describedby`, which `no-error-line` leaves off.
 * @param {Record<string, string>} attrs
 * @param {TemplateContext} ctx
 * @returns {Record<string, string>}
 */
export function ariaAttrs(attrs, ctx) {
  const props = forwardedAttrs(attrs);
  if (!has(attrs, "no-error-line")) {
    if (has(attrs, "error")) props["aria-invalid"] = "true";
    if (attrs.error) props["aria-describedby"] = ctx.id("error");
  }
  return props;
}

/**
 * @param {Record<string, string>} attrs
 * @param {TemplateContext} ctx
 * @param {string[]} names
 * @returns {Record<string, string | true>}
 */
export function controlAttrs(attrs, ctx, names) {
  /** @type {Record<string, string | true>} */
  const props = { id: ctx.id("control") };
  for (const name of names) if (has(attrs, name)) props[name] = BOOLEAN.has(name) ? true : attrs[name];
  if (has(attrs, "disabled")) props.disabled = true;
  if (has(attrs, "form")) props.form = attrs.form;
  return Object.assign(props, ariaAttrs(attrs, ctx));
}

/**
 * The field shell around a control: the label, the control, then the error line.
 * @param {Record<string, string>} attrs
 * @param {TemplateContext} ctx
 * @param {TemplateNode} control
 * @param {{ labelId?: string }} [options]
 * @returns {TemplateNode}
 */
export function fieldTemplate(attrs, ctx, control, { labelId } = {}) {
  const slotted = ctx.children.some((child) => child.slot === "label");
  const labelled = has(attrs, "label") || slotted;
  return h(
    "div",
    { class: attrs.size === "sm" ? "neuwo-field neuwo-field--sm" : "neuwo-field" },
    h(
      "label",
      { class: labelled ? "neuwo-field__label" : "neuwo-field__label neuwo-field__label--empty", for: ctx.id("control"), id: labelId },
      h("span", { class: "neuwo-field__label-content" }, region("label")),
      has(attrs, "label") && !slotted && h("span", { class: "neuwo-field__label-text" }, attrs.label),
      labelled && has(attrs, "required") && h("span", { class: "neuwo-field__required", "aria-hidden": "true" }, "*"),
    ),
    control,
    !has(attrs, "no-error-line") && h("span", { class: "neuwo-field__error", id: ctx.id("error") }, attrs.error),
  );
}
