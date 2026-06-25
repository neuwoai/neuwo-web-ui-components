import { NeuwoElement } from "../../core/base-element.js";
import { sheet } from "../../core/sheet.js";
import statusDotCss from "./status-dot.css?raw";

/**
 * Standalone status indicator: a small coloured dot with a soft ring. Two
 * independent axes: colour (`variant`) and motion (`motion`). Presentational
 * and decorative on its own, pair it with a visible or accessible label (the
 * dot conveys no text).
 *
 * @summary Neuwo status dot (standalone indicator).
 * @customElement neuwo-status-dot
 * @attr {green|blue} variant - dot colour (default green).
 * @attr {pulse|blink} motion - optional animation: `pulse` expands the ring, `blink` fades the dot. Honours prefers-reduced-motion.
 * @csspart dot - the dot element.
 * @cssprop --color-green - the default dot colour; re-theme on :root.
 * @cssprop --color-blue - the blue-variant dot colour; re-theme on :root.
 */
export class NeuwoStatusDot extends NeuwoElement {
  static styles = sheet(statusDotCss);
  static observedAttributes = ["variant", "motion"];

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

  render() {
    const classes = ["status-dot"];
    // Two orthogonal axes: only blue deviates on colour; motion adds at most one
    // animation class (pulse and blink are mutually exclusive).
    if (this.getAttribute("variant") === "blue") classes.push("status-dot--blue");
    const motion = this.getAttribute("motion");
    if (motion === "pulse") classes.push("status-dot--pulse");
    else if (motion === "blink") classes.push("status-dot--blink");

    const dot = document.createElement("span");
    dot.className = classes.join(" ");
    dot.setAttribute("part", "dot");
    this.shadowRoot.replaceChildren(dot);
  }
}

customElements.define("neuwo-status-dot", NeuwoStatusDot);
