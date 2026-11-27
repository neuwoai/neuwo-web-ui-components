import { NeuwoElement, define } from "../../core/element.js";
import { menuPanelId } from "../menu/menu.template.js";
import { MENU_LABEL, buttonTemplate } from "./button.template.js";

/** @typedef {import("../menu/neuwo-menu.js").NeuwoMenu} NeuwoMenu */

/**
 * On-brand button. Renders a native `<button>`, or an `<a>` when `href` is set and the
 * element is not disabled. Inside a form the native `<button>` submits or resets it.
 *
 * With `menu`, the native button opens the `<neuwo-menu>` of that id through `popovertarget`: it is always a
 * `<button type="button">`, announces the menu, and is `aria-expanded` while the menu is open from it, so of several
 * buttons sharing one menu only the one that opened it has `aria-expanded="true"`, though Chromium reports them all
 * as expanded while the menu is open. A chevron follows the end children and turns while the menu is open. A button
 * naming no menu on the page stays an ordinary button.
 *
 * With `split` as well, the button renders two halves in one pill. The main half is the button as it is without
 * `menu`, so `href`, `type` and the form attributes apply to it, and the toggle half, named by `menu-label`, opens the
 * menu. Only the main half's clicks reach the host's listeners. `disabled` disables both halves; `loading` disables
 * the toggle half, and the main half too unless it is a link, which stays a link marked busy.
 *
 * @summary Neuwo button (or link button). Public classes: `.neuwo-btn` on the `<button>` or `<a>`, with its modifiers `.neuwo-btn--solid`, `--outline`, `--glass`, `--sm`, `--lg`, `--hover-s`, `--hover-l`, `--wide`, `--xwide`, `--block`, `--loading` and `--icon-only`; `.neuwo-btn__spinner` on the loading ring, which is also a `.neuwo-spinner`, the `<neuwo-spinner>` ring; the wrappers `.neuwo-btn__start`, `.neuwo-btn__label` and `.neuwo-btn__end` around the start children, the label and the end children; `.neuwo-btn__chevron` after the end wrapper while `menu` is set without `icon-only`; `.neuwo-btn__dots` after the label wrapper on an `icon-only` button with `menu` and no label content, unless it is loading; and with `split`, the wrapper `.neuwo-btn-split` around the main half `.neuwo-btn-split__main` and the toggle half `.neuwo-btn-split__toggle`, both `.neuwo-btn` with the variant, the toggle half holding the chevron.
 * @customElement neuwo-button
 * @attr {solid|outline|glass} variant - visual style (default solid).
 * @attr {sm|lg} size - size preset (default medium when unset).
 * @attr {s|m|l} hover - hover-emphasis level: s calmer, l stronger (default m = base).
 * @attr {boolean} wide - extra horizontal padding.
 * @attr {boolean} xwide - maximal horizontal padding.
 * @attr {boolean} block - stretch the button to the container width.
 * @attr href - when set (and not disabled), renders a navigable link.
 * @attr {boolean} disabled - disables the button (a disabled `href` stays a button to be inert).
 * @attr {boolean} loading - shows the shared spinner, sets aria-busy, and blocks activation while keeping the button's colour.
 * @attr {button|submit|reset} type - native button type, for the enclosing form (default button).
 * @attr form - id of the form the native button belongs to, when it sits outside it.
 * @attr name - name the native button submits with its form.
 * @attr value - value the native button submits under `name`.
 * @attr target - link target, forwarded to the `<a>` when `href` is set.
 * @attr rel - link rel, forwarded to the `<a>` when `href` is set.
 * @attr download - link download, forwarded to the `<a>` when `href` is set.
 * @attr menu - id of the `<neuwo-menu>` the button opens; without `split`, the native button is then a `<button type="button">` whatever `href` and `type` say, and shows a chevron.
 * @attr {boolean} icon-only - a round button whose content is its icon, padded by its font size; with `menu` and no content it shows three dots, and never the chevron; while loading, the spinner takes the icon's place. Name it with `aria-label`. Ignored on a `split` button.
 * @attr {boolean} split - with `menu`, splits the button into a main half that acts as the button does without `menu` and a toggle half that opens the menu; ignored without `menu`.
 * @attr menu-label - the accessible name of a `split` button's toggle half (default More Options).
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
    "split",
    "menu-label",
  ];

  /** @type {Node | null} */
  #root = null;

  /** @param {Event} event */
  #onClick = (event) => {
    const target = /** @type {Node | null} */ (event.target);
    const split = this.querySelector(":scope > .neuwo-btn-split");
    if (split?.contains(target) && !split.querySelector(":scope > .neuwo-btn-split__main")?.contains(target)) event.stopPropagation();
  };

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

  get split() {
    return this.hasAttribute("split");
  }

  set split(value) {
    this.toggleAttribute("split", Boolean(value));
  }

  get menuLabel() {
    return this.getAttribute("menu-label") || MENU_LABEL;
  }

  set menuLabel(value) {
    if (value == null || value === "") this.removeAttribute("menu-label");
    else this.setAttribute("menu-label", String(value));
  }

  connect() {
    this.#root = this.getRootNode();
    this.#root.addEventListener("toggle", this.#onToggle, true);
    this.addEventListener("click", this.#onClick, true);
  }

  disconnect() {
    this.#root?.removeEventListener("toggle", this.#onToggle, true);
    this.#root = null;
    this.removeEventListener("click", this.#onClick, true);
  }

  updated() {
    this.#mark();
  }

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
