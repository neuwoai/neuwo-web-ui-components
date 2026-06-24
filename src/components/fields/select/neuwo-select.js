import { NeuwoFieldElement, fieldSheet } from "../field-element.js";
import { sheet } from "../../../core/sheet.js";
import selectCss from "./select.css?raw";

/**
 * Native single-select dropdown styled with Neuwo chrome.
 *
 * @summary Neuwo select.
 * @customElement neuwo-select
 * @slot - the `<option>` and `<optgroup>` elements for the list.
 * @csspart chevron - the dropdown chevron.
 */
export class NeuwoSelect extends NeuwoFieldElement {
  static formAssociated = true;
  static styles = [fieldSheet, sheet(selectCss)];

  #observer = null;

  createControl() {
    return document.createElement("select");
  }

  // Wrap the select so the masked chevron can sit over its right edge.
  decorateControl(control) {
    const wrap = document.createElement("div");
    wrap.className = "select";
    const chevron = document.createElement("span");
    chevron.className = "select__chevron";
    chevron.setAttribute("part", "chevron");
    chevron.setAttribute("aria-hidden", "true");
    wrap.append(control, chevron);
    return wrap;
  }

  connectedCallback() {
    super.connectedCallback(); // builds the structure
    this.#cloneOptions();
    // A native <select> only renders real <option> children, not slotted content,
    // so mirror the light-DOM options into the inner select and keep them in sync.
    this.#observer = new MutationObserver(() => this.#cloneOptions());
    this.#observer.observe(this, { childList: true, subtree: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    this.#observer?.disconnect();
  }

  #cloneOptions() {
    const select = this.control;
    if (!select) return;
    const desired = this.getAttribute("value");
    select.replaceChildren(
      ...Array.from(this.children)
        .filter((el) => el.tagName === "OPTION" || el.tagName === "OPTGROUP")
        .map((el) => el.cloneNode(true))
    );
    if (desired !== null) select.value = desired;
    this.value = select.value; // mirror the resolved value to the form
  }
}

customElements.define("neuwo-select", NeuwoSelect);
