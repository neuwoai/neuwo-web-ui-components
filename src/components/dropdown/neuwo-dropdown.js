import { NeuwoElement } from "../../core/base-element.js";
import { sheet } from "../../core/sheet.js";
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

  // --- Public API ---

  get label() {
    return this.getAttribute("label") ?? "";
  }
  set label(v) {
    if (v == null || v === "") this.removeAttribute("label");
    else this.setAttribute("label", String(v));
  }

  get placement() {
    const v = this.getAttribute("placement");
    return PLACEMENTS.includes(v) ? v : "bottom";
  }
  set placement(v) {
    if (v == null || v === "") this.removeAttribute("placement");
    else this.setAttribute("placement", String(v));
  }

  get align() {
    const v = this.getAttribute("align");
    return ALIGNMENTS.includes(v) ? v : "start";
  }
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

    this.#built = true;
    this.#patch();
  }

  #patch() {
    this.#inline = this.hasAttribute("inline");

    // Only non-default modifiers are emitted, so the CSS carries rules for
    // exactly the classes that appear.
    const classes = ["dropdown"];
    if (this.placement === "top") classes.push("dropdown--top");
    if (this.align === "end") classes.push("dropdown--end");
    if (this.#inline) classes.push("dropdown--inline");
    this.#wrapper.className = classes.join(" ");

    // Rewriting the fallback text mutates the slot's children, which the browser
    // reports as a slot change; only write when it actually differs.
    const text = this.getAttribute("label") ?? "";
    if (this.#labelSlot.textContent !== text) this.#labelSlot.textContent = text;

    this.#open = this.hasAttribute("open");
    this.#trigger.setAttribute("aria-expanded", this.#open ? "true" : "false");
    this.#panel.hidden = !this.#open;
  }
}

customElements.define("neuwo-dropdown", NeuwoDropdown);
