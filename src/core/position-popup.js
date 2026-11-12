const EDGE = 8;

/**
 * Places a `[popover]` popup against its trigger in viewport coordinates, flipping to the side with more room.
 * @param {HTMLElement} trigger - the element to position against.
 * @param {HTMLElement} popup - the popup to move.
 * @param {{ placement?: "bottom" | "top", align?: "start" | "end", gap?: number, matchWidth?: boolean }} [options]
 *   `placement` is the preferred side, `align` the trigger edge to line up with, `gap` the offset in px, `matchWidth` the min-width.
 * @returns {"bottom" | "top" | undefined} the side placed on, or undefined for a trigger that cannot be measured.
 */
export function positionPopup(trigger, popup, options = {}) {
  if (!trigger || typeof trigger.getBoundingClientRect !== "function") return;
  const { placement = "bottom", align = "start", gap = 4, matchWidth = true } = options;
  const r = trigger.getBoundingClientRect();

  // The viewport inside classic scrollbars, where a fixed popup's right and bottom are measured; without a doctype the root's is the document's.
  const frame = document.scrollingElement ?? document.documentElement;
  const viewport = frame.clientWidth || window.innerWidth;
  const viewportHeight = frame.clientHeight || window.innerHeight;
  const room = Math.max(0, viewport - 2 * EDGE);
  popup.style.position = "fixed";
  popup.style.maxWidth = `${room}px`;
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
  const height = popup.offsetHeight || 0;
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
  return onTop ? "top" : "bottom";
}
