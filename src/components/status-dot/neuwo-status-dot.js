import { NeuwoElement, define } from "../../core/element.js";
import { statusDotTemplate } from "./status-dot.template.js";

/**
 * Standalone status indicator: a small coloured dot with a soft ring. Four
 * independent, mix-and-match axes: colour (`variant`), motion (`motion`), ring
 * size (`halo`), and glow (`glow`). Presentational and decorative on its own,
 * pair it with a visible or accessible label (the dot conveys no text).
 *
 * @summary Neuwo status dot (standalone indicator). Public classes: `.neuwo-status-dot` on the dot `<span>`, with its modifiers `.neuwo-status-dot--blue`, `--pulse`, `--blink`, `--halo-s`, `--halo-l`, `--glow-s`, `--glow-m` and `--glow-l`.
 * @customElement neuwo-status-dot
 * @attr {green|blue} variant - dot colour (default green).
 * @attr {pulse|blink} motion - optional animation: `pulse` expands the ring, `blink` fades the dot. Honours prefers-reduced-motion.
 * @attr {s|m|l} halo - ring intensity: s tighter, l a wide glow halo (default m = base ring).
 * @attr {none|s|m|l} glow - static saturated bloom keyed to the dot colour; s subtle, l strongest (default none). Composes with any variant, halo and motion.
 * @cssprop --neuwo-color-green - the default dot colour; re-theme on :root.
 * @cssprop --neuwo-color-blue - the blue-variant dot colour; re-theme on :root.
 */
export class NeuwoStatusDot extends NeuwoElement {
  static template = statusDotTemplate;
  static observedAttributes = ["variant", "motion", "halo", "glow"];

  get variant() { return this.getAttribute("variant") || "green"; }
  set variant(value) {
    if (value == null || value === "") this.removeAttribute("variant");
    else this.setAttribute("variant", String(value));
  }
  get motion() { return this.getAttribute("motion") || ""; }
  set motion(value) {
    if (value == null || value === "") this.removeAttribute("motion");
    else this.setAttribute("motion", String(value));
  }
  get halo() { return this.getAttribute("halo") || "m"; }
  set halo(value) {
    if (value == null || value === "") this.removeAttribute("halo");
    else this.setAttribute("halo", String(value));
  }
  get glow() { return this.getAttribute("glow") || "none"; }
  set glow(value) {
    if (value == null || value === "") this.removeAttribute("glow");
    else this.setAttribute("glow", String(value));
  }
}

define("neuwo-status-dot", NeuwoStatusDot);
