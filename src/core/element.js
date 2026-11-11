import { adopt, hasLooseContent, isRendered, reconcile, render } from "./adapters/dom.js";
import { REACT } from "./marks.js";

/** @param {string} name */
const relevantName = (name) => name === "title" || name === "role" || name.startsWith("aria-");

/** @param {MutationRecord} record */
const relevant = (record) => record.type === "childList" || relevantName(/** @type {string} */ (record.attributeName));

/** @param {Element} el */
const relevantAttributes = (el) =>
  Array.from(el.attributes)
    .filter(({ name }) => relevantName(name))
    .map(({ name, value }) => `${name}=${value}`)
    .join("\n");

/**
 * Whether React rendered or hydrated the element, so its markup is React's to write.
 * @param {Element} el
 * @returns {boolean}
 */
export function ownedByReact(el) {
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

  // Unlike the observer it survives a disconnect, so a reconnect runs updated() and an upgrade's first adoption does not.
  #started = false;

  #dirty = false;

  // The relevant attributes the markup was last known to match: at a disconnect, or at construction with content.
  /** @type {string | null} */
  #away = null;

  /**
   * Null when built empty, as the parser builds it, so its first attribute callbacks are not changes.
   * @type {Map<string, string> | null}
   */
  #initial = null;

  constructor() {
    super();
    if (!this.hasAttributes() && !this.hasChildNodes()) return;
    const observed = /** @type {{ observedAttributes?: string[] }} */ (this.constructor).observedAttributes ?? [];
    this.#initial = new Map(observed.filter((name) => this.hasAttribute(name)).map((name) => [name, /** @type {string} */ (this.getAttribute(name))]));
    this.#away = relevantAttributes(this);
  }

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
    const owned = ownedByReact(this);
    const restart = this.#started && !owned;
    if (!owned) {
      // A move such as React's Suspense reveal reconnects served markup its attributes alone would not render.
      if (!restart || this.#changedWhileAway()) this.#write(isRendered(this, template) ? adopt : render);
      // A change made before the first start, or a child appended before definition, is not in the adopted markup.
      if (!restart && this.#changedWhileAway()) this.#write(reconcile);
      this.#dirty = false;
      this.#away = null;
      this.#initial = null;
      this.#observer ??= new MutationObserver((records) => this.#changed(records));
      this.#observer.observe(this, { childList: true, attributes: true });
      this.#started = true;
    }
    this.connect();
    if (restart) this.updated();
  }

  #changedWhileAway() {
    return this.#dirty || hasLooseContent(this) || (this.#away !== null && this.#away !== relevantAttributes(this));
  }

  /** @param {(host: Element, template: import("./template.js").Template) => void} update */
  #write(update) {
    update(this, /** @type {typeof NeuwoElement} */ (this.constructor).template);
    this.#observer?.takeRecords();
  }

  #reconcile() {
    this.#write(reconcile);
    if (this.#started) this.updated();
  }

  /** @param {MutationRecord[]} records */
  #changed(records) {
    if (ownedByReact(this)) {
      this.#observer?.disconnect();
      this.#observer = null;
    } else if (records.some(relevant)) this.#reconcile();
  }

  /**
   * @param {string} name
   * @param {string | null} oldValue
   * @param {string | null} value
   */
  attributeChangedCallback(name, oldValue, value) {
    if (ownedByReact(this)) return;
    if (!this.#started && !this.#waiting) {
      // An upgrade reporting an attribute the element had, or the parser filling one it just created, is not a change.
      if (oldValue === null && (this.#initial === null || this.#initial.get(name) === value)) this.#initial?.delete(name);
      else this.#dirty = true;
    } else if (this.#started && this.isConnected && !this.#waiting) this.#reconcile();
    else this.#dirty = true;
  }

  /**
   * Reconciles the markup with the attributes and children now, then runs `updated`. Does nothing on a host
   * that is disconnected, not yet rendered, waiting for the document to parse, or rendered by React.
   */
  refresh() {
    const { template } = /** @type {typeof NeuwoElement} */ (this.constructor);
    if (this.isConnected && !this.#waiting && !ownedByReact(this) && isRendered(this, template)) this.#reconcile();
  }

  disconnectedCallback() {
    // Disconnecting the observer drops a change made just before the move, so it is kept as a dirty mark.
    if (this.#observer?.takeRecords().some(relevant)) this.#dirty = true;
    if (this.#started) this.#away = relevantAttributes(this);
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

  /**
   * Hook to re-apply live state the template cannot know. It runs after every write to the markup but the first
   * render or adoption: after an attribute or child change, after `refresh()`, and after a reconnect, where it
   * follows `connect`. It must write only values that differ from the DOM.
   */
  updated() {}
}

/**
 * @param {string} tag
 * @param {CustomElementConstructor} ctor
 */
export function define(tag, ctor) {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) customElements.define(tag, ctor);
}
