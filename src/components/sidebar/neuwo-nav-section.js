import { NeuwoElement, define } from "../../core/element.js";
import { navSectionTemplate } from "./nav-section.template.js";

/**
 * A folding section in a `<neuwo-sidebar>`, holding `<neuwo-nav-item>` entries and further sections to any depth. A
 * click anywhere on its row, or Enter or Space on it, folds or unfolds it, and the chevron at the row's end turns to
 * show which. When the sidebar's `current` page is one of its entries, or lies below one of them, the section's name
 * takes the active underline and the section opens.
 *
 * @summary Neuwo nav section. Public classes: `.neuwo-nav-section` on the `<li>`, with `.neuwo-nav-section--link` when it has an `href` and `.neuwo-nav-section--active` while it holds the current page; `.neuwo-nav-section__details` on the `<details>`; `.neuwo-nav-section__row`, the `<summary>` holding the name and the chevron, or with `href` the link `.neuwo-nav-section__name` beside the `<summary>` `.neuwo-nav-section__toggle`; `.neuwo-nav-section__name`, which also carries `.neuwo-nav-link`, and `.neuwo-nav-link--active` while the section is marked; `.neuwo-nav-section__chevron`; and the nested list `.neuwo-nav-section__list`.
 * @customElement neuwo-nav-section
 * @attr label - the section's name.
 * @attr href - the section's own page, a path from the site's root or a full URL; the name becomes a link to it, carrying `aria-current="page"` there, and the chevron a separate toggle named Show <label> pages. Unset, the name only folds, which is the recommended form.
 * @attr {boolean} open - starts the section open. It is the starting state only: removing it later leaves the section open, since only the reader closes a section.
 * @attr id - the key the section's disclosure carries as `data-key`, for remembering its state; without it the label is the key.
 * @slot - the section's `<neuwo-nav-item>` entries and nested `<neuwo-nav-section>` elements.
 */
export class NeuwoNavSection extends NeuwoElement {
  static template = navSectionTemplate;
  static observedAttributes = ["label", "href", "open", "id"];

  /** @type {HTMLDetailsElement | null} */
  #watched = null;

  #wasOpen = false;

  #reader = false;

  #observer = new MutationObserver(() => this.#keepOpen());

  /** @param {Event} event */
  #onClick = (event) => {
    const summary = this.#watched?.querySelector(":scope > summary");
    if (!summary || !(event.target instanceof Node) || !summary.contains(event.target)) return;
    this.#reader = true;
    // The browser toggles after the click's listeners return, with a microtask checkpoint between, so a microtask is too soon.
    setTimeout(() => (this.#reader = false));
  };

  #keepOpen() {
    const details = this.#watched;
    const reader = this.#reader;
    this.#reader = false;
    if (!details) return;
    if (this.#wasOpen && !details.open && !reader) details.open = true;
    this.#wasOpen = details.open;
  }

  get #details() {
    return /** @type {HTMLDetailsElement | null} */ (this.querySelector(":scope > .neuwo-nav-section > .neuwo-nav-section__details"));
  }

  #guard() {
    const details = this.#details;
    if (details === this.#watched) return;
    this.#release();
    this.#watched = details;
    this.#wasOpen = details?.open ?? false;
    if (!details) return;
    // On the details, not the host: Chromium puts a host with a click listener in the accessibility tree, between the list and its item.
    details.addEventListener("click", this.#onClick);
    this.#observer.observe(details, { attributes: true, attributeFilter: ["open"] });
  }

  #release() {
    this.#observer.disconnect();
    this.#watched?.removeEventListener("click", this.#onClick);
    this.#watched = null;
  }

  connect() {
    this.#guard();
  }

  updated() {
    this.#guard();
  }

  disconnect() {
    this.#release();
  }

  get label() {
    return this.getAttribute("label") ?? "";
  }
  set label(value) {
    if (value == null || value === "") this.removeAttribute("label");
    else this.setAttribute("label", String(value));
  }

  get href() {
    return this.getAttribute("href") ?? "";
  }
  set href(value) {
    if (value == null || value === "") this.removeAttribute("href");
    else this.setAttribute("href", String(value));
  }

  get open() {
    return this.hasAttribute("open");
  }
  set open(value) {
    this.toggleAttribute("open", Boolean(value));
  }
}

define("neuwo-nav-section", NeuwoNavSection);
