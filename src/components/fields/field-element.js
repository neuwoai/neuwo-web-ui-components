import { NeuwoElement } from "../../core/base-element.js";
import { sheet } from "../../core/sheet.js";
import { syncError } from "../../core/control-error.js";
import fieldCss from "./field.css?raw";

// Built once, adopted by reference across every field element.
export const fieldSheet = sheet(fieldCss);

// Unique ids for the in-shadow label/control and error association.
let uid = 0;

// Shared base for the field elements. Holds form association, the value and disabled
// API, label and error rendering, and a build-once-then-patch render. The value
// source and validity are seams (wireControl/seedValue/readValue/writeValue/
// syncValidity): native controls use the defaults; a custom-value subclass (the
// combobox) overrides them.
/**
 * Base for the text-like field controls (input, textarea, combobox, range).
 * Owns form association, the value and disabled API, label and error rendering.
 * Restyle the control from the host via `::part(input)`, including transient
 * state the component does not own (e.g. `[data-flash]::part(input)` to flash a
 * field red on a host-driven event without setting a persistent `error`).
 *
 * @summary Base class for Neuwo field controls.
 * @attr name - form field name submitted with the value.
 * @attr value - the field's value.
 * @attr placeholder - placeholder text shown when empty.
 * @attr {boolean} disabled - disables the control and removes it from submission.
 * @attr {boolean} required - the field must have a value to be valid.
 * @attr {boolean} readonly - the value is shown but cannot be edited.
 * @attr autocomplete - native autocomplete hint forwarded to the control.
 * @attr {sm} size - compact density step for the control, label and error line (default: the standard size when the attribute is absent).
 * @attr label - visible label text rendered above the control; the fallback for the `label` slot.
 * @attr error - error message; shows the red accent, the message, and aria-invalid.
 * @attr {boolean} error-muted - softens a shown error: drops the border/box-shadow accent while the red message and invalid state stay.
 * @attr {boolean} no-error-line - drop the reserved error message row (for a non-validated control); setting `error` alongside it is a misconfiguration.
 * @fires {Event} change - the committed value changed.
 * @slot label - rich label content (a help link, a badge, emphasis) replacing the `label` attribute text, inside the associated `<label>`. The required marker still follows it.
 * @slot - not used; plain label text is set via the `label` attribute.
 * @csspart field - the wrapper around label, control, and error line.
 * @csspart input - the native control element.
 * @csspart label - the field's label element.
 * @csspart error - the reserved error message line.
 * @cssprop --color-blue - brand accent (focus ring); re-theme by setting it on :root.
 */
export class NeuwoFieldElement extends NeuwoElement {
  static formAssociated = true;
  static delegatesFocus = true;
  /** @type {CSSStyleSheet | CSSStyleSheet[]} */
  static styles = fieldSheet;
  static observedAttributes = [
    "name",
    "value",
    "placeholder",
    "disabled",
    "required",
    "readonly",
    "autocomplete",
    "size",
    "label",
    "error",
    "error-muted",
    "no-error-line",
  ];

  #internals;
  #wrapper;
  #control;
  #labelEl = null;
  #labelSlot = null;
  #requiredEl = null;
  #errorEl = null;
  #id = `neuwo-field-${++uid}`;
  #defaultValue = "";
  #built = false;

  constructor() {
    super();
    this.#internals = typeof this.attachInternals === "function" ? this.attachInternals() : null;
  }

  // --- Hooks for subclasses ---
  createControl() {
    throw new Error("NeuwoFieldElement subclasses must implement createControl()");
  }
  decorateControl(control) {
    return control;
  }
  syncControl() {}
  get forwardedAttributes() {
    return ["name", "placeholder", "required", "readonly", "autocomplete"];
  }

  // --- Value / validity seams (defaults reproduce native behaviour) ---
  wireControl(control) {
    control.addEventListener("input", this.#onInput);
    control.addEventListener("change", this.#onChange);
  }
  seedValue() {
    this.#control.value = this.#defaultValue;
  }
  readValue() {
    return this.#control ? this.#control.value : this.getAttribute("value") ?? "";
  }
  writeValue(v) {
    if (this.#control) this.#control.value = v;
  }
  syncValidity() {
    if (!this.#internals || typeof this.#internals.setValidity !== "function") return;
    const c = this.#control;
    if (!c || !c.validity || c.validity.valid) {
      this.#internals.setValidity({});
      return;
    }
    const flags = {};
    for (const key of [
      "badInput",
      "customError",
      "patternMismatch",
      "rangeOverflow",
      "rangeUnderflow",
      "stepMismatch",
      "tooLong",
      "tooShort",
      "typeMismatch",
      "valueMissing",
    ]) {
      if (c.validity[key]) flags[key] = true;
    }
    this.#internals.setValidity(flags, c.validationMessage, c);
  }

  // --- Protected accessors for subclasses ---
  get internals() {
    return this.#internals;
  }
  get control() {
    return this.#control;
  }
  get defaultValue() {
    return this.#defaultValue;
  }

  // --- Public API ---
  get value() {
    return this.readValue();
  }
  set value(v) {
    this.writeValue(v);
    this.#internals?.setFormValue(this.readValue());
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(v) {
    this.toggleAttribute("disabled", Boolean(v));
  }
  get size() {
    return this.getAttribute("size") ?? "";
  }
  set size(v) {
    if (v == null || v === "") this.removeAttribute("size");
    else this.setAttribute("size", String(v));
  }
  get noErrorLine() {
    return this.hasAttribute("no-error-line");
  }
  set noErrorLine(v) {
    this.toggleAttribute("no-error-line", Boolean(v));
  }
  checkValidity() {
    return this.#control ? this.#control.checkValidity() : true;
  }
  reportValidity() {
    return this.#control ? this.#control.reportValidity() : true;
  }
  formResetCallback() {
    this.writeValue(this.#defaultValue);
    this.removeAttribute("error");
    this.#internals?.setFormValue(this.#defaultValue);
    this.syncValidity();
  }
  formDisabledCallback(disabled) {
    if (this.#control) this.#control.disabled = disabled || this.hasAttribute("disabled");
  }

  // --- Render (build once, then patch) ---
  render() {
    if (this.#built) this.#patch();
    else this.#build();
  }

  #build() {
    this.#wrapper = document.createElement("div");
    this.#wrapper.className = "field";
    this.#wrapper.setAttribute("part", "field");

    this.#buildLabel();

    this.#control = this.createControl();
    this.#control.classList.add("input");
    this.#control.setAttribute("part", "input");
    this.#control.id = this.#id;

    this.#defaultValue = this.getAttribute("value") ?? "";
    this.seedValue();

    this.#wrapper.append(this.decorateControl(this.#control) ?? this.#control);
    this.shadowRoot.append(this.#wrapper);
    // Wire events after decorateControl, so a subclass can attach listeners to
    // structure it builds there (the combobox's popup/listbox), not only the control.
    this.wireControl(this.#control);
    this.#built = true;

    this.#patch();
    this.#internals?.setFormValue(this.readValue());
  }

  #patch() {
    this.#defaultValue = this.getAttribute("value") ?? "";
    this.#syncLabel();
    this.#control.disabled = this.hasAttribute("disabled");
    // Only the one known value compacts; anything else renders at the default
    // size rather than inventing a `.input--<whatever>` class.
    const compact = this.getAttribute("size") === "sm";
    this.#wrapper.classList.toggle("field--sm", compact);
    this.#control.classList.toggle("input--sm", compact);
    this.#forward();
    this.#syncError();
    this.syncControl();
  }

  // The label element is built once and kept, even while empty, so the label
  // slot always exists to fire `slotchange` when rich label content arrives.
  // An empty label is hidden by `.field__label--empty`, which keeps it out of
  // the flex column's gap and out of the accessibility tree.
  #buildLabel() {
    this.#labelEl = document.createElement("label");
    this.#labelEl.className = "field__label";
    this.#labelEl.setAttribute("part", "label");
    this.#labelEl.setAttribute("for", this.#id);
    // The `label` attribute becomes the slot's fallback content, so slotted
    // markup replaces it without either side needing to know about the other.
    this.#labelSlot = document.createElement("slot");
    this.#labelSlot.setAttribute("name", "label");
    this.#labelSlot.addEventListener("slotchange", () => this.#syncLabel());
    this.#labelEl.append(this.#labelSlot);
    this.#wrapper.append(this.#labelEl);
  }

  // Read from the light DOM rather than assignedNodes(), so the answer is right
  // before the first slot assignment and in every rendering environment.
  #hasSlottedLabel() {
    return this.querySelector(':scope > [slot="label"]') !== null;
  }

  #syncLabel() {
    // Rewriting the slot's fallback content mutates its children, which the
    // browser reports as a slot change, which calls this back. Only write when
    // the text actually differs, or the listener below feeds itself forever.
    const text = this.getAttribute("label") ?? "";
    if (this.#labelSlot.textContent !== text) this.#labelSlot.textContent = text;
    const labelled = this.hasAttribute("label") || this.#hasSlottedLabel();
    this.#labelEl.classList.toggle("field__label--empty", !labelled);

    // The marker is a sibling of the slot, so setting the fallback text above
    // never clobbers it. Only a labelled field carries one.
    const marked = labelled && this.hasAttribute("required");
    if (marked && !this.#requiredEl) {
      this.#requiredEl = document.createElement("span");
      this.#requiredEl.className = "field__required";
      this.#requiredEl.setAttribute("aria-hidden", "true");
      this.#requiredEl.textContent = "*";
      this.#labelEl.append(this.#requiredEl);
    } else if (!marked && this.#requiredEl) {
      this.#requiredEl.remove();
      this.#requiredEl = null;
    }
  }

  #syncError() {
    this.#errorEl = syncError(this, {
      announce: this.#control,
      accentEl: this.#control,
      accentClass: "input--error",
      container: this.#wrapper,
      lineClass: "field__error",
      lineId: `${this.#id}-error`,
    });
  }

  #forward() {
    for (const name of this.forwardedAttributes) {
      if (this.hasAttribute(name)) this.#control.setAttribute(name, this.getAttribute(name));
      else this.#control.removeAttribute(name);
    }
    for (const { name, value } of this.attributes) {
      if (name === "title" || name.startsWith("aria-") || name.startsWith("data-")) {
        this.#control.setAttribute(name, value);
      }
    }
  }

  #onInput = () => {
    this.#internals?.setFormValue(this.readValue());
    this.syncValidity();
  };

  #onChange = () => {
    this.#internals?.setFormValue(this.readValue());
    this.syncValidity();
    this.dispatchEvent(new Event("change", { bubbles: true }));
  };
}
