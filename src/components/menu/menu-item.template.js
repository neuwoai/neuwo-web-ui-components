import { h, has, live, region } from "../../core/template.js";

/** @type {Record<string, string>} */
const ROLES = { one: "menuitemradio", many: "menuitemcheckbox" };

/**
 * A menu item: its control, a link or a button with the role its group's `select` gives it, then the wrapper a
 * submenu sits in. It reads the nearer of its group and its menu, so an outer group's `select` never reaches an item
 * placed directly in a submenu. The control holds the check of a checkable item, the start icon, the label, the hint,
 * a new-tab link's mark and a submenu parent's chevron.
 * @param {Record<string, string>} attrs
 * @param {import("../../core/template.js").TemplateContext} ctx
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function menuItemTemplate(attrs, ctx) {
  const select = ctx.within?.select;
  const role = Object.hasOwn(ROLES, select) ? ROLES[select] : "menuitem";
  const checkable = role !== "menuitem";
  const disabled = has(attrs, "disabled");
  const submenu = ctx.children.some((child) => child.slot === "submenu");
  const link = Boolean(attrs.href) && !disabled && !checkable && !submenu;
  const newTab = link && attrs.target === "_blank";

  /** @type {Record<string, string | boolean>} */
  const props = { class: "neuwo-menu-item__control" };
  if (link) {
    props.href = attrs.href;
    for (const name of ["target", "rel", "download"]) if (has(attrs, name)) props[name] = attrs[name];
  } else props.type = "button";
  props.role = role;
  props.tabindex = "-1";
  if (checkable) props["aria-checked"] = String(has(attrs, "checked"));
  if (disabled) props["aria-disabled"] = "true";
  if (submenu) {
    props["aria-haspopup"] = "menu";
    props["aria-expanded"] = "false";
  }

  const control = h(
    link ? "a" : "button",
    props,
    checkable && h("span", { class: "neuwo-menu-item__check", "aria-hidden": "true" }),
    h("span", { class: "neuwo-menu-item__start" }, region("start")),
    h("span", { class: "neuwo-menu-item__label" }, region()),
    attrs.hint && h("span", { class: "neuwo-menu-item__hint" }, attrs.hint),
    newTab && h("span", { class: "neuwo-menu-item__external", "aria-hidden": "true" }),
    newTab && h("span", { class: "neuwo-menu-item__new-tab" }, "(opens in a new tab)"),
    submenu && h("span", { class: "neuwo-menu-item__chevron", "aria-hidden": "true" }),
  );
  const tone = attrs.tone === "red" || attrs.tone === "green" ? ` neuwo-menu-item--${attrs.tone}` : "";
  return h(
    "div",
    { class: `neuwo-menu-item${tone}`, role: "none" },
    submenu ? live(control) : control,
    h("div", { class: "neuwo-menu-item__submenu", role: "none" }, region("submenu")),
  );
}
menuItemTemplate.within = "neuwo-menu-group, neuwo-menu";
