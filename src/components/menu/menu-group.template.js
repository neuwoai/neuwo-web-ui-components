import { h, has, region } from "../../core/template.js";

/**
 * A group of menu items: the divider that separates it from the group before, the heading that names it, when set,
 * and the region its items sit in.
 * @param {Record<string, string>} attrs
 * @param {import("../../core/template.js").TemplateContext} ctx
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function menuGroupTemplate(attrs, ctx) {
  const heading = attrs.heading;
  return h(
    "div",
    {
      class: has(attrs, "no-divider") ? "neuwo-menu-group neuwo-menu-group--no-divider" : "neuwo-menu-group",
      role: "group",
      "aria-labelledby": heading ? ctx.id("heading") : null,
    },
    h("div", { class: "neuwo-menu-group__divider", role: "separator" }),
    heading && h("div", { class: "neuwo-menu-group__heading", id: ctx.id("heading") }, heading),
    h("div", { class: "neuwo-menu-group__items", role: "none" }, region()),
  );
}
