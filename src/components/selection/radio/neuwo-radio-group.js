import { NeuwoSingleSelect } from "../single-select.js";
import { sheet } from "../../../core/sheet.js";
import { controlsSheet } from "../controls.js";
import radioGroupCss from "./radio-group.css?raw";

export class NeuwoRadioGroup extends NeuwoSingleSelect {
  static formAssociated = true;
  static styles = [sheet(radioGroupCss), controlsSheet];
  static observedAttributes = NeuwoSingleSelect.observedAttributes;

  #legend = null;
  // Captured before super.connectedCallback() clears checked attributes via
  // #applyState, so initialValue() returns the right seed value.
  #seedValue = null;

  get groupClass() { return "radio-group"; }
  get accentClass() { return "radio-group--error"; }

  connectedCallback() {
    // Read the initially checked radio BEFORE the base class calls render()
    // -> #applyState(), which would strip the checked attribute from all
    // non-selected radios before initialValue() is ever called.
    if (this.#seedValue === null && !this.hasAttribute("value")) {
      const seed = this.querySelector(":scope > neuwo-radio[checked]");
      this.#seedValue = seed ? (seed.getAttribute("value") ?? "") : "";
    }
    super.connectedCallback();
    // In happy-dom, slotted light-DOM events (click) and shadow-forwarded
    // events (keydown re-dispatched from <neuwo-radio> on itself) bubble to
    // the host but do not reach the base-class listeners on the shadow #group
    // element. Attach host-level delegating handlers to bridge the gap.
    this.addEventListener("click", this.#onHostClick);
    this.addEventListener("keydown", this.#onHostKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    this.removeEventListener("click", this.#onHostClick);
    this.removeEventListener("keydown", this.#onHostKeydown);
  }

  // Select a radio by its handle. Mirrors the base-class private #select:
  // setting this.value triggers attributeChangedCallback -> render -> #applyState.
  #selectHandle(handle) {
    if (!handle || handle.disabled || this.disabled) return;
    const prev = this.value;
    this.value = handle.value;
    handle.focus();
    if (handle.value !== prev) this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Handle click events that bubble from slotted <neuwo-radio> children.
  #onHostClick = (e) => {
    const opts = this.readOptions();
    const handle = opts.find((o) => o.element === e.target || o.element.contains(e.target));
    if (handle) this.#selectHandle(handle);
  };

  // Handle keydown events forwarded from <neuwo-radio>'s shadow input via the
  // radio's own re-dispatch (keydown is re-fired on the <neuwo-radio> element).
  #onHostKeydown = (e) => {
    if (this.disabled) return;
    const opts = this.readOptions();
    const enabled = opts.filter((o) => !o.disabled);
    if (!enabled.length) return;
    // The event target is the <neuwo-radio> element (re-dispatched from its shadow input).
    const focused = opts.find((o) => o.element === e.target);
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
    this.#selectHandle(enabled[i]);
  };

  renderContents(group) {
    this.#legend = document.createElement("span");
    this.#legend.className = "radio-group__legend";
    this.#legend.setAttribute("part", "legend");
    this.#legend.id = `${this.controlId}-legend`;
    const options = document.createElement("div");
    options.className = "radio-group__options";
    options.setAttribute("part", "options");
    const slot = document.createElement("slot");
    // Slotting happens after this group connects but before its radios render,
    // so re-apply state once the radios are distributed and rendered.
    slot.addEventListener("slotchange", () => this.resync());
    options.append(slot);
    group.append(this.#legend, options);
  }

  syncLabel(group) {
    const label = this.getAttribute("label");
    if (label) {
      this.#legend.textContent = label;
      this.#legend.hidden = false;
      group.setAttribute("aria-labelledby", this.#legend.id);
    } else {
      this.#legend.hidden = true;
      group.removeAttribute("aria-labelledby");
    }
  }

  readOptions() {
    return [...this.querySelectorAll(":scope > neuwo-radio")];
  }

  initialValue() {
    return this.#seedValue ?? "";
  }
}

customElements.define("neuwo-radio-group", NeuwoRadioGroup);
