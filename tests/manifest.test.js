import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  readFileSync(join(__dirname, "../custom-elements.json"), "utf8")
);

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
// The analyzer flattens inherited attributes today; the chain walk covers a version that stops.
function attributesFor(m, tag) {
  const names = new Set();
  let dec = declByTag(m, tag);
  while (dec) {
    for (const a of dec.attributes ?? []) names.add(a.name);
    dec = dec.superclass ? declByName(m, dec.superclass.name) : null;
  }
  return names;
}

function cssPropertiesFor(m, tag) {
  return new Set((declByTag(m, tag)?.cssProperties ?? []).map((property) => property.name));
}

const classes = () =>
  (manifest.modules ?? []).flatMap((mod) => (mod.declarations ?? []).filter((dec) => dec.kind === "class").map((dec) => ({ dec, path: mod.path })));

function chainOf(m, dec) {
  const names = [];
  for (let each = dec; each; each = each.superclass ? declByName(m, each.superclass.name) : null) names.push(each.name);
  return names;
}

function documentedBy(path, name) {
  const source = readFileSync(join(__dirname, "..", path), "utf8");
  const block = source.match(new RegExp(String.raw`/\*\*((?:(?!\*/)[\s\S])*)\*/\s*export class ${name}\b`))?.[1] ?? "";
  return new Set([...block.matchAll(/@attr\s+(?:\{[^}]*\}\s+)?([\w-]+)/g)].map((match) => match[1]));
}

export { manifest, attributesFor };

const EXPECTED_TAGS = [
  "neuwo-button", "neuwo-input", "neuwo-textarea",
  "neuwo-combobox", "neuwo-range", "neuwo-checkbox", "neuwo-toggle", "neuwo-radio",
  "neuwo-radio-group", "neuwo-segmented", "neuwo-badge", "neuwo-deal-id",
  "neuwo-status-dot", "neuwo-cta", "neuwo-notice", "neuwo-logo", "neuwo-copy",
  "neuwo-menu", "neuwo-menu-group", "neuwo-menu-item",
  "neuwo-nav-item", "neuwo-nav-section", "neuwo-sidebar",
];

// Removed on purpose: the combobox replaces `neuwo-select`, and `foundation/navigation.css` `neuwo-dropdown`.
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

  it("names HTMLElement, a global, as the base class's superclass", () => {
    expect(declByName(manifest, "NeuwoElement").superclass).toEqual({ name: "HTMLElement", package: "global:" });
  });

  it("marks the lifecycle hooks protected on every element class", () => {
    const hooks = ["connect", "disconnect", "updated", "formReset"];
    const elements = classes().filter(({ dec }) => chainOf(manifest, dec).includes("NeuwoElement"));
    expect(elements.length).toBeGreaterThan(EXPECTED_TAGS.length);
    for (const { dec } of elements) {
      for (const member of (dec.members ?? []).filter(({ name }) => hooks.includes(name))) {
        expect(member.privacy, `${dec.name} ${member.name}`).toBe("protected");
      }
    }
  });

  it("records no inheritedFrom on an attribute a class documents itself", () => {
    for (const { dec, path } of classes()) {
      const own = documentedBy(path, dec.name);
      for (const attribute of dec.attributes ?? []) {
        if (own.has(attribute.name)) expect(attribute.inheritedFrom, `${dec.name} ${attribute.name}`).toBeUndefined();
      }
    }
    const group = declByTag(manifest, "neuwo-radio-group").attributes;
    expect(group.find(({ name }) => name === "name").inheritedFrom).toBeUndefined();
    expect(group.find(({ name }) => name === "form").inheritedFrom?.name).toBe("NeuwoControlElement");
  });

  it("documents the shared field attributes on field elements", () => {
    const attrs = attributesFor(manifest, "neuwo-input");
    for (const a of ["name", "value", "label", "disabled", "required", "error", "error-muted", "no-error-line", "size"])
      expect(attrs).toContain(a);
  });

  it("documents the shared checkable attributes and the native events on the checkbox and the toggle", () => {
    for (const tag of ["neuwo-checkbox", "neuwo-toggle"]) {
      const attrs = attributesFor(manifest, tag);
      for (const a of ["name", "value", "checked", "disabled", "form", "required", "error", "error-muted", "no-error-line"])
        expect(attrs, tag).toContain(a);
      expect(declByTag(manifest, tag).events.map((e) => e.name), tag).toEqual(expect.arrayContaining(["input", "change"]));
    }
    expect(attributesFor(manifest, "neuwo-toggle").has("pulse")).toBe(true);
  });

  it("documents the radio group's attributes and the native events", () => {
    const attrs = attributesFor(manifest, "neuwo-radio-group");
    for (const a of ["name", "value", "disabled", "form", "required", "label", "orientation", "error", "error-muted", "no-error-line"])
      expect(attrs).toContain(a);
    expect(attrs.has("checked")).toBe(false);
    expect(declByTag(manifest, "neuwo-radio-group").events.map((e) => e.name)).toEqual(expect.arrayContaining(["input", "change"]));
  });

  it("documents the button's own attributes", () => {
    const attrs = attributesFor(manifest, "neuwo-button");
    for (const a of ["variant", "size", "hover", "wide", "xwide", "block", "href", "disabled", "loading", "type", "menu", "icon-only", "split", "menu-label"])
      expect(attrs).toContain(a);
    const button = declByTag(manifest, "neuwo-button");
    expect(button.attributes.find((attribute) => attribute.name === "icon-only").type.text).toBe("boolean");
    expect(button.attributes.find((attribute) => attribute.name === "split").type.text).toBe("boolean");
    expect(button.attributes.find((attribute) => attribute.name === "menu-label").description).toMatch(/More Options/);
    expect(button.attributes.find((attribute) => attribute.name === "menu").description).toMatch(/<neuwo-menu>/);
    expect(button.summary).toMatch(/--icon-only/);
    expect(button.summary).toMatch(/\.neuwo-btn__chevron/);
    expect(button.summary).toMatch(/\.neuwo-btn__dots/);
    for (const name of [".neuwo-btn-split", ".neuwo-btn-split__main", ".neuwo-btn-split__toggle"]) expect(button.summary).toContain(`\`${name}\``);
  });

  it("documents the input's type and constraint attributes and its change event", () => {
    const attrs = attributesFor(manifest, "neuwo-input");
    for (const a of ["type", "min", "max", "step", "pattern", "minlength", "maxlength", "inputmode"])
      expect(attrs).toContain(a);
    expect(declByTag(manifest, "neuwo-input").events.map((e) => e.name)).toContain("change");
  });

  it("documents the range's bounds", () => {
    const attrs = attributesFor(manifest, "neuwo-range");
    for (const a of ["min", "max", "step", "value", "label", "disabled"]) expect(attrs).toContain(a);
  });

  it("documents the combobox's searchable attribute and its input and change events", () => {
    const attrs = attributesFor(manifest, "neuwo-combobox");
    for (const a of ["searchable", "name", "value", "placeholder", "required", "disabled", "form"]) expect(attrs).toContain(a);
    expect(declByTag(manifest, "neuwo-combobox").events.map((e) => e.name)).toEqual(expect.arrayContaining(["input", "change"]));
  });

  it("documents the segmented control's attributes, with no orientation, and its input and change events", () => {
    const attrs = attributesFor(manifest, "neuwo-segmented");
    expect([...attrs].sort()).toEqual(["disabled", "error", "error-muted", "form", "label", "name", "no-error-line", "required", "value"]);
    expect(declByTag(manifest, "neuwo-segmented").events.map((e) => e.name)).toEqual(expect.arrayContaining(["input", "change"]));
  });

  it("documents the radio's checkable attributes, none of the error line's, and the native events", () => {
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

  it("documents the error attributes and noErrorLine on a mixin every base with an error line applies, which a few restate, never on the radio", () => {
    const mixin = declByName(manifest, "NeuwoErrorMixin");
    expect(mixin.kind).toBe("mixin");
    expect(mixin.attributes.map((attribute) => attribute.name)).toEqual(["error", "error-muted", "no-error-line"]);
    expect(mixin.members.map((member) => member.name)).toEqual(["noErrorLine"]);
    for (const name of ["NeuwoFieldElement", "NeuwoChoiceElement", "NeuwoRadioGroup", "NeuwoSegmented"]) {
      expect(declByName(manifest, name).mixins?.map((applied) => applied.name), name).toContain("NeuwoErrorMixin");
    }
    const items = classes().flatMap(({ dec }) =>
      [...(dec.attributes ?? []), ...(dec.members ?? [])]
        .filter(({ name }) => ["error", "error-muted", "no-error-line", "noErrorLine"].includes(name))
        .map((item) => ({ dec, item, key: `${dec.name} ${item.name}` })),
    );
    const restated = new Set(items.filter(({ item }) => !item.inheritedFrom).map(({ key }) => key));
    expect([...restated].sort()).toEqual(["NeuwoFieldElement error-muted", "NeuwoRadioGroup error", "NeuwoRadioGroup no-error-line", "NeuwoSegmented no-error-line"]);
    for (const { dec, item, key } of items.filter(({ item }) => item.inheritedFrom)) {
      const nearest = chainOf(manifest, dec).slice(1).find((name) => restated.has(`${name} ${item.name}`));
      expect(item.inheritedFrom.name, key).toBe(nearest ?? "NeuwoErrorMixin");
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
    expect(names("neuwo-input")).toEqual(["type", "min", "max", "step", "pattern", "minlength", "maxlength", "inputmode", "mono", ...base]);
    expect(names("neuwo-textarea")).toEqual(["rows", "minlength", "maxlength", "mono", "no-resize", ...base]);
    expect(names("neuwo-combobox")).toEqual(["searchable", ...base]);
    for (const tag of ["neuwo-input", "neuwo-textarea", "neuwo-combobox", "neuwo-range"]) {
      const muted = declByTag(manifest, tag).attributes.find((attribute) => attribute.name === "error-muted");
      expect(muted.description, tag).toMatch(/border\/box-shadow accent/);
    }
  });

  it("describes every public method of every element, and each of its parameters", () => {
    const missing = [];
    let methods = 0;
    for (const tag of EXPECTED_TAGS) {
      for (const member of declByTag(manifest, tag).members ?? []) {
        if (member.kind !== "method" || member.static || member.privacy || member.name.startsWith("#")) continue;
        methods++;
        if (!member.description?.trim()) missing.push(`${tag} ${member.name}()`);
        for (const parameter of member.parameters ?? []) {
          if (!parameter.description?.trim()) missing.push(`${tag} ${member.name}(${parameter.name})`);
        }
      }
    }
    expect(methods).toBeGreaterThan(50);
    expect(missing).toEqual([]);
  });

  it("describes every public property that mirrors no attribute, whose attribute cannot describe it", () => {
    const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    const missing = [];
    for (const tag of EXPECTED_TAGS) {
      const declaration = declByTag(manifest, tag);
      const attributes = new Set((declaration.attributes ?? []).map((attribute) => attribute.name));
      for (const member of declaration.members ?? []) {
        if (member.kind !== "field" || member.static || member.privacy || member.name.startsWith("#")) continue;
        if (!member.description?.trim() && !attributes.has(kebab(member.name))) missing.push(`${tag} ${member.name}`);
      }
    }
    expect(missing).toEqual([]);
    for (const [tag, name] of [["neuwo-input", "validity"], ["neuwo-input", "value"], ["neuwo-checkbox", "checked"], ["neuwo-combobox", "isOpen"]]) {
      expect(declByTag(manifest, tag).members.find((member) => member.name === name)?.description, `${tag} ${name}`).toBeTruthy();
    }
  });

  it("documents flashError() once, on the text field base, for the input and the textarea only", () => {
    for (const tag of ["neuwo-input", "neuwo-textarea"]) {
      const method = declByTag(manifest, tag).members.find((member) => member.name === "flashError");
      expect(method?.kind, tag).toBe("method");
      expect(method.inheritedFrom?.name, tag).toBe("NeuwoTextFieldElement");
      expect(method.description, tag).toMatch(/for 0\.9 s.*no\s+message/s);
    }
    for (const tag of ["neuwo-combobox", "neuwo-range"]) {
      expect(declByTag(manifest, tag).members.some((member) => member.name === "flashError"), tag).toBe(false);
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
    for (const a of ["variant", "size", "borderless", "uppercase", "motion", "intensity", "glow"]) expect(attrs).toContain(a);
  });

  it("documents the badge shimmer percentage and not the 0.1 width name", () => {
    const properties = cssPropertiesFor(manifest, "neuwo-badge");
    expect(properties).toContain("--neuwo-badge-shimmer-percent");
    expect(properties).not.toContain("--neuwo-badge-shimmer-width");
  });

  it("documents the deal-id size attribute", () => {
    expect(attributesFor(manifest, "neuwo-deal-id").has("size")).toBe(true);
  });

  it("documents the status-dot's five axes", () => {
    const attrs = attributesFor(manifest, "neuwo-status-dot");
    for (const a of ["variant", "size", "motion", "halo", "glow"]) expect(attrs).toContain(a);
  });

  it("documents the cta's attributes", () => {
    const attrs = attributesFor(manifest, "neuwo-cta");
    for (const a of ["variant", "pulse", "intensity", "heading-level", "status", "status-state"])
      expect(attrs).toContain(a);
  });

  it("documents the notice's axes", () => {
    const attrs = attributesFor(manifest, "neuwo-notice");
    for (const a of ["position", "layout", "dismissible", "dismiss-label", "dismiss-filled"]) expect(attrs).toContain(a);
  });

  it("documents the logo's variant and label", () => {
    const attrs = attributesFor(manifest, "neuwo-logo");
    for (const a of ["variant", "label"]) expect(attrs).toContain(a);
  });

  it("documents the menu's, the menu group's and the menu item's attributes, slots and panel", () => {
    const names = (tag) => declByTag(manifest, tag).attributes.map((attribute) => attribute.name);
    expect(names("neuwo-menu")).toEqual(["id", "submenu", "align"]);
    expect(names("neuwo-menu-group")).toEqual(["heading", "select", "no-divider"]);
    expect(names("neuwo-menu-item")).toEqual(["value", "hint", "tone", "disabled", "checked", "href", "target", "rel", "download"]);
    expect(declByTag(manifest, "neuwo-menu-item").slots.map((slot) => slot.name).sort()).toEqual(["", "start", "submenu"]);
    const panel = declByTag(manifest, "neuwo-menu").members.find((member) => member.name === "panel");
    expect(panel.description).toMatch(/popover panel/);
    expect(panel.readonly).toBe(true);
  });

  it("documents the sidebar's attributes, slots, navigate event, menu property and width, and the entry's href", () => {
    const sidebar = declByTag(manifest, "neuwo-sidebar");
    expect(sidebar.attributes.map((attribute) => attribute.name)).toEqual(["label", "current", "remember", "menu-label"]);
    expect(sidebar.attributes.find((attribute) => attribute.name === "remember").type.text).toBe("boolean|string");
    expect(sidebar.slots.map((slot) => slot.name).sort()).toEqual(["", "actions", "after-nav", "brand", "footer"]);
    expect(sidebar.events.map((event) => [event.name, event.type.text])).toEqual([["navigate", "CustomEvent<{ href: string }>"]]);
    const menuOpen = sidebar.members.find((member) => member.name === "menuOpen");
    expect(menuOpen.return.type.text).toBe("boolean");
    expect(menuOpen.description).toMatch(/not reflected/);
    expect(cssPropertiesFor(manifest, "neuwo-sidebar")).toEqual(new Set(["--neuwo-sidebar-width"]));
    expect(declByTag(manifest, "neuwo-nav-item").attributes.map((attribute) => attribute.name)).toEqual(["href"]);
  });

  it("documents the section's attributes, open as the starting state only, and its slot", () => {
    const section = declByTag(manifest, "neuwo-nav-section");
    expect(section.attributes.map((attribute) => [attribute.name, attribute.type?.text ?? null])).toEqual([
      ["label", null],
      ["href", null],
      ["open", "boolean"],
      ["id", null],
    ]);
    expect(section.attributes.find((attribute) => attribute.name === "open").description).toMatch(/starting state/);
    expect(section.attributes.find((attribute) => attribute.name === "href").description).toMatch(/Show <label> pages/);
    expect(section.slots.map((slot) => slot.name)).toEqual([""]);
    expect(section.events ?? []).toEqual([]);
  });

  it("documents the copy wrapper's three labels", () => {
    const attrs = attributesFor(manifest, "neuwo-copy");
    for (const a of ["label", "copied-label", "failed-label"]) expect(attrs).toContain(a);
  });
});
