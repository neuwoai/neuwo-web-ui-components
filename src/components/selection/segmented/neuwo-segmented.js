import { childInfo } from "../../../core/adapters/dom.js";
import { define, ownedByReact } from "../../../core/element.js";
import { NeuwoControlElement } from "../../control-element.js";
import { NeuwoDefaultValueMixin } from "../../default-value-mixin.js";
import { NeuwoErrorMixin } from "../../error-mixin.js";
import { OptionWidget } from "../../fields/option-widget.js";
import { readOptions } from "../../fields/options.js";
import { segmentedTemplate } from "./segmented.template.js";

const GROUP = ":scope > .neuwo-choice > .neuwo-segmented";
const PLACED = "data-neuwo-placed";

/** @param {Element} button */
const valueOf = (button) => button.getAttribute("data-value") ?? "";

/** @param {Element} button */
const isChecked = (button) => button.getAttribute("aria-checked") === "true";

/** @param {HTMLButtonElement} button */
const isShown = (button) => isChecked(button) && !button.disabled;

/**
 * Segmented control: a compact pill of single-select buttons, one per `<option>` child, for switching a view or a
 * mode. The template renders the buttons as a horizontal radiogroup, the hidden `<select>` that keeps the options,
 * and a visually hidden native input that carries `name`, the starting value, `required` and `disabled`, so the
 * control submits, resets and validates with its form, before the script has loaded too. The starting value is
 * the `value` attribute when it names an enabled option, else the first enabled option marked `selected`, and its
 * button shows selected from the first paint. Once the user picks, a pill slides behind the selected button. The
 * arrow keys, Home and End move the selection, which follows focus, past disabled options, and Space selects.
 *
 * @summary Neuwo segmented control. Public classes: `.neuwo-choice` on the wrapper; `.neuwo-segmented` on the radiogroup pill, with `--error`; `.neuwo-segmented__indicator` on the sliding pill, which carries `data-neuwo-placed` once a pick has placed it; `.neuwo-segmented__option` on each button, the selected one with `aria-checked="true"`, and `.neuwo-segmented__option-label` around its label; `.neuwo-segmented__options` on the hidden `<select>`; `.neuwo-segmented__form-value` on the native input that submits; `.neuwo-choice__error` on the error line.
 * @customElement neuwo-segmented
 * @attr name - form field name, carried onto the native input.
 * @attr value - the starting value, carried onto the native input as its default; the live value is the `value` property.
 * @attr {boolean} disabled - disables every option and removes the control from submission.
 * @attr {boolean} required - an option must be selected for the control to be valid.
 * @attr label - accessible name of the radiogroup.
 * @attr {boolean} no-error-line - drop the reserved error message row (for a non-validated control, such as a toolbar); setting `error` alongside it is a misconfiguration.
 * @fires {Event} input - the user picked a new value; dispatched just before `change`.
 * @fires {Event} change - the user picked a new value.
 * @slot - the `<option>` elements, one per segment.
 * @cssprop --neuwo-color-blue - brand accent (selected option, sliding pill); re-theme by setting it on :root.
 */
export class NeuwoSegmented extends NeuwoErrorMixin(NeuwoDefaultValueMixin(NeuwoControlElement)) {
  static template = segmentedTemplate;
  static observedAttributes = ["name", "value", "disabled", "form", "required", "label", "error", "error-muted", "no-error-line"];

  /** @type {string | undefined} */
  #pending;

  // Only a pick sets it, so a served first paint is never measured or written to before the user acts.
  #armed = false;

  /** @type {ResizeObserver | null} */
  #resize = null;

  /** @type {Element | null} */
  #measured = null;

  #widget = new OptionWidget(this, {
    options: () => this.querySelector(`${GROUP} > .neuwo-segmented__options`),
    accept: (value) => this.#accept(value),
    show: (value) => this.#show(value),
    held: () => this.#follow(),
    attributes: ["value", "aria-checked", "tabindex", "disabled"],
    named: (target) => this.#buttonOf(target) ?? null,
  });

  /**
   * The native input that submits the value.
   * @returns {HTMLInputElement | null}
   */
  get control() {
    return this.querySelector(`${GROUP} > .neuwo-segmented__form-value`);
  }

  /**
   * The button `focus()` moves to: the selected one, else the first enabled one, as Tab reaches the control.
   * @returns {HTMLButtonElement | null}
   */
  get focusTarget() {
    const enabled = this.#buttons().filter((button) => !button.disabled);
    return enabled.find(isChecked) ?? enabled[0] ?? null;
  }

  /**
   * The options, read from the `<option>` children.
   * @returns {import("../../fields/options.js").ListOption[]}
   */
  get options() {
    return readOptions(childInfo(this, segmentedTemplate));
  }

  /**
   * The live value, which is the form value's; while a pick on a host React controls dispatches `input` and
   * `change`, it is the picked value. Setting it selects an enabled option's value, or nothing for any other value,
   * fires nothing and writes no attribute; it does nothing on a host React controls.
   * @returns {string}
   */
  get value() {
    return this.#widget.picked ?? this.control?.value ?? this.#pending ?? this.getAttribute("value") ?? "";
  }
  set value(value) {
    if (this.#widget.refuses) return;
    const next = value == null ? "" : String(value);
    if (!this.control) this.#pending = next;
    else this.#widget.assign(next);
  }

  /**
   * Picks a value as the user does: selects it, then dispatches `input` and `change` on the element when it
   * changed. A value no enabled option has picks nothing. On a host React controls it only dispatches them, with
   * `value` reading the picked value meanwhile, and React shows whatever the consumer's state then holds.
   * @param {string} value - the `value` of the option to pick.
   */
  commit(value) {
    this.#widget.commit(value);
  }

  connect() {
    super.connect();
    const control = this.control;
    // React's ref sets the controlled flag after connect, so on a React host a write here could undo React's value.
    if (control && this.#pending !== undefined && !ownedByReact(this)) {
      control.value = this.#pending;
      this.#pending = undefined;
    }
    this.addEventListener("click", this.#onClick);
    this.addEventListener("keydown", this.#onKeydown);
    this.addEventListener("focus", this.#onFocus, true);
    this.#widget.connect();
    if (this.#armed) this.#measure();
  }

  disconnect() {
    super.disconnect();
    this.removeEventListener("click", this.#onClick);
    this.removeEventListener("keydown", this.#onKeydown);
    this.removeEventListener("focus", this.#onFocus, true);
    this.#widget.disconnect();
    this.#resize?.disconnect();
    this.#measured = null;
  }

  updated() {
    super.updated();
    this.#widget.updated();
  }

  formReset() {
    this.#widget.sync();
  }

  /** @returns {HTMLButtonElement[]} */
  #buttons() {
    return Array.from(this.querySelectorAll(`${GROUP} > .neuwo-segmented__option`));
  }

  /** @returns {HTMLElement | null} */
  #indicator() {
    return this.querySelector(`${GROUP} > .neuwo-segmented__indicator`);
  }

  /**
   * @param {EventTarget | null} target
   * @returns {HTMLButtonElement | undefined}
   */
  #buttonOf(target) {
    const button = /** @type {Element | null} */ (target)?.closest?.(".neuwo-segmented__option");
    return button ? this.#buttons().find((each) => each === button) : undefined;
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  #accept(value) {
    return this.options.some((option) => !option.disabled && option.value === value) ? value : "";
  }

  /**
   * Writes the checked button, the tab stop and a placed pill as the template would, only where they differ.
   * @param {string} value
   */
  #show(value) {
    const buttons = this.#buttons();
    const chosen = buttons[this.options.findIndex((option) => !option.disabled && option.value === value)];
    const stop = chosen && !chosen.disabled ? chosen : buttons.find((button) => !button.disabled);
    for (const button of buttons) {
      const checked = String(button === chosen);
      if (button.getAttribute("aria-checked") !== checked) button.setAttribute("aria-checked", checked);
      const tabindex = button === stop ? "0" : "-1";
      if (button.getAttribute("tabindex") !== tabindex) button.setAttribute("tabindex", tabindex);
    }
    this.#follow();
  }

  /** @param {HTMLButtonElement} button */
  #pick(button) {
    this.#arm();
    this.commit(valueOf(button));
    button.focus();
  }

  /** Shows the pill under the selection the user is about to change, so the pick slides it from there. */
  #arm() {
    this.#armed = true;
    this.#measure();
    const indicator = this.#indicator();
    const selected = this.#buttons().find(isShown);
    if (!indicator || !selected || indicator.hasAttribute(PLACED)) return;
    this.#place(indicator, selected);
    // Styled at this position now, the pill transitions from it when the pick moves it.
    void indicator.offsetWidth;
  }

  /**
   * Moves an armed pill under the selected button, hiding it with none selected or a disabled one, which draws its own.
   */
  #follow() {
    const indicator = this.#indicator();
    if (!this.#armed || !indicator) return;
    const selected = this.#buttons().find(isShown);
    if (selected) this.#place(indicator, selected);
    else if (indicator.hasAttribute(PLACED)) indicator.removeAttribute(PLACED);
  }

  /**
   * @param {HTMLElement} indicator
   * @param {HTMLButtonElement} button
   */
  #place(indicator, button) {
    const { style } = indicator;
    const width = `${button.offsetWidth}px`;
    const height = `${button.offsetHeight}px`;
    const transform = `translate(${button.offsetLeft}px, ${button.offsetTop}px)`;
    if (style.width !== width) style.width = width;
    if (style.height !== height) style.height = height;
    if (style.transform !== transform) style.transform = transform;
    if (!indicator.hasAttribute(PLACED)) indicator.setAttribute(PLACED, "");
  }

  /** Re-places the pill whenever the pill's group resizes, as a late font swap does. */
  #measure() {
    const group = this.querySelector(GROUP);
    if (!group || group === this.#measured || typeof ResizeObserver !== "function") return;
    this.#resize ??= new ResizeObserver(() => this.#follow());
    this.#resize.disconnect();
    this.#resize.observe(group);
    this.#measured = group;
  }

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    const button = this.#buttonOf(event.target);
    if (button && !button.disabled) this.#pick(button);
  };

  /** @param {KeyboardEvent} event */
  #onKeydown = (event) => {
    const button = this.#buttonOf(event.target);
    if (!button) return;
    const enabled = this.#buttons().filter((each) => !each.disabled);
    const at = enabled.indexOf(button);
    const count = enabled.length;
    const step = this.#step(event.key);
    /** @type {HTMLButtonElement | undefined} */
    let next;
    if (step === 1) next = enabled[(at + 1) % count];
    else if (step === -1) next = enabled[at < 0 ? count - 1 : (at - 1 + count) % count];
    else if (event.key === "Home") next = enabled[0];
    else if (event.key === "End") next = enabled[count - 1];
    else if (event.key === " ") next = at < 0 ? undefined : button;
    else return;
    if (!next) return;
    event.preventDefault();
    this.#pick(next);
  };

  /**
   * How far an arrow key moves the selection, ArrowLeft and ArrowRight read in the text direction at the time of the key.
   * @param {string} key
   * @returns {number}
   */
  #step(key) {
    if (key === "ArrowDown") return 1;
    if (key === "ArrowUp") return -1;
    if (key !== "ArrowLeft" && key !== "ArrowRight") return 0;
    return (key === "ArrowRight") === (getComputedStyle(this).direction !== "rtl") ? 1 : -1;
  }

  /** @param {FocusEvent} event */
  #onFocus = (event) => {
    if (event.target === this.control) this.focusTarget?.focus();
  };
}

define("neuwo-segmented", NeuwoSegmented);
