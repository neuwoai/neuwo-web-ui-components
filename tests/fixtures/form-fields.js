import { control, h, has } from "../../src/core/template.js";

/** @typedef {import("../../src/core/template.js").Template} Template */

/** @type {Template} */
const field = (a) =>
  h(
    "div",
    { class: "x-field", style: a.fill && `--neuwo-range-fill:${a.fill}` },
    control(
      h("input", {
        class: "x-field__input",
        name: a.name,
        value: a.value,
        maxlength: a.maxlength,
        minlength: a.minlength,
        tabindex: a.tabindex,
        autocomplete: a.autocomplete,
        inputmode: a.inputmode,
      }),
    ),
    h("input", { class: "x-field__filter", value: a.filter ?? "f" }),
  );

/** @type {Template} */
const notes = (a) => h("div", { class: "x-notes" }, control(h("textarea", { class: "x-notes__input", name: a.name }, a.value)));

/** @type {Template} */
const check = (a) =>
  h(
    "label",
    { class: "x-check" },
    control(h("input", { class: "x-check__input", type: "checkbox", name: a.name, value: a.value, checked: has(a, "checked") })),
  );

/** @type {Record<string, Template>} */
export const formTemplates = { "x-field": field, "x-notes": notes, "x-check": check };
