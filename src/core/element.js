import { adopt, isRendered, patch, render } from "./adapters/dom.js";

const REACT = Symbol.for("neuwo.react");

/**
 * Base class for light DOM Neuwo custom elements. The markup is one pure
 * template function, rendered on connect or adopted when the server or React
 * already produced it, and patched in place when an attribute changes.
 *
 * @summary Base class for light DOM Neuwo custom elements.
 */
export class NeuwoElement extends /** @type {typeof HTMLElement} */ (globalThis.HTMLElement ?? class {}) {
  /** @type {import("./template.js").Template} */
  static template;

  /** @type {(() => void) | null} */
  #waiting = null;

  connectedCallback() {
    const { template } = /** @type {typeof NeuwoElement} */ (this.constructor);
    const doc = this.ownerDocument;
    if (!isRendered(this, template) && doc.readyState === "loading") {
      // The parser runs this before the children exist, so rendering now would duplicate server markup.
      if (this.#waiting) return;
      this.#waiting = () => {
        this.#waiting = null;
        this.#start();
      };
      doc.addEventListener("DOMContentLoaded", this.#waiting, { once: true });
      return;
    }
    this.#start();
  }

  #start() {
    const { template } = /** @type {typeof NeuwoElement} */ (this.constructor);
    if (!(REACT in this)) {
      if (isRendered(this, template)) adopt(this, template);
      else render(this, template);
    }
    this.connect();
  }

  attributeChangedCallback() {
    const { template } = /** @type {typeof NeuwoElement} */ (this.constructor);
    if (this.isConnected && !(REACT in this) && isRendered(this, template)) patch(this, template);
  }

  disconnectedCallback() {
    if (this.#waiting) {
      this.ownerDocument.removeEventListener("DOMContentLoaded", this.#waiting);
      this.#waiting = null;
      return;
    }
    this.disconnect();
  }

  /** Hook for listeners and observers; must not write to the DOM. */
  connect() {}

  /** Hook to release whatever `connect` set up. */
  disconnect() {}
}

/**
 * @param {string} tag
 * @param {CustomElementConstructor} ctor
 */
export function define(tag, ctor) {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) customElements.define(tag, ctor);
}
