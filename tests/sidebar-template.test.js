import { describe, expect, it } from "vitest";
import { navItemTemplate } from "../src/components/sidebar/nav-item.template.js";
import { navSectionTemplate } from "../src/components/sidebar/nav-section.template.js";
import { sidebarTemplate } from "../src/components/sidebar/sidebar.template.js";
import { templates } from "../src/templates.js";

const ctx = (within = null, children = []) => ({ id: (suffix) => `c-${suffix}`, children, within });
const isNode = (child) => typeof child === "object" && "tag" in child;
const classesOf = (node) => String(node.props.class ?? "").split(" ").filter(Boolean);

function find(node, name) {
  if (classesOf(node).includes(name)) return node;
  for (const child of node.children.filter(isNode)) {
    const hit = find(child, name);
    if (hit) return hit;
  }
  return null;
}

const linkOf = (attrs, within) => find(navItemTemplate(attrs, ctx(within)), "neuwo-nav-item__link");

/**
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 * @param {import("../src/core/template.js").ChildInfo[]} [children]
 */
const child = (tag, attrs = {}, children = []) => ({ tag, attrs, text: "", slot: "default", children });
const entries = [child("neuwo-nav-item", { href: "/guides/" }), child("neuwo-nav-section", { label: "Setup" }, [child("neuwo-nav-item", { href: "/guides/setup/keys/" })])];
const section = (attrs, current = null) => navSectionTemplate(attrs, ctx(current === null ? null : { current }, entries));
const isOpen = (node) => find(node, "neuwo-nav-section__details").props.open === true;
const isMarked = (node) => classesOf(node).includes("neuwo-nav-section--active") && classesOf(find(node, "neuwo-nav-section__name")).includes("neuwo-nav-link--active");

describe("sidebarTemplate()", () => {
  it("is registered under its tag", () => {
    expect(templates["neuwo-sidebar"]).toBe(sidebarTemplate);
  });

  it("renders the frame: the bar with brand and actions, then the menu disclosure holding the nav, after-nav and footer", () => {
    expect(sidebarTemplate({}, ctx())).toEqual({
      tag: "aside",
      props: { class: "neuwo-sidebar" },
      children: [
        {
          tag: "div",
          props: { class: "neuwo-sidebar__bar" },
          children: [
            { tag: "div", props: { class: "neuwo-sidebar__brand" }, children: [{ region: "brand" }] },
            { tag: "div", props: { class: "neuwo-sidebar__actions" }, children: [{ region: "actions" }] },
          ],
        },
        {
          tag: "details",
          props: { class: "neuwo-sidebar__menu" },
          live: true,
          children: [
            {
              tag: "summary",
              props: { class: "neuwo-sidebar__toggle", "aria-label": "Menu" },
              children: [{ tag: "span", props: { class: "neuwo-sidebar__toggle-icon", "aria-hidden": "true" }, children: [] }],
            },
            {
              tag: "nav",
              props: { class: "neuwo-sidebar__nav", "aria-label": "Main" },
              children: [{ tag: "ul", props: { class: "neuwo-sidebar__list", role: "list" }, children: [{ region: "default" }] }],
            },
            { tag: "div", props: { class: "neuwo-sidebar__after-nav" }, children: [{ region: "after-nav" }] },
            { tag: "div", props: { class: "neuwo-sidebar__footer" }, children: [{ region: "footer" }] },
          ],
        },
      ],
    });
  });

  it("names the nav from label and the menu button from menu-label, defaulting to Main and Menu", () => {
    const named = sidebarTemplate({ label: "Documentation", "menu-label": "Open Navigation" }, ctx());
    expect(find(named, "neuwo-sidebar__nav").props["aria-label"]).toBe("Documentation");
    expect(find(named, "neuwo-sidebar__toggle").props["aria-label"]).toBe("Open Navigation");
    const empty = sidebarTemplate({ label: "", "menu-label": "" }, ctx());
    expect(find(empty, "neuwo-sidebar__nav").props["aria-label"]).toBe("Main");
    expect(find(empty, "neuwo-sidebar__toggle").props["aria-label"]).toBe("Menu");
  });

  it("renders the same markup whatever current says, since the entries read it", () => {
    expect(sidebarTemplate({ current: "/a/" }, ctx())).toEqual(sidebarTemplate({}, ctx()));
  });
});

describe("navItemTemplate()", () => {
  it("is registered under its tag and reads the enclosing sidebar", () => {
    expect(templates["neuwo-nav-item"]).toBe(navItemTemplate);
    expect(navItemTemplate.within).toBe("neuwo-sidebar");
  });

  it("renders an entry as a list item holding a nav link", () => {
    expect(navItemTemplate({ href: "/a/" }, ctx({}))).toEqual({
      tag: "li",
      props: { class: "neuwo-nav-item" },
      children: [{ tag: "a", props: { class: "neuwo-nav-item__link neuwo-nav-link", href: "/a/" }, children: [{ region: "default" }] }],
    });
  });

  it("marks the entry for the current page with aria-current and the active underline", () => {
    expect(linkOf({ href: "/a" }, { current: "/a/" }).props).toEqual({
      class: "neuwo-nav-item__link neuwo-nav-link neuwo-nav-link--active",
      href: "/a",
      "aria-current": "page",
    });
    expect(linkOf({ href: "/a/?tab=1" }, { current: "/a/index.html" }).props["aria-current"]).toBe("page");
  });

  it("never marks an entry for a page below it", () => {
    const link = linkOf({ href: "/a/" }, { current: "/a/b/" });
    expect(classesOf(link)).toEqual(["neuwo-nav-item__link", "neuwo-nav-link"]);
    expect(link.props["aria-current"]).toBeUndefined();
    expect(linkOf({ href: "/" }, { current: "/a/" }).props["aria-current"]).toBeUndefined();
  });

  it("marks nothing outside a sidebar, without an href, or in a sidebar with no current page", () => {
    for (const link of [linkOf({ href: "/a/" }, null), linkOf({}, { current: "/a/" }), linkOf({ href: "/a/" }, {})]) {
      expect(classesOf(link)).toEqual(["neuwo-nav-item__link", "neuwo-nav-link"]);
      expect(link.props["aria-current"]).toBeUndefined();
    }
    expect(linkOf({}, null).props.href).toBeUndefined();
  });
});

describe("navSectionTemplate()", () => {
  it("is registered under its tag and reads the enclosing sidebar", () => {
    expect(templates["neuwo-nav-section"]).toBe(navSectionTemplate);
    expect(navSectionTemplate.within).toBe("neuwo-sidebar");
  });

  it("renders a section as a list item with a disclosure, the name as a nav link, a chevron and a nested list", () => {
    expect(navSectionTemplate({ label: "Guides" }, ctx({ current: "/" }))).toEqual({
      tag: "li",
      props: { class: "neuwo-nav-section" },
      children: [
        {
          tag: "details",
          props: { class: "neuwo-nav-section__details", "data-key": "Guides" },
          live: true,
          children: [
            {
              tag: "summary",
              props: { class: "neuwo-nav-section__row" },
              children: [
                { tag: "span", props: { class: "neuwo-nav-link neuwo-nav-section__name" }, children: ["Guides"] },
                { tag: "span", props: { class: "neuwo-nav-section__chevron", "aria-hidden": "true" }, children: [] },
              ],
            },
            { tag: "ul", props: { class: "neuwo-nav-section__list", role: "list" }, children: [{ region: "default" }] },
          ],
        },
      ],
    });
  });

  it("opens and marks a section holding an entry the page's path continues", () => {
    for (const current of ["/guides/", "/guides/unlisted/", "/guides/setup/keys/", "/guides/setup/keys/rotate/"]) {
      const node = section({ label: "Guides" }, current);
      expect([isOpen(node), isMarked(node)], current).toEqual([true, true]);
      expect(find(node, "neuwo-nav-section__name").props["aria-current"], current).toBeUndefined();
    }
    for (const current of ["/", "/guide/", "/guidesx/", "/elsewhere/setup/keys/"]) {
      const node = section({ label: "Guides" }, current);
      expect([isOpen(node), isMarked(node), classesOf(node)], current).toEqual([false, false, ["neuwo-nav-section"]]);
    }
    expect(isOpen(section({ label: "Guides" }))).toBe(false);
    expect(isOpen(navSectionTemplate({ label: "Guides" }, ctx({}, entries)))).toBe(false);
  });

  it("starts open with open", () => {
    const node = section({ label: "Guides", open: "" }, "/");
    expect([isOpen(node), isMarked(node)]).toEqual([true, false]);
    expect(isOpen(section({ label: "Guides", open: "" }))).toBe(true);
  });

  it("keys the disclosure by id, else label", () => {
    const key = (attrs) => find(navSectionTemplate(attrs, ctx()), "neuwo-nav-section__details").props["data-key"];
    expect(key({ label: "Guides", id: "guides" })).toBe("guides");
    expect(key({ label: "Guides" })).toBe("Guides");
    expect(key({ label: "Guides", id: "" })).toBe("Guides");
    expect(key({})).toBeUndefined();
  });

  it("renders a section with href as a link beside a toggle named Show <label> pages, marking the link on its page", () => {
    const own = section({ label: "Reference", href: "/reference/" }, "/reference/index.html");
    expect(own).toEqual({
      tag: "li",
      props: { class: "neuwo-nav-section neuwo-nav-section--link neuwo-nav-section--active" },
      children: [
        { tag: "a", props: { class: "neuwo-nav-link neuwo-nav-section__name neuwo-nav-link--active", href: "/reference/", "aria-current": "page" }, children: ["Reference"] },
        {
          tag: "details",
          props: { class: "neuwo-nav-section__details", "data-key": "Reference", open: true },
          live: true,
          children: [
            {
              tag: "summary",
              props: { class: "neuwo-nav-section__toggle", "aria-label": "Show Reference pages" },
              children: [{ tag: "span", props: { class: "neuwo-nav-section__chevron", "aria-hidden": "true" }, children: [] }],
            },
            { tag: "ul", props: { class: "neuwo-nav-section__list", role: "list" }, children: [{ region: "default" }] },
          ],
        },
      ],
    });
    const below = section({ label: "Reference", href: "/reference/" }, "/reference/unlisted/");
    expect([isOpen(below), isMarked(below), find(below, "neuwo-nav-section__name").props["aria-current"]]).toEqual([true, true, undefined]);
    const holding = section({ label: "Reference", href: "/reference/" }, "/guides/setup/keys/");
    expect([isOpen(holding), isMarked(holding), find(holding, "neuwo-nav-section__name").props["aria-current"]]).toEqual([true, true, undefined]);
    const away = section({ label: "Reference", href: "/reference/" }, "/");
    expect([isOpen(away), classesOf(away)]).toEqual([false, ["neuwo-nav-section", "neuwo-nav-section--link"]]);
  });

  it("emits no <neuwo-*> tag and renders the label as text", () => {
    const tags = (node) => [node.tag, ...node.children.filter(isNode).flatMap(tags)];
    for (const attrs of [{ label: "<b>Guides</b>" }, { label: "<b>Guides</b>", href: "/g/" }]) {
      const node = navSectionTemplate(attrs, ctx({ current: "/" }, entries));
      expect(tags(node).filter((tag) => tag.startsWith("neuwo-"))).toEqual([]);
      expect(find(node, "neuwo-nav-section__name").children).toEqual(["<b>Guides</b>"]);
    }
  });
});
