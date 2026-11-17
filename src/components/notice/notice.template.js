import { DEFAULT_REGION, h, has, region } from "../../core/template.js";

/** @type {Record<string, string[]>} */
const PLACEMENTS = {
  "bottom-end": ["fixed", "bottom", "end"],
  "bottom-start": ["fixed", "bottom", "start"],
  "bottom-center": ["fixed", "bottom", "center"],
  "top-end": ["fixed", "top", "end"],
  "top-start": ["fixed", "top", "start"],
  "top-center": ["fixed", "top", "center"],
  static: [],
};

/**
 * @param {Record<string, string>} attrs
 * @param {import("../../core/template.js").TemplateContext} ctx
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function noticeTemplate(attrs, ctx) {
  const placement = Object.hasOwn(PLACEMENTS, attrs.position) ? PLACEMENTS[attrs.position] : PLACEMENTS["bottom-end"];
  const dismissible = has(attrs, "dismissible");
  const classes = ["neuwo-notice", ...placement.map((edge) => `neuwo-notice--${edge}`)];
  if (attrs.layout === "row") classes.push("neuwo-notice--row");
  if (dismissible) classes.push("neuwo-notice--dismissible");

  /**
   * @param {string} name
   * @param {string} slot
   */
  const wrapper = (name, slot) => {
    const filled = ctx.children.some((child) => child.slot === slot);
    // Never a <p>: authors put headings and paragraphs here, and a parser pushes those out of a <p>.
    return h("div", { class: filled ? `neuwo-notice__${name}` : `neuwo-notice__${name} neuwo-notice__${name}--empty` }, region(slot));
  };

  return h(
    "div",
    { class: classes.join(" "), role: has(attrs, "role") ? null : "status" },
    h("div", { class: "neuwo-notice__content" }, wrapper("title", "title"), wrapper("message", DEFAULT_REGION)),
    wrapper("actions", "actions"),
    dismissible &&
      h("button", {
        class: has(attrs, "dismiss-filled") ? "neuwo-notice__dismiss neuwo-notice__dismiss--filled" : "neuwo-notice__dismiss",
        type: "button",
        "aria-label": attrs["dismiss-label"] || "Dismiss",
      }),
  );
}
