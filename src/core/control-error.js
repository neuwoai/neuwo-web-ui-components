// One implementation of the field/control error affordance, shared by every
// form control. It reserves a fixed-height message line (so toggling an error
// never shifts layout), mirrors the `error` attribute into the line text,
// toggles `aria-invalid` and `aria-describedby` on the announced element, and
// toggles a presentational accent class on the portable wrapper.
//
// The `error-muted` attribute (only meaningful alongside `error`) drops the heavy
// control chrome once the user acts: the accent (red border + box-shadow ring)
// comes off, but the red message and the invalid state stay until the error
// owner re-validates and removes `error`. So the accent follows not-muted, while
// `aria-invalid`, `aria-describedby` and the (red) message follow the error's
// presence. The consumer drives both attributes (see README).
export function syncError(host, refs) {
  const { announce, accentEl, accentClass, container, lineClass, lineId } = refs;
  const has = host.hasAttribute("error");
  const muted = has && host.hasAttribute("error-muted");
  const message = has ? host.getAttribute("error") : "";

  accentEl.classList.toggle(accentClass, has && !muted);
  if (has) announce.setAttribute("aria-invalid", "true");
  else announce.removeAttribute("aria-invalid");

  let line = container.querySelector(`.${lineClass}`);
  if (!line) {
    line = document.createElement("span");
    line.className = lineClass;
    line.setAttribute("part", "error");
    line.id = lineId;
    container.append(line);
  }
  line.textContent = message;
  if (message) announce.setAttribute("aria-describedby", lineId);
  else announce.removeAttribute("aria-describedby");
  return line;
}
