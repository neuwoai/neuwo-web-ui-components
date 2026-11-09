import { adopt, isRendered, patch, render } from "./adapters/dom.js";

/**
 * Base class for light DOM Neuwo custom elements. The markup is one pure
 * template function, rendered on connect or adopted when the server or React
 * already produced it, and patched in place when an attribute changes.
 *
 * @summary Base class for light DOM Neuwo custom elements.
 */
export class NeuwoElement extends (globalThis.HTMLElement ?? class {}) {
  /** @type {import("./template.js").Template} */
  static template;

  connectedCallback() {
    const { template } = /** @type {typeof NeuwoElement} */ (this.constructor);
    const host = /** @type {HTMLElement} */ (/** @type {unknown} */ (this));
    if (isRendered(host, template)) adopt(host, template);
    else render(host, template);
    this.connect();
  }

  attributeChangedCallback() {
    const { template } = /** @type {typeof NeuwoElement} */ (this.constructor);
    const host = /** @type {HTMLElement} */ (/** @type {unknown} */ (this));
    if (host.isConnected && isRendered(host, template)) patch(host, template);
  }

  disconnectedCallback() {
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
