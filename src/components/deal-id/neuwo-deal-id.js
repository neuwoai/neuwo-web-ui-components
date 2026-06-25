import { NeuwoElement } from "../../core/base-element.js";
import { sheet } from "../../core/sheet.js";
import dealIdCss from "./deal-id.css?raw";

/**
 * Read-only value display for a short identifier (the design language's deal-ID
 * chip): a rounded, faint-green box with Outfit at small size and slight letter
 * spacing. Presentational and read-only, distinct from the pill-shaped badge.
 *
 * @summary Neuwo deal-ID chip (read-only identifier display).
 * @customElement neuwo-deal-id
 * @slot - the identifier / value text.
 * @csspart value - the value box.
 */
export class NeuwoDealId extends NeuwoElement {
  static styles = sheet(dealIdCss);

  render() {
    const box = document.createElement("span");
    box.className = "deal-id";
    box.setAttribute("part", "value");
    box.append(document.createElement("slot"));
    this.shadowRoot.replaceChildren(box);
  }
}

customElements.define("neuwo-deal-id", NeuwoDealId);
