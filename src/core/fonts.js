/**
 * Makes each `url('fonts/<file>.woff2')` in the font faces absolute, so they load from beside the
 * script rather than beside the page.
 * @param {string} cssText
 * @returns {string}
 */
export function resolveFontUrls(cssText) {
  // Literal so bundlers copy each file and rewrite its URL; relative to dist/neuwo-standalone.js, not this file.
  /** @type {Record<string, string>} */
  const urls = {
    "fonts/outfit-variable.woff2": new URL("./fonts/outfit-variable.woff2", import.meta.url).href,
    "fonts/outfit-ext-variable.woff2": new URL("./fonts/outfit-ext-variable.woff2", import.meta.url).href,
    "fonts/noto-sans-variable.woff2": new URL("./fonts/noto-sans-variable.woff2", import.meta.url).href,
    "fonts/noto-sans-ext-variable.woff2": new URL("./fonts/noto-sans-ext-variable.woff2", import.meta.url).href,
    "fonts/noto-sans-italic-variable.woff2": new URL("./fonts/noto-sans-italic-variable.woff2", import.meta.url).href,
    "fonts/noto-sans-italic-ext-variable.woff2": new URL("./fonts/noto-sans-italic-ext-variable.woff2", import.meta.url).href,
    "fonts/jetbrains-mono-variable.woff2": new URL("./fonts/jetbrains-mono-variable.woff2", import.meta.url).href,
    "fonts/jetbrains-mono-ext-variable.woff2": new URL("./fonts/jetbrains-mono-ext-variable.woff2", import.meta.url).href,
  };
  return cssText.replace(/url\(['"]?([^'")]+\.woff2)['"]?\)/g, (match, rel) =>
    Object.hasOwn(urls, rel) ? `url('${urls[rel]}')` : match,
  );
}
