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
 * A `.neuwo-x` block inside the `.neuwo-f` root, its modifier listed first, holding the default region.
 * @param {Record<string, string>} attrs
 * @param {import("../../src/core/template.js").TemplateContext} ctx
 */
export const nestedBlocks = (attrs, ctx) =>
  h(
    "div",
    { class: "neuwo-f" },
    h("label", { class: "neuwo-f__label" }, "L"),
    h(
      "div",
      { class: `neuwo-x--${attrs.tone ?? "a"} neuwo-x` },
      h("span", { class: "neuwo-x__value" }, String(ctx.children.length)),
      h("select", { class: "neuwo-x__options", hidden: true }, region()),
    ),
  );
