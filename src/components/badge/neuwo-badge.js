import { NeuwoElement } from "../../core/base-element.js";
import { sheet } from "../../core/sheet.js";
import badgeCss from "./badge.css?raw";

/**
 * On-brand inline label pill with three independent, mix-and-match axes: colour
 * (`variant`), border (`borderless`), and motion (`motion`). Renders the design
 * language's eyebrow "tag" recipe and, composed, its live-status look.
 * Presentational only -- no events, no role. For a label whose text changes at
 * runtime, set `aria-live` and/or an accessible name on the element.
 *
 * @summary Neuwo badge (inline label / status pill).
 * @customElement neuwo-badge
 * @attr {blue|green} variant - colour (default blue).
 * @attr {boolean} borderless - drop the outline for a solid-looking pill.
 * @attr {pulse|shimmer} motion - optional animation: `pulse` a radial ring, `shimmer` a sweep; honours prefers-reduced-motion.
 * @slot - the label content.
 * @csspart badge - the pill element.
 * @cssprop --color-blue - brand accent for the blue variant; re-theme on :root.
 * @cssprop --color-green - brand accent for the green variant; re-theme on :root.
 */
export class NeuwoBadge extends NeuwoElement {
  static styles = sheet(badgeCss);
  static observedAttributes = ["variant", "borderless", "motion"];

  get variant() { return this.getAttribute("variant") || "blue"; }
  set variant(value) {
    if (value == null || value === "") this.removeAttribute("variant");
    else this.setAttribute("variant", String(value));
  }
  get borderless() { return this.hasAttribute("borderless"); }
  set borderless(value) { this.toggleAttribute("borderless", Boolean(value)); }
  get motion() { return this.getAttribute("motion") || ""; }
  set motion(value) {
    if (value == null || value === "") this.removeAttribute("motion");
    else this.setAttribute("motion", String(value));
  }

  render() {
    const classes = ["badge"];
    // Three orthogonal axes, freely combined. Only green deviates on colour; any
    // other value (absent or unknown) renders the blue base.
    if (this.getAttribute("variant") === "green") classes.push("badge--green");
    if (this.hasAttribute("borderless")) classes.push("badge--borderless");
    const motion = this.getAttribute("motion");
    if (motion === "pulse") classes.push("badge--pulse");
    else if (motion === "shimmer") classes.push("badge--shimmer");

    const badge = document.createElement("span");
    badge.className = classes.join(" ");
    badge.setAttribute("part", "badge");
    badge.append(document.createElement("slot"));
    this.shadowRoot.replaceChildren(badge);
  }
}

customElements.define("neuwo-badge", NeuwoBadge);
