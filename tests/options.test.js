import { describe, expect, it } from "vitest";
import { readOptions, resolveValue } from "../src/components/fields/options.js";

const text = (value, slot = "default") => ({ tag: null, attrs: {}, text: value, slot });
const option = (label, attrs = {}) => ({ tag: "option", attrs, text: label, slot: attrs.slot ?? "default", children: [text(label)] });
const optgroup = (label, children) => ({ tag: "optgroup", attrs: { label }, text: children.map((child) => child.text).join(""), slot: "default", children });

const FRUIT = [option("Apple", { value: "a" }), option("Banana", { value: "b" }), option("Cherry", { value: "c", disabled: "" })];

describe("readOptions()", () => {
  it("reads flat options with their value, label, flags and running index", () => {
    expect(readOptions([option("Apple", { value: "a" }), option("Banana", { value: "b", selected: "", disabled: "" })])).toEqual([
      { value: "a", label: "Apple", disabled: false, selected: false, group: "", index: 0 },
      { value: "b", label: "Banana", disabled: true, selected: true, group: "", index: 1 },
    ]);
  });

  it("gives an optgroup's options its label as the group, the index running across every option", () => {
    const options = readOptions([option("Apple", { value: "a" }), optgroup("Citrus", [option("Orange", { value: "o" }), text("\n"), option("Lemon")]), option("Kiwi")]);
    expect(options.map(({ value, group, index }) => [value, group, index])).toEqual([
      ["a", "", 0],
      ["o", "Citrus", 1],
      ["Lemon", "Citrus", 2],
      ["Kiwi", "", 3],
    ]);
  });

  it("trims the label, and falls back to it for a missing value but not for an empty one", () => {
    const [spaced, empty] = readOptions([option("\n  Apple \n"), option("  None ", { value: "" })]);
    expect(spaced).toMatchObject({ value: "Apple", label: "Apple" });
    expect(empty).toMatchObject({ value: "", label: "None" });
  });

  it("ignores text, other elements and children of another region", () => {
    const children = [text("loose"), { tag: "span", attrs: {}, text: "x", slot: "default", children: [] }, option("Label", { slot: "label" }), option("Kept")];
    expect(readOptions(children).map((each) => each.value)).toEqual(["Kept"]);
  });
});

describe("resolveValue()", () => {
  const options = readOptions([...FRUIT, option("Date", { value: "d", selected: "" })]);

  it("takes the value attribute when it names an enabled option", () => {
    expect(resolveValue({ value: "b" }, options)).toBe("b");
  });

  it("ignores a value attribute that names a disabled or missing option", () => {
    expect(resolveValue({ value: "c" }, options)).toBe("d");
    expect(resolveValue({ value: "zzz" }, options)).toBe("d");
  });

  it("falls back to the first enabled selected option", () => {
    const marked = readOptions([option("A", { value: "a", selected: "", disabled: "" }), option("B", { value: "b", selected: "" }), option("C", { value: "c", selected: "" })]);
    expect(resolveValue({}, marked)).toBe("b");
  });

  it("is empty when nothing resolves", () => {
    expect(resolveValue({}, readOptions(FRUIT))).toBe("");
    expect(resolveValue({ value: "a" }, [])).toBe("");
  });
});
