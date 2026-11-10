import { NeuwoElement, define } from "../../core/element.js";
import { buttonTemplate } from "./button.template.js";

/**
 * On-brand button. Renders a native `<button>`, or an `<a>` when `href` is set and the
 * element is not disabled. Inside a form the native `<button>` submits or resets it.
 *
 * @summary Neuwo button (or link button). Public classes: `.neuwo-btn` on the `<button>` or `<a>`, with its modifiers `.neuwo-btn--solid`, `--outline`, `--glass`, `--sm`, `--lg`, `--hover-s`, `--hover-l`, `--wide`, `--xwide`, `--block` and `--loading`; `.neuwo-btn__spinner` while loading; and the wrappers `.neuwo-btn__start`, `.neuwo-btn__label` and `.neuwo-btn__end` around the start children, the label and the end children.
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
 * @attr target - link target, forwarded to the `<a>` when `href` is set.
 * @attr rel - link rel, forwarded to the `<a>` when `href` is set.
 * @attr download - link download, forwarded to the `<a>` when `href` is set.
 * @slot - the button label (default slot).
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
    "target",
    "rel",
    "download",
  ];

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
}

define("neuwo-button", NeuwoButton);
