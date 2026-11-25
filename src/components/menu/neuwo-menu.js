import { NeuwoElement, define, ownedByReact } from "../../core/element.js";
import { positionPopup } from "../../core/position-popup.js";
import { menuTemplate } from "./menu.template.js";

/** @typedef {import("./neuwo-menu-item.js").NeuwoMenuItem} NeuwoMenuItem */

const CONTROL = ".neuwo-menu-item__control";

/** @param {Element} control */
const enabled = (control) => control.getAttribute("aria-disabled") !== "true";

/** @param {HTMLElement | null} invoker */
const triggerOf = (invoker) => (invoker ? /** @type {HTMLElement | null} */ (invoker.closest("neuwo-button")) ?? invoker : null);

/**
 * The button in `trigger` whose `popovertarget` names the panel, else `trigger` itself.
 * @param {HTMLElement | null} trigger
 * @param {string} id
 * @returns {HTMLElement | null}
 */
function invokerIn(trigger, id) {
  if (!trigger || trigger.getAttribute("popovertarget") === id) return trigger;
  const inside = Array.from(trigger.querySelectorAll("[popovertarget]")).find((each) => each.getAttribute("popovertarget") === id);
  return inside instanceof HTMLElement ? inside : trigger;
}

/**
 * Applies a pick to a checkable item, unchecking the other radio items of its group, on hosts React did not render.
 * @param {NeuwoMenuItem} item
 * @param {boolean} checked
 * @param {boolean} radio
 */
function check(item, checked, radio) {
  if (!ownedByReact(item)) item.checked = checked;
  const group = radio ? item.closest("neuwo-menu-group") : null;
  if (!group) return;
  const menu = item.closest("neuwo-menu");
  for (const other of /** @type {NodeListOf<NeuwoMenuItem>} */ (group.querySelectorAll("neuwo-menu-item"))) {
    if (other === item || !other.checked || ownedByReact(other)) continue;
    if (other.closest("neuwo-menu-group") === group && other.closest("neuwo-menu") === menu) other.checked = false;
  }
}

/**
 * Action menu: a list of `<neuwo-menu-group>` elements, or of `<neuwo-menu-item>` elements directly for a simple
 * menu, rendered into a top-layer popover panel that stays hidden until a trigger opens it. Any button whose
 * `popovertarget` names the panel opens it, natively: the panel's id is the menu's id followed by `-panel`. The menu
 * lines the panel up with the trigger that opened it, below it, or above when there is more room there, and keeps it
 * there while the page scrolls or resizes. The panel never exceeds the viewport less a margin; a longer menu scrolls
 * inside it. A menu in an item's `submenu` slot needs no id.
 *
 * Opening focuses the first enabled item, or with ArrowUp on the trigger the last; ArrowDown opens it from the
 * trigger too. In the menu, ArrowDown and ArrowUp move through the items that are not `hidden`, wrapping, Home and
 * End jump to the first and last, Enter and Space pick, Escape closes it and returns focus to the trigger, and Tab
 * closes it and moves on from the trigger. Picking an action or a link closes the menu and returns focus to the
 * trigger; picking a checkable item checks it, unchecks the others of a `select="one"` group, and keeps the menu open.
 * A disabled item cannot be picked. On a host React rendered, a pick only fires `select`: React's state decides
 * `checked`. Clicking a second trigger while the menu is open reopens it as that trigger's menu.
 *
 * @summary Neuwo menu. Public classes: `.neuwo-menu` on the popover panel, which holds `.neuwo-menu__items` around the groups or items; a submenu's panel also holds the `.neuwo-menu__back` row, hidden until it drills in, with `.neuwo-menu__back-icon` and `.neuwo-menu__back-label`.
 * @customElement neuwo-menu
 * @attr id - names the panel `<id>-panel`, the id a trigger's `popovertarget` gives.
 * @attr {flyout|drill|auto} submenu - how submenus open, set on the root menu (default auto): beside the menu, in its place, or beside it when it fits and in its place when it does not.
 * @attr {start|end} align - the trigger edge the panel lines up with (default start).
 * @fires {CustomEvent<{ trigger: HTMLElement | null }>} open - just before the panel shows; cancelable, and cancelling keeps it closed. `detail.trigger` is the element that opens it, as `trigger` reads, so a handler can hide, disable or check items for it.
 * @fires {CustomEvent<{ value: string; item: NeuwoMenuItem; trigger: HTMLElement | null; checked?: boolean }>} select - an item was picked, before the pick takes effect; cancelable, and cancelling keeps the menu open, a checkable item's state, and a link item from navigating. `detail.checked`, on a checkable item only, is the state it is about to take.
 * @slot - the `<neuwo-menu-group>` elements, or for a simple menu the `<neuwo-menu-item>` elements.
 * @cssprop --neuwo-color-surface-solid - the panel's background; re-theme by setting it on :root.
 */
export class NeuwoMenu extends NeuwoElement {
  static template = menuTemplate;
  static observedAttributes = ["id", "submenu", "align"];

  /** @type {HTMLElement | null} */
  #invoker = null;
  /** @type {HTMLElement | null} */
  #refocus = null;
  /** @type {Node | null} */
  #root = null;
  #open = false;
  #frame = 0;
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

  /**
   * Whether the panel is open now. Read-only.
   * @returns {boolean}
   */
  get isOpen() {
    const panel = this.panel;
    return Boolean(panel && typeof panel.showPopover === "function" && panel.matches(":popover-open"));
  }

  /**
   * The element that opened the menu, while it is open: the `<neuwo-button>` whose button opened it, so the page's
   * own attributes on it can be read, else the button itself. Null while the menu is closed, and while it is open
   * from `open()` without a trigger. Read-only.
   * @returns {HTMLElement | null}
   */
  get trigger() {
    return this.isOpen ? triggerOf(this.#invoker) : null;
  }

  /**
   * Opens the menu as if `trigger` opened it: it fires `open`, shows the panel against the trigger and focuses the
   * first enabled item. Open from another trigger, it closes and opens again as this trigger's menu. Without a
   * trigger, the panel shows where it was last placed and `trigger` reads null.
   * @param {HTMLElement | null} [trigger] - the button that opens the menu, whose `popovertarget` names the panel, or an element holding it, such as a `<neuwo-button>`.
   */
  open(trigger = null) {
    this.#show(invokerIn(trigger, this.panel?.id ?? ""), "first");
  }

  /** Closes the menu, as Escape does, and returns focus to its trigger when focus was inside it. */
  close() {
    if (this.isOpen) this.panel?.hidePopover();
  }

  connect() {
    if (this.parentElement?.closest("neuwo-menu-item")) return;
    this.#root = this.getRootNode();
    this.#root.addEventListener("click", this.#onTriggerClick, true);
    this.#root.addEventListener("keydown", this.#onTriggerKeydown, true);
    this.addEventListener("click", this.#onClick);
    this.addEventListener("keydown", this.#onKeydown);
    this.addEventListener("beforetoggle", this.#onBeforeToggle, true);
    this.addEventListener("toggle", this.#onToggle, true);
  }

  disconnect() {
    this.removeEventListener("click", this.#onClick);
    this.removeEventListener("keydown", this.#onKeydown);
    this.removeEventListener("beforetoggle", this.#onBeforeToggle, true);
    this.removeEventListener("toggle", this.#onToggle, true);
    this.#root?.removeEventListener("click", this.#onTriggerClick, true);
    this.#root?.removeEventListener("keydown", this.#onTriggerKeydown, true);
    this.#root = null;
    cancelAnimationFrame(this.#frame);
    this.#invoker = null;
    this.#refocus = null;
    this.#follow(false);
  }

  updated() {
    if (this.#open) this.#position(this.#side);
  }

  /** @param {"bottom" | "top"} [placement] the side to keep while the panel fits there */
  #position(placement) {
    this.#side = this.#place(placement);
  }

  /** @param {"bottom" | "top"} [placement] */
  #place(placement) {
    const panel = this.panel;
    if (!panel || !this.#invoker) return undefined;
    const align = this.align === "end" ? "end" : "start";
    return positionPopup(this.#invoker, panel, { placement, align, matchWidth: false, fitHeight: true });
  }

  /**
   * @param {HTMLElement | null} invoker
   * @param {"first" | "last"} edge the enabled item to focus
   */
  #show(invoker, edge) {
    const panel = this.panel;
    if (!panel || typeof panel.showPopover !== "function" || !panel.isConnected) return;
    if (this.isOpen) {
      if (invoker === this.#invoker) {
        this.#arrive(panel, edge);
        return;
      }
      panel.hidePopover();
    }
    this.#invoker = invoker;
    panel.showPopover();
    if (!this.isOpen) return;
    this.#position();
    this.#arrive(panel, edge);
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

  #focused() {
    const root = this.getRootNode();
    return "activeElement" in root ? /** @type {Document | ShadowRoot} */ (root).activeElement : null;
  }

  /**
   * The items the keyboard moves through in one panel: its own controls, not a submenu's, that are not hidden.
   * @param {Element} panel
   * @returns {HTMLElement[]}
   */
  #items(panel) {
    return /** @type {HTMLElement[]} */ (
      Array.from(panel.querySelectorAll(CONTROL)).filter((control) => control.closest(".neuwo-menu") === panel && !control.closest("[hidden]"))
    );
  }

  /**
   * Focuses the panel's first or last enabled item, unless focus is already in the panel.
   * @param {HTMLElement} panel
   * @param {"first" | "last"} [edge]
   */
  #arrive(panel, edge = "first") {
    const focused = this.#focused();
    if (focused && panel.contains(focused)) return;
    const items = this.#items(panel);
    const usable = items.filter(enabled);
    const pool = usable.length ? usable : items;
    (edge === "last" ? pool.at(-1) : pool[0])?.focus();
  }

  /** Returns focus to the trigger, then closes, so the panel never hides with focus inside it. */
  #dismiss() {
    this.#invoker?.focus();
    this.close();
  }

  /** @param {Event} event */
  #onTriggerClick = (event) => {
    const button = /** @type {Element} */ (event.target).closest?.("button[popovertarget]");
    const id = this.panel?.id;
    if (!(button instanceof HTMLElement) || !id || button.getAttribute("popovertarget") !== id) return;
    if (!this.isOpen) this.#invoker = button;
    else if (button !== this.#invoker && button.getAttribute("popovertargetaction") !== "hide") {
      event.preventDefault();
      this.#show(button, "first");
    }
  };

  /** @param {Event} event */
  #onTriggerKeydown = (event) => {
    const { key, altKey, ctrlKey, metaKey } = /** @type {KeyboardEvent} */ (event);
    if ((key !== "ArrowDown" && key !== "ArrowUp") || altKey || ctrlKey || metaKey || event.defaultPrevented) return;
    const invoker = /** @type {Element} */ (event.target).closest?.("[popovertarget]");
    const id = this.panel?.id;
    if (!(invoker instanceof HTMLElement) || !id || invoker.getAttribute("popovertarget") !== id) return;
    event.preventDefault();
    this.#show(invoker, key === "ArrowUp" ? "last" : "first");
  };

  /** @param {Event} event */
  #onClick = (event) => {
    const control = /** @type {Element} */ (event.target).closest?.(CONTROL);
    const item = control?.closest("neuwo-menu-item");
    if (!control || !item || !this.contains(control) || !enabled(control) || control.hasAttribute("aria-haspopup")) return;
    const role = control.getAttribute("role");
    const radio = role === "menuitemradio";
    const checkable = radio || role === "menuitemcheckbox";
    const checked = radio || control.getAttribute("aria-checked") !== "true";
    const pick = /** @type {NeuwoMenuItem} */ (item);
    /** @type {{ value: string, item: NeuwoMenuItem, trigger: HTMLElement | null, checked?: boolean }} */
    const detail = { value: pick.value, item: pick, trigger: this.trigger };
    if (checkable) detail.checked = checked;
    if (!this.dispatchEvent(new CustomEvent("select", { bubbles: true, cancelable: true, detail }))) {
      event.preventDefault();
      return;
    }
    if (checkable) check(pick, checked, radio);
    else this.#dismiss();
  };

  /** @param {Event} event */
  #onKeydown = (event) => {
    const keyboard = /** @type {KeyboardEvent} */ (event);
    if (event.defaultPrevented || keyboard.altKey || keyboard.ctrlKey || keyboard.metaKey) return;
    const target = /** @type {Element} */ (event.target);
    const panel = target.closest?.(".neuwo-menu");
    if (!panel || !this.contains(panel)) return;
    switch (keyboard.key) {
      case "ArrowDown":
      case "ArrowUp":
      case "Home":
      case "End": {
        event.preventDefault();
        const items = this.#items(panel);
        const at = items.indexOf(/** @type {HTMLElement} */ (target));
        const last = items.length - 1;
        const next = { ArrowDown: at < last ? at + 1 : 0, ArrowUp: at > 0 ? at - 1 : last, Home: 0, End: last }[keyboard.key];
        items[next]?.focus();
        break;
      }
      case " ":
        // Space scrolls from a link, where it picks a button natively.
        if (target.localName === "a" && target.matches(CONTROL)) {
          event.preventDefault();
          /** @type {HTMLElement} */ (target).click();
        }
        break;
      case "Escape":
        event.preventDefault();
        this.#dismiss();
        break;
      case "Tab":
        this.#dismiss();
        break;
    }
  };

  /** @param {Event} event */
  #onBeforeToggle = (event) => {
    const panel = this.panel;
    if (!panel || event.target !== panel) return;
    if (/** @type {ToggleEvent} */ (event).newState !== "open") {
      const focused = this.#focused();
      this.#refocus = focused && panel.contains(focused) ? this.#invoker : null;
      this.#invoker = null;
      return;
    }
    if (!this.dispatchEvent(new CustomEvent("open", { bubbles: true, cancelable: true, detail: { trigger: triggerOf(this.#invoker) } }))) {
      event.preventDefault();
      this.#invoker = null;
      return;
    }
    // Still display: none here, so placed from the trigger alone; measured in the first frame, which the toggle event can follow.
    this.#place();
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => {
      if (this.isOpen) this.#position();
    });
  };

  /** @param {Event} event */
  #onToggle = (event) => {
    const panel = this.panel;
    if (!panel || event.target !== panel) return;
    const open = /** @type {ToggleEvent} */ (event).newState === "open";
    this.#follow(open);
    if (open) {
      this.#refocus = null;
      this.#position();
      this.#arrive(panel);
      return;
    }
    cancelAnimationFrame(this.#frame);
    const refocus = this.#refocus;
    this.#refocus = null;
    const focused = this.#focused();
    const lost = !focused || focused === this.ownerDocument.body || panel.contains(focused);
    if (refocus?.isConnected && lost) refocus.focus();
  };
}

define("neuwo-menu", NeuwoMenu);
