import fontsCss from "../foundation/fonts.css?raw";

let injected = false;

export function injectFonts() {
  if (injected || typeof document === "undefined") return;
  if (document.querySelector("style[data-neuwo-fonts]")) {
    injected = true;
    return;
  }
  const base = new URL(".", import.meta.url); // directory containing the bundle
  const css = fontsCss.replace(
    /url\(['"]?([^'")]+\.woff2)['"]?\)/g,
    (_match, rel) => `url('${new URL(rel, base).href}')`
  );
  const style = document.createElement("style");
  style.setAttribute("data-neuwo-fonts", "");
  style.textContent = css;
  document.head.appendChild(style);
  injected = true;
}
