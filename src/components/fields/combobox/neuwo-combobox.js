import { childInfo } from "../../../core/adapters/dom.js";
import { define, ownedByReact } from "../../../core/element.js";
import { CONTROLLED } from "../../../core/marks.js";
import { positionPopup } from "../../../core/position-popup.js";
import { NeuwoFieldElement } from "../field-element.js";
import { comboboxOptions, comboboxTemplate } from "./combobox.template.js";

const ACTIVE = "neuwo-combobox__option--active";
const BOX = ":scope > .neuwo-field > .neuwo-combobox";
const DISPLAY = { subtree: true, childList: true, characterData: true, attributeFilter: ["value", "data-placeholder", "aria-selected"] };

/** @param {Element} row */
const enabled = (row) => row.getAttribute("aria-disabled") !== "true";

/** @param {Element} row */
const indexOf = (row) => Number(row.getAttribute("data-index"));

/**
 * Fully styled dropdown that renders its list in the top layer, with optional type-to-filter. The template renders
 * the trigger, the listbox and a visually hidden native input that carries `name`, the starting value, `required`
 * and `disabled`, so the combobox submits, resets and validates with its form, before the script has loaded too.
 * The options come from the element's own `<option>` and `<optgroup>` children, which stay in a hidden `<select>`.
 * The starting value is the `value` attribute when it names an enabled option, else the first enabled option
 * marked `selected`. `readonly` and `autocomplete` do not apply.
 *
 * @summary Neuwo combobox. Shares the field's classes (see `neuwo-input`): `.neuwo-input` and `.neuwo-combobox__trigger` on the trigger, inside `.neuwo-combobox`; `.neuwo-combobox__value` around the shown label; `.neuwo-combobox__chevron`; `.neuwo-combobox__popup` and `.neuwo-combobox__listbox`; `.neuwo-combobox__option`, with `--active` on the highlighted row; `.neuwo-combobox__group-item` and `.neuwo-combobox__group` for an `<optgroup>`; `.neuwo-combobox__empty` on the "No matches" row; `.neuwo-combobox__options` on the hidden `<select>`; `.neuwo-combobox__form-value` on the native input that submits.
 * @customElement neuwo-combobox
 * @attr {boolean} searchable - show a text field that filters the options.
 * @fires {Event} input - the user picked a new value; dispatched just before `change`. Typing into the filter does not fire it.
 * @fires {Event} change - the user picked a new value.
 * @slot - the `<option>` and `<optgroup>` elements for the list.
 */
export class NeuwoCombobox extends NeuwoFieldElement {
  static template = comboboxTemplate;
  static observedAttributes = [...NeuwoFieldElement.observedAttributes, "searchable"];

  #open = false;
  #active = -1;
  #filter = "";
  #typeahead = "";
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #typeaheadTimer;

  /** @type {MutationObserver | null} */
  #observer = null;

  /** @type {Element | null} */
  #watched = null;

  /** @type {MutationObserver | null} */
  #display = null;

  /** @type {string | undefined} */
  #picked;

  #reposition = () => this.#position();

  /**
   * The native input that submits the value.
   * @returns {HTMLInputElement | null}
   */
  get control() {
    return this.querySelector(`${BOX} > .neuwo-combobox__form-value`);
  }

  /**
   * The element `focus()` and `blur()` act on.
   * @returns {HTMLElement | null}
   */
  get focusTarget() {
    return this.trigger;
  }

  /**
   * The `<button>`, or with `searchable` the text `<input>`, that opens the list.
   * @returns {HTMLButtonElement | HTMLInputElement | null}
   */
  get trigger() {
    return this.querySelector(`${BOX} > .neuwo-combobox__trigger`);
  }

  /** @returns {HTMLElement | null} */
  get popup() {
    return this.querySelector(`${BOX} > .neuwo-combobox__popup`);
  }

  /** @returns {HTMLElement | null} */
  get listbox() {
    return this.querySelector(`${BOX} > .neuwo-combobox__popup > .neuwo-combobox__listbox`);
  }

  /**
   * The options, read from the `<option>` and `<optgroup>` children.
   * @returns {import("./combobox.template.js").ComboboxOption[]}
   */
  get options() {
    return comboboxOptions(childInfo(this, comboboxTemplate));
  }

  /**
   * The live value, which is the form value's; while a pick on a host React controls dispatches `input` and
   * `change`, it is the picked value. Setting it shows an enabled option's value, or nothing for any other value,
   * and does nothing on a host React controls.
   * @returns {string}
   */
  get value() {
    return this.#picked ?? super.value;
  }
  set value(value) {
    const controlled = Reflect.get(this, CONTROLLED);
    // React hands an element it is still building a value only when it controls it, and sets the flag later, from its ref.
    if (controlled === true || (controlled === undefined && !this.isConnected && ownedByReact(this))) return;
    const next = value == null ? "" : String(value);
    if (!this.control) super.value = next;
    else this.#show(this.#accept(next));
  }

  get isOpen() {
    return this.#open;
  }

  /**
   * Picks a value as the user does: shows it, then dispatches `input` and `change` on the element when it changed.
   * A value no enabled option has picks nothing. On a host React controls it only dispatches them, with `value`
   * reading the picked value meanwhile, and React shows whatever the consumer's state then holds.
   * @param {string} value
   */
  commit(value) {
    const next = this.#accept(value == null ? "" : String(value));
    if (next === this.value) return;
    if (Reflect.get(this, CONTROLLED) === true) this.#picked = next;
    else this.#show(next);
    try {
      this.dispatchEvent(new Event("input", { bubbles: true }));
      this.dispatchEvent(new Event("change", { bubbles: true }));
    } finally {
      this.#picked = undefined;
    }
  }

  open() {
    const trigger = this.trigger;
    const popup = this.popup;
    if (this.#open || !trigger || !popup || this.disabled || !this.#rows().length) return;
    this.#open = true;
    trigger.setAttribute("aria-expanded", "true");
    if (typeof popup.showPopover === "function") {
      try {
        popup.showPopover();
      } catch {
        // It throws when already shown or detached, and either leaves nothing to do.
      }
    }
    this.#position();
    if (this.#active < 0) this.#activeStart();
    window.addEventListener("scroll", this.#reposition, true);
    window.addEventListener("resize", this.#reposition);
  }

  close() {
    if (!this.#open) return;
    this.#open = false;
    if (this.#filter) {
      this.#filter = "";
      this.#applyFilter();
    }
    this.#revertText();
    this.trigger?.setAttribute("aria-expanded", "false");
    this.#setActive(-1);
    const popup = this.popup;
    if (popup && typeof popup.hidePopover === "function") {
      try {
        popup.hidePopover();
      } catch {
        // It throws when already hidden, which leaves nothing to do.
      }
    }
    window.removeEventListener("scroll", this.#reposition, true);
    window.removeEventListener("resize", this.#reposition);
  }

  connect() {
    super.connect();
    this.addEventListener("click", this.#onClick);
    this.addEventListener("keydown", this.#onKeydown);
    this.addEventListener("input", this.#onInputOrChange, true);
    this.addEventListener("change", this.#onInputOrChange, true);
    this.addEventListener("toggle", this.#onToggle, true);
    this.addEventListener("focus", this.#onFocus, true);
    this.addEventListener("blur", this.#onBlur, true);
    this.addEventListener("blur", this.#lendName, true);
    this.addEventListener("focusout", this.#lendName, true);
    this.#watchOptions();
    // Every host watches, since React can hydrate one after it connected and then rewrite what the element showed.
    this.#display ??= new MutationObserver(() => {
      if (ownedByReact(this)) this.#sync();
    });
    this.#display.observe(this, DISPLAY);
    // React's ref sets the controlled flag after connect, so on a React host a write here could undo React's value.
    if (!ownedByReact(this)) this.#sync();
  }

  disconnect() {
    super.disconnect();
    this.close();
    this.removeEventListener("click", this.#onClick);
    this.removeEventListener("keydown", this.#onKeydown);
    this.removeEventListener("input", this.#onInputOrChange, true);
    this.removeEventListener("change", this.#onInputOrChange, true);
    this.removeEventListener("toggle", this.#onToggle, true);
    this.removeEventListener("focus", this.#onFocus, true);
    this.removeEventListener("blur", this.#onBlur, true);
    this.removeEventListener("blur", this.#lendName, true);
    this.removeEventListener("focusout", this.#lendName, true);
    this.#observer?.disconnect();
    this.#observer = null;
    this.#watched = null;
    this.#display?.disconnect();
    clearTimeout(this.#typeaheadTimer);
  }

  updated() {
    super.updated();
    this.#watchOptions();
    this.#sync();
    if (this.#open) {
      this.trigger?.setAttribute("aria-expanded", "true");
      if (this.#filter) this.#applyFilter();
      else if (this.#row(this.#active)) this.#setActive(this.#active);
      else this.#activeStart();
      this.#position();
    }
    this.#observer?.takeRecords();
  }

  formReset() {
    this.#sync();
  }

  #watchOptions() {
    const select = ownedByReact(this) ? null : this.querySelector(`${BOX} > .neuwo-combobox__options`);
    if (select === this.#watched) return;
    this.#observer?.disconnect();
    this.#watched = select;
    if (!select) return;
    this.#observer ??= new MutationObserver(() => this.refresh());
    this.#observer.observe(select, { childList: true, subtree: true, attributes: true, characterData: true });
  }

  /**
   * Shows the live value, dropping one that no enabled option has any more. On a host React controls, React shows
   * it, and only the text a searchable trigger keeps from typing is the element's to put back.
   */
  #sync() {
    const control = this.control;
    if (!control) return;
    if (Reflect.get(this, CONTROLLED) !== true) this.#show(this.#accept(control.value));
    else if (!this.#open) this.#revertText();
  }

  /** @returns {HTMLElement[]} */
  #rows() {
    return Array.from(this.listbox?.querySelectorAll(".neuwo-combobox__option") ?? []);
  }

  /**
   * @param {number} index
   * @returns {HTMLElement | undefined}
   */
  #row(index) {
    return index < 0 ? undefined : this.#rows().find((row) => indexOf(row) === index);
  }

  /**
   * @param {string} value
   * @returns {HTMLElement | undefined}
   */
  #chosen(value) {
    return this.#rows().find((row) => enabled(row) && row.getAttribute("data-value") === value);
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  #accept(value) {
    return this.#chosen(value) ? value : "";
  }

  /**
   * Writes the displayed value: the form value, the shown label or placeholder, and which row is selected. It writes
   * only what differs.
   * @param {string} value
   */
  #show(value) {
    const control = this.control;
    if (control && control.value !== value) control.value = value;
    const chosen = this.#chosen(value);
    for (const row of this.#rows()) {
      const selected = String(Boolean(chosen) && row.getAttribute("data-value") === value);
      if (row.getAttribute("aria-selected") !== selected) row.setAttribute("aria-selected", selected);
    }
    const trigger = this.trigger;
    if (trigger && trigger.hasAttribute("data-placeholder") === Boolean(chosen)) trigger.toggleAttribute("data-placeholder", !chosen);
    if (trigger instanceof HTMLInputElement) {
      if (!this.#open) this.#revertText();
    } else {
      const shown = trigger?.querySelector(".neuwo-combobox__value");
      const text = chosen ? (chosen.textContent ?? "") : (this.getAttribute("placeholder") ?? "");
      if (shown && shown.textContent !== text) shown.textContent = text;
    }
    this.#display?.takeRecords();
  }

  /** Puts the label of the live value back into the searchable trigger, over any filter text. */
  #revertText() {
    const trigger = this.trigger;
    if (!(trigger instanceof HTMLInputElement)) return;
    const label = this.#chosen(this.value)?.textContent ?? "";
    if (trigger.value !== label) trigger.value = label;
  }

  #position() {
    const trigger = this.trigger;
    const popup = this.popup;
    if (this.#open && trigger && popup) positionPopup(trigger, popup);
  }

  /** @returns {number[]} */
  #selectable() {
    return this.#rows()
      .filter((row) => enabled(row) && !row.hidden)
      .map(indexOf);
  }

  /** @param {number} index */
  #setActive(index) {
    this.#active = index;
    const row = this.#row(index);
    for (const each of this.#rows()) {
      if (each.classList.contains(ACTIVE) !== (each === row)) each.classList.toggle(ACTIVE, each === row);
    }
    const trigger = this.trigger;
    if (!row) {
      trigger?.removeAttribute("aria-activedescendant");
      return;
    }
    if (trigger && trigger.getAttribute("aria-activedescendant") !== row.id) trigger.setAttribute("aria-activedescendant", row.id);
    if (typeof row.scrollIntoView === "function") row.scrollIntoView({ block: "nearest" });
  }

  /**
   * @param {number} delta
   * @param {boolean} toEdge
   */
  #move(delta, toEdge) {
    const selectable = this.#selectable();
    if (!selectable.length) return;
    const current = selectable.indexOf(this.#active);
    let at;
    if (toEdge || current === -1) at = delta > 0 ? 0 : selectable.length - 1;
    else at = Math.min(selectable.length - 1, Math.max(0, current + delta));
    this.#setActive(selectable[at]);
  }

  #activeStart() {
    const chosen = this.#chosen(this.value);
    this.#setActive(chosen ? indexOf(chosen) : (this.#selectable()[0] ?? -1));
  }

  #commitActive() {
    const row = this.#row(this.#active);
    if (row && enabled(row)) this.commit(row.getAttribute("data-value") ?? "");
  }

  /** @param {string} char */
  #typeaheadMatch(char) {
    this.#typeahead = (this.#typeahead + char).toLowerCase();
    const match = this.#rows().find((row) => enabled(row) && (row.textContent ?? "").trim().toLowerCase().startsWith(this.#typeahead));
    if (match) {
      if (!this.#open) this.open();
      this.#setActive(indexOf(match));
    }
    clearTimeout(this.#typeaheadTimer);
    this.#typeaheadTimer = setTimeout(() => (this.#typeahead = ""), 500);
  }

  #applyFilter() {
    const query = this.#filter.trim().toLowerCase();
    let any = false;
    let first = -1;
    for (const row of this.#rows()) {
      const match = !query || (row.textContent ?? "").toLowerCase().includes(query);
      if (row.hidden === match) row.hidden = !match;
      if (match) {
        any = true;
        if (first < 0 && enabled(row)) first = indexOf(row);
      }
    }
    const empty = this.listbox?.querySelector(".neuwo-combobox__empty");
    if (empty instanceof HTMLElement && empty.hidden !== any) empty.hidden = any;
    this.#setActive(first);
  }

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    const target = /** @type {Element} */ (event.target);
    const trigger = this.trigger;
    if (trigger && trigger.contains(target)) {
      if (trigger instanceof HTMLInputElement) this.open();
      else if (this.#open) this.close();
      else this.open();
      return;
    }
    const row = target.closest?.(".neuwo-combobox__option");
    if (!row || !this.listbox?.contains(row) || !enabled(row)) return;
    this.commit(row.getAttribute("data-value") ?? "");
    this.close();
    trigger?.focus();
  };

  /** @param {KeyboardEvent} event */
  #onKeydown = (event) => {
    const trigger = this.trigger;
    if (!trigger || event.target !== trigger) return;
    const key = event.key;
    const search = trigger instanceof HTMLInputElement;
    const printable = !search && key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey;
    if (!this.#open) {
      if (key === "ArrowUp") {
        event.preventDefault();
        this.open();
        this.#move(-1, true);
      } else if (key === "ArrowDown" || key === "Enter" || (key === " " && !search)) {
        event.preventDefault();
        this.open();
      } else if (printable) {
        event.preventDefault();
        this.#typeaheadMatch(key);
      }
      return;
    }
    switch (key) {
      case "ArrowDown":
        event.preventDefault();
        this.#move(1, false);
        break;
      case "ArrowUp":
        event.preventDefault();
        this.#move(-1, false);
        break;
      case "Home":
      case "End":
        if (!search) {
          event.preventDefault();
          this.#move(key === "Home" ? 1 : -1, true);
        }
        break;
      case "Enter":
        event.preventDefault();
        this.#commitActive();
        this.close();
        trigger.focus();
        break;
      case " ":
        if (!search) {
          event.preventDefault();
          this.#commitActive();
          this.close();
          trigger.focus();
        }
        break;
      case "Escape":
        event.preventDefault();
        this.close();
        trigger.focus();
        break;
      case "Tab":
        this.#commitActive();
        this.close();
        break;
      default:
        if (printable) {
          event.preventDefault();
          this.#typeaheadMatch(key);
        }
    }
  };

  // Capture, at the element: stopped any later, these events would reach the element's own listeners.
  /** @param {Event} event */
  #onInputOrChange = (event) => {
    if (event.target === this.control) {
      event.stopPropagation();
      if (Reflect.get(this, CONTROLLED) !== true) this.#sync();
      return;
    }
    const trigger = this.trigger;
    if (!(trigger instanceof HTMLInputElement) || event.target !== trigger) return;
    event.stopPropagation();
    if (event.type !== "input") return;
    this.#filter = trigger.value;
    if (!this.#open) this.open();
    this.#applyFilter();
  };

  /** @param {Event} event */
  #onToggle = (event) => {
    if (event.target === this.popup && /** @type {ToggleEvent} */ (event).newState === "closed" && this.#open) this.close();
  };

  /** @param {FocusEvent} event */
  #onFocus = (event) => {
    const trigger = this.trigger;
    if (event.target === this.control) trigger?.focus();
    else if (trigger instanceof HTMLInputElement && event.target === trigger && !this.#open) {
      this.#filter = "";
      this.open();
    }
  };

  /** @param {FocusEvent} event */
  #onBlur = (event) => {
    if (event.target === this.trigger && !this.#open) this.#revertText();
  };

  /**
   * Form libraries find a blurred field by `event.target.name`, so the trigger reads as named for that dispatch only.
   * @param {FocusEvent} event
   */
  #lendName = (event) => {
    const trigger = this.trigger;
    if (!trigger || event.target !== trigger) return;
    Object.defineProperty(trigger, "name", {
      configurable: true,
      get: () => (event.eventPhase === Event.NONE ? (trigger.getAttribute("name") ?? "") : this.name),
      set: (value) => trigger.setAttribute("name", value),
    });
  };
}

define("neuwo-combobox", NeuwoCombobox);
