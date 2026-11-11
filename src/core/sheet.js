/**
 * Builds a constructable stylesheet from a CSS string, which the standalone bundle adopts onto the document as the
 * one components sheet every element's light DOM markup is styled by. Returns null where there is no
 * `CSSStyleSheet`, as on a server.
 * @param {string} cssText
 * @returns {CSSStyleSheet | null}
 */
export function sheet(cssText) {
  if (typeof CSSStyleSheet === "undefined") return null;
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(cssText);
  return styleSheet;
}
