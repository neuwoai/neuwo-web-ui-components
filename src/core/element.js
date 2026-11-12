import { adopt, forget, hasLooseContent, isRendered, reconcile, regions, render, reslot, separate, withinOf } from "./adapters/dom.js";
import { REACT } from "./marks.js";

/** @type {Map<string, Set<string>>} */
const readers = new Map();

// Never the JSON of an enclosing element's attributes or of null, so it differs from wherever the element lands.
const UNPLACED = "unplaced";

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
 * The attributes an element lends the elements that read it through `within`, or null when none does.
 * @param {Element} el
 */
const lentBy = (el) => (readers.has(el.localName) ? JSON.stringify(Array.from(el.attributes, ({ name, value }) => [name, value])) : null);

/**
 * The nearest definition of `name` on the prototype chain, when it is an accessor.
 * @param {object | null} proto
 * @param {string} name
 * @returns {PropertyDescriptor | null}
 */
function accessorOf(proto, name) {
  for (let each = proto; each; each = Object.getPrototypeOf(each)) {
    const descriptor = Object.getOwnPropertyDescriptor(each, name);
    if (descriptor) return descriptor.get || descriptor.set ? descriptor : null;
  }
  return null;
}

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
 * Listens in the capture phase, on the window and on a containing shadow root, before an unhydrated React root stops the event.
 * @param {Element} el
 * @param {string} type
 * @param {(event: Event) => void} listener
 * @returns {() => void} removes the listeners
 */
export function listenEarly(el, type, listener) {
  const root = el.getRootNode();
  /** @type {EventTarget[]} */
  const targets = [];
  if (el.ownerDocument.defaultView) targets.push(el.ownerDocument.defaultView);
  if (typeof ShadowRoot === "function" && root instanceof ShadowRoot) targets.push(root);
  for (const target of targets) target.addEventListener(type, listener, true);
  return () => {
    for (const target of targets) target.removeEventListener(type, listener, true);
  };
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

  /** @type {(() => void) | null} */
  #loaded = null;

  /** @type {MutationObserver | null} */
  #observer = null;

  /** @type {Set<Node>} */
  #wrappers = new Set();

  // Unlike the observer it survives a disconnect, so a reconnect runs updated() and an upgrade's first adoption does not.
  #started = false;

  #dirty = false;

  #firstStart = false;

  // The relevant attributes the markup was last known to match: at a disconnect, or at construction with content.
  /** @type {string | null} */
  #away = null;

  /**
   * Null when built empty, as the parser builds it, so its first attribute callbacks are not changes.
   * @type {Map<string, string> | null}
   */
  #initial = null;

  // Compared on start, so markup written under one enclosing element is refitted under another.
  /** @type {string | null} */
  #within = null;

  /** @type {Map<string, unknown>} */
  #early = new Map();

  // Compared after a reconcile, so the elements reading this one through `within` refresh only when it changed.
  /** @type {string | null} */
  #lent = null;

  get #template() {
    return /** @type {typeof NeuwoElement} */ (this.constructor).template;
  }

  constructor() {
    super();
    // A script that sets a property before the element is defined leaves an own property hiding the accessor.
    for (const name of Object.keys(this)) {
      const accessor = accessorOf(Object.getPrototypeOf(this), name);
      if (!accessor) continue;
      const value = Reflect.get(this, name);
      Reflect.deleteProperty(this, name);
      if (accessor.set) this.#hold(name, value, accessor);
    }
    if (this.#early.size) queueMicrotask(() => this.#restore());
    const within = this.#template?.within;
    if (within) readers.set(within, (readers.get(within) ?? new Set()).add(this.localName));
    if (!this.hasAttributes() && !this.hasChildNodes()) return;
    const observed = /** @type {{ observedAttributes?: string[] }} */ (this.constructor).observedAttributes ?? [];
    this.#initial = new Map(observed.filter((name) => this.hasAttribute(name)).map((name) => [name, /** @type {string} */ (this.getAttribute(name))]));
    this.#away = relevantAttributes(this);
    this.#within = within && !this.isConnected ? UNPLACED : this.#enclosing();
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
    return this.ownerDocument.readyState === "loading" && !isRendered(this, this.#template);
  }

  #start() {
    const template = this.#template;
    const owned = ownedByReact(this);
    const restart = this.#started && !owned;
    if (!owned) {
      // A move such as React's Suspense reveal reconnects served markup its attributes alone would not render.
      if (!restart || this.#changedWhileAway()) this.#write(isRendered(this, template) ? adopt : render);
      else this.#write(separate);
      // A change made before the first start, or a child appended before definition, is not in the adopted markup.
      if (!restart && this.#changedWhileAway()) {
        this.#write(reconcile);
        this.#refreshReaders();
      }
      this.#dirty = false;
      this.#away = null;
      this.#initial = null;
      this.#within = this.#enclosing();
      this.#lent = lentBy(this);
      this.#watch();
      this.#started = true;
    }
    this.#firstStart = !restart;
    try {
      this.#restore();
    } finally {
      this.#firstStart = false;
    }
    this.connect();
    if (restart) this.updated();
  }

  /**
   * Holds an early property for `#restore` behind an own accessor that passes a newer write on, so that write wins.
   * @param {string} name
   * @param {unknown} value
   * @param {PropertyDescriptor} accessor
   */
  #hold(name, value, accessor) {
    this.#early.set(name, value);
    Object.defineProperty(this, name, {
      configurable: true,
      get: () => accessor.get?.call(this),
      set: (next) => {
        this.#early.delete(name);
        Reflect.deleteProperty(this, name);
        Reflect.set(this, name, next);
      },
    });
  }

  #restore() {
    const early = Array.from(this.#early);
    this.#early.clear();
    for (const [name] of early) Reflect.deleteProperty(this, name);
    for (const [name, value] of early) Reflect.set(this, name, value);
  }

  #changedWhileAway() {
    return (
      this.#dirty ||
      hasLooseContent(this) ||
      (this.#away !== null && this.#away !== relevantAttributes(this)) ||
      (this.#within !== null && this.#within !== this.#enclosing())
    );
  }

  #enclosing() {
    return JSON.stringify(withinOf(this, this.#template));
  }

  /** @param {(host: Element, template: import("./template.js").Template) => void} update */
  #write(update) {
    if (this.#observer) this.#take(this.#observer.takeRecords());
    update(this, this.#template);
    if (this.#observer) this.#watch();
  }

  #watch() {
    const observer = (this.#observer ??= new MutationObserver((records) => this.#changed(records)));
    observer.disconnect();
    observer.observe(this, { childList: true, attributes: true });
    const found = regions(this);
    this.#wrappers = new Set(found?.wrappers);
    if (!found) return;
    // A node takes one set of options, so `slot` is watched from the root and the child lists on the wrappers.
    observer.observe(found.root, { attributes: true, attributeFilter: ["slot"], subtree: true, childList: this.#wrappers.has(found.root) });
    for (const wrapper of this.#wrappers) if (wrapper !== found.root) observer.observe(wrapper, { childList: true });
  }

  /**
   * Whether the records hold a change the markup must fit, marking each placed child whose `slot` changed.
   * @param {MutationRecord[]} records
   */
  #take(records) {
    let own = false;
    let wrapped = false;
    for (const record of records) {
      const parent = record.target.parentNode;
      if (record.target === this) own ||= relevant(record);
      else if (record.type === "childList") wrapped ||= this.#wrappers.has(record.target);
      else if (parent && this.#wrappers.has(parent)) {
        reslot(this, record.target);
        wrapped = true;
      }
    }
    if (!wrapped || this.ownerDocument.readyState !== "loading") return own || wrapped;
    // The parser may still be filling the wrappers of markup adopted mid-stream, so their change waits for it.
    this.#afterLoad();
    return own;
  }

  #afterLoad() {
    if (this.#loaded) return;
    this.#loaded = () => {
      this.#loaded = null;
      if (this.#writable()) this.#reconcile();
    };
    this.ownerDocument.addEventListener("DOMContentLoaded", this.#loaded, { once: true });
  }

  #reconcile() {
    this.#write(reconcile);
    this.#within = this.#enclosing();
    const lent = lentBy(this);
    if (lent !== this.#lent) {
      this.#lent = lent;
      this.#refreshReaders();
    }
    if (this.isConnected) {
      if (this.#started && !this.#firstStart) this.updated();
      return;
    }
    this.#dirty = false;
    this.#away = relevantAttributes(this);
  }

  // A detached rendered copy is written at once, so its native controls carry the change before they join the document.
  #writable() {
    if (ownedByReact(this) || this.#waiting) return false;
    return this.isConnected ? this.#started : isRendered(this, this.#template);
  }

  #refreshReaders() {
    const tags = readers.get(this.localName);
    if (!tags) return;
    for (const el of Array.from(this.querySelectorAll(Array.from(tags).join(",")))) {
      if (!(el instanceof NeuwoElement) || el.parentElement?.closest(this.localName) !== this) continue;
      // Marked dirty, a reader that cannot be written now reconciles when it starts.
      if (el.#writable()) el.#reconcile();
      else el.#dirty = true;
    }
  }

  /** @param {MutationRecord[]} records */
  #changed(records) {
    if (ownedByReact(this)) {
      this.#observer?.disconnect();
      this.#observer = null;
    } else if (this.#take(records)) this.#reconcile();
  }

  /**
   * @param {string} name
   * @param {string | null} oldValue
   * @param {string | null} value
   */
  attributeChangedCallback(name, oldValue, value) {
    if (ownedByReact(this)) return;
    forget(this, name);
    // An upgrade reporting an attribute the element had, or the parser filling one it just created, is not a change.
    if (!this.#started && !this.#waiting && oldValue === null && (this.#initial === null || this.#initial.get(name) === value)) {
      this.#initial?.delete(name);
      return;
    }
    if (this.#started && oldValue === value) return;
    if (this.#writable()) this.#reconcile();
    else this.#dirty = true;
  }

  /**
   * Reconciles the markup with the attributes and children now, wherever an attribute change would be written at
   * once: on a started host in the page, then running `updated` unless the first start is re-applying early
   * properties, and on rendered markup out of the page, such as a copy a script made. It does nothing on a host in
   * the page that has not started or is waiting for the document to parse, on one out of the page with no rendered
   * markup, or on one React rendered.
   */
  refresh() {
    if (this.#writable()) this.#reconcile();
  }

  disconnectedCallback() {
    // Disconnecting the observer drops a change made just before the move, so it is kept as a dirty mark.
    if (this.#observer && this.#take(this.#observer.takeRecords())) this.#dirty = true;
    if (this.#started) this.#away = relevantAttributes(this);
    this.#observer?.disconnect();
    this.#observer = null;
    if (this.#loaded) {
      this.ownerDocument.removeEventListener("DOMContentLoaded", this.#loaded);
      this.#loaded = null;
      this.#dirty = true;
    }
    if (this.#waiting) {
      this.ownerDocument.removeEventListener("DOMContentLoaded", this.#waiting);
      this.#waiting = null;
      return;
    }
    this.disconnect();
  }

  /**
   * Hook for listeners and observers. It writes nothing on adoption. It runs just after the element has re-applied,
   * through their setters, the properties a script set before the element was defined, and `updated` does not run
   * for those on the first start.
   * @protected
   */
  connect() {}

  /**
   * Hook to release whatever `connect` set up.
   * @protected
   */
  disconnect() {}

  /**
   * Hook to re-apply live state the template cannot know. It runs on a started host in the page: after each
   * reconcile there, from an attribute or child change or `refresh()`, and after every reconnect, where it follows
   * `connect` and covers a change written while the element was out of the page. It never runs on the first start,
   * where `connect` runs alone, nor for a write to markup out of the page. It must write only values that differ
   * from the DOM.
   * @protected
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
