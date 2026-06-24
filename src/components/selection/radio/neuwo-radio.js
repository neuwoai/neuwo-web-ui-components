import { NeuwoElement } from "../../../core/base-element.js";
import { formCheckSheet } from "../form-check.js";

let uid = 0;

/**
 * A single radio. Not form-associated: the parent `<neuwo-radio-group>` owns the
 * value and drives this through its option-handle API.
 *
 * @summary Neuwo radio (child of neuwo-radio-group).
 * @customElement neuwo-radio
 * @attr value - the value this option contributes to the group.
 * @attr {boolean} disabled - disables just this option.
 * @attr {boolean} checked - whether this option is selected (managed by the group).
 * @slot - the radio label content.
 * @csspart field - the label/circle/text row.
 * @csspart input - the underlying native radio input.
 * @csspart label - the radio label text.
 */
// A single radio. Not form-associated: the parent <neuwo-radio-group> owns the
// value and drives this through the option-handle API (checked / tabbable /
// disabledByGroup / focus). It renders the shared .form-check visual around a
// real <input type="radio"> (no name, so there is no native grouping to fight).
// tabbable / group-disabled are stored as fields so they apply even if the group
// sets them before this element has rendered.
export class NeuwoRadio extends NeuwoElement {
  static styles = formCheckSheet;
  static observedAttributes = ["value", "disabled", "checked"];

  #input = null;
  #label = null;
  #id = `neuwo-radio-${++uid}`;
  #tabbable = false;
  #groupDisabled = false;
  #invalid = false;
  #built = false;

  // --- option-handle API consumed by NeuwoRadioGroup ---
  get value() { return this.getAttribute("value") ?? ""; }
  get disabled() { return this.hasAttribute("disabled"); }
  get element() { return this; }
  get checked() { return this.#input ? this.#input.checked : this.hasAttribute("checked"); }
  set checked(v) {
    const on = Boolean(v);
    this.toggleAttribute("checked", on);
    if (this.#input) this.#input.checked = on;
  }
  set tabbable(v) {
    this.#tabbable = Boolean(v);
    if (this.#input) this.#input.tabIndex = this.#tabbable ? 0 : -1;
  }
  set disabledByGroup(v) {
    this.#groupDisabled = Boolean(v);
    if (this.#input) this.#input.disabled = this.#groupDisabled || this.hasAttribute("disabled");
  }
  // The group's active-error state: redden this radio's circle to match the
  // checkbox error ring (the shared .form-check--error rule on the label).
  set invalid(v) {
    this.#invalid = Boolean(v);
    if (this.#label) this.#label.classList.toggle("form-check--error", this.#invalid);
  }
  focus() { this.#input?.focus(); }

  render() {
    if (this.#built) { this.#patch(); return; }
    this.#input = document.createElement("input");
    this.#input.type = "radio";
    this.#input.className = "form-check__input";
    this.#input.setAttribute("part", "input");
    this.#input.id = this.#id;
    this.#input.tabIndex = -1;
    // Forward keydown events from the shadow input to this element so the
    // parent <neuwo-radio-group> can receive them via normal light-DOM bubbling.
    // (Shadow-internal events do not cross the shadow boundary by default.)
    this.#input.addEventListener("keydown", (e) => {
      this.dispatchEvent(
        new KeyboardEvent(e.type, { key: e.key, bubbles: true, cancelable: e.cancelable })
      );
    });

    const label = document.createElement("label");
    label.className = "form-check";
    label.setAttribute("part", "field");
    this.#label = label;
    const text = document.createElement("span");
    text.className = "form-check__label";
    text.setAttribute("part", "label");
    text.append(document.createElement("slot"));
    label.append(this.#input, text);
    this.shadowRoot.append(label);

    this.#built = true;
    this.#patch();
  }

  #patch() {
    this.#input.checked = this.hasAttribute("checked");
    this.#input.disabled = this.hasAttribute("disabled") || this.#groupDisabled;
    this.#input.tabIndex = this.#tabbable ? 0 : -1;
    this.#label.classList.toggle("form-check--error", this.#invalid);
  }
}

customElements.define("neuwo-radio", NeuwoRadio);
