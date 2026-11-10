import { describe, expect, it } from "vitest";
import { toHTML } from "../src/core/adapters/html.js";
import { comboboxOptions, comboboxTemplate, resolveValue } from "../src/components/fields/combobox/combobox.template.js";

const text = (value, slot = "default") => ({ tag: null, attrs: {}, text: value, slot });
const option = (label, attrs = {}) => ({ tag: "option", attrs, text: label, slot: attrs.slot ?? "default", children: [text(label)] });
const optgroup = (label, children) => ({ tag: "optgroup", attrs: { label }, text: children.map((child) => child.text).join(""), slot: "default", children });

const ctx = (children = []) => ({ id: (suffix) => `c-${suffix}`, children });
const isNode = (child) => typeof child === "object" && "tag" in child;
const classesOf = (node) => String(node.props.class ?? "").split(" ").filter(Boolean);

function find(node, name) {
  if (classesOf(node).includes(name)) return node;
  for (const child of node.children.filter(isNode)) {
    const hit = find(child, name);
    if (hit) return hit;
  }
  return null;
}

function findAll(node, name, out = []) {
  if (classesOf(node).includes(name)) out.push(node);
  for (const child of node.children.filter(isNode)) findAll(child, name, out);
  return out;
}

const FRUIT = [option("Apple", { value: "a" }), option("Banana", { value: "b" }), option("Cherry", { value: "c", disabled: "" })];

describe("comboboxOptions()", () => {
  it("reads flat options with their value, label, flags and running index", () => {
    expect(comboboxOptions([option("Apple", { value: "a" }), option("Banana", { value: "b", selected: "", disabled: "" })])).toEqual([
      { value: "a", label: "Apple", disabled: false, selected: false, group: "", index: 0 },
      { value: "b", label: "Banana", disabled: true, selected: true, group: "", index: 1 },
    ]);
  });

  it("gives an optgroup's options its label as the group, the index running across every option", () => {
    const options = comboboxOptions([option("Apple", { value: "a" }), optgroup("Citrus", [option("Orange", { value: "o" }), text("\n"), option("Lemon")]), option("Kiwi")]);
    expect(options.map(({ value, group, index }) => [value, group, index])).toEqual([
      ["a", "", 0],
      ["o", "Citrus", 1],
      ["Lemon", "Citrus", 2],
      ["Kiwi", "", 3],
    ]);
  });

  it("trims the label, and falls back to it for a missing value but not for an empty one", () => {
    const [spaced, empty] = comboboxOptions([option("\n  Apple \n"), option("  None ", { value: "" })]);
    expect(spaced).toMatchObject({ value: "Apple", label: "Apple" });
    expect(empty).toMatchObject({ value: "", label: "None" });
  });

  it("ignores text, other elements and children of another region", () => {
    const children = [text("loose"), { tag: "span", attrs: {}, text: "x", slot: "default", children: [] }, option("Label", { slot: "label" }), option("Kept")];
    expect(comboboxOptions(children).map((each) => each.value)).toEqual(["Kept"]);
  });
});

describe("resolveValue()", () => {
  const options = comboboxOptions([...FRUIT, option("Date", { value: "d", selected: "" })]);

  it("takes the value attribute when it names an enabled option", () => {
    expect(resolveValue({ value: "b" }, options)).toBe("b");
  });

  it("ignores a value attribute that names a disabled or missing option", () => {
    expect(resolveValue({ value: "c" }, options)).toBe("d");
    expect(resolveValue({ value: "zzz" }, options)).toBe("d");
  });

  it("falls back to the first enabled selected option", () => {
    const marked = comboboxOptions([option("A", { value: "a", selected: "", disabled: "" }), option("B", { value: "b", selected: "" }), option("C", { value: "c", selected: "" })]);
    expect(resolveValue({}, marked)).toBe("b");
  });

  it("is empty when nothing resolves", () => {
    expect(resolveValue({}, comboboxOptions(FRUIT))).toBe("");
    expect(resolveValue({ value: "a" }, [])).toBe("");
  });
});

describe("comboboxTemplate()", () => {
  it("wraps a nested combobox box in the field shell, the label carrying the listbox's name", () => {
    const root = comboboxTemplate({ label: "Fruit" }, ctx(FRUIT));
    expect(classesOf(root)).toEqual(["neuwo-field"]);
    const [label, box, error] = root.children.filter(isNode);
    expect(label.props).toMatchObject({ for: "c-control", id: "c-label" });
    expect(classesOf(box)).toEqual(["neuwo-combobox"]);
    expect(classesOf(error)).toEqual(["neuwo-field__error"]);
    expect(box.children.filter(isNode).map((child) => `${child.tag}.${classesOf(child).at(-1)}`)).toEqual([
      "button.neuwo-combobox__trigger",
      "span.neuwo-combobox__chevron",
      "div.neuwo-combobox__popup",
      "select.neuwo-combobox__options",
      "input.neuwo-combobox__form-value",
    ]);
  });

  it("renders a button trigger showing the selected label", () => {
    const trigger = find(comboboxTemplate({ value: "b", placeholder: "Pick", title: "Fruit", "aria-label": "Fruit" }, ctx(FRUIT)), "neuwo-combobox__trigger");
    expect(trigger.tag).toBe("button");
    expect(classesOf(trigger)).toEqual(["neuwo-input", "neuwo-combobox__trigger"]);
    expect(trigger.props).toEqual({
      class: "neuwo-input neuwo-combobox__trigger",
      type: "button",
      id: "c-control",
      title: "Fruit",
      "aria-label": "Fruit",
      role: "combobox",
      "aria-haspopup": "listbox",
      "aria-expanded": "false",
      "aria-controls": "c-listbox",
    });
    expect(toHTML(trigger.children[0])).toBe('<span class="neuwo-combobox__value">Banana</span>');
  });

  it("shows the placeholder and marks the trigger while nothing is selected", () => {
    const trigger = find(comboboxTemplate({ placeholder: "Pick" }, ctx(FRUIT)), "neuwo-combobox__trigger");
    expect(trigger.props["data-placeholder"]).toBe(true);
    expect(toHTML(trigger.children[0])).toBe('<span class="neuwo-combobox__value">Pick</span>');
    expect(toHTML(find(comboboxTemplate({}, ctx(FRUIT)), "neuwo-combobox__value"))).toBe('<span class="neuwo-combobox__value"></span>');
  });

  it("announces required on the trigger, in both modes, since the required form value is hidden from assistive technology", () => {
    for (const attrs of [{ required: "" }, { required: "", searchable: "" }]) {
      expect(find(comboboxTemplate(attrs, ctx(FRUIT)), "neuwo-combobox__trigger").props["aria-required"]).toBe("true");
    }
    expect(find(comboboxTemplate({}, ctx(FRUIT)), "neuwo-combobox__trigger").props).not.toHaveProperty("aria-required");
  });

  it("carries the size and error modifiers, the error references and disabled on the trigger", () => {
    const trigger = find(comboboxTemplate({ size: "sm", error: "Choose", disabled: "", form: "f" }, ctx(FRUIT)), "neuwo-combobox__trigger");
    expect(classesOf(trigger)).toEqual(["neuwo-input", "neuwo-input--sm", "neuwo-input--error", "neuwo-combobox__trigger"]);
    expect(trigger.props).toMatchObject({ disabled: true, form: "f", "aria-invalid": "true", "aria-describedby": "c-error" });
  });

  it("renders a text input trigger when searchable, its value the selected label", () => {
    const root = comboboxTemplate({ searchable: "", value: "a", placeholder: "Type" }, ctx(FRUIT));
    const trigger = find(root, "neuwo-combobox__trigger");
    expect(trigger.tag).toBe("input");
    expect(trigger.children).toEqual([]);
    expect(trigger.props).toMatchObject({
      type: "text",
      role: "combobox",
      "aria-haspopup": "listbox",
      "aria-expanded": "false",
      "aria-controls": "c-listbox",
      autocomplete: "off",
      "aria-autocomplete": "list",
      value: "Apple",
      placeholder: "Type",
    });
    expect(trigger.props).not.toHaveProperty("data-placeholder");
    const empty = find(comboboxTemplate({ searchable: "" }, ctx(FRUIT)), "neuwo-combobox__trigger");
    expect(empty.props).not.toHaveProperty("value");
    expect(empty.props["data-placeholder"]).toBe(true);
  });

  it("puts the listbox in a popover named by the label, with one row per option and a hidden empty row last", () => {
    const root = comboboxTemplate({ value: "b" }, ctx(FRUIT));
    const popup = find(root, "neuwo-combobox__popup");
    expect(popup.props).toEqual({ class: "neuwo-combobox__popup", popover: "auto", id: "c-popup" });
    const listbox = find(popup, "neuwo-combobox__listbox");
    expect(listbox.tag).toBe("ul");
    expect(listbox.props).toMatchObject({ role: "listbox", id: "c-listbox", "aria-labelledby": "c-label" });
    expect(toHTML(listbox)).toBe(
      '<ul class="neuwo-combobox__listbox" role="listbox" id="c-listbox" aria-labelledby="c-label">' +
        '<li class="neuwo-combobox__option" id="c-option-0" role="option" data-value="a" data-index="0" aria-selected="false">Apple</li>' +
        '<li class="neuwo-combobox__option" id="c-option-1" role="option" data-value="b" data-index="1" aria-selected="true">Banana</li>' +
        '<li class="neuwo-combobox__option" id="c-option-2" role="option" data-value="c" data-index="2" aria-selected="false" aria-disabled="true">Cherry</li>' +
        '<li class="neuwo-combobox__empty" role="presentation" hidden="">No matches</li>' +
        "</ul>",
    );
  });

  it("renders a group as a labelled role=group item holding its options as div rows", () => {
    const children = [option("Apple", { value: "a" }), optgroup("Citrus", [option("Orange", { value: "o", selected: "" }), option("Lemon", { value: "l" })])];
    const listbox = find(comboboxTemplate({}, ctx(children)), "neuwo-combobox__listbox");
    const [group] = findAll(listbox, "neuwo-combobox__group-item");
    expect(toHTML(group)).toBe(
      '<li class="neuwo-combobox__group-item" role="group" aria-labelledby="c-group-1">' +
        '<div class="neuwo-combobox__group" id="c-group-1">Citrus</div>' +
        '<div class="neuwo-combobox__option" id="c-option-1" role="option" data-value="o" data-index="1" aria-selected="true">Orange</div>' +
        '<div class="neuwo-combobox__option" id="c-option-2" role="option" data-value="l" data-index="2" aria-selected="false">Lemon</div>' +
        "</li>",
    );
    expect(listbox.children.filter(isNode).map((child) => classesOf(child)[0])).toEqual(["neuwo-combobox__option", "neuwo-combobox__group-item", "neuwo-combobox__empty"]);
  });

  it("keeps the author's options in a hidden select, the default region's wrapper", () => {
    const select = find(comboboxTemplate({}, ctx(FRUIT)), "neuwo-combobox__options");
    expect(select.props).toEqual({ class: "neuwo-combobox__options", hidden: true, tabindex: "-1", "aria-hidden": "true" });
    expect(select.children).toEqual([{ region: "default" }]);
  });

  it("marks a visually hidden native input as the form control, carrying the resolved value", () => {
    const children = [option("Apple", { value: "a" }), option("Banana", { value: "b", selected: "" })];
    const value = find(comboboxTemplate({ name: "fruit", required: "", disabled: "", form: "f" }, ctx(children)), "neuwo-combobox__form-value");
    expect(value.control).toBe(true);
    expect(value.props).toEqual({
      class: "neuwo-combobox__form-value",
      type: "text",
      tabindex: "-1",
      "aria-hidden": "true",
      autocomplete: "off",
      name: "fruit",
      value: "b",
      required: true,
      disabled: true,
      form: "f",
    });
    expect(find(comboboxTemplate({}, ctx(FRUIT)), "neuwo-combobox__form-value").props.value).toBe("");
  });
});
