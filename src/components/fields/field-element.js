import { NeuwoElement } from "../../core/base-element.js";
import { sheet } from "../../core/sheet.js";
import fieldCss from "./field.css?raw";

// Built once, adopted by reference across every field element.
export const fieldSheet = sheet(fieldCss);

// Unique ids for the in-shadow label/control and error association.
let uid = 0;

// Shared base for the text-entry fields. Holds form association, the value and
// disabled API, label and error rendering, and a build-once-then-patch render so
// the inner control keeps focus, caret and typed value across attribute changes.
export class NeuwoFieldElement extends NeuwoElement {
  static formAssociated = true;
  static styles = fieldSheet;
  static observedAttributes = [
    "name",
    "value",
    "placeholder",
    "disabled",
    "required",
    "readonly",
    "autocomplete",
    "label",
    "error",
  ];

  #internals;
  #wrapper;
  #control;
  #labelEl = null;
  #errorEl = null;
  #id = `neuwo-field-${++uid}`;
  #defaultValue = "";
  #built = false;

  constructor() {
    super();
    // attachInternals is absent in some non-browser test environments.
    this.#internals = typeof this.attachInternals === "function" ? this.attachInternals() : null;
  }

  // --- Hooks for subclasses ---

  // Returns the native control (<input>/<textarea>/<select>).
  createControl() {
    throw new Error("NeuwoFieldElement subclasses must implement createControl()");
  }

  // Wraps the control before insertion (the select adds a chevron). Default: none.
  decorateControl(control) {
    return control;
  }

  // Control-specific attribute sync on every render (the input clamps `type`).
  syncControl() {}

  // Attributes copied straight through to the control. Subclasses extend this.
  get forwardedAttributes() {
    return ["name", "placeholder", "required", "readonly", "autocomplete"];
  }

  // --- Public API ---

  // The inner native control, exposed so subclasses can reach it (select cloning).
  get control() {
    return this.#control;
  }

  get value() {
    return this.#control ? this.#control.value : this.getAttribute("value") ?? "";
  }

  set value(v) {
    if (this.#control) this.#control.value = v;
    this.#internals?.setFormValue(v);
  }

  get disabled() {
    return this.hasAttribute("disabled");
  }

  set disabled(v) {
    this.toggleAttribute("disabled", Boolean(v));
  }

  checkValidity() {
    return this.#control ? this.#control.checkValidity() : true;
  }

  reportValidity() {
    return this.#control ? this.#control.reportValidity() : true;
  }

  formResetCallback() {
    if (this.#control) this.#control.value = this.#defaultValue;
    this.removeAttribute("error");
    this.#internals?.setFormValue(this.#defaultValue);
    this.#syncValidity();
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

    this.#control = this.createControl();
    this.#control.classList.add("input");
    this.#control.setAttribute("part", "input");
    this.#control.id = this.#id;
    this.#control.addEventListener("input", this.#onInput);
    this.#control.addEventListener("change", this.#onChange);

    this.#defaultValue = this.getAttribute("value") ?? "";
    this.#control.value = this.#defaultValue;

    this.#wrapper.append(this.decorateControl(this.#control));
    this.shadowRoot.append(this.#wrapper);
    this.#built = true;

    this.#patch();
    this.#internals?.setFormValue(this.#control.value);
  }

  #patch() {
    this.#defaultValue = this.getAttribute("value") ?? "";
    this.#syncLabel();
    this.#control.disabled = this.hasAttribute("disabled");
    this.#forward();
    this.#syncError();
    this.syncControl();
  }

  #syncLabel() {
    const has = this.hasAttribute("label");
    if (has && !this.#labelEl) {
      this.#labelEl = document.createElement("label");
      this.#labelEl.className = "field__label";
      this.#labelEl.setAttribute("part", "label");
      this.#labelEl.setAttribute("for", this.#id);
      this.#wrapper.prepend(this.#labelEl);
    }
    if (has) this.#labelEl.textContent = this.getAttribute("label");
    else if (this.#labelEl) {
      this.#labelEl.remove();
      this.#labelEl = null;
    }
  }

  #syncError() {
    const has = this.hasAttribute("error");
    this.#control.classList.toggle("input--error", has);
    const message = has ? this.getAttribute("error") : "";
    if (message) {
      if (!this.#errorEl) {
        this.#errorEl = document.createElement("span");
        this.#errorEl.className = "field__error";
        this.#errorEl.setAttribute("part", "error");
        this.#errorEl.id = `${this.#id}-error`;
        this.#wrapper.append(this.#errorEl);
      }
      this.#errorEl.textContent = message;
      this.#control.setAttribute("aria-describedby", this.#errorEl.id);
    } else {
      if (this.#errorEl) {
        this.#errorEl.remove();
        this.#errorEl = null;
      }
      this.#control.removeAttribute("aria-describedby");
    }
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
    this.#internals?.setFormValue(this.#control.value);
    this.#syncValidity();
  };

  #onChange = () => {
    this.#internals?.setFormValue(this.#control.value);
    this.#syncValidity();
    // `change` is not composed, so it does not cross the shadow boundary; re-emit it.
    this.dispatchEvent(new Event("change", { bubbles: true }));
  };

  #syncValidity() {
    if (!this.#internals || typeof this.#internals.setValidity !== "function") return;
    const c = this.#control;
    if (!c.validity || c.validity.valid) {
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
}
