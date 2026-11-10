// Build a single shared CSSStyleSheet from a CSS string.
// One sheet object is adopted by reference across every component instance --
// no per-instance <style> duplication.
export function sheet(cssText) {
  if (typeof CSSStyleSheet === "undefined") return null;
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(cssText);
  return styleSheet;
}
