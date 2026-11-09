import { sheet } from "./sheet.js";
import tokensCss from "../foundation/tokens.css?raw";
import resetCss from "./reset.css?raw";

// Built once at module load, adopted by reference.
const tokensSheet = sheet(tokensCss);
const resetSheet = sheet(resetCss);

// Tokens live on the document (their :root only matches there) and inherit into every shadow root.
if (typeof document !== "undefined" && !document.adoptedStyleSheets.includes(tokensSheet)) {
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, tokensSheet];
}

/**
 * Shared base for every Neuwo custom element: attaches an open shadow root,
 * adopts the shared reset plus the component's stylesheet, and runs an
 * attribute-driven render lifecycle. Design tokens inherit through the shadow
 * boundary, so consumers re-theme by setting CSS custom properties on `:root`.
 *
 * @summary Base class for Neuwo custom elements.
 */
export class NeuwoShadowElement extends HTMLElement {
  constructor() {
    super();
    const ctor = /** @type {any} */ (this.constructor);
    // Standard `delegatesFocus` so real browsers honour it. Note: happy-dom
    // reads a non-standard `delegateFocus` key, so a field's shadowRoot.delegatesFocus
    // cannot be asserted in tests; the static-flag contract is tested instead.
    this.attachShadow({ mode: "open", delegatesFocus: ctor.delegatesFocus ?? false });
    const own = /** @type {any} */ (this.constructor).styles ? [].concat(/** @type {any} */ (this.constructor).styles) : [];
    // Tokens inherit from the document; shadow root carries reset + recipe.
    this.shadowRoot.adoptedStyleSheets = [resetSheet, ...own];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  // Subclasses may override to run teardown when removed from the DOM.
  disconnectedCallback() {}

  // Subclasses override and write markup into this.shadowRoot.
  render() {}
}
