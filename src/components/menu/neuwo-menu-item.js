import { DEFAULT_REGION } from "../../core/template.js";
import { childInfo } from "../../core/adapters/dom.js";
import { NeuwoElement, define } from "../../core/element.js";
import { menuItemTemplate } from "./menu-item.template.js";

/**
 * A menu item inside a `<neuwo-menu-group>` or directly in a `<neuwo-menu>`. Its control is a button, or a real link
 * with `href`, focusable but not activatable while `disabled`. In a group with `select` it is a radio or checkbox
 * item, its check in the start position. A `<neuwo-menu>` in its `submenu` slot makes it open that menu, with a
 * chevron at its inline end. The global `hidden` attribute removes it from the menu.
 *
 * @summary Neuwo menu item. Public classes: `.neuwo-menu-item` on the `role="none"` `<div>`, with `--red` and `--green`; `.neuwo-menu-item__control` on the `<button>` or `<a>`, which holds `.neuwo-menu-item__check` on a checkable item, the wrappers `.neuwo-menu-item__start` and `.neuwo-menu-item__label` around the start icon and the label, `.neuwo-menu-item__hint`, a new-tab link's `.neuwo-menu-item__external` mark and visually hidden `.neuwo-menu-item__new-tab` text, and a submenu parent's `.neuwo-menu-item__chevron`; `.neuwo-menu-item__submenu` around the submenu.
 * @customElement neuwo-menu-item
 * @attr value - the value reported when the item is picked (default: its label text).
 * @attr hint - short trailing text, such as a shortcut, a file type or a plan.
 * @attr {red|green} tone - colours the label and the icon.
 * @attr {boolean} disabled - dims the item, which stays focusable but cannot be picked.
 * @attr {boolean} checked - the starting state of an item in a group with `select`.
 * @attr href - makes the item a link, unless it is disabled, checkable or opens a submenu.
 * @attr target - link target, forwarded to the `<a>`; `_blank` adds the external mark and tells screen readers it opens a new tab.
 * @attr rel - link rel, forwarded to the `<a>`.
 * @attr download - link download, forwarded to the `<a>`.
 * @slot - the label.
 * @slot start - a start icon, before the label.
 * @slot submenu - a nested `<neuwo-menu>` the item opens.
 * @cssprop --neuwo-color-blue - the hover tint, the hovered icon and a checked item; re-theme by setting it on :root.
 */
export class NeuwoMenuItem extends NeuwoElement {
  static template = menuItemTemplate;
  static observedAttributes = ["value", "hint", "tone", "disabled", "checked", "href", "target", "rel", "download"];

  /**
   * The `value` attribute, else the label text, trimmed. Setting it sets the attribute.
   * @returns {string}
   */
  get value() {
    const value = this.getAttribute("value");
    if (value !== null) return value;
    return childInfo(this, menuItemTemplate)
      .filter((child) => child.slot === DEFAULT_REGION)
      .map((child) => child.text)
      .join("")
      .trim();
  }
  set value(value) {
    if (value == null) this.removeAttribute("value");
    else this.setAttribute("value", String(value));
  }

  get hint() {
    return this.getAttribute("hint") ?? "";
  }
  set hint(value) {
    if (value == null || value === "") this.removeAttribute("hint");
    else this.setAttribute("hint", String(value));
  }

  get tone() {
    return this.getAttribute("tone") ?? "";
  }
  set tone(value) {
    if (value == null || value === "") this.removeAttribute("tone");
    else this.setAttribute("tone", String(value));
  }

  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(value) {
    this.toggleAttribute("disabled", Boolean(value));
  }

  get checked() {
    return this.hasAttribute("checked");
  }
  set checked(value) {
    this.toggleAttribute("checked", Boolean(value));
  }

  get href() {
    return this.getAttribute("href") ?? "";
  }
  set href(value) {
    if (value == null || value === "") this.removeAttribute("href");
    else this.setAttribute("href", String(value));
  }
}

define("neuwo-menu-item", NeuwoMenuItem);
