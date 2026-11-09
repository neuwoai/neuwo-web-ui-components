import fontsCss from "../foundation/fonts.css?raw";

let injected = false;

function fontUrls() {
  // Literal so bundlers copy each file and rewrite its URL; relative to dist/neuwo.js, not this file.
  return {
    "fonts/outfit-variable.woff2": new URL("./fonts/outfit-variable.woff2", import.meta.url).href,
    "fonts/noto-sans-variable.woff2": new URL("./fonts/noto-sans-variable.woff2", import.meta.url).href,
    "fonts/noto-sans-italic-variable.woff2": new URL("./fonts/noto-sans-italic-variable.woff2", import.meta.url).href,
  };
}

export function injectFonts() {
  if (injected || typeof document === "undefined") return;
  if (document.querySelector("style[data-neuwo-fonts]")) {
    injected = true;
    return;
  }
  const urls = fontUrls();
  const css = fontsCss.replace(
    /url\(['"]?([^'")]+\.woff2)['"]?\)/g,
    (_match, rel) => `url('${urls[rel]}')`
  );
  const style = document.createElement("style");
  style.setAttribute("data-neuwo-fonts", "");
  style.textContent = css;
  document.head.appendChild(style);
  injected = true;
}
