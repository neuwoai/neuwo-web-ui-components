import { control, h, has, live, region } from "../../../core/template.js";
import { controlAttrs, controlClass, fieldTemplate } from "../field.template.js";
import { readOptions, resolveValue } from "../options.js";

/** @typedef {import("../../../core/template.js").TemplateNode} TemplateNode */
/** @typedef {import("../../../core/template.js").TemplateContext} TemplateContext */
/** @typedef {import("../options.js").ListOption} ListOption */

/**
 * @param {Record<string, string>} attrs
 * @param {TemplateContext} ctx
 * @returns {TemplateNode}
 */
export function comboboxTemplate(attrs, ctx) {
  const options = readOptions(ctx.children);
  const value = resolveValue(attrs, options);
  const chosen = options.find((option) => !option.disabled && option.value === value);
  const triggerClass = `${controlClass(attrs)} neuwo-combobox__trigger`;
  const trigger = {
    ...controlAttrs(attrs, ctx, []),
    role: "combobox",
    "aria-haspopup": "listbox",
    "aria-expanded": "false",
    "aria-controls": ctx.id("listbox"),
    "aria-required": has(attrs, "required") && "true",
    "data-placeholder": !chosen,
  };
  /**
   * @param {string} tag
   * @param {ListOption} option
   */
  const row = (tag, option) =>
    live(
      h(
        tag,
        {
          class: "neuwo-combobox__option",
          id: ctx.id(`option-${option.index}`),
          role: "option",
          "data-value": option.value,
          "data-index": String(option.index),
          "aria-selected": String(Boolean(chosen) && option.value === value),
          "aria-disabled": option.disabled && "true",
        },
        h("span", { class: "neuwo-combobox__option-label" }, option.label),
      ),
    );
  /** @type {TemplateNode[]} */
  const rows = [];
  for (let at = 0; at < options.length; ) {
    const first = options[at];
    if (!first.group) {
      rows.push(row("li", first));
      at += 1;
      continue;
    }
    const members = [];
    while (at < options.length && options[at].group === first.group) members.push(options[at++]);
    const labelId = ctx.id(`group-${first.index}`);
    rows.push(
      h(
        "li",
        { class: "neuwo-combobox__group-item", role: "group", "aria-labelledby": labelId },
        h("div", { class: "neuwo-combobox__group", id: labelId }, first.group),
        members.map((member) => row("div", member)),
      ),
    );
  }
  const box = h(
    "div",
    { class: "neuwo-combobox" },
    live(
      has(attrs, "searchable")
        ? h("input", {
            class: triggerClass,
            type: "text",
            ...trigger,
            autocomplete: "off",
            "aria-autocomplete": "list",
            value: chosen?.label,
            placeholder: attrs.placeholder,
          })
        : h("button", { class: triggerClass, type: "button", ...trigger }, live(h("span", { class: "neuwo-combobox__value" }, chosen ? chosen.label : attrs.placeholder))),
    ),
    h("span", { class: "neuwo-combobox__chevron", "aria-hidden": "true" }),
    live(
      h(
        "div",
        { class: "neuwo-combobox__popup", popover: "auto", id: ctx.id("popup") },
        h(
          "ul",
          { class: "neuwo-combobox__listbox", role: "listbox", id: ctx.id("listbox"), "aria-labelledby": ctx.id("label") },
          rows,
          h("li", { class: "neuwo-combobox__empty", role: "presentation", hidden: true }, "No matches"),
        ),
      ),
    ),
    h("select", { class: "neuwo-combobox__options", multiple: true, hidden: true, tabindex: "-1", "aria-hidden": "true" }, region()),
    control(
      h("input", {
        class: "neuwo-combobox__form-value",
        type: "text",
        tabindex: "-1",
        "aria-hidden": "true",
        autocomplete: "off",
        name: attrs.name,
        value,
        required: has(attrs, "required"),
        disabled: has(attrs, "disabled"),
        form: attrs.form,
      }),
    ),
  );
  return fieldTemplate(attrs, ctx, box, { labelId: ctx.id("label") });
}
