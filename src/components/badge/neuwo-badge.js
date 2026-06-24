import { NeuwoElement } from "../../core/base-element.js";
import { sheet } from "../../core/sheet.js";
import badgeCss from "./badge.css?raw";

/**
 * On-brand inline label pill. Blue by default, with a green variant. Renders the
 * design language's eyebrow "tag" recipe as a self-contained element.
 * Presentational only -- no events, no role. For a label whose text changes at
 * runtime, set `aria-live` and/or an accessible name on the element.
 *
 * @summary Neuwo badge (inline label pill).
 * @customElement neuwo-badge
 * @attr {blue|green} variant - colour (default blue).
 * @slot - the label content.
 * @csspart badge - the pill element.
 * @cssprop --color-blue - brand accent for the default badge; re-theme on :root.
 * @cssprop --color-green - brand accent for the green variant; re-theme on :root.
 */
export class NeuwoBadge extends NeuwoElement {
  static styles = sheet(badgeCss);
  static observedAttributes = ["variant"];

  get variant() { return this.getAttribute("variant") || "blue"; }
  set variant(value) {
    if (value == null || value === "") this.removeAttribute("variant");
    else this.setAttribute("variant", String(value));
  }

  render() {
    const badge = document.createElement("span");
    // Only the green variant deviates from the base pill; any other value
    // (including absent or unknown) renders the blue default.
    badge.className = this.getAttribute("variant") === "green" ? "badge badge--green" : "badge";
    badge.setAttribute("part", "badge");
    badge.append(document.createElement("slot"));
    this.shadowRoot.replaceChildren(badge);
  }
}

customElements.define("neuwo-badge", NeuwoBadge);
