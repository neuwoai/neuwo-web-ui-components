import { NeuwoElement } from "../../core/base-element.js";
import { sheet } from "../../core/sheet.js";
import ctaCss from "./cta.css?raw";

function el(tag, className, part) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (part) node.setAttribute("part", part);
  return node;
}

function slot(name) {
  const s = document.createElement("slot");
  if (name) s.setAttribute("name", name);
  return s;
}

/**
 * Call-to-action band: a headline, a supporting line, and one or two action
 * buttons on a branded surface. Two variants: `banner` (a flat horizontal bar
 * for page-foot CTAs) and `spotlight` (a centred hero card framed by an animated
 * gradient border that comes alive on hover). Wrap headline words in an element
 * with `data-accent` to paint just those words with the brand gradient.
 * Presentational, the actions are slotted `<neuwo-button>`s.
 *
 * @summary Neuwo call-to-action band.
 * @customElement neuwo-cta
 * @attr {banner|spotlight} variant - layout and chrome (default banner).
 * @slot - the headline; wrap gradient fragments in an element with `data-accent`.
 * @slot sub - the supporting line under the headline.
 * @slot actions - one or two action buttons.
 * @csspart cta - the outer band.
 * @csspart inner - the inner panel (spotlight variant only).
 * @csspart headline - the headline element.
 * @csspart sub - the supporting line.
 * @csspart actions - the actions row.
 * @cssprop --color-blue - brand accent (shimmer + gradient border); re-theme on :root.
 * @cssprop --color-green - brand accent (gradient border + text accent); re-theme on :root.
 */
export class NeuwoCta extends NeuwoElement {
  static styles = sheet(ctaCss);
  static observedAttributes = ["variant"];

  get variant() { return this.getAttribute("variant") || "banner"; }
  set variant(value) {
    if (value == null || value === "") this.removeAttribute("variant");
    else this.setAttribute("variant", String(value));
  }

  render() {
    const spotlight = this.getAttribute("variant") === "spotlight";
    const root = el("div", `cta cta--${spotlight ? "spotlight" : "banner"}`, "cta");

    const headline = el("h2", "cta__headline", "headline");
    headline.append(slot()); // default slot carries the headline content
    const sub = el("p", "cta__sub", "sub");
    sub.append(slot("sub"));
    const actions = el("div", "cta__actions", "actions");
    actions.append(slot("actions"));

    if (spotlight) {
      // card -> blurred glow halo + inner panel (the gradient-frame layering).
      const glow = el("div", "cta__glow");
      glow.setAttribute("aria-hidden", "true");
      const inner = el("div", "cta__inner", "inner");
      inner.append(headline, sub, actions);
      root.append(glow, inner);
    } else {
      const body = el("div", "cta__body");
      body.append(headline, sub);
      root.append(body, actions);
    }

    this.shadowRoot.replaceChildren(root);
  }
}

customElements.define("neuwo-cta", NeuwoCta);
