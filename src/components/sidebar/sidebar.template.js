import { h, live, region } from "../../core/template.js";

export const NAV_LABEL = "Main";
export const MENU_LABEL = "Menu";

/**
 * The sidebar's frame: an `<aside>` holding the bar with the brand and actions, then a `<details>` whose summary is
 * the phone menu button and whose content is the nav of entries, the after-nav place and the footer. The browser holds
 * the details' open state, which the element also writes, so it is live.
 * @param {Record<string, string>} attrs
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function sidebarTemplate(attrs) {
  return h(
    "aside",
    { class: "neuwo-sidebar" },
    h(
      "div",
      { class: "neuwo-sidebar__bar" },
      h("div", { class: "neuwo-sidebar__brand" }, region("brand")),
      h("div", { class: "neuwo-sidebar__actions" }, region("actions")),
    ),
    live(
      h(
        "details",
        { class: "neuwo-sidebar__menu" },
        h(
          "summary",
          { class: "neuwo-sidebar__toggle", "aria-label": attrs["menu-label"] || MENU_LABEL },
          h("span", { class: "neuwo-sidebar__toggle-icon", "aria-hidden": "true" }),
        ),
        h(
          "nav",
          { class: "neuwo-sidebar__nav", "aria-label": attrs.label || NAV_LABEL },
          h("ul", { class: "neuwo-sidebar__list", role: "list" }, region()),
        ),
        h("div", { class: "neuwo-sidebar__after-nav" }, region("after-nav")),
        h("div", { class: "neuwo-sidebar__footer" }, region("footer")),
      ),
    ),
  );
}
