import { DEFAULT_REGION, h, has, live, region } from "../../core/template.js";
import { menuPanelId } from "../menu/menu.template.js";

/**
 * The attributes that make a native button open the menu whose id is `menu`.
 * @param {string} menu
 * @returns {Record<string, string>}
 */
export const menuTrigger = (menu) => ({
  type: "button",
  popovertarget: menuPanelId(menu),
  "aria-haspopup": "menu",
  "aria-controls": menuPanelId(menu),
  "aria-expanded": "false",
});

export const MENU_LABEL = "More Options";

/**
 * @param {Record<string, string>} attrs
 * @param {import("../../core/template.js").TemplateContext} ctx
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function buttonTemplate(attrs, ctx) {
  const disabled = has(attrs, "disabled");
  const loading = has(attrs, "loading");
  const iconOnly = has(attrs, "icon-only");
  const menu = attrs.menu || "";
  const split = Boolean(menu) && has(attrs, "split");
  const opens = Boolean(menu) && !split;
  const link = Boolean(attrs.href) && !disabled && !opens;

  const shared = [`neuwo-btn--${attrs.variant || "solid"}`];
  if (attrs.size) shared.push(`neuwo-btn--${attrs.size}`);
  if (attrs.hover === "s" || attrs.hover === "l") shared.push(`neuwo-btn--hover-${attrs.hover}`);
  const classes = ["neuwo-btn", ...shared];
  for (const modifier of ["wide", "xwide", "loading", "block", "icon-only"]) {
    if (has(attrs, modifier)) classes.push(`neuwo-btn--${modifier}`);
  }
  if (split) classes.unshift("neuwo-btn-split__main");

  /** @type {Record<string, string | boolean>} */
  const props = { class: classes.join(" ") };
  if (link) {
    props.href = attrs.href;
    for (const name of ["target", "rel", "download"]) if (has(attrs, name)) props[name] = attrs[name];
  } else {
    props.type = attrs.type || "button";
    props.disabled = disabled || loading;
    for (const name of ["form", "name", "value"]) if (has(attrs, name)) props[name] = attrs[name];
  }
  for (const [name, value] of Object.entries(attrs)) {
    if (name === "title" || name.startsWith("aria-")) props[name] = value;
  }
  if (loading) props["aria-busy"] = "true";
  if (opens) Object.assign(props, menuTrigger(menu));

  const empty = !ctx.children.some((child) => child.slot === DEFAULT_REGION);
  const chevron = h("span", { class: "neuwo-btn__chevron", "aria-hidden": "true" });
  const node = h(
    link ? "a" : "button",
    props,
    loading && h("span", { class: "neuwo-btn__spinner", "aria-hidden": "true" }),
    h("span", { class: "neuwo-btn__start" }, region("start")),
    h("span", { class: "neuwo-btn__label" }, region()),
    iconOnly && opens && !loading && empty && h("span", { class: "neuwo-btn__dots", "aria-hidden": "true" }),
    h("span", { class: "neuwo-btn__end" }, region("end")),
    opens && !iconOnly && chevron,
  );
  if (!split) return opens ? live(node) : node;
  const toggle = h(
    "button",
    {
      class: ["neuwo-btn-split__toggle", "neuwo-btn", ...shared].join(" "),
      ...menuTrigger(menu),
      "aria-label": attrs["menu-label"] || MENU_LABEL,
      disabled: disabled || loading,
    },
    chevron,
  );
  return h("span", { class: "neuwo-btn-split" }, node, live(toggle));
}
