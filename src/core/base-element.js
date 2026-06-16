import { sheet } from "./sheet.js";
import tokensCss from "../foundation/tokens.css?raw";
import resetCss from "./reset.css?raw";

// Built once at module load, adopted by reference by every component instance.
const tokensSheet = sheet(tokensCss);
const resetSheet = sheet(resetCss);

export class NeuwoElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    const own = this.constructor.styles ? [this.constructor.styles] : [];
    this.shadowRoot.adoptedStyleSheets = [tokensSheet, resetSheet, ...own];
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
