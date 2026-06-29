import { NeuwoElement } from "../../core/base-element.js";
import { sheet } from "../../core/sheet.js";
import dealIdCss from "./deal-id.css?raw";

/**
 * Read-only value display for a short identifier (the design language's deal-ID
 * chip): a rounded, faint-green box with Outfit at small size and slight letter
 * spacing. Presentational and read-only, distinct from the pill-shaped badge.
 * Restyle weight/colour/spacing from the host via `::part(value)`.
 *
 * @summary Neuwo deal-ID chip (read-only identifier display).
 * @customElement neuwo-deal-id
 * @attr {s|m|l} size - density scale, font-size only (default m): s 0.75rem, m 0.875rem, l 1rem.
 * @slot - the identifier / value text.
 * @csspart value - the value box.
 */
export class NeuwoDealId extends NeuwoElement {
  static styles = sheet(dealIdCss);
  static observedAttributes = ["size"];

  get size() { return this.getAttribute("size") || "m"; }
  set size(value) {
    if (value == null || value === "") this.removeAttribute("size");
    else this.setAttribute("size", String(value));
  }

  render() {
    const classes = ["deal-id"];
    const size = this.getAttribute("size");
    if (size === "s" || size === "l") classes.push(`deal-id--${size}`);

    const box = document.createElement("span");
    box.className = classes.join(" ");
    box.setAttribute("part", "value");
    box.append(document.createElement("slot"));
    this.shadowRoot.replaceChildren(box);
  }
}

customElements.define("neuwo-deal-id", NeuwoDealId);
