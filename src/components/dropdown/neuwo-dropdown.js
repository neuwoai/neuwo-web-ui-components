import { NeuwoElement } from "../../core/base-element.js";
import { sheet } from "../../core/sheet.js";
import { positionPopup } from "../../core/position-popup.js";
import dropdownCss from "./dropdown.css?raw";

let ddUid = 0;

const PLACEMENTS = ["bottom", "top"];
const ALIGNMENTS = ["start", "end"];

/**
 * Disclosure navigation dropdown: a trigger button over a panel of slotted
 * links. Follows the APG disclosure navigation pattern rather than the menu
 * button pattern, so the items keep their native link semantics: they stay in
 * the light DOM, so `href`, middle-click, Ctrl-click, the context menu and
 * delegated document listeners all keep working.
 *
 * @summary Neuwo dropdown (navigation menu).
 * @customElement neuwo-dropdown
 * @attr label - the trigger's text; the fallback for the `label` slot.
 * @attr {bottom|top} placement - which side the panel opens on (default bottom). Ignored while `inline` is set.
 * @attr {start|end} align - which trigger edge the panel lines up with (default start). Ignored while `inline` is set.
 * @attr {boolean} inline - render the panel in flow, pushing siblings down, instead of in the top layer.
 * @attr {boolean} open - whether the panel is open; reflected.
 * @fires {Event} toggle - the panel opened or closed.
 * @slot - the items: links or buttons, kept in the light DOM.
 * @slot label - rich trigger content, replacing the `label` attribute's text. The icon and chevron stay owned by the recipe.
 * @slot icon - a leading icon, before the trigger's label.
 * @csspart trigger - the trigger button.
 * @csspart label - the wrapper around the trigger's label.
 * @csspart arrow - the trigger's chevron.
 * @csspart panel - the panel holding the items.
 * @cssprop --color-blue - the underline and focus accent; re-theme by setting it on :root.
 * @cssprop --color-text - the item and trigger text colour.
 * @cssprop --color-heading - the hovered and current item colour.
 */
export class NeuwoDropdown extends NeuwoElement {
  static styles = sheet(dropdownCss);
  static observedAttributes = ["label", "placement", "align", "inline", "open"];

  #id = `neuwo-dropdown-${++ddUid}`;
  #wrapper;
  #trigger;
  #labelSlot;
  #arrow;
  #panel;
  #built = false;
  #open = false;
  #inline = false;
  #reposition = () => this.#position();
  #dismissBound = false;

  // --- Public API ---

  get label() {
    return this.getAttribute("label") ?? "";
  }
  set label(v) {
    if (v == null || v === "") this.removeAttribute("label");
    else this.setAttribute("label", String(v));
  }

  /** @returns {"bottom" | "top"} */
  get placement() {
    const v = this.getAttribute("placement");
    return PLACEMENTS.includes(v) ? /** @type {"bottom" | "top"} */ (v) : "bottom";
  }
  /** @param {string | null} v */
  set placement(v) {
    if (v == null || v === "") this.removeAttribute("placement");
    else this.setAttribute("placement", String(v));
  }

  /** @returns {"start" | "end"} */
  get align() {
    const v = this.getAttribute("align");
    return ALIGNMENTS.includes(v) ? /** @type {"start" | "end"} */ (v) : "start";
  }
  /** @param {string | null} v */
  set align(v) {
    if (v == null || v === "") this.removeAttribute("align");
    else this.setAttribute("align", String(v));
  }

  get inline() {
    return this.hasAttribute("inline");
  }
  set inline(v) {
    this.toggleAttribute("inline", Boolean(v));
  }

  get open() {
    return this.hasAttribute("open");
  }
  set open(v) {
    this.toggleAttribute("open", Boolean(v));
  }

  /** Open the panel. The `open` attribute is the single source of truth. */
  show() {
    this.open = true;
  }

  /** Close the panel. */
  hide() {
    this.open = false;
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    this.#teardownDismiss();
  }

  // --- Render: build once, then patch ---
  // A full rebuild on every attribute change would drop the panel's popover
  // state and re-slot the items, so only the first render constructs.

  render() {
    if (this.#built) this.#patch();
    else this.#build();
  }

  #build() {
    this.#wrapper = document.createElement("div");
    this.#wrapper.className = "dropdown";

    this.#trigger = document.createElement("button");
    this.#trigger.type = "button";
    this.#trigger.className = "dropdown__trigger";
    this.#trigger.setAttribute("part", "trigger");
    this.#trigger.setAttribute("aria-expanded", "false");
    this.#trigger.id = `${this.#id}-trigger`;

    const iconSlot = document.createElement("slot");
    iconSlot.setAttribute("name", "icon");

    const labelWrap = document.createElement("span");
    labelWrap.className = "dropdown__label";
    labelWrap.setAttribute("part", "label");
    // The `label` attribute becomes the slot's fallback content, so slotted
    // markup replaces it without either side knowing about the other.
    this.#labelSlot = document.createElement("slot");
    this.#labelSlot.setAttribute("name", "label");
    labelWrap.append(this.#labelSlot);

    this.#arrow = document.createElement("span");
    this.#arrow.className = "dropdown__arrow";
    this.#arrow.setAttribute("part", "arrow");
    this.#arrow.setAttribute("aria-hidden", "true");

    this.#trigger.append(iconSlot, labelWrap, this.#arrow);

    this.#panel = document.createElement("div");
    this.#panel.className = "dropdown__panel";
    this.#panel.setAttribute("part", "panel");
    this.#panel.id = `${this.#id}-panel`;
    this.#panel.hidden = true;
    this.#panel.append(document.createElement("slot"));

    this.#trigger.setAttribute("aria-controls", this.#panel.id);

    this.#wrapper.append(this.#trigger, this.#panel);
    this.shadowRoot.append(this.#wrapper);

    this.#trigger.addEventListener("click", this.#onTriggerClick);
    this.#panel.addEventListener("toggle", this.#onPopoverToggle);
    this.#trigger.addEventListener("keydown", this.#onTriggerKeydown);
    this.addEventListener("keydown", this.#onItemKeydown);
    this.addEventListener("focusout", this.#onFocusOut);

    this.#built = true;
    this.#patch();
  }

  #patch() {
    const inline = this.hasAttribute("inline");
    // Removing `popover` from an open popover is a spec edge case. Close first,
    // which re-enters #patch() to finish the reconfigure.
    if (inline !== this.#inline && this.#open) {
      this.#inline = inline;
      this.removeAttribute("open");
      return;
    }
    this.#inline = inline;

    const classes = ["dropdown"];
    if (this.placement === "top") classes.push("dropdown--top");
    if (this.align === "end") classes.push("dropdown--end");
    if (this.#inline) classes.push("dropdown--inline");
    this.#wrapper.className = classes.join(" ");

    const text = this.getAttribute("label") ?? "";
    if (this.#labelSlot.textContent !== text) this.#labelSlot.textContent = text;

    // Entering popover mode: the attribute must exist before #doOpen shows it.
    if (!this.#inline && !this.#panel.hasAttribute("popover")) {
      this.#panel.setAttribute("popover", "auto");
    }

    // The `open` attribute is the single source of truth; reconcile to it.
    const wantOpen = this.hasAttribute("open");
    if (wantOpen !== this.#open) {
      if (wantOpen) this.#doOpen();
      else this.#doClose();
    }

    // Leaving popover mode: remove only after #doClose has hidden the panel.
    if (this.#inline) this.#panel.removeAttribute("popover");
  }

  // The focusable items, in light-DOM order. A non-focusable child (the current
  // locale rendered as a <span>) is present but never a navigation target.
  #items() {
    return Array.from(this.children).filter((el) =>
      el.matches?.('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    );
  }

  #doOpen() {
    this.#open = true;
    this.#trigger.setAttribute("aria-expanded", "true");
    this.#panel.hidden = false;
    if (!this.#inline) {
      if (typeof this.#panel.showPopover === "function") {
        try {
          this.#panel.showPopover();
        } catch {
          /* already open, or popover unsupported */
        }
      }
      this.#position();
      window.addEventListener("scroll", this.#reposition, true);
      window.addEventListener("resize", this.#reposition);
    }
    // `popover=auto` dismisses on an outside click by itself, but inline mode and
    // environments without popover support need this.
    document.addEventListener("click", this.#onDocumentClick);
    this.#dismissBound = true;
    this.dispatchEvent(new Event("toggle", { bubbles: true }));
  }

  #doClose() {
    this.#open = false;
    this.#trigger.setAttribute("aria-expanded", "false");
    if (this.#panel.hasAttribute("popover") && typeof this.#panel.hidePopover === "function") {
      try {
        this.#panel.hidePopover();
      } catch {
        /* already closed */
      }
    }
    this.#panel.hidden = true;
    this.#teardownDismiss();
    this.dispatchEvent(new Event("toggle", { bubbles: true }));
  }

  #teardownDismiss() {
    window.removeEventListener("scroll", this.#reposition, true);
    window.removeEventListener("resize", this.#reposition);
    if (this.#dismissBound) {
      document.removeEventListener("click", this.#onDocumentClick);
      this.#dismissBound = false;
    }
  }

  #position() {
    if (!this.#open || this.#inline) return;
    positionPopup(this.#trigger, this.#panel, {
      placement: this.placement,
      align: this.align,
    });
  }

  #onTriggerClick = (e) => {
    e.stopPropagation();
    this.open = !this.open;
  };

  // A click inside the shadow root retargets to the host, so containment covers
  // the trigger, the panel and the slotted items alike.
  #onDocumentClick = (e) => {
    if (!this.contains(e.target)) this.hide();
  };

  // The browser can close an auto popover on its own (Escape, outside click), so
  // mirror that back onto the attribute that drives our state.
  #onPopoverToggle = (e) => {
    if (e.newState === "closed" && this.open) this.hide();
  };

  // Focus the item at `index`; a negative index counts back from the end.
  #focusItem(index) {
    const items = /** @type {HTMLElement[]} */ (this.#items());
    if (!items.length) return;
    const i = index < 0 ? items.length + index : index;
    items[Math.min(items.length - 1, Math.max(0, i))]?.focus();
  }

  // Enter and Space are deliberately absent: a native <button> synthesises a
  // click for both, and #onTriggerClick already toggles.
  #onTriggerKeydown = (e) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.show();
        this.#focusItem(0);
        break;
      case "ArrowUp":
        e.preventDefault();
        this.show();
        this.#focusItem(-1);
        break;
      case "Escape":
        if (this.open) {
          e.preventDefault();
          this.hide();
        }
        break;
    }
  };

  // Listens on the host, not the panel. A slotted item's keydown reaches the host by
  // ordinary light-DOM bubbling, which every environment supports; reaching the panel
  // would need the event to cross the shadow boundary via the slot, which real
  // browsers do but this project's test environment (happy-dom) does not, so a panel
  // listener cannot be exercised by the suite. The trigger's own keydown can also
  // reach the host once it crosses the shadow boundary, but retargeted so e.target is
  // the host itself, never a member of #items(), so the guard below discards it
  // without double-handling what #onTriggerKeydown already did.
  #onItemKeydown = (e) => {
    const items = this.#items();
    const current = items.indexOf(/** @type {HTMLElement} */ (e.target));
    if (current < 0) return; // not one of our items: the trigger, or slotted label content
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.#focusItem(current + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        // Past the first item, focus goes back to the trigger (APG).
        if (current === 0) this.#trigger.focus();
        else this.#focusItem(current - 1);
        break;
      case "Home":
        e.preventDefault();
        this.#focusItem(0);
        break;
      case "End":
        e.preventDefault();
        this.#focusItem(-1);
        break;
      case "Escape":
        e.preventDefault();
        this.hide();
        this.#trigger.focus();
        break;
    }
  };

  // Tab walks the items and out, and leaving the component closes it. A null
  // relatedTarget means focus went nowhere (a window blur), which must not close.
  #onFocusOut = (e) => {
    if (!this.open || !e.relatedTarget) return;
    if (this.contains(e.relatedTarget) || this.shadowRoot.contains(e.relatedTarget)) return;
    this.hide();
  };
}

customElements.define("neuwo-dropdown", NeuwoDropdown);
