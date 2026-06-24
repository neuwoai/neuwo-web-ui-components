import { NeuwoSingleSelect } from "../single-select.js";
import { sheet } from "../../../core/sheet.js";
import { controlsSheet } from "../controls.js";
import radioGroupCss from "./radio-group.css?raw";

/**
 * Radio group: a labelled set of `<neuwo-radio>` children with roving-focus
 * keyboard and single selection.
 *
 * @summary Neuwo radio group.
 * @customElement neuwo-radio-group
 * @slot - the `<neuwo-radio>` children.
 * @csspart legend - the group's visible label.
 * @csspart options - the container that lays the radios out.
 */
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
  }

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
