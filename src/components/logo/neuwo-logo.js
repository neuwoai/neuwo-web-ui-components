import { NeuwoElement, define } from "../../core/element.js";
import { DEFAULT_LABEL, DEFAULT_VARIANT, logoTemplate } from "./logo.template.js";

/**
 * The Neuwo wordmark. Draws one of the brand's four ink pairs, each named for
 * the background it belongs on, and inlines the SVG rather than fetching it, so
 * a logo costs no request. Size it with `--neuwo-logo-height`; the width follows the
 * aspect ratio. Wrap it in an `<a>` to make it a link.
 *
 * The same four files are published to `dist/logos/` for consumers that need an
 * `<img>`. A server-rendered or expanded logo draws with the first paint; only one
 * rendered by script waits for the bundle, so a page without server rendering whose
 * logo is the LCP element should prefer the `<img>`.
 *
 * @summary Neuwo logo (brand wordmark). Public classes: `.neuwo-logo` on the `<svg>`, with `.neuwo-logo--bg-light`, `--bg-dark`, `--bg-dark-alt` and `--bg-colour`.
 * @customElement neuwo-logo
 * @attr {bg-light|bg-dark|bg-dark-alt|bg-colour} variant - which brand ink pair to draw, named for the background it suits: `bg-light` blue on near-black, `bg-dark` white on blue, `bg-dark-alt` blue on white, `bg-colour` white on near-black for brand-coloured backgrounds where blue would vanish (default bg-dark). An unknown value falls back to bg-dark.
 * @attr {string} label - the accessible name (default Neuwo). An empty value marks the logo decorative instead (aria-hidden, no role), for a link or heading that already says Neuwo.
 * @cssprop --neuwo-logo-height - rendered height; the width follows the aspect ratio (default 1.75rem).
 */
export class NeuwoLogo extends NeuwoElement {
  static template = logoTemplate;
  static observedAttributes = ["variant", "label"];

  get variant() { return this.getAttribute("variant") || DEFAULT_VARIANT; }
  set variant(value) {
    if (value == null || value === "") this.removeAttribute("variant");
    else this.setAttribute("variant", String(value));
  }
  get label() { return this.getAttribute("label") ?? DEFAULT_LABEL; }
  set label(value) {
    // An empty label marks the logo decorative, so only null removes the attribute.
    if (value == null) this.removeAttribute("label");
    else this.setAttribute("label", String(value));
  }
}

define("neuwo-logo", NeuwoLogo);
