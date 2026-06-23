import { NeuwoSingleSelect } from "../single-select.js";
import { sheet } from "../../../core/sheet.js";
import { controlsSheet } from "../controls.js";
import segmentedCss from "./segmented.css?raw";

export class NeuwoSegmented extends NeuwoSingleSelect {
  static formAssociated = true;
  static styles = [sheet(segmentedCss), controlsSheet];
  static observedAttributes = NeuwoSingleSelect.observedAttributes;

  #buttons = [];

  get groupClass() { return "segmented"; }
  get accentClass() { return "segmented--error"; }

  syncLabel(group) {
    const label = this.getAttribute("label");
    if (label) group.setAttribute("aria-label", label);
    else group.removeAttribute("aria-label");
  }

  renderOptions() {
    const data = [...this.querySelectorAll(":scope > option")].map((o) => ({
      value: o.getAttribute("value") ?? o.textContent.trim(),
      label: o.textContent.trim(),
      disabled: o.hasAttribute("disabled"),
    }));
    this.group.replaceChildren(
      ...data.map((d) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "segmented__option";
        btn.setAttribute("part", "option");
        btn.setAttribute("role", "radio");
        btn.dataset.value = d.value;
        btn.textContent = d.label;
        btn.tabIndex = -1;
        if (d.disabled) {
          btn.setAttribute("data-own-disabled", "");
          btn.disabled = true;
        }
        return btn;
      })
    );
    this.#buttons = [...this.group.querySelectorAll(".segmented__option")];
  }

  readOptions() {
    return this.#buttons.map((btn) => ({
      element: btn,
      value: btn.dataset.value,
      disabled: btn.hasAttribute("data-own-disabled"),
      set checked(on) { btn.setAttribute("aria-checked", on ? "true" : "false"); },
      set tabbable(on) { btn.tabIndex = on ? 0 : -1; },
      set disabledByGroup(on) { btn.disabled = on || btn.hasAttribute("data-own-disabled"); },
      focus() { btn.focus(); },
    }));
  }

  initialValue() {
    const sel = this.querySelector(":scope > option[selected]");
    return sel ? sel.getAttribute("value") ?? sel.textContent.trim() : "";
  }
}

customElements.define("neuwo-segmented", NeuwoSegmented);
