const EDGE = 8;
const OVERLAP = 4;

/** The viewport inside classic scrollbars, where a fixed popup's right and bottom are measured; without a doctype the root's is the document's. */
function viewport() {
  const frame = document.scrollingElement ?? document.documentElement;
  return { width: frame.clientWidth || window.innerWidth, height: frame.clientHeight || window.innerHeight };
}

/** @param {Element} el */
const rightToLeft = (el) => getComputedStyle(el).direction === "rtl";

/**
 * Place a top-layer popup against its trigger. The popup is expected to be a
 * `[popover]`, which the browser renders in the top layer, so it is positioned
 * `fixed` in viewport coordinates and is unaffected by any ancestor's
 * `overflow`, `transform` or `backdrop-filter`.
 *
 * The preferred side flips to the opposite one when it cannot fit and the
 * opposite one has more room. The popup is never wider than the viewport less
 * an 8px margin on each side, nor than a pixel `max-width` its stylesheet gives
 * it, such as the menu's, and one that would cross the viewport edge is
 * moved back towards the trigger's other edge, to that margin. Both the horizontal and vertical anchors clear
 * their opposite property, so repositioning never leaves a stale value behind.
 *
 * @param {HTMLElement} trigger - the element to position against.
 * @param {HTMLElement} popup - the popup to move.
 * @param {{ placement?: "bottom" | "top", align?: "start" | "end", gap?: number, matchWidth?: boolean, fitHeight?: boolean }} [options]
 *   `placement` is the preferred side (default bottom); pass the side a popup is already on to keep it there
 *   while it fits. `align` is the trigger edge the popup lines up with (default start), in the trigger's own
 *   direction, so start is its right edge when it runs right to left, `gap` the offset in px (default 4),
 *   `matchWidth` sets the popup's `min-width` to the trigger's width (default true); pass false when the popup
 *   wants its own width floor instead of matching a possibly-narrower trigger. `fitHeight` caps the popup's
 *   `max-height` to the room on the side it is placed on, less the gap and the margin (default false), for a popup
 *   that scrolls inside rather than crossing the viewport edge.
 * @returns {"bottom" | "top" | undefined} the side the popup is placed on, or undefined for a trigger that cannot
 *   be measured.
 */
export function positionPopup(trigger, popup, options = {}) {
  if (!trigger || typeof trigger.getBoundingClientRect !== "function") return;
  const { placement = "bottom", align = "start", gap = 4, matchWidth = true, fitHeight = false } = options;
  const r = trigger.getBoundingClientRect();

  const { width: viewportWidth, height: viewportHeight } = viewport();
  const room = Math.max(0, viewportWidth - 2 * EDGE);
  popup.style.position = "fixed";
  popup.style.maxWidth = "";
  const own = popup instanceof Element ? getComputedStyle(popup).maxWidth : "";
  popup.style.maxWidth = `${own.endsWith("px") ? Math.min(parseFloat(own), room) : room}px`;
  if (matchWidth) popup.style.minWidth = `${Math.min(r.width, room)}px`;

  const rtl = trigger instanceof Element && rightToLeft(trigger);
  const toRight = (align === "end") !== rtl;
  // Measured from one edge only: with both set from before, an auto width would stretch between them.
  popup.style.left = "0px";
  popup.style.right = "auto";
  const width = popup.offsetWidth || 0;
  let left = toRight ? r.right - width : r.left;
  if (left < 0 || left + width > viewportWidth) left = Math.max(EDGE, Math.min(left, viewportWidth - EDGE - width));
  if (toRight) {
    popup.style.left = "auto";
    popup.style.right = `${viewportWidth - left - width}px`;
  } else {
    popup.style.right = "auto";
    popup.style.left = `${left}px`;
  }

  const below = viewportHeight - r.bottom;
  const above = r.top;
  // Its content's height, read under the cap from before: lifting the cap would lay it out anew and clamp its scroll.
  const content = (popup.scrollHeight || 0) + (popup.offsetHeight || 0) - (popup.clientHeight || 0);
  const height = fitHeight ? content : popup.offsetHeight || 0;
  // Flip only when the preferred side cannot fit AND the other side is roomier.
  const flip =
    placement === "top" ? above < height && below > above : below < height && above > below;
  const onTop = placement === "top" ? !flip : flip;

  if (onTop) {
    popup.style.top = "auto";
    popup.style.bottom = `${viewportHeight - r.top + gap}px`;
  } else {
    popup.style.bottom = "auto";
    popup.style.top = `${r.bottom + gap}px`;
  }
  if (fitHeight) popup.style.maxHeight = `${Math.max(0, Math.min((onTop ? above : below) - gap, viewportHeight - EDGE) - EDGE)}px`;
  return onTop ? "top" : "bottom";
}

/**
 * Which side of a menu panel fits a popup `width` px wide, overlapping the panel by 4px and keeping 8px from the
 * viewport's edge: the panel's inline end, else its inline start, read in the panel's own direction, else null.
 * @param {HTMLElement} panel
 * @param {number} width
 * @returns {"end" | "start" | null}
 */
export function roomBeside(panel, width) {
  const r = panel.getBoundingClientRect();
  const right = r.right - OVERLAP + width <= viewport().width - EDGE;
  const left = r.left + OVERLAP - width >= EDGE;
  const [end, start] = rightToLeft(panel) ? [left, right] : [right, left];
  if (end) return "end";
  return start ? "start" : null;
}

/**
 * @param {HTMLElement} popup
 * @param {number} top
 */
function placeTop(popup, top) {
  const room = viewport().height - EDGE - (popup.offsetHeight || 0);
  popup.style.top = `${Math.max(EDGE, Math.min(top, room))}px`;
  popup.style.bottom = "auto";
}

/**
 * Place a submenu beside its parent panel, overlapping it by 4px, its first row level with `item`: its top is the
 * item's less the panel's top border and padding, moved up to stay in the viewport. `side` is the panel's side,
 * read in its direction, as `roomBeside` gives it; null puts the popup at the viewport's inline end, less 8px, over
 * the panel. It clears a `min-width` that `positionOver` left.
 * @param {HTMLElement} panel - the parent panel.
 * @param {HTMLElement} item - the row the popup opens from.
 * @param {HTMLElement} popup
 * @param {"end" | "start" | null} side
 */
export function positionBeside(panel, item, popup, side) {
  const r = panel.getBoundingClientRect();
  const rtl = rightToLeft(panel);
  const style = getComputedStyle(panel);
  const inset = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.paddingTop) || 0);
  popup.style.position = "fixed";
  popup.style.minWidth = "";
  let left = "auto";
  let right = "auto";
  if (side === null) {
    if (rtl) left = `${EDGE}px`;
    else right = `${EDGE}px`;
  } else if ((side === "end") !== rtl) left = `${r.right - OVERLAP}px`;
  else right = `${viewport().width - r.left - OVERLAP}px`;
  popup.style.left = left;
  popup.style.right = right;
  placeTop(popup, item.getBoundingClientRect().top - inset);
}

/**
 * Place a submenu over its parent panel, on the panel's top and inline-start edges, at least as wide as the panel,
 * moved up to stay in the viewport.
 * @param {HTMLElement} panel - the parent panel.
 * @param {HTMLElement} popup
 */
export function positionOver(panel, popup) {
  const r = panel.getBoundingClientRect();
  popup.style.position = "fixed";
  popup.style.minWidth = `${r.width}px`;
  if (rightToLeft(panel)) {
    popup.style.left = "auto";
    popup.style.right = `${viewport().width - r.right}px`;
  } else {
    popup.style.right = "auto";
    popup.style.left = `${r.left}px`;
  }
  placeTop(popup, r.top);
}
