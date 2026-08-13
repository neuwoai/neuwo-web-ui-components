/**
 * Place a top-layer popup against its trigger. The popup is expected to be a
 * `[popover]`, which the browser renders in the top layer, so it is positioned
 * `fixed` in viewport coordinates and is unaffected by any ancestor's
 * `overflow`, `transform` or `backdrop-filter`.
 *
 * The preferred side flips to the opposite one when it cannot fit and the
 * opposite one has more room. Both the horizontal and vertical anchors clear
 * their opposite property, so repositioning never leaves a stale value behind.
 *
 * @param {HTMLElement} trigger - the element to position against.
 * @param {HTMLElement} popup - the popup to move.
 * @param {{ placement?: "bottom" | "top", align?: "start" | "end", gap?: number }} [options]
 *   `placement` is the preferred side (default bottom), `align` the trigger edge
 *   the popup lines up with (default start), `gap` the offset in px (default 4).
 */
export function positionPopup(trigger, popup, options = {}) {
  if (!trigger || typeof trigger.getBoundingClientRect !== "function") return;
  const { placement = "bottom", align = "start", gap = 4 } = options;
  const r = trigger.getBoundingClientRect();

  popup.style.position = "fixed";
  popup.style.minWidth = `${r.width}px`;

  if (align === "end") {
    popup.style.left = "auto";
    popup.style.right = `${window.innerWidth - r.right}px`;
  } else {
    popup.style.right = "auto";
    popup.style.left = `${r.left}px`;
  }

  const below = window.innerHeight - r.bottom;
  const above = r.top;
  const height = popup.offsetHeight || 0;
  // Flip only when the preferred side cannot fit AND the other side is roomier.
  const flip =
    placement === "top" ? above < height && below > above : below < height && above > below;
  const onTop = placement === "top" ? !flip : flip;

  if (onTop) {
    popup.style.top = "auto";
    popup.style.bottom = `${window.innerHeight - r.top + gap}px`;
  } else {
    popup.style.bottom = "auto";
    popup.style.top = `${r.bottom + gap}px`;
  }
}
