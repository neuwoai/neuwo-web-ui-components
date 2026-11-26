import { has, h, live, region } from "../../core/template.js";
import { holds, isPage, isUnder } from "./match.js";

/**
 * A folding section: a list item holding a `<details>` whose nested list holds the section's entries. Without `href`
 * the summary is the whole row, the name and a chevron; with it, the name is a link to the section's own page and the
 * summary is a separate toggle holding the chevron. Inside a sidebar whose `current` page the section holds, or lies
 * below one of its entries or its own page, the section is marked and opens. The browser holds the details' open
 * state, which the element also writes, so it is live.
 * @param {Record<string, string>} attrs
 * @param {import("../../core/template.js").TemplateContext} ctx
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function navSectionTemplate(attrs, ctx) {
  const current = ctx.within?.current;
  const label = attrs.label ?? "";
  const link = Boolean(attrs.href);
  const page = Boolean(link && current && isPage(attrs.href, current));
  const marked = Boolean(current) && (page || (link && isUnder(attrs.href, current)) || holds(ctx.children, current));
  const name = marked ? "neuwo-nav-link neuwo-nav-section__name neuwo-nav-link--active" : "neuwo-nav-link neuwo-nav-section__name";
  const chevron = h("span", { class: "neuwo-nav-section__chevron", "aria-hidden": "true" });
  const summary = link
    ? h("summary", { class: "neuwo-nav-section__toggle", "aria-label": `Show ${label} pages` }, chevron)
    : h("summary", { class: "neuwo-nav-section__row" }, h("span", { class: name }, label), chevron);
  const details = live(
    h(
      "details",
      { class: "neuwo-nav-section__details", "data-key": attrs.id || label || null, open: marked || has(attrs, "open") },
      summary,
      h("ul", { class: "neuwo-nav-section__list", role: "list" }, region()),
    ),
  );
  return h(
    "li",
    { class: ["neuwo-nav-section", link && "neuwo-nav-section--link", marked && "neuwo-nav-section--active"].filter(Boolean).join(" ") },
    link ? h("a", { class: name, href: attrs.href, "aria-current": page ? "page" : null }, label) : null,
    details,
  );
}
navSectionTemplate.within = "neuwo-sidebar";
