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

export class NeuwoElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    const own = this.constructor.styles ? [this.constructor.styles] : [];
    // Tokens inherit from the document; shadow root carries reset + recipe.
    this.shadowRoot.adoptedStyleSheets = [resetSheet, ...own];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  // Subclasses override and write markup into this.shadowRoot.
  render() {}
}
