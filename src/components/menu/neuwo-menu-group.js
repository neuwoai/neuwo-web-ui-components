import { NeuwoElement, define } from "../../core/element.js";
import { menuGroupTemplate } from "./menu-group.template.js";

/**
 * A group of `<neuwo-menu-item>` elements inside a `<neuwo-menu>`, with an optional heading. A divider separates it
 * from the group before it; the first group has none. Its `select` makes its items checkable: radio items, one of
 * which is checked, or checkbox items. A group whose items are all `hidden` is hidden with its heading and divider.
 *
 * @summary Neuwo menu group. Public classes: `.neuwo-menu-group` on the `role="group"` `<div>`, with `--no-divider`; `.neuwo-menu-group__divider`, `.neuwo-menu-group__heading` while `heading` is set, and `.neuwo-menu-group__items` around the items.
 * @customElement neuwo-menu-group
 * @attr heading - a label shown above the items, which names the group for screen readers.
 * @attr {one|many} select - makes the items checkable: `one` radio items, one checked at a time, `many` checkbox items; absent, they are actions.
 * @attr {boolean} no-divider - drops the divider between this group and the one before it.
 * @slot - the `<neuwo-menu-item>` elements.
 * @cssprop --neuwo-glass-border - the divider's colour; re-theme by setting it on :root.
 */
export class NeuwoMenuGroup extends NeuwoElement {
  static template = menuGroupTemplate;
  static observedAttributes = ["heading", "select", "no-divider"];

  get heading() {
    return this.getAttribute("heading") ?? "";
  }
  set heading(value) {
    if (value == null || value === "") this.removeAttribute("heading");
    else this.setAttribute("heading", String(value));
  }

  get select() {
    return this.getAttribute("select") ?? "";
  }
  set select(value) {
    if (value == null || value === "") this.removeAttribute("select");
    else this.setAttribute("select", String(value));
  }

  get noDivider() {
    return this.hasAttribute("no-divider");
  }
  set noDivider(value) {
    this.toggleAttribute("no-divider", Boolean(value));
  }
}

define("neuwo-menu-group", NeuwoMenuGroup);
