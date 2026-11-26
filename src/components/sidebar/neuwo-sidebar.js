import { NeuwoElement, define, ownedByReact } from "../../core/element.js";
import { MENU_LABEL, NAV_LABEL, sidebarTemplate } from "./sidebar.template.js";

const NAV = ":scope > .neuwo-sidebar > .neuwo-sidebar__menu > .neuwo-sidebar__nav";
const ENTRY_LINKS = ".neuwo-nav-item__link, a.neuwo-nav-section__name";

/** @param {MouseEvent} event */
const plain = (event) => event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;

/**
 * Site navigation down the side of the page. From 48rem it is a column, sticky at the top and the full viewport tall,
 * with the brand at the top, the nav of `<neuwo-nav-item>` entries and folding `<neuwo-nav-section>` sections taking
 * the slack and scrolling on its own, and the footer at the bottom. Below 48rem it is a glass bar pinned to the top,
 * the brand at the start and a menu button at the end that shows and hides the nav, the after-nav place and the footer
 * below the bar. The menu starts closed and its button works before and without the script, since it is a `<details>`
 * summary; from 48rem the nav shows whatever the menu's state. Following a link in the nav closes the menu, unless a
 * modifier key or the middle button opens it elsewhere.
 *
 * The entry whose `href` names the `current` page carries `aria-current="page"` and the active underline, and the
 * sections holding it are marked and open. On a plain click of an entry's or a section's own link the sidebar fires
 * `navigate`, so a site with a client-side router can cancel it and route instead; the links in the other places are
 * the site's own.
 *
 * @summary Neuwo sidebar. Public classes: `.neuwo-sidebar` on the `<aside>`, which holds `.neuwo-sidebar__bar` around the wrappers `.neuwo-sidebar__brand` and `.neuwo-sidebar__actions`, then `.neuwo-sidebar__menu`, the `<details>` holding the menu button `.neuwo-sidebar__toggle` with its `.neuwo-sidebar__toggle-icon`, the `<nav>` `.neuwo-sidebar__nav` around the entries' list `.neuwo-sidebar__list`, and the wrappers `.neuwo-sidebar__after-nav` and `.neuwo-sidebar__footer`.
 * @customElement neuwo-sidebar
 * @attr label - the nav's accessible name (default Main).
 * @attr current - the current page, a path from the site's root or a full URL, which marks the entry naming it; without it the element takes `location.pathname` once it runs, unless React rendered it.
 * @attr {boolean|string} remember - keeps the reader's place in the nav for the tab, under the storage key it names (default neuwo.sidebar); not yet in effect.
 * @attr menu-label - the menu button's accessible name (default Menu).
 * @fires {CustomEvent<{ href: string }>} navigate - a plain click on an entry's or a section's own link, before the browser follows it; cancelable, and cancelling keeps the page, so a client-side router can take the `href` instead. It bubbles.
 * @slot - the `<neuwo-nav-item>` entries and `<neuwo-nav-section>` sections.
 * @slot brand - the top of the column, centred; the start of the bar below 48rem.
 * @slot actions - controls in the bar before the menu button, below 48rem only.
 * @slot after-nav - content between the nav and the footer, outside the nav's scroll; inside the menu below 48rem.
 * @slot footer - the bottom of the column, ruled off above; inside the menu below 48rem.
 * @cssprop --neuwo-sidebar-width - the column's width from 48rem (default 17rem); read, never declared, so set it on the element or an ancestor.
 */
export class NeuwoSidebar extends NeuwoElement {
  static template = sidebarTemplate;
  static observedAttributes = ["label", "current", "remember", "menu-label"];

  /** @param {Event} event */
  #onClick = (event) => {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!link || !this.querySelector(NAV)?.contains(link)) return;
    if (!event.defaultPrevented) {
      if (!plain(/** @type {MouseEvent} */ (event))) return;
      if (link.matches(ENTRY_LINKS)) {
        const detail = { href: /** @type {string} */ (link.getAttribute("href")) };
        if (!this.dispatchEvent(new CustomEvent("navigate", { bubbles: true, cancelable: true, detail }))) event.preventDefault();
      }
    }
    this.menuOpen = false;
  };

  get label() {
    return this.getAttribute("label") || NAV_LABEL;
  }
  set label(value) {
    if (value == null || value === "") this.removeAttribute("label");
    else this.setAttribute("label", String(value));
  }

  get current() {
    return this.getAttribute("current") ?? "";
  }
  set current(value) {
    if (value == null || value === "") this.removeAttribute("current");
    else this.setAttribute("current", String(value));
  }

  /**
   * The `remember` attribute, an empty string for the default key, or null when it is absent. Setting true sets it
   * empty, and false or null removes it.
   * @returns {string | null}
   */
  get remember() {
    return this.getAttribute("remember");
  }
  /** @param {string | boolean | null} value */
  set remember(value) {
    if (value == null || value === false) this.removeAttribute("remember");
    else this.setAttribute("remember", value === true ? "" : String(value));
  }

  get menuLabel() {
    return this.getAttribute("menu-label") || MENU_LABEL;
  }
  set menuLabel(value) {
    if (value == null || value === "") this.removeAttribute("menu-label");
    else this.setAttribute("menu-label", String(value));
  }

  /**
   * Whether the menu below 48rem is open. Setting it opens or closes it, as the menu button does; from 48rem the nav
   * shows either way. It is not reflected to an attribute, so it never writes a host React rendered.
   * @returns {boolean}
   */
  get menuOpen() {
    return this.#menu?.open ?? false;
  }
  set menuOpen(value) {
    const menu = this.#menu;
    if (menu && menu.open !== Boolean(value)) menu.open = Boolean(value);
  }

  get #menu() {
    return /** @type {HTMLDetailsElement | null} */ (this.querySelector(":scope > .neuwo-sidebar > .neuwo-sidebar__menu"));
  }

  connect() {
    if (!this.hasAttribute("current") && !ownedByReact(this)) this.current = location.pathname;
    this.addEventListener("click", this.#onClick);
  }

  disconnect() {
    this.removeEventListener("click", this.#onClick);
  }
}

define("neuwo-sidebar", NeuwoSidebar);
