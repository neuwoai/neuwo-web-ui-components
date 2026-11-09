import { NeuwoElement } from "../../core/base-element.js";
import { sheet } from "../../core/sheet.js";
import statusDotCss from "./status-dot.css?raw";

/**
 * Standalone status indicator: a small coloured dot with a soft ring. Four
 * independent, mix-and-match axes: colour (`variant`), motion (`motion`), ring
 * size (`halo`), and glow (`glow`). Presentational and decorative on its own,
 * pair it with a visible or accessible label (the dot conveys no text).
 *
 * @summary Neuwo status dot (standalone indicator).
 * @customElement neuwo-status-dot
 * @attr {green|blue} variant - dot colour (default green).
 * @attr {pulse|blink} motion - optional animation: `pulse` expands the ring, `blink` fades the dot. Honours prefers-reduced-motion.
 * @attr {s|m|l} halo - ring intensity: s tighter, l a wide glow halo (default m = base ring).
 * @attr {none|s|m|l} glow - static saturated bloom keyed to the dot colour; s subtle, l strongest (default none). Composes with any variant, halo and motion.
 * @csspart dot - the dot element.
 * @cssprop --neuwo-color-green - the default dot colour; re-theme on :root.
 * @cssprop --neuwo-color-blue - the blue-variant dot colour; re-theme on :root.
 */
export class NeuwoStatusDot extends NeuwoElement {
  static styles = sheet(statusDotCss);
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

  render() {
    const classes = ["status-dot"];
    // Four orthogonal axes: only blue deviates on colour; motion adds at most one
    // animation class (pulse and blink are mutually exclusive); halo and glow add
    // at most one class each (m/none and absent/unknown add nothing).
    if (this.getAttribute("variant") === "blue") classes.push("status-dot--blue");
    const motion = this.getAttribute("motion");
    if (motion === "pulse") classes.push("status-dot--pulse");
    else if (motion === "blink") classes.push("status-dot--blink");
    const halo = this.getAttribute("halo");
    if (halo === "s" || halo === "l") classes.push(`status-dot--halo-${halo}`);
    const glow = this.getAttribute("glow");
    if (glow === "s" || glow === "m" || glow === "l") classes.push(`status-dot--glow-${glow}`);

    const dot = document.createElement("span");
    dot.className = classes.join(" ");
    dot.setAttribute("part", "dot");
    this.shadowRoot.replaceChildren(dot);
  }
}

customElements.define("neuwo-status-dot", NeuwoStatusDot);
