import { NeuwoElement } from "../../core/base-element.js";
import { syncError } from "../../core/control-error.js";

let uid = 0;

// Shared base for the single-select form controls (radio-group, segmented).
// Owns form association, the single value, required validity, error display,
// the role=radiogroup wiring, and the WAI-ARIA APG roving-focus keyboard with
// selection following focus. Option sourcing and rendering are seams: a
// subclass supplies ordered "option handles" via readOptions().
//
// Option handle: { value, disabled, element, set checked(on), set tabbable(on),
//   set disabledByGroup(on), set invalid(on), focus() }. `invalid` is the group's
//   active-error state (error set and not muted); a radio reddens its own circle
//   with it, segmented conveys the error on the group accent and ignores it.
/**
 * Base for the single-select controls (radio group, segmented). Owns form
 * association, the single value, required validity, error display, the
 * role=radiogroup wiring, and the roving-focus keyboard with selection
 * following focus.
 *
 * @summary Base class for Neuwo single-select controls.
 * @attr name - form field name submitted with the selected value.
 * @attr value - the selected option's value.
 * @attr {boolean} disabled - disables the whole group.
 * @attr {boolean} required - a value must be selected to be valid.
 * @attr label - accessible group label.
 * @attr {horizontal|vertical} orientation - layout and arrow-key axis (default vertical).
 * @attr error - error message; shows the red accent, the message, and aria-invalid.
 * @attr {boolean} error-muted - softens a shown error: drops the accent while the red message and invalid state stay.
 * @attr {boolean} no-error-line - drop the reserved error message row (for a non-validated toggle, e.g. a toolbar segmented); setting `error` alongside it is a misconfiguration.
 * @fires {Event} change - the selected value changed.
 * @csspart group - the role=radiogroup container.
 * @csspart error - the reserved error message line.
 * @cssprop --color-blue - brand accent (selected option); re-theme on :root.
 */
export class NeuwoSingleSelect extends NeuwoElement {
  static formAssociated = true;
  static observedAttributes = ["name", "value", "disabled", "required", "label", "orientation", "error", "error-muted", "no-error-line"];

  #internals;
  #group;
  #id = `neuwo-select-${++uid}`;
  #defaultValue = "";
  #formDisabled = false;
  #built = false;
  #observer = null;

  constructor() {
    super();
    this.#internals = typeof this.attachInternals === "function" ? this.attachInternals() : null;
  }

  // --- hooks ---
  /** @returns {string} */
  get groupClass() { throw new Error("NeuwoSingleSelect subclasses must define groupClass"); }
  /** @returns {string} */
  get accentClass() { throw new Error("NeuwoSingleSelect subclasses must define accentClass"); }
  renderContents(group) {}
  renderOptions() {}
  readOptions() { return []; }
  syncLabel(group) {}
  initialValue() { return ""; }

  // --- protected ---
  get internals() { return this.#internals; }
  get group() { return this.#group; }
  get controlId() { return this.#id; }
  resync() { this.#syncOptions(); }

  // --- public API ---
  get value() { return this.getAttribute("value") ?? ""; }
  set value(v) {
    if (v == null || v === "") this.removeAttribute("value");
    else this.setAttribute("value", String(v));
  }
  get disabled() { return this.hasAttribute("disabled"); }
  set disabled(v) { this.toggleAttribute("disabled", Boolean(v)); }
  get noErrorLine() { return this.hasAttribute("no-error-line"); }
  set noErrorLine(v) { this.toggleAttribute("no-error-line", Boolean(v)); }

  checkValidity() {
    if (this.#internals && typeof this.#internals.checkValidity === "function")
      return this.#internals.checkValidity();
    return !(this.hasAttribute("required") && !this.value);
  }
  reportValidity() {
    if (this.#internals && typeof this.#internals.reportValidity === "function")
      return this.#internals.reportValidity();
    return this.checkValidity();
  }
  #syncValidity() {
    if (!this.#internals || typeof this.#internals.setValidity !== "function") return;
    if (this.hasAttribute("required") && !this.value)
      this.#internals.setValidity({ valueMissing: true }, "Please select an option.", this.#group);
    else this.#internals.setValidity({});
  }

  #isDisabled() { return this.hasAttribute("disabled") || this.#formDisabled; }

  formResetCallback() {
    this.value = this.#defaultValue;
    this.removeAttribute("error");
  }
  formDisabledCallback(disabled) {
    this.#formDisabled = disabled;
    if (this.#built) this.#applyState();
  }

  // --- lifecycle ---
  connectedCallback() {
    super.connectedCallback(); // builds via render()
    this.#defaultValue = this.getAttribute("value") ?? this.initialValue();
    if (!this.hasAttribute("value") && this.#defaultValue) this.setAttribute("value", this.#defaultValue);
    // Only option-child changes (added/removed, or an option's own attributes)
    // need a re-render. The host's OWN attribute changes are already handled by
    // attributeChangedCallback, so ignore them here -- otherwise a host `value`
    // change would rebuild the options and cancel the segmented slide animation.
    this.#observer = new MutationObserver((records) => {
      if (records.some((r) => r.type === "childList" || r.target !== this)) {
        this.#syncOptions();
      }
    });
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["value", "disabled", "selected", "checked", "label"],
    });
    this.#syncOptions();
  }
  disconnectedCallback() {
    super.disconnectedCallback?.();
    this.#observer?.disconnect();
    this.removeEventListener("keydown", this.#onKeydown);
    this.removeEventListener("click", this.#onClick);
  }

  render() {
    if (this.#built) this.#patch();
    else this.#build();
  }

  #build() {
    this.#group = document.createElement("div");
    this.#group.className = this.groupClass;
    this.#group.setAttribute("part", "group");
    this.#group.setAttribute("role", "radiogroup");
    this.shadowRoot.append(this.#group);
    this.renderContents(this.#group);
    this.#group.addEventListener("keydown", this.#onKeydown);
    this.#group.addEventListener("click", this.#onClick);
    this.addEventListener("keydown", this.#onKeydown);
    this.addEventListener("click", this.#onClick);
    this.#built = true;
    this.#patch();
  }

  #patch() {
    if (this.hasAttribute("required")) this.#group.setAttribute("aria-required", "true");
    else this.#group.removeAttribute("aria-required");
    this.#group.setAttribute(
      "aria-orientation",
      this.getAttribute("orientation") === "horizontal" ? "horizontal" : "vertical"
    );
    this.syncLabel(this.#group);
    syncError(this, {
      announce: this.#group,
      accentEl: this.#group,
      accentClass: this.accentClass,
      container: this.shadowRoot,
      lineClass: "control-error",
      lineId: `${this.#id}-error`,
    });
    this.#applyState();
    this.#syncValidity();
    this.#internals?.setFormValue(this.value || null);
  }

  #syncOptions() {
    if (!this.#built) return;
    this.renderOptions();
    this.#applyState();
    this.#syncValidity();
    this.#internals?.setFormValue(this.value || null);
  }

  #applyState() {
    const opts = this.readOptions();
    const value = this.value;
    const groupDisabled = this.#isDisabled();
    // The group accent lives in this shadow root, but radios render in their own
    // child shadow roots, so the active-error state has to be pushed per option.
    const activeError = this.hasAttribute("error") && !this.hasAttribute("error-muted");
    let selected = null;
    for (const o of opts) {
      o.disabledByGroup = groupDisabled;
      o.invalid = activeError;
      const on = value !== "" && o.value === value;
      o.checked = on;
      if (on) selected = o;
    }
    const enabled = opts.filter((o) => !o.disabled && !groupDisabled);
    const tabbable = selected && enabled.includes(selected) ? selected : enabled[0] || null;
    for (const o of opts) o.tabbable = o === tabbable;
  }

  #select(handle) {
    if (!handle || handle.disabled || this.#isDisabled()) return;
    const changed = handle.value !== this.value;
    this.value = handle.value; // -> patch: applyState + form value + validity
    handle.focus();
    if (changed) this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  #onClick = (e) => {
    const path = e.composedPath();
    const handle = this.readOptions().find((o) => path.includes(o.element));
    if (handle) this.#select(handle);
  };

  #onKeydown = (e) => {
    if (this.#isDisabled()) return;
    const opts = this.readOptions();
    const enabled = opts.filter((o) => !o.disabled);
    if (!enabled.length) return;
    const path = e.composedPath();
    const focused = opts.find((o) => path.includes(o.element));
    let i = focused ? enabled.indexOf(focused) : -1;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        i = i < 0 ? 0 : (i + 1) % enabled.length;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        i = i < 0 ? enabled.length - 1 : (i - 1 + enabled.length) % enabled.length;
        break;
      case " ":
      case "Spacebar":
        i = i < 0 ? 0 : i;
        break;
      default:
        return;
    }
    e.preventDefault();
    this.#select(enabled[i]);
  };
}
