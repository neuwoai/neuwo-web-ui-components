import { NeuwoSingleSelect } from "../single-select.js";
import { sheet } from "../../../core/sheet.js";
import { controlsSheet } from "../controls.js";
import segmentedCss from "./segmented.css?raw";

export class NeuwoSegmented extends NeuwoSingleSelect {
  static formAssociated = true;
  static styles = [sheet(segmentedCss), controlsSheet];
  static observedAttributes = NeuwoSingleSelect.observedAttributes;

  #buttons = [];
  #indicator = null;
  #indicatorReady = false;
  #resize = null;

  get groupClass() { return "segmented"; }
  get accentClass() { return "segmented--error"; }

  connectedCallback() {
    super.connectedCallback();
    // Keep the sliding indicator aligned when the pill reflows (responsive
    // width, or a late web-font swap changing button widths).
    if (typeof ResizeObserver === "function") {
      this.#resize = new ResizeObserver(() => this.#repositionActive());
      this.#resize.observe(this.group);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    this.#resize?.disconnect();
  }

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
    // The indicator is the moving blue pill that sits behind the active option.
    const indicator = document.createElement("span");
    indicator.className = "segmented__indicator";
    indicator.setAttribute("part", "indicator");
    indicator.setAttribute("aria-hidden", "true");
    this.#indicator = indicator;
    this.#indicatorReady = false;
    this.group.replaceChildren(
      indicator,
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
    const self = this;
    return this.#buttons.map((btn) => ({
      element: btn,
      value: btn.dataset.value,
      disabled: btn.hasAttribute("data-own-disabled"),
      set checked(on) {
        btn.setAttribute("aria-checked", on ? "true" : "false");
        if (on) self.#positionIndicator(btn);
      },
      set tabbable(on) { btn.tabIndex = on ? 0 : -1; },
      set disabledByGroup(on) { btn.disabled = on || btn.hasAttribute("data-own-disabled"); },
      focus() { btn.focus(); },
    }));
  }

  initialValue() {
    const sel = this.querySelector(":scope > option[selected]");
    return sel ? sel.getAttribute("value") ?? sel.textContent.trim() : "";
  }

  // Move the blue pill under the given option button.
  #positionIndicator(btn) {
    const ind = this.#indicator;
    if (!ind) return;
    ind.style.width = `${btn.offsetWidth}px`;
    ind.style.height = `${btn.offsetHeight}px`;
    ind.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop}px)`;
    ind.dataset.active = "true";
    if (!this.#indicatorReady) {
      // Arm the slide only after the first placement, so the active pill
      // appears in position on load instead of sliding in from the corner.
      void ind.offsetWidth; // flush layout before enabling the transition
      ind.classList.add("segmented__indicator--animated");
      this.#indicatorReady = true;
    }
  }

  #repositionActive() {
    const active = this.#buttons.find((b) => b.getAttribute("aria-checked") === "true");
    if (active) this.#positionIndicator(active);
  }
}

customElements.define("neuwo-segmented", NeuwoSegmented);
