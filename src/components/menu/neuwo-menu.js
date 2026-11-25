import { NeuwoElement, define } from "../../core/element.js";
import { positionPopup } from "../../core/position-popup.js";
import { menuTemplate } from "./menu.template.js";

/**
 * Action menu: a list of `<neuwo-menu-group>` elements, or of `<neuwo-menu-item>` elements directly for a simple
 * menu, rendered into a top-layer popover panel that stays hidden until a trigger opens it. Any button whose
 * `popovertarget` names the panel opens it, natively: the panel's id is the menu's id followed by `-panel`. The menu
 * lines the panel up with the trigger that opened it, below it, or above when there is more room there, and keeps it
 * there while the page scrolls or resizes. The panel never exceeds the viewport less a margin; a longer menu scrolls
 * inside it. A menu in an item's `submenu` slot needs no id.
 *
 * @summary Neuwo menu. Public classes: `.neuwo-menu` on the popover panel, which holds `.neuwo-menu__items` around the groups or items; a submenu's panel also holds the `.neuwo-menu__back` row, hidden until it drills in, with `.neuwo-menu__back-icon` and `.neuwo-menu__back-label`.
 * @customElement neuwo-menu
 * @attr id - names the panel `<id>-panel`, the id a trigger's `popovertarget` gives.
 * @attr {flyout|drill|auto} submenu - how submenus open, set on the root menu (default auto): beside the menu, in its place, or beside it when it fits and in its place when it does not.
 * @attr {start|end} align - the trigger edge the panel lines up with (default start).
 * @slot - the `<neuwo-menu-group>` elements, or for a simple menu the `<neuwo-menu-item>` elements.
 * @cssprop --neuwo-color-surface-solid - the panel's background; re-theme by setting it on :root.
 */
export class NeuwoMenu extends NeuwoElement {
  static template = menuTemplate;
  static observedAttributes = ["id", "submenu", "align"];

  /** @type {Element | null} */
  #invoker = null;
  /** @type {Node | null} */
  #root = null;
  #open = false;
  /** @type {"bottom" | "top" | undefined} */
  #side;

  /** @param {Event} event */
  #reposition = (event) => {
    if (!(event.target instanceof Node && this.panel?.contains(event.target))) this.#position(this.#side);
  };

  get submenu() {
    return this.getAttribute("submenu") || "auto";
  }
  set submenu(value) {
    if (value == null || value === "") this.removeAttribute("submenu");
    else this.setAttribute("submenu", String(value));
  }

  get align() {
    return this.getAttribute("align") || "start";
  }
  set align(value) {
    if (value == null || value === "") this.removeAttribute("align");
    else this.setAttribute("align", String(value));
  }

  /**
   * The popover panel, `.neuwo-menu`; null before the menu renders.
   * @returns {HTMLElement | null}
   */
  get panel() {
    return this.querySelector(":scope > .neuwo-menu");
  }

  connect() {
    if (this.parentElement?.closest("neuwo-menu-item")) return;
    this.#root = this.getRootNode();
    this.#root.addEventListener("click", this.#onClick, true);
    this.addEventListener("beforetoggle", this.#onBeforeToggle, true);
    this.addEventListener("toggle", this.#onToggle, true);
  }

  disconnect() {
    this.removeEventListener("beforetoggle", this.#onBeforeToggle, true);
    this.removeEventListener("toggle", this.#onToggle, true);
    this.#root?.removeEventListener("click", this.#onClick, true);
    this.#root = null;
    this.#follow(false);
  }

  updated() {
    if (this.#open) this.#position(this.#side);
  }

  /** @param {"bottom" | "top"} [placement] the side to keep while the panel fits there */
  #position(placement) {
    const panel = this.panel;
    if (!panel || !(this.#invoker instanceof HTMLElement)) return;
    const align = this.align === "end" ? "end" : "start";
    this.#side = positionPopup(this.#invoker, panel, { placement, align, matchWidth: false, fitHeight: true });
  }

  /** @param {boolean} open */
  #follow(open) {
    if (open === this.#open) return;
    this.#open = open;
    if (open) {
      window.addEventListener("scroll", this.#reposition, true);
      window.addEventListener("resize", this.#reposition);
    } else {
      window.removeEventListener("scroll", this.#reposition, true);
      window.removeEventListener("resize", this.#reposition);
    }
  }

  /** @param {Event} event */
  #onClick = (event) => {
    const button = /** @type {Element} */ (event.target).closest?.("button[popovertarget]");
    const id = this.panel?.id;
    if (button && id && button.getAttribute("popovertarget") === id) this.#invoker = button;
  };

  // The toggle event comes a task after the panel shows, which can be after its first frame is painted.
  /** @param {Event} event */
  #onBeforeToggle = (event) => {
    if (event.target === this.panel && /** @type {ToggleEvent} */ (event).newState === "open") this.#position();
  };

  /** @param {Event} event */
  #onToggle = (event) => {
    if (event.target !== this.panel) return;
    const open = /** @type {ToggleEvent} */ (event).newState === "open";
    this.#follow(open);
    if (open) this.#position();
  };
}

define("neuwo-menu", NeuwoMenu);
