const EDGE = 8;

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

  // The viewport inside classic scrollbars, where a fixed popup's right and bottom are measured; without a doctype the root's is the document's.
  const frame = document.scrollingElement ?? document.documentElement;
  const viewport = frame.clientWidth || window.innerWidth;
  const viewportHeight = frame.clientHeight || window.innerHeight;
  const room = Math.max(0, viewport - 2 * EDGE);
  popup.style.position = "fixed";
  popup.style.maxWidth = "";
  const own = popup instanceof Element ? getComputedStyle(popup).maxWidth : "";
  popup.style.maxWidth = `${own.endsWith("px") ? Math.min(parseFloat(own), room) : room}px`;
  if (matchWidth) popup.style.minWidth = `${Math.min(r.width, room)}px`;

  const rtl = trigger instanceof Element && getComputedStyle(trigger).direction === "rtl";
  const toRight = (align === "end") !== rtl;
  // Measured from one edge only: with both set from before, an auto width would stretch between them.
  popup.style.left = "0px";
  popup.style.right = "auto";
  const width = popup.offsetWidth || 0;
  let left = toRight ? r.right - width : r.left;
  if (left < 0 || left + width > viewport) left = Math.max(EDGE, Math.min(left, viewport - EDGE - width));
  if (toRight) {
    popup.style.left = "auto";
    popup.style.right = `${viewport - left - width}px`;
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
