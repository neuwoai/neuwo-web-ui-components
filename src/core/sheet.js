// Build a single shared CSSStyleSheet from a CSS string.
// One sheet object is adopted by reference across every component instance --
// no per-instance <style> duplication.
export function sheet(cssText) {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(cssText);
  return styleSheet;
}
