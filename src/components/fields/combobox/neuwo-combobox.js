import { NeuwoFieldElement, fieldSheet } from "../field-element.js";
import { sheet } from "../../../core/sheet.js";
import comboboxCss from "./combobox.css?raw";

let cbUid = 0;

// A fully styled single-select dropdown (ARIA select-only combobox). The trigger
// reuses the field chrome; the option list is a top-layer popover listbox. Options
// are authored as light-DOM <option>/<optgroup> children. Open/close and keyboard
// behaviour are added in later tasks.
export class NeuwoCombobox extends NeuwoFieldElement {
  static formAssociated = true;
  static styles = [fieldSheet, sheet(comboboxCss)];
  static observedAttributes = [...NeuwoFieldElement.observedAttributes, "searchable"];

  #cbId = `neuwo-cb-${++cbUid}`;
  #options = []; // { value, label, disabled, selected, group }
  #selected = "";
  #trigger;
  #chevron;
  #popup;
  #listbox;
  #observer = null;
  #open = false;
  #reposition = () => this.#position();
  #active = -1;
  #typeahead = "";
  #typeaheadTimer = 0;
  #filter = "";

  get #searchable() {
    return this.hasAttribute("searchable");
  }

  // --- base seams ---

  createControl() {
    if (this.hasAttribute("searchable")) {
      this.#trigger = document.createElement("input");
      this.#trigger.type = "text";
      this.#trigger.setAttribute("autocomplete", "off");
      this.#trigger.setAttribute("aria-autocomplete", "list");
    } else {
      this.#trigger = document.createElement("button");
      this.#trigger.type = "button";
    }
    this.#trigger.className = "combobox__trigger";
    this.#trigger.setAttribute("role", "combobox");
    this.#trigger.setAttribute("aria-haspopup", "listbox");
    this.#trigger.setAttribute("aria-expanded", "false");
    return this.#trigger;
  }

  decorateControl(control) {
    const box = document.createElement("div");
    box.className = "combobox";

    this.#chevron = document.createElement("span");
    this.#chevron.className = "combobox__chevron";
    this.#chevron.setAttribute("part", "chevron");
    this.#chevron.setAttribute("aria-hidden", "true");

    this.#popup = document.createElement("div");
    this.#popup.className = "combobox__popup";
    this.#popup.setAttribute("part", "popup");
    this.#popup.setAttribute("popover", "auto");
    this.#popup.id = `${this.#cbId}-popup`;

    this.#listbox = document.createElement("ul");
    this.#listbox.className = "combobox__listbox";
    this.#listbox.setAttribute("role", "listbox");
    this.#listbox.id = `${this.#cbId}-listbox`;
    // aria-labelledby is wired to the field label in syncControl (the base creates it lazily).

    this.#popup.append(this.#listbox);
    control.setAttribute("aria-controls", this.#listbox.id);
    box.append(control, this.#chevron, this.#popup);
    return box;
  }

  // The combobox owns its value and commit path; no native input/change wiring.
  // Runs after decorateControl, so the popup/listbox exist to wire here.
  wireControl() {
    this.#trigger.addEventListener("click", this.#onTriggerClick);
    this.#trigger.addEventListener("keydown", this.#onKeydown);
    this.#popup.addEventListener("toggle", this.#onPopoverToggle);
    this.#listbox.addEventListener("click", this.#onOptionClick);
    if (this.#searchable) {
      this.#trigger.addEventListener("input", this.#onFilterInput);
      this.#trigger.addEventListener("focus", this.#onTriggerFocus);
      this.#trigger.addEventListener("blur", this.#onTriggerBlur);
    }
  }

  // No native .value to seed; read options and resolve the initial selection.
  seedValue() {
    this.#readOptions();
    const selectable = this.#options.filter((o) => !o.disabled);
    const initial = this.getAttribute("value");
    if (initial !== null && selectable.some((o) => o.value === initial)) {
      this.#selected = initial;
    } else {
      const preselected = selectable.find((o) => o.selected);
      this.#selected = preselected ? preselected.value : "";
    }
  }

  readValue() {
    return this.#selected;
  }

  writeValue(v) {
    const ok = this.#options.some((o) => o.value === v && !o.disabled);
    this.#selected = ok ? v : "";
    this.#renderTriggerText();
    this.#syncSelectedAria();
    this.syncValidity();
  }

  // Custom validity: required with no selection is valueMissing.
  syncValidity() {
    if (!this.internals || typeof this.internals.setValidity !== "function") return;
    if (this.hasAttribute("required") && !this.#selected) {
      this.internals.setValidity({ valueMissing: true }, "Please select an option.", this.#trigger);
    } else {
      this.internals.setValidity({});
    }
  }

  checkValidity() {
    if (this.internals) return this.internals.checkValidity();
    return !(this.hasAttribute("required") && !this.#selected);
  }
  reportValidity() {
    if (this.internals) return this.internals.reportValidity();
    return !(this.hasAttribute("required") && !this.#selected);
  }

  // The combobox manages its own trigger attributes; forward nothing extra.
  get forwardedAttributes() {
    return [];
  }

  // Refresh the closed-state text and the listbox label on every patch.
  syncControl() {
    this.#renderTriggerText();
    this.#syncListboxLabel();
  }

  // Name the listbox by the field's <label> (spec: "listbox named by the same
  // label"). The base creates the label lazily and updates it on patch, so wire
  // the reference here, giving the label an id when it lacks one.
  #syncListboxLabel() {
    if (!this.#listbox) return;
    const labelEl = this.shadowRoot.querySelector(".field__label");
    if (labelEl) {
      if (!labelEl.id) labelEl.id = `${this.#cbId}-label`;
      this.#listbox.setAttribute("aria-labelledby", labelEl.id);
    } else {
      this.#listbox.removeAttribute("aria-labelledby");
    }
  }

  connectedCallback() {
    super.connectedCallback(); // builds the structure (first time) and seeds the selection
    this.#resync();            // re-read options, drop a vanished selection, render
    this.internals?.setFormValue(this.#selected);
    this.#observer = new MutationObserver(() => this.#resync());
    this.#observer.observe(this, { childList: true, subtree: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    this.close(); // remove the window scroll/resize listeners if open
    this.#observer?.disconnect();
  }

  // --- protected helpers used by later tasks ---
  get options() {
    return this.#options;
  }
  get trigger() {
    return this.#trigger;
  }
  get listbox() {
    return this.#listbox;
  }
  get popup() {
    return this.#popup;
  }

  // --- open/close and positioning ---

  get isOpen() {
    return this.#open;
  }

  open() {
    if (this.#open || this.hasAttribute("disabled") || !this.#options.length) return;
    this.#open = true;
    this.#trigger.setAttribute("aria-expanded", "true");
    if (typeof this.#popup.showPopover === "function") {
      try {
        this.#popup.showPopover();
      } catch {
        /* already open or unsupported */
      }
    }
    this.#position();
    if (this.#active < 0) this.#activeStart();
    window.addEventListener("scroll", this.#reposition, true);
    window.addEventListener("resize", this.#reposition);
  }

  close() {
    if (!this.#open) return;
    this.#filter = "";
    if (this.#searchable) {
      this.#listbox.querySelectorAll(".combobox__option").forEach((li) => (li.hidden = false));
      const empty = this.#listbox.querySelector(".combobox__empty");
      if (empty) empty.remove();
      this.#renderTriggerText();
    }
    this.#open = false;
    this.#trigger.setAttribute("aria-expanded", "false");
    this.#setActive(-1); // reset highlight + aria-activedescendant so the next open re-highlights the selection
    if (typeof this.#popup.hidePopover === "function") {
      try {
        this.#popup.hidePopover();
      } catch {
        /* already closed */
      }
    }
    window.removeEventListener("scroll", this.#reposition, true);
    window.removeEventListener("resize", this.#reposition);
  }

  #onTriggerClick = () => {
    if (this.#searchable) {
      // The input opens on focus; a click must not toggle it shut.
      if (!this.#open) this.open();
      return;
    }
    if (this.#open) this.close();
    else this.open();
  };

  // Place the popup under the trigger, flipping above when there is no room,
  // matching the trigger width. The popover renders in the top layer (fixed).
  #position() {
    if (!this.#open || typeof this.#trigger.getBoundingClientRect !== "function") return;
    const r = this.#trigger.getBoundingClientRect();
    const popup = this.#popup;
    popup.style.position = "fixed";
    popup.style.minWidth = `${r.width}px`;
    popup.style.left = `${r.left}px`;
    const below = window.innerHeight - r.bottom;
    const ph = popup.offsetHeight || 0;
    if (below < ph && r.top > below) {
      popup.style.top = "auto";
      popup.style.bottom = `${window.innerHeight - r.top + 4}px`;
    } else {
      popup.style.bottom = "auto";
      popup.style.top = `${r.bottom + 4}px`;
    }
  }

  #onPopoverToggle = (e) => {
    // Browser-driven close (Escape, outside click) -> mirror our state.
    if (e.newState === "closed" && this.#open) this.close();
  };

  // Indices of selectable (non-disabled, not hidden) options.
  #selectable() {
    return this.#options
      .map((o, i) => {
        if (o.disabled) return -1;
        const li = this.#listbox?.querySelector(`.combobox__option[data-index="${i}"]`);
        if (li && li.hidden) return -1;
        return i;
      })
      .filter((i) => i >= 0);
  }

  #setActive(index) {
    this.#active = index;
    const items = this.#listbox.querySelectorAll(".combobox__option");
    items.forEach((li) => li.classList.remove("is-active"));
    if (index < 0) {
      this.#trigger.removeAttribute("aria-activedescendant");
      return;
    }
    const el = this.#listbox.querySelector(`.combobox__option[data-index="${index}"]`);
    if (!el) return;
    el.classList.add("is-active");
    this.#trigger.setAttribute("aria-activedescendant", el.id);
    if (typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "nearest" });
  }

  #move(delta, toEdge) {
    const sel = this.#selectable();
    if (!sel.length) return;
    let pos;
    if (toEdge) {
      pos = delta > 0 ? 0 : sel.length - 1;
    } else {
      const current = sel.indexOf(this.#active);
      if (current === -1) pos = delta > 0 ? 0 : sel.length - 1;
      else pos = Math.min(sel.length - 1, Math.max(0, current + delta));
    }
    this.#setActive(sel[pos]);
  }

  #activeStart() {
    // Open with the selected option active, else the first selectable.
    const selIdx = this.#options.findIndex((o) => o.value === this.#selected && !o.disabled);
    this.#setActive(selIdx >= 0 ? selIdx : this.#selectable()[0] ?? -1);
  }

  #commitActive() {
    if (this.#active >= 0 && !this.#options[this.#active].disabled) {
      this.commit(this.#options[this.#active].value);
    }
  }

  #typeaheadMatch(char) {
    this.#typeahead = (this.#typeahead + char).toLowerCase();
    const match = this.#options.findIndex(
      (o) => !o.disabled && o.label.toLowerCase().startsWith(this.#typeahead)
    );
    if (match >= 0) {
      if (!this.#open) this.open();
      this.#setActive(match);
    }
    clearTimeout(this.#typeaheadTimer);
    this.#typeaheadTimer = setTimeout(() => (this.#typeahead = ""), 500);
  }

  #onKeydown = (e) => {
    const k = e.key;
    // In searchable mode, printable keys and Space must reach the input to
    // filter/type, and Home/End move the caret, so they are not intercepted.
    const search = this.#searchable;
    if (!this.#open) {
      if (k === "ArrowUp") {
        e.preventDefault();
        this.open();
        this.#move(-1, true); // ArrowUp opens at the last option (APG)
        return;
      }
      if (k === "ArrowDown" || k === "Enter" || (k === " " && !search)) {
        e.preventDefault();
        this.open(); // open() highlights the selected or first option
        return;
      }
      if (!search && k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        this.#typeaheadMatch(k);
        return;
      }
      return;
    }
    switch (k) {
      case "ArrowDown": e.preventDefault(); this.#move(1, false); break;
      case "ArrowUp": e.preventDefault(); this.#move(-1, false); break;
      case "Home": if (!search) { e.preventDefault(); this.#move(1, true); } break;
      case "End": if (!search) { e.preventDefault(); this.#move(-1, true); } break;
      case "Enter": e.preventDefault(); this.#commitActive(); this.close(); this.#trigger.focus(); break;
      case " ":
        // Select-only: Space commits. Searchable: Space types into the filter.
        if (!search) { e.preventDefault(); this.#commitActive(); this.close(); this.#trigger.focus(); }
        break;
      case "Escape": e.preventDefault(); this.close(); this.#trigger.focus(); break;
      case "Tab": this.#commitActive(); this.close(); break;
      default:
        if (!search && k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          this.#typeaheadMatch(k);
        }
    }
  };

  #onOptionClick = (e) => {
    const li = e.target.closest(".combobox__option");
    if (!li || li.getAttribute("aria-disabled") === "true") return;
    this.commit(li.dataset.value);
    this.close();
    this.#trigger.focus();
  };

  // Commit a value: update selection, the form value, validity, and emit events.
  commit(value) {
    if (value === this.#selected) return;
    this.value = value; // base setter -> writeValue + setFormValue
    this.syncValidity();
    this.dispatchEvent(new Event("input", { bubbles: true }));
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // --- private: options + rendering ---

  // Re-read the light-DOM options, drop a selection that no longer maps to an
  // enabled option (updating the form value), and re-render. Runs on connect
  // (so a reconnect re-syncs) and on every child mutation.
  #resync() {
    this.#readOptions();
    if (this.#selected && !this.#options.some((o) => o.value === this.#selected && !o.disabled)) {
      this.#selected = "";
      this.internals?.setFormValue("");
    }
    this.#renderOptions();
    this.#renderTriggerText();
    this.#syncSelectedAria();
    this.syncValidity();
  }

  #readOptions() {
    const read = (nodes, group) =>
      Array.from(nodes).flatMap((el) => {
        if (el.tagName === "OPTGROUP") return read(el.children, el.getAttribute("label") || "");
        if (el.tagName !== "OPTION") return [];
        return [
          {
            value: el.getAttribute("value") ?? el.textContent.trim(),
            label: el.textContent.trim(),
            disabled: el.hasAttribute("disabled"),
            selected: el.hasAttribute("selected"),
            group,
          },
        ];
      });
    this.#options = read(this.children, "");
  }

  #renderOptions() {
    if (!this.#listbox) return;
    this.#listbox.replaceChildren();
    let groupEl = null;
    let lastGroup = "";
    this.#options.forEach((opt, i) => {
      if (opt.group) {
        if (opt.group !== lastGroup) {
          groupEl = document.createElement("li");
          groupEl.className = "combobox__group-item";
          groupEl.setAttribute("role", "group");
          const labelId = `${this.#cbId}-grp-${i}`;
          groupEl.setAttribute("aria-labelledby", labelId);
          const label = document.createElement("div");
          label.className = "combobox__group";
          label.id = labelId;
          label.textContent = opt.group;
          groupEl.append(label);
          this.#listbox.append(groupEl);
          lastGroup = opt.group;
        }
      } else {
        groupEl = null;
        lastGroup = "";
      }
      const item = document.createElement(opt.group ? "div" : "li");
      item.className = "combobox__option";
      item.id = `${this.#cbId}-opt-${i}`;
      item.dataset.value = opt.value;
      item.dataset.index = String(i);
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", opt.value === this.#selected ? "true" : "false");
      if (opt.disabled) item.setAttribute("aria-disabled", "true");
      item.textContent = opt.label;
      (opt.group ? groupEl : this.#listbox).append(item);
    });
  }

  #renderTriggerText() {
    if (!this.#trigger) return;
    const opt = this.#options.find((o) => o.value === this.#selected);
    if (this.#searchable) {
      this.#trigger.value = opt ? opt.label : "";
      this.#trigger.placeholder = this.getAttribute("placeholder") || "";
      return;
    }
    const label = document.createElement("span");
    label.className = "combobox__value";
    if (opt) {
      label.textContent = opt.label;
      this.#trigger.removeAttribute("data-placeholder");
    } else {
      label.textContent = this.getAttribute("placeholder") || "";
      this.#trigger.setAttribute("data-placeholder", "");
    }
    this.#trigger.replaceChildren(label);
  }

  #syncSelectedAria() {
    if (!this.#listbox) return;
    for (const li of this.#listbox.querySelectorAll('[role="option"]')) {
      li.setAttribute("aria-selected", li.dataset.value === this.#selected ? "true" : "false");
    }
  }

  #applyFilter() {
    const q = this.#filter.trim().toLowerCase();
    let anyVisible = false;
    let firstVisible = -1;
    this.#listbox.querySelectorAll(".combobox__option").forEach((li) => {
      const i = Number(li.dataset.index);
      const match = !q || this.#options[i].label.toLowerCase().includes(q);
      li.hidden = !match;
      if (match) {
        anyVisible = true;
        if (firstVisible < 0 && !this.#options[i].disabled) firstVisible = i;
      }
    });
    let empty = this.#listbox.querySelector(".combobox__empty");
    if (!anyVisible) {
      if (!empty) {
        empty = document.createElement("li");
        empty.className = "combobox__empty";
        empty.setAttribute("role", "presentation");
        empty.textContent = "No matches";
        this.#listbox.append(empty);
      }
    } else if (empty) {
      empty.remove();
    }
    this.#setActive(firstVisible);
  }

  #onFilterInput = () => {
    this.#filter = this.#trigger.value;
    if (!this.#open) this.open();
    this.#applyFilter();
  };

  #onTriggerFocus = () => {
    if (!this.#open) {
      this.#filter = "";
      this.open(); // open() highlights the current selection; options are already unfiltered after close()
    }
  };

  #onTriggerBlur = () => {
    // Revert the input text to the committed selection's label.
    if (!this.#open) this.#renderTriggerText();
  };
}

customElements.define("neuwo-combobox", NeuwoCombobox);
