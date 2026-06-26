import { NeuwoElement } from "../../core/base-element.js";
import { sheet } from "../../core/sheet.js";
import buttonCss from "./button.css?raw";

/**
 * On-brand button. Renders a `<button>`, or an `<a>` when `href` is set and the
 * element is not disabled. Replicates submit/reset on activation via form internals.
 *
 * @summary Neuwo button (or link button).
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
 * @attr {button|submit|reset} type - activation behaviour for the host form (default button).
 * @attr target - link target, forwarded to the `<a>` when `href` is set.
 * @attr rel - link rel, forwarded to the `<a>` when `href` is set.
 * @attr download - link download, forwarded to the `<a>` when `href` is set.
 * @slot - the button label (default slot).
 * @slot start - leading icon, sits before the label.
 * @slot end - trailing icon, sits after the label.
 * @csspart button - the rendered `<button>` or `<a>`.
 * @cssprop --color-blue - brand accent; re-theme by setting it on :root.
 */
export class NeuwoButton extends NeuwoElement {
  static formAssociated = true;
  static styles = sheet(buttonCss);
  static observedAttributes = [
    "variant",
    "size",
    "hover",
    "wide",
    "xwide",
    "href",
    "disabled",
    "loading",
    "type",
    "target",
    "rel",
    "download",
  ];

  #internals;

  // The real control lives in the shadow root, so it cannot drive the outer form
  // natively. Replicate submit/reset on activation via ElementInternals.
  #onClick = () => {
    if (this.hasAttribute("disabled") || this.hasAttribute("loading") || this.getAttribute("href")) return;
    const form = this.#internals?.form ?? this.closest("form");
    if (!form) return;
    const type = this.getAttribute("type") || "button";
    if (type === "submit") form.requestSubmit();
    else if (type === "reset") form.reset();
  };

  constructor() {
    super();
    // attachInternals is absent in some non-browser test environments.
    this.#internals = typeof this.attachInternals === "function" ? this.attachInternals() : null;
    this.addEventListener("click", this.#onClick);
  }

  // Reflect disabled like a native button, so `el.disabled = true` drives the attribute.
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

  render() {
    const variant = this.getAttribute("variant") || "solid";
    const size = this.getAttribute("size");
    const href = this.getAttribute("href");
    const disabled = this.hasAttribute("disabled");
    const loading = this.hasAttribute("loading");
    const type = this.getAttribute("type") || "button";

    const classes = ["btn", `btn--${variant}`];
    if (size) classes.push(`btn--${size}`);
    const hover = this.getAttribute("hover");
    if (hover === "s" || hover === "l") classes.push(`btn--hover-${hover}`);
    if (this.hasAttribute("wide")) classes.push("btn--wide");
    if (this.hasAttribute("xwide")) classes.push("btn--xwide");
    if (loading) classes.push("btn--loading");

    // An anchor when navigable; a real button otherwise -- a disabled anchor
    // is not a thing, so disabled+href must stay a button to be inert.
    const asLink = href && !disabled;
    const el = document.createElement(asLink ? "a" : "button");
    el.className = classes.join(" ");
    el.setAttribute("part", "button"); // let host pages reach the control across the boundary
    if (asLink) {
      el.setAttribute("href", href);
      for (const attr of ["target", "rel", "download"]) {
        if (this.hasAttribute(attr)) el.setAttribute(attr, this.getAttribute(attr));
      }
    } else {
      const btn = /** @type {HTMLButtonElement} */ (el);
      btn.type = /** @type {"button" | "reset" | "submit"} */ (type);
      btn.disabled = disabled;
    }

    // Forward presentational / accessibility attributes to the rendered control.
    for (const { name, value } of this.attributes) {
      if (name === "title" || name.startsWith("aria-") || name.startsWith("data-")) {
        el.setAttribute(name, value);
      }
    }

    if (loading) {
      el.setAttribute("aria-busy", "true");
      if (!asLink) /** @type {HTMLButtonElement} */ (el).disabled = true;
      const spinner = document.createElement("span");
      spinner.className = "btn__spinner";
      spinner.setAttribute("aria-hidden", "true");
      el.append(spinner);
    }

    const startSlot = document.createElement("slot");
    startSlot.setAttribute("name", "start");
    const endSlot = document.createElement("slot");
    endSlot.setAttribute("name", "end");
    // start icon, then the default (label) slot, then end icon.
    el.append(startSlot, document.createElement("slot"), endSlot);

    this.shadowRoot.replaceChildren(el);
  }
}

customElements.define("neuwo-button", NeuwoButton);
