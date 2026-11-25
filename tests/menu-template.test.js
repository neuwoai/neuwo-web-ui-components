import { describe, expect, it } from "vitest";
import { menuPanelId, menuTemplate } from "../src/components/menu/menu.template.js";
import { menuGroupTemplate } from "../src/components/menu/menu-group.template.js";
import { menuItemTemplate } from "../src/components/menu/menu-item.template.js";
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

const SUBMENU = [{ tag: "neuwo-menu", attrs: { slot: "submenu" }, text: "Sports", slot: "submenu", children: [] }];

const controlOf = (attrs, within = null, children = []) => find(menuItemTemplate(attrs, ctx(within, children)), "neuwo-menu-item__control");

describe("menuTemplate()", () => {
  it("is registered under its tag and reads an enclosing item", () => {
    expect(templates["neuwo-menu"]).toBe(menuTemplate);
    expect(menuTemplate.within).toBe("neuwo-menu-item");
  });

  it("names the root panel after the host id", () => {
    expect(menuTemplate({ id: "export" }, ctx()).props.id).toBe("export-panel");
    expect(menuPanelId("x")).toBe("x-panel");
    expect(menuTemplate({}, ctx()).props.id).toBe("c-panel");
    expect(menuTemplate({ id: "inner" }, ctx({})).props.id).toBe("c-panel");
  });

  it("renders a popover menu, a nested one with a hidden Back row", () => {
    const root = menuTemplate({ id: "m" }, ctx());
    expect(root.props).toMatchObject({ class: "neuwo-menu", popover: "auto", role: "menu" });
    expect(root.children).toHaveLength(1);
    expect(root.children[0].props).toEqual({ class: "neuwo-menu__items", role: "none" });
    expect(root.children[0].children).toEqual([{ region: "default" }]);

    const nested = menuTemplate({}, ctx({}));
    const back = nested.children[0];
    expect(back.tag).toBe("button");
    expect(back.props).toEqual({ class: "neuwo-menu__back", type: "button", role: "menuitem", tabindex: "-1", hidden: true });
    expect(find(back, "neuwo-menu__back-icon").props["aria-hidden"]).toBe("true");
    expect(find(back, "neuwo-menu__back-label").live).toBe(true);
    expect(nested.children[1].props.class).toBe("neuwo-menu__items");
  });
});

describe("menuGroupTemplate()", () => {
  it("is registered under its tag", () => {
    expect(templates["neuwo-menu-group"]).toBe(menuGroupTemplate);
  });

  it("renders a divider, then the items wrapper, in a group", () => {
    const root = menuGroupTemplate({}, ctx());
    expect(root.props).toEqual({ class: "neuwo-menu-group", role: "group" });
    expect(root.children.map((child) => child.props.class)).toEqual(["neuwo-menu-group__divider", "neuwo-menu-group__items"]);
    expect(root.children[0].props.role).toBe("separator");
    expect(root.children[1].props.role).toBe("none");
    expect(root.children[1].children).toEqual([{ region: "default" }]);
  });

  it("renders a heading and labels the group with it", () => {
    const root = menuGroupTemplate({ heading: "Sort By" }, ctx());
    const heading = find(root, "neuwo-menu-group__heading");
    expect(heading.props.id).toBe("c-heading");
    expect(heading.children).toEqual(["Sort By"]);
    expect(root.props["aria-labelledby"]).toBe("c-heading");
    expect(root.children.map((child) => child.props.class)).toEqual(["neuwo-menu-group__divider", "neuwo-menu-group__heading", "neuwo-menu-group__items"]);
    expect(find(menuGroupTemplate({ heading: "" }, ctx()), "neuwo-menu-group__heading")).toBeNull();
  });

  it("drops the divider with no-divider", () => {
    expect(menuGroupTemplate({ "no-divider": "" }, ctx()).props.class).toBe("neuwo-menu-group neuwo-menu-group--no-divider");
  });
});

describe("menuItemTemplate()", () => {
  it("is registered under its tag and reads the nearer of an enclosing group and menu, so a group's select stops at a submenu", () => {
    expect(templates["neuwo-menu-item"]).toBe(menuItemTemplate);
    expect(menuItemTemplate.within).toBe("neuwo-menu-group, neuwo-menu");
    expect(controlOf({}, { slot: "submenu" }).props.role).toBe("menuitem");
  });

  it("renders the control, then the submenu wrapper that is always there", () => {
    const root = menuItemTemplate({}, ctx());
    expect(root.props).toEqual({ class: "neuwo-menu-item", role: "none" });
    expect(root.children.map((child) => child.props.class)).toEqual(["neuwo-menu-item__control", "neuwo-menu-item__submenu"]);
    expect(root.children[1].props.role).toBe("none");
    expect(root.children[1].children).toEqual([{ region: "submenu" }]);
    const control = root.children[0];
    expect(control.props).toEqual({ class: "neuwo-menu-item__control", type: "button", role: "menuitem", tabindex: "-1" });
    expect(control.children.map((child) => child.props.class)).toEqual(["neuwo-menu-item__start", "neuwo-menu-item__label"]);
    expect(control.children[0].children).toEqual([{ region: "start" }]);
    expect(control.children[1].children).toEqual([{ region: "default" }]);
  });

  it("gives items the role of their group's select", () => {
    expect(controlOf({}, { select: "one" }).props.role).toBe("menuitemradio");
    expect(controlOf({}, { select: "many" }).props.role).toBe("menuitemcheckbox");
    for (const within of [null, {}, { select: "" }, { select: "all" }]) expect(controlOf({}, within).props.role, JSON.stringify(within)).toBe("menuitem");
    expect(controlOf({ checked: "" }, { select: "one" }).props["aria-checked"]).toBe("true");
    expect(controlOf({}, { select: "many" }).props["aria-checked"]).toBe("false");
    expect(controlOf({ checked: "" }).props).not.toHaveProperty("aria-checked");
  });

  it("puts the check before the start icon on a checkable item", () => {
    const control = controlOf({}, { select: "many" });
    expect(control.children[0].props).toEqual({ class: "neuwo-menu-item__check", "aria-hidden": "true" });
    expect(control.children[1].props.class).toBe("neuwo-menu-item__start");
    expect(find(controlOf({}), "neuwo-menu-item__check")).toBeNull();
  });

  it("keeps a disabled item focusable", () => {
    const control = controlOf({ disabled: "" });
    expect(control.props["aria-disabled"]).toBe("true");
    expect(control.props).not.toHaveProperty("disabled");
    expect(control.props.tabindex).toBe("-1");
  });

  it("renders a link only for an enabled plain item", () => {
    const link = controlOf({ href: "/docs", target: "_blank", rel: "noopener", download: "" });
    expect(link.tag).toBe("a");
    expect(link.props).toEqual({ class: "neuwo-menu-item__control", role: "menuitem", tabindex: "-1", href: "/docs", target: "_blank", rel: "noopener", download: "" });
    expect(controlOf({ href: "/docs", disabled: "" }).tag).toBe("button");
    expect(controlOf({ href: "/docs" }, { select: "one" }).tag).toBe("button");
    expect(controlOf({ href: "/docs" }, null, SUBMENU).tag).toBe("button");
    expect(controlOf({ href: "" }).tag).toBe("button");
    expect(controlOf({ href: "/docs", disabled: "" }).props).not.toHaveProperty("href");
  });

  it("marks a new-tab link", () => {
    const link = controlOf({ href: "/docs", target: "_blank" });
    expect(find(link, "neuwo-menu-item__external").props["aria-hidden"]).toBe("true");
    expect(find(link, "neuwo-menu-item__new-tab").children).toEqual(["(opens in a new tab)"]);
    expect(find(controlOf({ href: "/docs" }), "neuwo-menu-item__external")).toBeNull();
    expect(find(controlOf({ target: "_blank" }), "neuwo-menu-item__new-tab")).toBeNull();
  });

  it("shows a hint after the label", () => {
    const control = controlOf({ hint: "F2" });
    expect(control.children.map((child) => child.props.class)).toEqual(["neuwo-menu-item__start", "neuwo-menu-item__label", "neuwo-menu-item__hint"]);
    expect(find(control, "neuwo-menu-item__hint").children).toEqual(["F2"]);
    expect(find(controlOf({ hint: "" }), "neuwo-menu-item__hint")).toBeNull();
  });

  it("marks a submenu parent", () => {
    const control = controlOf({ hint: "3" }, null, SUBMENU);
    expect(control.props["aria-haspopup"]).toBe("menu");
    expect(control.props["aria-expanded"]).toBe("false");
    expect(control.live).toBe(true);
    expect(control.children.map((child) => child.props.class).at(-1)).toBe("neuwo-menu-item__chevron");
    expect(find(control, "neuwo-menu-item__chevron").props["aria-hidden"]).toBe("true");
    const plain = controlOf({});
    expect(plain.live).toBeUndefined();
    expect(plain.props).not.toHaveProperty("aria-haspopup");
    expect(plain.props).not.toHaveProperty("aria-expanded");
    expect(find(plain, "neuwo-menu-item__chevron")).toBeNull();
  });

  it("colours the item by tone, red or green only", () => {
    expect(menuItemTemplate({ tone: "red" }, ctx()).props.class).toBe("neuwo-menu-item neuwo-menu-item--red");
    expect(menuItemTemplate({ tone: "green" }, ctx()).props.class).toBe("neuwo-menu-item neuwo-menu-item--green");
    expect(menuItemTemplate({ tone: "blue" }, ctx()).props.class).toBe("neuwo-menu-item");
  });
});
