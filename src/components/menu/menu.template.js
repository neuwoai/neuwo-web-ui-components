import { h, live, region } from "../../core/template.js";

/**
 * The id of a root menu's panel, the popover a trigger's `popovertarget` names: the menu's own id followed by
 * `-panel`, so a server can render a trigger without seeing the menu.
 * @param {string} id - the `<neuwo-menu>` element's id.
 * @returns {string}
 */
export const menuPanelId = (id) => `${id}-panel`;

/**
 * The menu's panel: a popover with the `menu` role around the region its groups or items sit in. A menu nested in an
 * item, a submenu, also renders the hidden Back row that leads up a level when it drills in.
 * @param {Record<string, string>} attrs
 * @param {import("../../core/template.js").TemplateContext} ctx
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function menuTemplate(attrs, ctx) {
  const nested = Boolean(ctx.within);
  return h(
    "div",
    { class: "neuwo-menu", popover: "auto", role: "menu", id: !nested && attrs.id ? menuPanelId(attrs.id) : ctx.id("panel") },
    nested &&
      h(
        "button",
        { class: "neuwo-menu__back", type: "button", role: "menuitem", tabindex: "-1", hidden: true },
        h("span", { class: "neuwo-menu__back-icon", "aria-hidden": "true" }),
        h("span", { class: "neuwo-menu__back-to" }, "Back to "),
        live(h("span", { class: "neuwo-menu__back-label" })),
      ),
    h("div", { class: "neuwo-menu__items", role: "none" }, region()),
  );
}
menuTemplate.within = "neuwo-menu-item";
