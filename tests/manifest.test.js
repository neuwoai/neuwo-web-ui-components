import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  readFileSync(join(__dirname, "../custom-elements.json"), "utf8")
);

// --- manifest walkers (shared by later attribute assertions) ---
function declByTag(m, tag) {
  for (const mod of m.modules ?? [])
    for (const dec of mod.declarations ?? [])
      if (dec.tagName === tag) return dec;
  return null;
}
function declByName(m, name) {
  for (const mod of m.modules ?? [])
    for (const dec of mod.declarations ?? [])
      if (dec.name === name) return dec;
  return null;
}
// Attributes resolved up the superclass chain. The analyzer flattens inherited
// attributes onto each subclass declaration; the chain walk below is a defensive
// fallback in case a future analyzer version changes that behaviour.
function attributesFor(m, tag) {
  const names = new Set();
  let dec = declByTag(m, tag);
  while (dec) {
    for (const a of dec.attributes ?? []) names.add(a.name);
    dec = dec.superclass ? declByName(m, dec.superclass.name) : null;
  }
  return names;
}
function partsFor(m, tag) {
  const names = new Set();
  let dec = declByTag(m, tag);
  while (dec) {
    for (const p of dec.cssParts ?? []) names.add(p.name);
    dec = dec.superclass ? declByName(m, dec.superclass.name) : null;
  }
  return names;
}

export { manifest, attributesFor, partsFor };

const EXPECTED_TAGS = [
  "neuwo-button", "neuwo-input", "neuwo-textarea", "neuwo-select",
  "neuwo-combobox", "neuwo-checkbox", "neuwo-toggle", "neuwo-radio",
  "neuwo-radio-group", "neuwo-segmented", "neuwo-badge", "neuwo-deal-id",
  "neuwo-status-dot", "neuwo-cta",
];

describe("custom-elements.json", () => {
  it("declares every registered neuwo-* element", () => {
    const tags = (manifest.modules ?? [])
      .flatMap((mod) => mod.declarations ?? [])
      .filter((d) => d.customElement && d.tagName)
      .map((d) => d.tagName);
    for (const tag of EXPECTED_TAGS) expect(tags).toContain(tag);
  });

  it("documents the shared field attributes on field elements", () => {
    const attrs = attributesFor(manifest, "neuwo-input");
    for (const a of ["name", "value", "label", "disabled", "required", "error", "error-muted"])
      expect(attrs).toContain(a);
  });

  it("documents the shared boolean attributes on the checkbox", () => {
    const attrs = attributesFor(manifest, "neuwo-checkbox");
    for (const a of ["name", "value", "checked", "disabled", "required", "error", "error-muted"])
      expect(attrs).toContain(a);
  });

  it("documents the shared single-select attributes on the radio group", () => {
    const attrs = attributesFor(manifest, "neuwo-radio-group");
    for (const a of ["name", "value", "disabled", "required", "label", "orientation", "error", "error-muted"])
      expect(attrs).toContain(a);
  });

  it("documents the button's own attributes and part", () => {
    const attrs = attributesFor(manifest, "neuwo-button");
    for (const a of ["variant", "size", "wide", "xwide", "href", "disabled", "type", "block"])
      expect(attrs).toContain(a);
    expect(partsFor(manifest, "neuwo-button").has("button")).toBe(true);
  });

  it("documents the input's type and constraint attributes", () => {
    const attrs = attributesFor(manifest, "neuwo-input");
    for (const a of ["type", "min", "max", "step", "pattern", "minlength", "maxlength"])
      expect(attrs).toContain(a);
  });

  it("documents the combobox's searchable attribute and parts", () => {
    expect(attributesFor(manifest, "neuwo-combobox").has("searchable")).toBe(true);
    for (const p of ["chevron", "popup"])
      expect(partsFor(manifest, "neuwo-combobox").has(p)).toBe(true);
  });

  it("documents the select's chevron part", () => {
    expect(partsFor(manifest, "neuwo-select").has("chevron")).toBe(true);
  });

  it("documents the selection-control parts", () => {
    for (const p of ["field", "label"]) expect(partsFor(manifest, "neuwo-checkbox").has(p)).toBe(true);
    for (const p of ["field", "track", "label"]) expect(partsFor(manifest, "neuwo-toggle").has(p)).toBe(true);
    for (const p of ["field", "input", "label"]) expect(partsFor(manifest, "neuwo-radio").has(p)).toBe(true);
    for (const p of ["legend", "options"]) expect(partsFor(manifest, "neuwo-radio-group").has(p)).toBe(true);
    for (const p of ["indicator", "option"]) expect(partsFor(manifest, "neuwo-segmented").has(p)).toBe(true);
  });

  it("documents the radio's own attributes", () => {
    const attrs = attributesFor(manifest, "neuwo-radio");
    for (const a of ["value", "disabled", "checked"]) expect(attrs).toContain(a);
  });

  it("documents the badge's three axes and part", () => {
    const attrs = attributesFor(manifest, "neuwo-badge");
    for (const a of ["variant", "borderless", "pulse"]) expect(attrs).toContain(a);
    expect(partsFor(manifest, "neuwo-badge").has("badge")).toBe(true);
  });

  it("documents the deal-id value part", () => {
    expect(partsFor(manifest, "neuwo-deal-id").has("value")).toBe(true);
  });

  it("documents the status-dot's two axes and part", () => {
    const attrs = attributesFor(manifest, "neuwo-status-dot");
    for (const a of ["variant", "motion"]) expect(attrs).toContain(a);
    expect(partsFor(manifest, "neuwo-status-dot").has("dot")).toBe(true);
  });

  it("documents the cta's attributes and parts", () => {
    const attrs = attributesFor(manifest, "neuwo-cta");
    for (const a of ["variant", "pulse", "heading-level"]) expect(attrs).toContain(a);
    for (const p of ["cta", "inner", "headline", "sub", "actions"])
      expect(partsFor(manifest, "neuwo-cta").has(p)).toBe(true);
  });
});
