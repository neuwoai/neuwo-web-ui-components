import { ownedByReact } from "../../core/element.js";
import { CONTROLLED } from "../../core/marks.js";

/** @typedef {import("../control-element.js").NeuwoControlElement & { value: string }} OptionHost */
/**
 * What a widget tells the shared value model about its own markup.
 * @typedef {object} OptionDisplay
 * @property {() => Element | null} options - the hidden `<select>` that keeps the author's options.
 * @property {(value: string) => string} accept - the value when an enabled option has it, else an empty string.
 * @property {(value: string) => void} show - writes the widget's display of an accepted value, only what differs.
 * @property {() => void} [held] - re-applies what the element still owns on a host React controls.
 * @property {string[]} attributes - the attributes of the display React may rewrite.
 * @property {(target: EventTarget | null) => HTMLElement | null} named - the widget's own focusable element an event
 *   targets, which reads as named while it loses focus, else null.
 */

/**
 * The value model shared by the widgets whose options are `<option>` children kept in a hidden `<select>`, and
 * whose value is a hidden native input, the form value, which is the element's control: the combobox and the
 * segmented control. The form value holds the live value. A pick on a host React controls only dispatches
 * `input` and `change`, with the element's `value` reading the picked value meanwhile, and React shows whatever
 * the consumer's state then holds. On a React host the element re-applies the live display once React has
 * written its own, and the form value's own `input` and `change` never leave the element. While the element's own
 * focusable part loses focus, it reads as named after the element, as form libraries expect of a blurred field.
 */
export class OptionWidget {
  /** @type {OptionHost} */
  #host;

  /** @type {OptionDisplay} */
  #display;

  /** @type {string | undefined} */
  #picked;

  /** @type {MutationObserver | null} */
  #options = null;

  /** @type {Element | null} */
  #watched = null;

  /** @type {MutationObserver | null} */
  #shown = null;

  /**
   * @param {OptionHost} host
   * @param {OptionDisplay} display
   */
  constructor(host, display) {
    this.#host = host;
    this.#display = display;
  }

  /**
   * The value a pick on a host React controls is dispatching, else `undefined`.
   * @returns {string | undefined}
   */
  get picked() {
    return this.#picked;
  }

  /**
   * Whether a value written to the element must be dropped, because React holds it.
   * @returns {boolean}
   */
  get refuses() {
    const host = this.#host;
    const controlled = Reflect.get(host, CONTROLLED);
    // React hands an element it is still building a value only when it controls it, and sets the flag later, from its ref.
    return controlled === true || (controlled === undefined && !host.isConnected && ownedByReact(host));
  }

  /**
   * Shows a value written to the element: an enabled option's value, else nothing.
   * @param {string} value
   */
  assign(value) {
    this.#show(this.#display.accept(value));
  }

  /**
   * Picks a value as the user does: shows it, then dispatches `input` and `change` on the element when it changed.
   * A value no enabled option has picks nothing. On a host React controls it only dispatches them.
   * @param {string} value
   */
  commit(value) {
    const host = this.#host;
    const next = this.#display.accept(value == null ? "" : String(value));
    if (next === host.value) return;
    if (Reflect.get(host, CONTROLLED) === true) this.#picked = next;
    else this.#show(next);
    try {
      host.dispatchEvent(new Event("input", { bubbles: true }));
      host.dispatchEvent(new Event("change", { bubbles: true }));
    } finally {
      this.#picked = undefined;
    }
  }

  /**
   * Shows the live value, dropping one that no enabled option has any more. On a host React controls, React shows
   * it, and the element re-applies only what it still owns.
   */
  sync() {
    const control = this.#host.control;
    if (!control) return;
    if (Reflect.get(this.#host, CONTROLLED) !== true) this.#show(this.#display.accept(control.value));
    else this.#display.held?.();
  }

  connect() {
    const host = this.#host;
    host.addEventListener("input", this.#isolate, true);
    host.addEventListener("change", this.#isolate, true);
    host.addEventListener("blur", this.#lendName, true);
    host.addEventListener("focusout", this.#lendName, true);
    this.#watch();
    // Every host watches, since React can hydrate one after it connected and then rewrite what the element showed.
    this.#shown ??= new MutationObserver(() => {
      if (ownedByReact(host)) this.sync();
    });
    this.#shown.observe(host, { subtree: true, childList: true, characterData: true, attributeFilter: this.#display.attributes });
    // React's ref sets the controlled flag after connect, so on a React host a write here could undo React's value.
    if (!ownedByReact(host)) this.sync();
  }

  disconnect() {
    this.#host.removeEventListener("input", this.#isolate, true);
    this.#host.removeEventListener("change", this.#isolate, true);
    this.#host.removeEventListener("blur", this.#lendName, true);
    this.#host.removeEventListener("focusout", this.#lendName, true);
    this.#options?.disconnect();
    this.#options = null;
    this.#watched = null;
    this.#shown?.disconnect();
  }

  /** Follows a re-render of the element's markup. */
  updated() {
    this.#watch();
    this.sync();
    this.#options?.takeRecords();
  }

  #watch() {
    const select = ownedByReact(this.#host) ? null : this.#display.options();
    if (select === this.#watched) return;
    this.#options?.disconnect();
    this.#watched = select;
    if (!select) return;
    this.#options ??= new MutationObserver(() => this.#host.refresh());
    this.#options.observe(select, { childList: true, subtree: true, attributes: true, characterData: true });
  }

  /**
   * Writes the form value and the widget's display, only what differs.
   * @param {string} value
   */
  #show(value) {
    const control = this.#host.control;
    if (control && control.value !== value) control.value = value;
    this.#display.show(value);
    this.#shown?.takeRecords();
  }

  // Capture, at the element: stopped any later, these events would reach the element's own listeners.
  /** @param {Event} event */
  #isolate = (event) => {
    if (event.target !== this.#host.control) return;
    event.stopPropagation();
    if (Reflect.get(this.#host, CONTROLLED) !== true) this.sync();
  };

  /**
   * Form libraries find a blurred field by `event.target.name`, so the focusable part reads as named for that
   * dispatch only.
   * @param {Event} event
   */
  #lendName = (event) => {
    const target = this.#display.named(event.target);
    if (!target) return;
    Object.defineProperty(target, "name", {
      configurable: true,
      get: () => (event.eventPhase === Event.NONE ? (target.getAttribute("name") ?? "") : this.#host.name),
      set: (value) => target.setAttribute("name", value),
    });
  };
}
