import { NeuwoElement, define } from "../../core/element.js";
import { menuPanelId } from "../menu/menu.template.js";
import { buttonTemplate } from "./button.template.js";

/** @typedef {import("../menu/neuwo-menu.js").NeuwoMenu} NeuwoMenu */

/**
 * On-brand button. Renders a native `<button>`, or an `<a>` when `href` is set and the
 * element is not disabled. Inside a form the native `<button>` submits or resets it.
 *
 * With `menu`, the native button opens the `<neuwo-menu>` of that id through `popovertarget`: it is always a
 * `<button type="button">`, announces the menu, and is `aria-expanded` while the menu is open from it, so of several
 * buttons sharing one menu only the one that opened it reads expanded. A chevron follows the end children and turns
 * while the menu is open. A button naming no menu on the page stays an ordinary button.
 *
 * @summary Neuwo button (or link button). Public classes: `.neuwo-btn` on the `<button>` or `<a>`, with its modifiers `.neuwo-btn--solid`, `--outline`, `--glass`, `--sm`, `--lg`, `--hover-s`, `--hover-l`, `--wide`, `--xwide`, `--block`, `--loading` and `--icon-only`; `.neuwo-btn__spinner` while loading; the wrappers `.neuwo-btn__start`, `.neuwo-btn__label` and `.neuwo-btn__end` around the start children, the label and the end children; `.neuwo-btn__chevron` after the end wrapper while `menu` is set without `icon-only`; and `.neuwo-btn__dots` after the label wrapper on an `icon-only` button with `menu` and no label content.
 * @customElement neuwo-button
 * @attr {solid|outline|glass} variant - visual style (default solid).
 * @attr {sm|lg} size - size preset (default medium when unset).
 * @attr {s|m|l} hover - hover-emphasis level: s calmer, l stronger (default m = base).
 * @attr {boolean} wide - extra horizontal padding.
 * @attr {boolean} xwide - maximal horizontal padding.
 * @attr {boolean} block - stretch the button to the container width.
 * @attr href - when set (and not disabled), renders a navigable link.
 * @attr {boolean} disabled - disables the button (a disabled `href` stays a button to be inert).
 * @attr {boolean} loading - shows a spinner, sets aria-busy, and blocks activation while keeping the button's colour.
 * @attr {button|submit|reset} type - native button type, for the enclosing form (default button).
 * @attr form - id of the form the native button belongs to, when it sits outside it.
 * @attr name - name the native button submits with its form.
 * @attr value - value the native button submits under `name`.
 * @attr target - link target, forwarded to the `<a>` when `href` is set.
 * @attr rel - link rel, forwarded to the `<a>` when `href` is set.
 * @attr download - link download, forwarded to the `<a>` when `href` is set.
 * @attr menu - id of the `<neuwo-menu>` the button opens; the native button is then a `<button type="button">` whatever `href` and `type` say, and shows a chevron.
 * @attr {boolean} icon-only - a round button whose content is its icon, padded by its font size; with `menu` and no content it shows three dots, and never the chevron. Name it with `aria-label`.
 * @slot - the button label, or the icon of an `icon-only` button (default slot).
 * @slot start - leading icon, sits before the label.
 * @slot end - trailing icon, sits after the label.
 * @cssprop --neuwo-color-blue - brand accent; re-theme by setting it on :root.
 */
export class NeuwoButton extends NeuwoElement {
  static template = buttonTemplate;
  static observedAttributes = [
    "variant",
    "size",
    "hover",
    "wide",
    "xwide",
    "block",
    "href",
    "disabled",
    "loading",
    "type",
    "form",
    "name",
    "value",
    "target",
    "rel",
    "download",
    "menu",
    "icon-only",
  ];

  /** @type {Node | null} */
  #root = null;

  /** @param {Event} event */
  #onToggle = (event) => {
    const menu = this.menu;
    if (menu && event.target instanceof Element && event.target.id === menuPanelId(menu)) this.#mark();
  };

  get disabled() {
    return this.hasAttribute("disabled");
  }

  set disabled(value) {
    this.toggleAttribute("disabled", Boolean(value));
  }

  get loading() {
    return this.hasAttribute("loading");
  }

  set loading(value) {
    this.toggleAttribute("loading", Boolean(value));
  }

  get hover() {
    return this.getAttribute("hover") || "m";
  }

  set hover(value) {
    if (value == null || value === "") this.removeAttribute("hover");
    else this.setAttribute("hover", String(value));
  }

  get menu() {
    return this.getAttribute("menu") || "";
  }

  set menu(value) {
    if (value == null || value === "") this.removeAttribute("menu");
    else this.setAttribute("menu", String(value));
  }

  get iconOnly() {
    return this.hasAttribute("icon-only");
  }

  set iconOnly(value) {
    this.toggleAttribute("icon-only", Boolean(value));
  }

  connect() {
    this.#root = this.getRootNode();
    this.#root.addEventListener("toggle", this.#onToggle, true);
  }

  disconnect() {
    this.#root?.removeEventListener("toggle", this.#onToggle, true);
    this.#root = null;
  }

  updated() {
    this.#mark();
  }

  /** Writes `aria-expanded` on the native button that opens the menu: true only while the menu is open from this button. */
  #mark() {
    const menu = this.menu;
    if (!menu) return;
    const id = menuPanelId(menu);
    const button = Array.from(this.querySelectorAll("button[popovertarget]")).find((each) => each.getAttribute("popovertarget") === id);
    if (!button) return;
    const root = this.getRootNode();
    const panel = "getElementById" in root ? /** @type {Document | ShadowRoot} */ (root).getElementById(id) : null;
    const owner = /** @type {NeuwoMenu | null | undefined} */ (panel?.closest("neuwo-menu"));
    const expanded = String(owner?.trigger === this);
    if (button.getAttribute("aria-expanded") !== expanded) button.setAttribute("aria-expanded", expanded);
  }
}

define("neuwo-button", NeuwoButton);
