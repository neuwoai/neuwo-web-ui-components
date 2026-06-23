// One implementation of the field/control error affordance, shared by every
// form control. It reserves a fixed-height message line (so toggling an error
// never shifts layout), mirrors the `error` attribute into the line text,
// toggles `aria-invalid` and `aria-describedby` on the announced element, and
// toggles a presentational accent class on the portable wrapper.
export function syncError(host, refs) {
  const { announce, accentEl, accentClass, container, lineClass, lineId } = refs;
  const has = host.hasAttribute("error");
  const message = has ? host.getAttribute("error") : "";

  accentEl.classList.toggle(accentClass, has);
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
