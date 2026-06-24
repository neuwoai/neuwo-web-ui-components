// One implementation of the field/control error affordance, shared by every
// form control. It reserves a fixed-height message line (so toggling an error
// never shifts layout), mirrors the `error` attribute into the line text,
// toggles `aria-invalid` and `aria-describedby` on the announced element, and
// toggles a presentational accent class on the portable wrapper.
//
// The `error-muted` attribute (only meaningful alongside `error`) de-escalates
// the alarm without losing the note: the accent and `aria-invalid` drop and the
// message line is marked `--muted`, but the text and its `aria-describedby`
// association stay. It lets a consumer acknowledge interaction ("we heard you")
// while leaving the message until the error owner re-validates. The consumer
// drives it; clearing the error remains the consumer's job (see README).
export function syncError(host, refs) {
  const { announce, accentEl, accentClass, container, lineClass, lineId } = refs;
  const has = host.hasAttribute("error");
  const muted = has && host.hasAttribute("error-muted");
  const active = has && !muted; // drives the accent + aria-invalid alarm
  const message = has ? host.getAttribute("error") : "";

  accentEl.classList.toggle(accentClass, active);
  if (active) announce.setAttribute("aria-invalid", "true");
  else announce.removeAttribute("aria-invalid");

  let line = container.querySelector(`.${lineClass}`);
  if (!line) {
    line = document.createElement("span");
    line.className = lineClass;
    line.setAttribute("part", "error");
    line.id = lineId;
    container.append(line);
  }
  line.classList.toggle(`${lineClass}--muted`, muted);
  line.textContent = message;
  if (message) announce.setAttribute("aria-describedby", lineId);
  else announce.removeAttribute("aria-describedby");
  return line;
}
