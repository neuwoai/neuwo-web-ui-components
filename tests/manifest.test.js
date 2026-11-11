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
  "neuwo-button", "neuwo-input", "neuwo-textarea",
  "neuwo-combobox", "neuwo-range", "neuwo-checkbox", "neuwo-toggle", "neuwo-radio",
  "neuwo-radio-group", "neuwo-segmented", "neuwo-badge", "neuwo-deal-id",
  "neuwo-status-dot", "neuwo-cta", "neuwo-notice", "neuwo-logo", "neuwo-copy",
];

// Elements deliberately removed. `neuwo-select` wrapped a native <select>, so its
// popup was drawn by the OS and could not be styled; the styled combobox replaces it.
// `neuwo-dropdown` bundled a disclosure toggle with the nav-link styling, which made
// it too rigid for site navigation; `foundation/navigation.css` publishes the styling
// on its own so the consumer owns the structure and any collapsing.
const REMOVED_TAGS = ["neuwo-select", "neuwo-dropdown"];

describe("custom-elements.json", () => {
  it("declares every registered neuwo-* element", () => {
    const tags = (manifest.modules ?? [])
      .flatMap((mod) => mod.declarations ?? [])
      .filter((d) => d.customElement && d.tagName)
      .map((d) => d.tagName);
    for (const tag of EXPECTED_TAGS) expect(tags).toContain(tag);
  });

  it("does not declare removed elements", () => {
    const tags = (manifest.modules ?? [])
      .flatMap((mod) => mod.declarations ?? [])
      .filter((d) => d.customElement && d.tagName)
      .map((d) => d.tagName);
    for (const tag of REMOVED_TAGS) expect(tags).not.toContain(tag);
  });

  it("documents the shared field attributes on field elements", () => {
    const attrs = attributesFor(manifest, "neuwo-input");
    for (const a of ["name", "value", "label", "disabled", "required", "error", "error-muted", "no-error-line", "size"])
      expect(attrs).toContain(a);
  });

  it("documents the shared checkable attributes, the native events and no parts on the checkbox and the toggle", () => {
    for (const tag of ["neuwo-checkbox", "neuwo-toggle"]) {
      const attrs = attributesFor(manifest, tag);
      for (const a of ["name", "value", "checked", "disabled", "form", "required", "error", "error-muted", "no-error-line"])
        expect(attrs, tag).toContain(a);
      expect(declByTag(manifest, tag).events.map((e) => e.name), tag).toEqual(expect.arrayContaining(["input", "change"]));
      expect(partsFor(manifest, tag).size, tag).toBe(0);
    }
    expect(attributesFor(manifest, "neuwo-toggle").has("pulse")).toBe(true);
  });

  it("documents the radio group's attributes, the native events and no parts", () => {
    const attrs = attributesFor(manifest, "neuwo-radio-group");
    for (const a of ["name", "value", "disabled", "form", "required", "label", "orientation", "error", "error-muted", "no-error-line"])
      expect(attrs).toContain(a);
    expect(attrs.has("checked")).toBe(false);
    expect(declByTag(manifest, "neuwo-radio-group").events.map((e) => e.name)).toEqual(expect.arrayContaining(["input", "change"]));
    expect(partsFor(manifest, "neuwo-radio-group").size).toBe(0);
  });

  it("documents the button's own attributes and no parts", () => {
    const attrs = attributesFor(manifest, "neuwo-button");
    for (const a of ["variant", "size", "hover", "wide", "xwide", "block", "href", "disabled", "loading", "type"])
      expect(attrs).toContain(a);
    expect(partsFor(manifest, "neuwo-button").size).toBe(0);
  });

  it("documents the input's type and constraint attributes, its change event and no parts", () => {
    const attrs = attributesFor(manifest, "neuwo-input");
    for (const a of ["type", "min", "max", "step", "pattern", "minlength", "maxlength", "inputmode"])
      expect(attrs).toContain(a);
    expect(declByTag(manifest, "neuwo-input").events.map((e) => e.name)).toContain("change");
    expect(partsFor(manifest, "neuwo-input").size).toBe(0);
  });

  it("documents the range's bounds and exposes no parts", () => {
    const attrs = attributesFor(manifest, "neuwo-range");
    for (const a of ["min", "max", "step", "value", "label", "disabled"]) expect(attrs).toContain(a);
    expect(partsFor(manifest, "neuwo-range").size).toBe(0);
  });

  it("documents the combobox's searchable attribute, its input and change events and no parts", () => {
    const attrs = attributesFor(manifest, "neuwo-combobox");
    for (const a of ["searchable", "name", "value", "placeholder", "required", "disabled", "form"]) expect(attrs).toContain(a);
    expect(declByTag(manifest, "neuwo-combobox").events.map((e) => e.name)).toEqual(expect.arrayContaining(["input", "change"]));
    expect(partsFor(manifest, "neuwo-combobox").size).toBe(0);
  });

  it("documents the segmented control's attributes, with no orientation, its input and change events and no parts", () => {
    const attrs = attributesFor(manifest, "neuwo-segmented");
    expect([...attrs].sort()).toEqual(["disabled", "error", "error-muted", "form", "label", "name", "no-error-line", "required", "value"]);
    expect(declByTag(manifest, "neuwo-segmented").events.map((e) => e.name)).toEqual(expect.arrayContaining(["input", "change"]));
    expect(partsFor(manifest, "neuwo-segmented").size).toBe(0);
  });

  it("documents the radio's checkable attributes, none of the error line's, the native events and no parts", () => {
    const attrs = attributesFor(manifest, "neuwo-radio");
    expect([...attrs].sort()).toEqual(["checked", "disabled", "form", "name", "required", "value"]);
    expect(declByTag(manifest, "neuwo-radio").events.map((e) => e.name)).toEqual(expect.arrayContaining(["input", "change"]));
    expect(partsFor(manifest, "neuwo-radio").size).toBe(0);
  });

  it("documents the badge's six axes and no parts", () => {
    const attrs = attributesFor(manifest, "neuwo-badge");
    for (const a of ["variant", "size", "borderless", "motion", "intensity", "glow"]) expect(attrs).toContain(a);
    expect(partsFor(manifest, "neuwo-badge").size).toBe(0);
  });

  it("documents the deal-id size attribute and no parts", () => {
    expect(attributesFor(manifest, "neuwo-deal-id").has("size")).toBe(true);
    expect(partsFor(manifest, "neuwo-deal-id").size).toBe(0);
  });

  it("documents the status-dot's four axes and no parts", () => {
    const attrs = attributesFor(manifest, "neuwo-status-dot");
    for (const a of ["variant", "motion", "halo", "glow"]) expect(attrs).toContain(a);
    expect(partsFor(manifest, "neuwo-status-dot").size).toBe(0);
  });

  it("documents the cta's attributes and no parts", () => {
    const attrs = attributesFor(manifest, "neuwo-cta");
    for (const a of ["variant", "pulse", "intensity", "heading-level", "status", "status-state"])
      expect(attrs).toContain(a);
    expect(partsFor(manifest, "neuwo-cta").size).toBe(0);
  });

  it("documents the notice's axes and no parts", () => {
    const attrs = attributesFor(manifest, "neuwo-notice");
    for (const a of ["position", "layout", "dismissible", "dismiss-label"]) expect(attrs).toContain(a);
    expect(partsFor(manifest, "neuwo-notice").size).toBe(0);
  });

  it("documents the logo's variant, label and no parts", () => {
    const attrs = attributesFor(manifest, "neuwo-logo");
    for (const a of ["variant", "label"]) expect(attrs).toContain(a);
    expect(partsFor(manifest, "neuwo-logo").size).toBe(0);
  });

  it("documents the copy wrapper's three labels and no parts", () => {
    const attrs = attributesFor(manifest, "neuwo-copy");
    for (const a of ["label", "copied-label", "failed-label"]) expect(attrs).toContain(a);
    expect(partsFor(manifest, "neuwo-copy").size).toBe(0);
  });
});
