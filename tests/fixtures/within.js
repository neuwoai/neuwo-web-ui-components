import { h, region } from "../../src/core/template.js";

/** @typedef {import("../../src/core/template.js").Template} Template */
/** @typedef {import("../../src/core/template.js").TemplateContext} TemplateContext */

/** @param {Record<string, string>} attrs */
export const groupTemplate = (attrs) => h("div", { class: `x-group x-group--${attrs.tone ?? "a"}` }, region());

/**
 * Renders its group's `name` and `value`, as text and as attributes, so a test sees both kinds of write.
 * @param {Record<string, string>} attrs
 * @param {TemplateContext} ctx
 */
export function itemTemplate(attrs, ctx) {
  const { within } = ctx;
  return h(
    "span",
    { class: "x-item", "data-name": within?.name, "data-value": within?.value },
    h("b", { class: "x-item__group" }, within ? `${within.name ?? ""}=${within.value ?? ""}` : "none"),
    h("span", { class: "x-item__label" }, region()),
  );
}
itemTemplate.within = "x-group";

/**
 * Reads the box around it, so a box is both the enclosing element and the one that reads it.
 * @param {Record<string, string>} attrs
 * @param {TemplateContext} ctx
 */
export function boxTemplate(attrs, ctx) {
  return h("div", { class: "x-box", "data-outer": ctx.within?.label ?? "none" }, region());
}
boxTemplate.within = "x-box";

/** @type {Record<string, Template>} */
export const withinTemplates = { "x-group": groupTemplate, "x-item": itemTemplate, "x-box": boxTemplate };
