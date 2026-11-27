import { NeuwoElement, define, ownedByReact } from "../../core/element.js";
import { MENU_LABEL, NAV_LABEL, sidebarTemplate } from "./sidebar.template.js";

const MENU = ":scope > .neuwo-sidebar > .neuwo-sidebar__menu";
const ENTRY_LINKS = ".neuwo-nav-item__link, a.neuwo-nav-section__name";

/** @param {MouseEvent} event */
const plain = (event) => event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;

/**
 * Whether following the link leaves the current document for another page of the same origin, the only kind a
 * client-side router can take: not a page elsewhere, and not a place in the current page.
 * @param {HTMLAnchorElement} link
 */
const leaves = (link) => link.origin === location.origin && !(link.href.includes("#") && link.href.split("#")[0] === location.href.split("#")[0]);

/**
 * Site navigation down the side of the page. From 48rem it is a column, sticky at the top and the full viewport tall,
 * with the brand at the top, the nav of `<neuwo-nav-item>` entries and folding `<neuwo-nav-section>` sections taking
 * the slack and scrolling on its own, and the footer at the bottom. Below 48rem it is a glass bar pinned to the top,
 * the brand at the start and a menu button at the end that shows and hides the nav, the after-nav place and the footer
 * below the bar. The menu starts closed and its button works before and without the script, since it is a `<details>`
 * summary; from 48rem the nav shows whatever the menu's state. Following any link in the sidebar closes the menu,
 * unless a modifier key or the middle button opens it elsewhere, and when a client-side router keeps the page, focus
 * goes back to the menu button.
 *
 * The entry whose `href` names the `current` page carries `aria-current="page"` and the active underline, and the
 * sections holding it are marked and open. On a plain click of an entry's or a section's own link to another page of
 * the same origin the sidebar fires `navigate`, so a site with a client-side router can cancel it and route instead;
 * a link elsewhere, or to a place in the current page, is the browser's to follow, and the links in the other places
 * are the site's own. With `remember`, the sections the reader leaves open and the nav's scroll follow them from page
 * to page for the tab.
 *
 * In React, write the entries and sections as JSX directly inside the sidebar; an inline `.map()` is fine. The JSX
 * runtime cannot see into a component of your own, so the entries such a component renders mark nothing, and the
 * sections around them cannot tell that they hold the page.
 *
 * @summary Neuwo sidebar. Public classes: `.neuwo-sidebar` on the `<aside>`, which holds `.neuwo-sidebar__bar` around the wrappers `.neuwo-sidebar__brand` and `.neuwo-sidebar__actions`, then `.neuwo-sidebar__menu`, the `<details>` holding the menu button `.neuwo-sidebar__toggle` with its `.neuwo-sidebar__toggle-icon`, the `<nav>` `.neuwo-sidebar__nav` around the entries' list `.neuwo-sidebar__list`, and the wrappers `.neuwo-sidebar__after-nav` and `.neuwo-sidebar__footer`; with `remember`, the `<aside>` carries `data-remember` and ends with the script `.neuwo-sidebar__remember`.
 * @customElement neuwo-sidebar
 * @attr label - the nav's accessible name (default Main).
 * @attr current - the current page, a path from the site's root or a full URL, which marks the entry naming it; without it the element takes `location.pathname` once it runs. A React or Next.js app must pass it: before React hydrates a server-rendered sidebar, the element cannot tell that React rendered it, so it would write the location into markup React owns.
 * @attr {boolean|string} remember - keeps the sections the reader leaves open and the nav's scroll for the tab, in `sessionStorage` under the key it names (default neuwo.sidebar), through an inline script after the nav that the parser runs on a served page and the element runs as it renders; a sidebar React renders on the client does not run it.
 * @attr menu-label - the menu button's accessible name (default Menu).
 * @fires {CustomEvent<{ href: string }>} navigate - a plain click on an entry's or a section's own link to another page of the same origin, before the browser follows it; cancelable, and cancelling keeps the page, so a client-side router can take the `href` instead. A link to another origin, or to a place in the current page, never fires it. It bubbles.
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
    if (!link || !this.contains(link)) return;
    const menu = this.#menu;
    if (!event.defaultPrevented) {
      if (!plain(/** @type {MouseEvent} */ (event))) return;
      const nav = menu?.querySelector(":scope > .neuwo-sidebar__nav");
      if (link instanceof HTMLAnchorElement && link.matches(ENTRY_LINKS) && nav?.contains(link) && leaves(link)) {
        const detail = { href: /** @type {string} */ (link.getAttribute("href")) };
        if (!this.dispatchEvent(new CustomEvent("navigate", { bubbles: true, cancelable: true, detail }))) event.preventDefault();
      }
    }
    const closing = menu?.open && menu.contains(link) ? menu : null;
    this.menuOpen = false;
    // After the dispatch, since a router listening above the sidebar, as React does at its root, prevents the default later.
    if (closing) setTimeout(() => this.#refocus(event, closing, link));
  };

  /**
   * Puts focus on the menu button once a click inside the menu closed it and the page stayed, so the reader is not left
   * on a link the menu hides, unless something else has taken focus since.
   * @param {Event} event
   * @param {HTMLDetailsElement} menu
   * @param {Element} link
   */
  #refocus(event, menu, link) {
    if (!event.defaultPrevented || menu.open || !menu.isConnected) return;
    const active = document.activeElement;
    if (active && active !== document.body && active !== link && !menu.contains(active)) return;
    /** @type {HTMLElement | null} */ (menu.querySelector(":scope > .neuwo-sidebar__toggle"))?.focus({ preventScroll: true });
  }

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
    return /** @type {HTMLDetailsElement | null} */ (this.querySelector(MENU));
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
