import { NeuwoShadowElement } from "../../core/shadow-element.js";
import { sheet } from "../../core/sheet.js";
import badgeCss from "./badge.css?raw";

/**
 * On-brand inline label pill with six independent, mix-and-match axes: colour
 * (`variant`), size (`size`), border (`borderless`), motion (`motion`), motion
 * amplitude (`intensity`), and glow (`glow`). Renders the design language's
 * eyebrow "tag" recipe and, composed,
 * its live-status look. The label renders as authored: pass upper-case text for
 * the eyebrow look, or mixed-case for a plain pill; the consumer owns casing
 * (host `text-transform` inherits through the shadow boundary into the label).
 * Restyle weight/colour/spacing from the host via `::part(badge)`.
 * Presentational only -- no events, no role. For a label whose text changes at
 * runtime, set `aria-live` and/or an accessible name on the element.
 *
 * @summary Neuwo badge (inline label / status pill).
 * @customElement neuwo-badge
 * @attr {blue|green} variant - colour (default blue).
 * @attr {s|m|l} size - density scale, font-size only (default m): s 0.625rem, m 0.75rem, l 0.875rem.
 * @attr {boolean} borderless - drop the outline for a solid-looking pill.
 * @attr {pulse|shimmer} motion - optional animation: `pulse` a radial ring, `shimmer` a sweep; honours prefers-reduced-motion.
 * @attr {s|m|l} intensity - amplitude of the active motion (default m): pulse ring size, shimmer sweep width. No effect without `motion`.
 * @attr {boolean} glow - neon bloom keyed to the variant colour; composes with any variant and motion.
 * @slot - the label content.
 * @csspart badge - the pill element.
 * @cssprop --neuwo-color-blue - brand accent for the blue variant; re-theme on :root.
 * @cssprop --neuwo-color-green - brand accent for the green variant; re-theme on :root.
 */
export class NeuwoBadge extends NeuwoShadowElement {
  static styles = sheet(badgeCss);
  static observedAttributes = ["variant", "size", "borderless", "motion", "intensity", "glow"];

  get variant() { return this.getAttribute("variant") || "blue"; }
  set variant(value) {
    if (value == null || value === "") this.removeAttribute("variant");
    else this.setAttribute("variant", String(value));
  }
  get size() { return this.getAttribute("size") || "m"; }
  set size(value) {
    if (value == null || value === "") this.removeAttribute("size");
    else this.setAttribute("size", String(value));
  }
  get borderless() { return this.hasAttribute("borderless"); }
  set borderless(value) { this.toggleAttribute("borderless", Boolean(value)); }
  get motion() { return this.getAttribute("motion") || ""; }
  set motion(value) {
    if (value == null || value === "") this.removeAttribute("motion");
    else this.setAttribute("motion", String(value));
  }
  get intensity() { return this.getAttribute("intensity") || "m"; }
  set intensity(value) {
    if (value == null || value === "") this.removeAttribute("intensity");
    else this.setAttribute("intensity", String(value));
  }
  get glow() { return this.hasAttribute("glow"); }
  set glow(value) { this.toggleAttribute("glow", Boolean(value)); }

  render() {
    const classes = ["badge"];
    // Orthogonal axes, freely combined. Only green deviates on colour; any
    // other value (absent or unknown) renders the blue base.
    if (this.getAttribute("variant") === "green") classes.push("badge--green");
    const size = this.getAttribute("size");
    if (size === "s" || size === "l") classes.push(`badge--${size}`);
    if (this.hasAttribute("borderless")) classes.push("badge--borderless");
    if (this.hasAttribute("glow")) classes.push("badge--glow");
    const motion = this.getAttribute("motion");
    if (motion === "pulse") classes.push("badge--pulse");
    else if (motion === "shimmer") classes.push("badge--shimmer");
    // Intensity only scales an active motion, so it is emitted alongside one.
    const intensity = this.getAttribute("intensity");
    if ((motion === "pulse" || motion === "shimmer") && (intensity === "s" || intensity === "l"))
      classes.push(`badge--intensity-${intensity}`);

    const badge = document.createElement("span");
    badge.className = classes.join(" ");
    badge.setAttribute("part", "badge");
    badge.append(document.createElement("slot"));
    this.shadowRoot.replaceChildren(badge);
  }
}

customElements.define("neuwo-badge", NeuwoBadge);
