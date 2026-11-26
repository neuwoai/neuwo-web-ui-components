import { describe, expect, it } from "vitest";
import { navItemTemplate } from "../src/components/sidebar/nav-item.template.js";
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
