import { NeuwoShadowElement } from "../../core/shadow-element.js";
import { define } from "../../core/element.js";
import { sheet } from "../../core/sheet.js";
import logoCss from "./logo.css?raw";
import bgLight from "../../foundation/logos/neuwo-logo--bg-light.svg?raw";
import bgDark from "../../foundation/logos/neuwo-logo--bg-dark.svg?raw";
import bgDarkAlt from "../../foundation/logos/neuwo-logo--bg-dark-alt.svg?raw";
import bgColour from "../../foundation/logos/neuwo-logo--bg-colour.svg?raw";

// The brand's own exports, keyed by the variant that says where each belongs.
// They differ only in their two fill values, and gzip collapses the repeated
// path data, so carrying all four costs about 100 bytes over carrying one.
const DRAWINGS = {
  "bg-light": bgLight,
  "bg-dark": bgDark,
  "bg-dark-alt": bgDarkAlt,
  "bg-colour": bgColour,
};

const DEFAULT_VARIANT = "bg-dark";
const DEFAULT_LABEL = "Neuwo";

/**
 * The Neuwo wordmark. Draws one of the brand's four ink pairs, each named for
 * the background it belongs on, and inlines the SVG rather than fetching it, so
 * a logo costs no request. Size it with `--neuwo-logo-height`; the width follows the
 * aspect ratio. Wrap it in an `<a>` to make it a link.
 *
 * The same four files are published to `dist/logos/` for consumers that need an
 * `<img>`: a page whose logo is the LCP element should prefer that, since an
 * element cannot paint until the bundle executes.
 *
 * @summary Neuwo logo (brand wordmark).
 * @customElement neuwo-logo
 * @attr {bg-light|bg-dark|bg-dark-alt|bg-colour} variant - which brand ink pair to draw, named for the background it suits: `bg-light` blue on near-black, `bg-dark` white on blue, `bg-dark-alt` blue on white, `bg-colour` white on near-black for brand-coloured backgrounds where blue would vanish (default bg-dark). An unknown value falls back to bg-dark.
 * @attr {string} label - the accessible name (default Neuwo). An empty value marks the logo decorative instead (aria-hidden, no role), for a link or heading that already says Neuwo.
 * @csspart logo - the svg element.
 * @cssprop --neuwo-logo-height - rendered height; the width follows the aspect ratio (default 1.75rem).
 */
export class NeuwoLogo extends NeuwoShadowElement {
  static styles = sheet(logoCss);
  static observedAttributes = ["variant", "label"];

  get variant() { return this.getAttribute("variant") || DEFAULT_VARIANT; }
  set variant(value) {
    if (value == null || value === "") this.removeAttribute("variant");
    else this.setAttribute("variant", String(value));
  }
  get label() { return this.getAttribute("label") ?? DEFAULT_LABEL; }
  set label(value) {
    // Unlike the other string attributes, an empty label is meaningful (it marks
    // the logo decorative), so only null removes the attribute.
    if (value == null) this.removeAttribute("label");
    else this.setAttribute("label", String(value));
  }

  render() {
    const requested = this.getAttribute("variant");
    // hasOwn, not `in`: `in` would accept an inherited key such as "toString".
    const variant = Object.hasOwn(DRAWINGS, requested) ? requested : DEFAULT_VARIANT;

    // Parsing through a template puts the markup in the SVG namespace, which
    // assigning innerHTML on the shadow root would not guarantee.
    const template = document.createElement("template");
    template.innerHTML = DRAWINGS[variant];
    const svg = template.content.firstElementChild;

    svg.setAttribute("class", `logo logo--${variant}`);
    svg.setAttribute("part", "logo");
    const label = this.getAttribute("label") ?? DEFAULT_LABEL;
    if (label === "") {
      svg.setAttribute("aria-hidden", "true");
    } else {
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", label);
    }

    this.shadowRoot.replaceChildren(svg);
  }
}

define("neuwo-logo", NeuwoLogo);
