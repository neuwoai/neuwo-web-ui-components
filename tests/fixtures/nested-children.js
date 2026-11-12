import { h, region } from "../../src/core/template.js";

/** @param {string} value */
export const described = (value) => ({ tag: null, attrs: {}, text: value, slot: "default" });

export const OPTGROUP = '<optgroup label="G"><option value="a">A</option>\n<option>B</option></optgroup>';

export const NESTED = {
  tag: "optgroup",
  attrs: { label: "G" },
  text: "A\nB",
  slot: "default",
  children: [
    { tag: "option", attrs: { value: "a" }, text: "A", slot: "default", children: [described("A")] },
    { tag: "option", attrs: {}, text: "B", slot: "default", children: [described("B")] },
  ],
};

/**
 * Modifiers come before the key classes on purpose, so a key class is never found by taking the first class.
 * @param {Record<string, string>} attrs
 * @param {import("../../src/core/template.js").TemplateContext} ctx
 */
export const nestedBlocks = (attrs, ctx) => {
  const invalid = Object.hasOwn(attrs, "invalid");
  return h(
    "div",
    { class: "neuwo-f" },
    h("label", { class: "neuwo-f__label" }, "L"),
    h("input", { class: `${invalid ? "neuwo-f__control--invalid " : ""}neuwo-f__control` }),
    h(
      "div",
      { class: `neuwo-x--${attrs.tone ?? "a"} neuwo-x` },
      h("span", { class: "neuwo-x__value" }, String(ctx.children.length)),
      h("select", { class: `${invalid ? "neuwo-x__options--invalid " : ""}neuwo-x__options`, hidden: true }, region()),
    ),
  );
};
