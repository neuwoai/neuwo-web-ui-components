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

export { manifest, attributesFor };

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

  it("documents the shared checkable attributes, the native events on the checkbox and the toggle", () => {
    for (const tag of ["neuwo-checkbox", "neuwo-toggle"]) {
      const attrs = attributesFor(manifest, tag);
      for (const a of ["name", "value", "checked", "disabled", "form", "required", "error", "error-muted", "no-error-line"])
        expect(attrs, tag).toContain(a);
      expect(declByTag(manifest, tag).events.map((e) => e.name), tag).toEqual(expect.arrayContaining(["input", "change"]));
    }
    expect(attributesFor(manifest, "neuwo-toggle").has("pulse")).toBe(true);
  });

  it("documents the radio group's attributes, the native events", () => {
    const attrs = attributesFor(manifest, "neuwo-radio-group");
    for (const a of ["name", "value", "disabled", "form", "required", "label", "orientation", "error", "error-muted", "no-error-line"])
      expect(attrs).toContain(a);
    expect(attrs.has("checked")).toBe(false);
    expect(declByTag(manifest, "neuwo-radio-group").events.map((e) => e.name)).toEqual(expect.arrayContaining(["input", "change"]));
  });

  it("documents the button's own attributes", () => {
    const attrs = attributesFor(manifest, "neuwo-button");
    for (const a of ["variant", "size", "hover", "wide", "xwide", "block", "href", "disabled", "loading", "type"])
      expect(attrs).toContain(a);
  });

  it("documents the input's type and constraint attributes, its change event", () => {
    const attrs = attributesFor(manifest, "neuwo-input");
    for (const a of ["type", "min", "max", "step", "pattern", "minlength", "maxlength", "inputmode"])
      expect(attrs).toContain(a);
    expect(declByTag(manifest, "neuwo-input").events.map((e) => e.name)).toContain("change");
  });

  it("documents the range's bounds", () => {
    const attrs = attributesFor(manifest, "neuwo-range");
    for (const a of ["min", "max", "step", "value", "label", "disabled"]) expect(attrs).toContain(a);
  });

  it("documents the combobox's searchable attribute, its input and change events", () => {
    const attrs = attributesFor(manifest, "neuwo-combobox");
    for (const a of ["searchable", "name", "value", "placeholder", "required", "disabled", "form"]) expect(attrs).toContain(a);
    expect(declByTag(manifest, "neuwo-combobox").events.map((e) => e.name)).toEqual(expect.arrayContaining(["input", "change"]));
  });

  it("documents the segmented control's attributes, with no orientation, its input and change events", () => {
    const attrs = attributesFor(manifest, "neuwo-segmented");
    expect([...attrs].sort()).toEqual(["disabled", "error", "error-muted", "form", "label", "name", "no-error-line", "required", "value"]);
    expect(declByTag(manifest, "neuwo-segmented").events.map((e) => e.name)).toEqual(expect.arrayContaining(["input", "change"]));
  });

  it("documents the radio's checkable attributes, none of the error line's, the native events", () => {
    const attrs = attributesFor(manifest, "neuwo-radio");
    expect([...attrs].sort()).toEqual(["checked", "disabled", "form", "name", "required", "value"]);
    expect(declByTag(manifest, "neuwo-radio").events.map((e) => e.name)).toEqual(expect.arrayContaining(["input", "change"]));
  });

  it("gives noErrorLine to every control that renders an error line, and not to the radio", () => {
    const has = (tag) => declByTag(manifest, tag).members.some((member) => member.name === "noErrorLine");
    for (const tag of ["neuwo-input", "neuwo-textarea", "neuwo-combobox", "neuwo-range", "neuwo-checkbox", "neuwo-toggle", "neuwo-radio-group", "neuwo-segmented"]) {
      expect(has(tag), tag).toBe(true);
    }
    expect(has("neuwo-radio")).toBe(false);
    expect(declByName(manifest, "NeuwoControlElement").members.some((member) => member.name === "noErrorLine")).toBe(false);
  });

  it("documents the error attributes and noErrorLine once, on a mixin every base with an error line applies, never the radio", () => {
    const mixin = declByName(manifest, "NeuwoErrorMixin");
    expect(mixin.kind).toBe("mixin");
    expect(mixin.attributes.map((attribute) => attribute.name)).toEqual(["error", "error-muted", "no-error-line"]);
    expect(mixin.members.map((member) => member.name)).toEqual(["noErrorLine"]);
    for (const name of ["NeuwoFieldElement", "NeuwoChoiceElement", "NeuwoRadioGroup", "NeuwoSegmented"]) {
      expect(declByName(manifest, name).mixins?.map((applied) => applied.name), name).toContain("NeuwoErrorMixin");
    }
    const declarations = (manifest.modules ?? []).flatMap((mod) => mod.declarations ?? []).filter((declaration) => declaration.kind === "class");
    for (const declaration of declarations) {
      for (const item of [...(declaration.attributes ?? []), ...(declaration.members ?? [])].filter(({ name }) => ["error", "error-muted", "no-error-line", "noErrorLine"].includes(name))) {
        expect(item.inheritedFrom?.name, `${declaration.name} ${item.name}`).toBe("NeuwoErrorMixin");
      }
    }
    expect(declByTag(manifest, "neuwo-radio").mixins).toBeUndefined();
  });

  it("shares the starting value accessor of the fields and the segmented control through one mixin, the radio group keeping its own", () => {
    const mixin = declByName(manifest, "NeuwoDefaultValueMixin");
    expect(mixin.kind).toBe("mixin");
    expect(mixin.members.map((member) => member.name)).toEqual(["defaultValue"]);
    for (const name of ["NeuwoFieldElement", "NeuwoSegmented"]) {
      expect(declByName(manifest, name).mixins?.map((applied) => applied.name), name).toContain("NeuwoDefaultValueMixin");
    }
    const group = declByTag(manifest, "neuwo-radio-group").members.find((member) => member.name === "defaultValue");
    expect(group.inheritedFrom).toBeUndefined();
    expect(group.description).toMatch(/the value of the radio that starts checked/);
    for (const tag of ["neuwo-checkbox", "neuwo-toggle", "neuwo-radio"]) {
      expect(declByTag(manifest, tag).members.some((member) => member.name === "defaultValue"), tag).toBe(false);
    }
  });

  it("keeps a field's inherited attributes in its base's order and wording, the error attributes after the label", () => {
    const names = (tag) => declByTag(manifest, tag).attributes.map((attribute) => attribute.name);
    const base = ["name", "value", "placeholder", "disabled", "form", "required", "readonly", "autocomplete", "size", "label", "error", "error-muted", "no-error-line"];
    expect(names("neuwo-input")).toEqual(["type", "min", "max", "step", "pattern", "minlength", "maxlength", "inputmode", ...base]);
    expect(names("neuwo-combobox")).toEqual(["searchable", ...base]);
    for (const tag of ["neuwo-input", "neuwo-textarea", "neuwo-combobox", "neuwo-range"]) {
      const muted = declByTag(manifest, tag).attributes.find((attribute) => attribute.name === "error-muted");
      expect(muted.description, tag).toMatch(/border\/box-shadow accent/);
    }
  });

  it("keeps the radio group's and the segmented control's own wording for the error attributes", () => {
    const description = (tag, name) => declByTag(manifest, tag).attributes.find((attribute) => attribute.name === name).description;
    expect(description("neuwo-radio-group", "error")).toMatch(/on each of the group's own radios/);
    expect(description("neuwo-radio-group", "no-error-line")).toMatch(/non-validated group/);
    expect(description("neuwo-segmented", "no-error-line")).toMatch(/such as a toolbar/);
  });

  it("documents the form attribute once, on the control base, which only the radio restates", () => {
    const own = (name) => declByName(manifest, name).attributes?.find((attribute) => attribute.name === "form" && !attribute.inheritedFrom);
    expect(own("NeuwoControlElement")?.description).toMatch(/id of the form/);
    for (const name of ["NeuwoFieldElement", "NeuwoCheckableElement", "NeuwoRadioGroup", "NeuwoSegmented"]) expect(own(name), name).toBeUndefined();
    const shared = own("NeuwoControlElement").description;
    for (const tag of ["neuwo-input", "neuwo-checkbox", "neuwo-radio-group", "neuwo-segmented"]) {
      expect(declByTag(manifest, tag).attributes.find((attribute) => attribute.name === "form").description, tag).toBe(shared);
    }
    expect(declByTag(manifest, "neuwo-radio").attributes.find((attribute) => attribute.name === "form").description).toMatch(/inside one, the group's applies/);
  });

  it("documents the badge's six axes", () => {
    const attrs = attributesFor(manifest, "neuwo-badge");
    for (const a of ["variant", "size", "borderless", "motion", "intensity", "glow"]) expect(attrs).toContain(a);
  });

  it("documents the deal-id size attribute", () => {
    expect(attributesFor(manifest, "neuwo-deal-id").has("size")).toBe(true);
  });

  it("documents the status-dot's four axes", () => {
    const attrs = attributesFor(manifest, "neuwo-status-dot");
    for (const a of ["variant", "motion", "halo", "glow"]) expect(attrs).toContain(a);
  });

  it("documents the cta's attributes", () => {
    const attrs = attributesFor(manifest, "neuwo-cta");
    for (const a of ["variant", "pulse", "intensity", "heading-level", "status", "status-state"])
      expect(attrs).toContain(a);
  });

  it("documents the notice's axes", () => {
    const attrs = attributesFor(manifest, "neuwo-notice");
    for (const a of ["position", "layout", "dismissible", "dismiss-label"]) expect(attrs).toContain(a);
  });

  it("documents the logo's variant, label", () => {
    const attrs = attributesFor(manifest, "neuwo-logo");
    for (const a of ["variant", "label"]) expect(attrs).toContain(a);
  });

  it("documents the copy wrapper's three labels", () => {
    const attrs = attributesFor(manifest, "neuwo-copy");
    for (const a of ["label", "copied-label", "failed-label"]) expect(attrs).toContain(a);
  });
});
