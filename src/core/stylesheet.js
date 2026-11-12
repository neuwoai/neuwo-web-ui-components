import { sheet } from "./sheet.js";

// happy-dom keeps a computed style it read before a sheet was adopted, so there the marker alone would adopt it again.
let adopted = false;

/**
 * Adopts the components sheet onto the document unless the page already has one, detected by the
 * `--neuwo-components` marker the sheet declares on `:root`. An adopted sheet sits after linked ones in
 * the cascade, so a second copy would override a site's own restyling.
 * @param {string} cssText
 * @returns {boolean} `true` when it adopted the sheet
 */
export function applyComponentsStylesheet(cssText) {
  if (adopted || typeof document === "undefined") return false;
  if (getComputedStyle(document.documentElement).getPropertyValue("--neuwo-components").trim() !== "") return false;
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet(cssText)];
  adopted = true;
  return true;
}
