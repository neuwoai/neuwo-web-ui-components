import { h, region } from "../../core/template.js";
import { isPage } from "./match.js";

/**
 * A page entry: a list item holding a nav link to `href`. Inside a sidebar whose `current` names the same page, the
 * link carries `aria-current="page"` and the active underline. A page below it never marks it.
 * @param {Record<string, string>} attrs
 * @param {import("../../core/template.js").TemplateContext} ctx
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function navItemTemplate(attrs, ctx) {
  const current = ctx.within?.current;
  const page = Boolean(attrs.href && current && isPage(attrs.href, current));
  return h(
    "li",
    { class: "neuwo-nav-item" },
    h(
      "a",
      {
        class: page ? "neuwo-nav-item__link neuwo-nav-link neuwo-nav-link--active" : "neuwo-nav-item__link neuwo-nav-link",
        href: attrs.href,
        "aria-current": page ? "page" : null,
      },
      region(),
    ),
  );
}
navItemTemplate.within = "neuwo-sidebar";
