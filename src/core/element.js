import { adopt, isRendered, reconcile, render } from "./adapters/dom.js";

const REACT = Symbol.for("neuwo.react");

/** @param {MutationRecord} record */
const relevant = (record) => record.type === "childList" || record.attributeName === "title" || record.attributeName === "role" || record.attributeName.startsWith("aria-");

/**
 * @param {Element} el
 * @returns {boolean}
 */
function ownedByReact(el) {
  // Reads React DOM's private node property, so Server Component output, which cannot carry a ref, is recognised.
  return REACT in el || Object.keys(el).some((key) => key.startsWith("__reactFiber$"));
}

/**
 * Base class for light DOM Neuwo custom elements. The markup is one pure
 * template function, rendered on connect or adopted when the server or React
 * already produced it, and patched in place when an attribute changes or a
 * script changes its children.
 *
 * @summary Base class for light DOM Neuwo custom elements.
 */
export class NeuwoElement extends /** @type {typeof HTMLElement} */ (globalThis.HTMLElement ?? class {}) {
  /** @type {import("./template.js").Template} */
  static template;

  /** @type {(() => void) | null} */
  #waiting = null;

  /** @type {MutationObserver | null} */
  #observer = null;

  connectedCallback() {
    if (this.#tooEarly()) {
      if (this.#waiting) return;
      this.#waiting = () => {
        this.#waiting = null;
        this.#start();
      };
      this.ownerDocument.addEventListener("DOMContentLoaded", this.#waiting, { once: true });
      return;
    }
    this.#start();
  }

  #tooEarly() {
    // The parser may not have added the children yet, so rendering now would duplicate server markup.
    return this.ownerDocument.readyState === "loading" && !isRendered(this, /** @type {typeof NeuwoElement} */ (this.constructor).template);
  }

  #start() {
    const { template } = /** @type {typeof NeuwoElement} */ (this.constructor);
    if (!ownedByReact(this)) {
      this.#write(isRendered(this, template) ? adopt : render);
      this.#observer ??= new MutationObserver((records) => this.#changed(records));
      this.#observer.observe(this, { childList: true, attributes: true });
    }
    this.connect();
  }

  /** @param {(host: Element, template: import("./template.js").Template) => void} update */
  #write(update) {
    update(this, /** @type {typeof NeuwoElement} */ (this.constructor).template);
    this.#observer?.takeRecords();
  }

  /** @param {MutationRecord[]} records */
  #changed(records) {
    if (ownedByReact(this)) {
      this.#observer?.disconnect();
      this.#observer = null;
    } else if (records.some(relevant)) this.#write(reconcile);
  }

  attributeChangedCallback() {
    // Not patch: #write drops the observer's pending records, so a child a script added just before must be placed now.
    if (this.isConnected && !this.#waiting && !this.#tooEarly() && !ownedByReact(this)) this.#write(reconcile);
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#observer = null;
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
