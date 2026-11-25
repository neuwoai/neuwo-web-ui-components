import { positionBeside, positionOver, roomBeside } from "../../core/position-popup.js";

/** @typedef {import("./neuwo-menu.js").NeuwoMenu} NeuwoMenu */

export const CONTROL = ".neuwo-menu-item__control";
const PANEL = ".neuwo-menu";
const BACK = ".neuwo-menu__back";
const COVERED = "neuwo-menu--covered";
const DRILL = "neuwo-menu--drill";

/** The approved mock's hover intent: how long the pointer rests on an item before its submenu opens. */
export const HOVER_OPEN_MS = 120;
/** And how long it rests on another item of the same panel before an open submenu closes. */
export const HOVER_CLOSE_MS = 250;

/** @param {Element} row */
export const enabled = (row) => row.getAttribute("aria-disabled") !== "true";

/**
 * The rows the keyboard moves through in one panel: its Back row while it shows, then its own items, not a
 * submenu's, that are not hidden.
 * @param {Element} panel
 * @returns {HTMLElement[]}
 */
export function rowsIn(panel) {
  return /** @type {HTMLElement[]} */ (
    Array.from(panel.querySelectorAll(`${BACK}, ${CONTROL}`)).filter((row) => row.closest(PANEL) === panel && !row.closest("[hidden]"))
  );
}

/**
 * The submenu panel an item's control opens, or null.
 * @param {Element} control
 * @returns {HTMLElement | null}
 */
const submenuOf = (control) => control.parentElement?.querySelector(":scope > .neuwo-menu-item__submenu > neuwo-menu > .neuwo-menu") ?? null;

/**
 * The control of the item whose submenu `panel` is, or null for a root panel.
 * @param {Element} panel
 * @returns {HTMLElement | null}
 */
export const openerOf = (panel) => panel.closest(".neuwo-menu-item__submenu")?.parentElement?.querySelector(`:scope > ${CONTROL}`) ?? null;

/** @param {Element} control */
const labelOf = (control) => (control.querySelector(".neuwo-menu-item__label")?.textContent ?? "").replace(/\s+/g, " ").trim();

/**
 * Writes a submenu's live state where it differs: its item's `aria-expanded`, and while it drills in, the covered
 * parent and the Back row naming the item. Only the submenu closing uncovers its parent, which one of its siblings
 * may cover instead.
 * @param {HTMLElement} panel
 * @param {HTMLElement} control
 * @param {boolean} open
 * @param {boolean} drill
 */
function draw(panel, control, open, drill) {
  const expanded = String(open);
  if (control.getAttribute("aria-expanded") !== expanded) control.setAttribute("aria-expanded", expanded);
  const drilled = open && drill;
  if (drilled) control.closest(PANEL)?.classList.toggle(COVERED, true);
  panel.classList.toggle(DRILL, drilled);
  const back = /** @type {HTMLElement | null} */ (panel.querySelector(`:scope > ${BACK}`));
  if (!back) return;
  if (back.hidden === drilled) back.hidden = !drilled;
  const label = back.querySelector(".neuwo-menu__back-label");
  const text = drilled ? labelOf(control) : "";
  if (label && label.textContent !== text) label.textContent = text;
}

/**
 * Re-applies a submenu's live state after its menu re-renders. Does nothing for a root menu.
 * @param {NeuwoMenu} menu
 */
export function refit(menu) {
  const panel = menu.panel;
  const control = panel && openerOf(panel);
  if (panel && control) draw(panel, control, panel.matches(":popover-open"), panel.classList.contains(DRILL));
}

/**
 * Opens and closes the submenus of a root `<neuwo-menu>`, each the popover panel of a `<neuwo-menu>` in an item's
 * `submenu` slot, so the browser's popover stack closes deeper levels with their parent and a submenu as its
 * sibling opens. The root menu's `submenu` attribute picks how each one opens: beside its parent, over it, or
 * beside it when it fits and over it when it does not.
 */
export class Submenus {
  /** @type {NeuwoMenu} */
  #menu;

  /** @type {Map<Element, { row: Element, timer: ReturnType<typeof setTimeout> }>} */
  #timers = new Map();

  /** @type {Map<HTMLElement, { control: HTMLElement, side: "end" | "start" | null, drill: boolean }>} */
  #placed = new Map();

  /** @param {NeuwoMenu} menu */
  constructor(menu) {
    this.#menu = menu;
  }

  connect() {
    this.#menu.addEventListener("mouseover", this.#onHover);
    this.#menu.addEventListener("beforetoggle", this.#onBeforeToggle, true);
  }

  disconnect() {
    this.#menu.removeEventListener("mouseover", this.#onHover);
    this.#menu.removeEventListener("beforetoggle", this.#onBeforeToggle, true);
    this.#reset();
  }

  /**
   * Opens the submenu `control` opens, unless it is open already, and focuses its first enabled item when asked.
   * @param {HTMLElement} control
   * @param {boolean} focus
   */
  openFrom(control, focus) {
    this.#open(control, focus, false);
  }

  /**
   * Closes the submenu `control` opens, and its own, returning focus to `control` when focus is in it, on the
   * body or nowhere.
   * @param {HTMLElement} control
   */
  closeFrom(control) {
    const panel = submenuOf(control);
    if (!panel?.matches(":popover-open")) return;
    const focused = control.ownerDocument.activeElement;
    if (!focused || focused === control.ownerDocument.body || panel.contains(focused)) {
      control.closest(PANEL)?.classList.toggle(COVERED, false);
      control.focus();
    }
    panel.hidePopover();
  }

  /** Places every open submenu again, outer levels first, after the root panel has moved, and forgets a closed one. */
  place() {
    for (const [panel, { control, side, drill }] of Array.from(this.#placed)) {
      if (panel.matches(":popover-open")) this.#put(panel, control, side, drill);
      else this.#forget(panel, control);
    }
  }

  /**
   * @param {HTMLElement} control
   * @param {boolean} focus
   * @param {boolean} hover - a hover only ever opens a submenu beside its parent.
   */
  #open(control, focus, hover) {
    const panel = submenuOf(control);
    const parent = /** @type {HTMLElement | null} */ (control.closest(PANEL));
    if (!panel || !parent || !enabled(control) || !this.#menu.isOpen) return;
    this.#cancel(parent);
    if (!panel.matches(":popover-open")) {
      panel.showPopover();
      if (!panel.matches(":popover-open")) return;
      const mode = this.#menu.submenu;
      // Measured from one edge only, as positionPopup does, so a width placed against the far edge before cannot narrow it.
      Object.assign(panel.style, { position: "fixed", left: "0px", right: "auto", minWidth: "" });
      const side = roomBeside(parent, panel.offsetWidth);
      const drill = mode === "drill" || (mode !== "flyout" && side === null);
      if (drill && hover) {
        panel.hidePopover();
        return;
      }
      this.#placed.set(panel, { control, side, drill });
      draw(panel, control, true, drill);
      this.#put(panel, control, side, drill);
    }
    if (focus) {
      const items = rowsIn(panel).filter((row) => row.matches(CONTROL));
      (items.find(enabled) ?? items[0])?.focus();
    }
  }

  /**
   * @param {HTMLElement} panel
   * @param {HTMLElement} control
   * @param {"end" | "start" | null} side
   * @param {boolean} drill
   */
  #put(panel, control, side, drill) {
    const parent = /** @type {HTMLElement | null} */ (control.closest(PANEL));
    if (!parent) return;
    if (drill) positionOver(parent, panel);
    else positionBeside(parent, control, panel, side);
  }

  /** @param {Element} panel closes the submenus its own items opened */
  #closeIn(panel) {
    for (const { control } of Array.from(this.#placed.values())) if (control.closest(PANEL) === panel) this.closeFrom(control);
  }

  /**
   * @param {Element} panel
   * @param {Element} row
   * @param {() => void} run
   * @param {number} delay
   */
  #schedule(panel, row, run, delay) {
    if (this.#timers.get(panel)?.row === row) return;
    this.#cancel(panel);
    const timer = setTimeout(() => {
      this.#timers.delete(panel);
      run();
    }, delay);
    this.#timers.set(panel, { row, timer });
  }

  /** @param {Element} panel */
  #cancel(panel) {
    const pending = this.#timers.get(panel);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.#timers.delete(panel);
  }

  #clear() {
    for (const { timer } of this.#timers.values()) clearTimeout(timer);
    this.#timers.clear();
  }

  /**
   * @param {HTMLElement} panel
   * @param {HTMLElement} control
   */
  #forget(panel, control) {
    this.#placed.delete(panel);
    control.closest(PANEL)?.classList.toggle(COVERED, false);
    draw(panel, control, false, false);
  }

  /**
   * Forgets every submenu and undoes what one left in the menu, as the browser hides a submenu removed from the page
   * without a `beforetoggle`.
   */
  #reset() {
    this.#clear();
    this.#placed.clear();
    for (const panel of this.#menu.querySelectorAll(`.${COVERED}`)) panel.classList.remove(COVERED);
    for (const panel of /** @type {NodeListOf<HTMLElement>} */ (this.#menu.querySelectorAll(PANEL))) {
      const control = openerOf(panel);
      if (control) draw(panel, control, false, false);
    }
    for (const control of this.#menu.querySelectorAll(`${CONTROL}[aria-expanded="true"]`)) control.setAttribute("aria-expanded", "false");
  }

  /** @param {Event} event */
  #onHover = (event) => {
    const target = /** @type {Element} */ (event.target);
    const panel = target.closest?.(PANEL);
    if (!panel || !this.#menu.contains(panel) || this.#menu.submenu === "drill") return;
    const owner = openerOf(panel);
    const above = owner?.closest(PANEL);
    if (above) this.#cancel(above);
    const row = /** @type {HTMLElement | null} */ (target.closest(CONTROL));
    if (!row || row.closest(PANEL) !== panel) return;
    if (row.hasAttribute("aria-haspopup") && enabled(row)) this.#schedule(panel, row, () => this.#open(row, false, true), HOVER_OPEN_MS);
    else this.#schedule(panel, row, () => this.#closeIn(panel), HOVER_CLOSE_MS);
  };

  /** @param {Event} event */
  #onBeforeToggle = (event) => {
    const panel = event.target;
    if (!(panel instanceof HTMLElement) || !panel.matches(PANEL) || /** @type {ToggleEvent} */ (event).newState !== "closed") return;
    this.#cancel(panel);
    if (panel === this.#menu.panel) {
      this.#reset();
      return;
    }
    const control = openerOf(panel);
    if (!control) return;
    this.#forget(panel, control);
    const focused = control.ownerDocument.activeElement;
    if (focused && panel.contains(focused)) control.focus();
  };
}
