((aside) => {
  if (!(aside instanceof Element) || !aside.hasAttribute("data-remember")) return;
  const nav = aside.querySelector(".neuwo-sidebar__nav");
  const sections = () => Array.from(aside.querySelectorAll(".neuwo-nav-section__details"));
  const path = (details) => {
    const keys = [];
    for (let at = details; at; at = at.parentElement?.closest(".neuwo-nav-section__details")) keys.unshift(at.getAttribute("data-key"));
    return keys.join("/");
  };
  const save = () => {
    const key = aside.getAttribute("data-remember");
    if (key === null) return;
    const open = sections().filter((details) => details.hasAttribute("open")).map(path);
    try {
      sessionStorage.setItem(key, JSON.stringify({ open, scroll: nav.scrollTop }));
    } catch {}
  };
  // Sections render after this runs when the library is defined before the parser reaches the sidebar.
  queueMicrotask(() => {
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(aside.getAttribute("data-remember")));
    } catch {}
    const open = Array.isArray(saved?.open) ? saved.open : [];
    for (const details of sections()) if (open.includes(path(details))) details.setAttribute("open", "");
    if (typeof saved?.scroll === "number") nav.scrollTop = saved.scroll;
    aside.addEventListener("toggle", save, true);
    addEventListener("pagehide", save);
  });
})(document.currentScript && document.currentScript.parentNode);
