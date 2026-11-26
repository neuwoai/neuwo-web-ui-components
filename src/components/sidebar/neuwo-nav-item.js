import { NeuwoElement, define } from "../../core/element.js";
import { navItemTemplate } from "./nav-item.template.js";

/**
 * A page entry in a `<neuwo-sidebar>`: a list item holding a link with the `.neuwo-nav-link` look. When the
 * sidebar's `current` names its page, the link carries `aria-current="page"` and the active underline; a page below it
 * does not mark it.
 *
 * @summary Neuwo nav entry. Public classes: `.neuwo-nav-item` on the `<li>`, and `.neuwo-nav-item__link` on the `<a>`, which also carries `.neuwo-nav-link`, with `.neuwo-nav-link--active` on the current page's entry.
 * @customElement neuwo-nav-item
 * @attr href - the page, a path from the site's root or a full URL, compared with the sidebar's `current` in the same form.
 * @slot - the label: text, or inline markup such as a `<neuwo-badge>`.
 */
export class NeuwoNavItem extends NeuwoElement {
  static template = navItemTemplate;
  static observedAttributes = ["href"];

  get href() {
    return this.getAttribute("href") ?? "";
  }
  set href(value) {
    if (value == null || value === "") this.removeAttribute("href");
    else this.setAttribute("href", String(value));
  }
}

define("neuwo-nav-item", NeuwoNavItem);
