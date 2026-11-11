import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { jsxElementsTypes, jsxRuntimeTypes } from "../scripts/jsx-types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(__dirname, "../custom-elements.json"), "utf8"));
const types = jsxElementsTypes(manifest);

function block(tag) {
  const start = types.indexOf(`"${tag}": NeuwoElementProps<`);
  expect(start, `${tag} is declared`).toBeGreaterThan(-1);
  return types.slice(start, types.indexOf("}>;", start));
}

describe("JSX types", () => {
  it("augments React's own JSX namespace", () => {
    expect(types).toContain('declare module "react"');
    expect(types).toContain("interface IntrinsicElements");
  });

  it("declares every element in the manifest, typed by its class", () => {
    const elements = manifest.modules
      .flatMap((m) => m.declarations ?? [])
      .filter((d) => d.tagName);
    expect(elements.length).toBeGreaterThan(0);
    for (const { tagName, name } of elements) {
      expect(types).toContain(`"${tagName}": NeuwoElementProps<${name},`);
    }
  });

  it("turns an enum attribute into a union of string literals", () => {
    expect(block("neuwo-button")).toContain('variant?: "solid" | "outline" | "glass";');
  });

  it("accepts a numeric enum value as a number or a string", () => {
    expect(block("neuwo-cta")).toContain('"heading-level"?: 1 | "1" | 2 | "2" | 3 | "3" | 4 | "4" | 5 | "5" | 6 | "6";');
  });

  it("keeps boolean and number attributes as such", () => {
    expect(block("neuwo-button")).toContain("disabled?: boolean;");
    const generated = jsxElementsTypes({ modules: [{ declarations: [{ kind: "class", name: "Counted", tagName: "x-counted", attributes: [{ name: "count", type: { text: "number" } }] }] }] });
    expect(generated).toContain("count?: number;");
  });

  it("types a union of primitive types as those types, not as string literals", () => {
    const generated = jsxElementsTypes({ modules: [{ declarations: [{ kind: "class", name: "Bounded", tagName: "x-bounded", attributes: [{ name: "min", type: { text: "string | number" } }] }] }] });
    expect(generated).toContain("min?: string | number;");
    expect(generated).not.toContain('"string"');
  });

  it("takes a field's numeric attributes as a string or a number, as React's own fields do", () => {
    const input = block("neuwo-input");
    for (const name of ["min", "max", "step", "minlength", "maxlength"]) expect(input).toContain(`${name}?: string | number;`);
    const range = block("neuwo-range");
    for (const name of ["min", "max", "step"]) expect(range).toContain(`${name}?: string | number;`);
    const textarea = block("neuwo-textarea");
    for (const name of ["rows", "minlength", "maxlength"]) expect(textarea).toContain(`${name}?: string | number;`);
  });

  it("types an attribute with no declared type as a string", () => {
    expect(block("neuwo-copy")).toContain('"copied-label"?: string;');
  });

  it("binds a custom event by its exact lower-case name", () => {
    expect(block("neuwo-copy")).toContain("oncopied?: (event: CustomEvent<{ text: string }>) => void;");
    expect(block("neuwo-notice")).toContain("ondismiss?: (event: CustomEvent) => void;");
  });

  it("gives a field with a value and a change event React's form props, typing the target as the element", () => {
    const input = block("neuwo-input");
    expect(input).toContain("value?: string | number;");
    expect(input).toContain("defaultValue?: string | number;");
    expect(input).toContain("onChange?: React.ChangeEventHandler<NeuwoInput>;");
    expect(input.match(/\bvalue\?:/g)).toHaveLength(1);
    expect(types).toContain('import type * as React from "react";');
  });

  it("reads a value and a change event whether declared or inherited", () => {
    const declaration = (name, attributes, events) => ({ kind: "class", name, tagName: name.toLowerCase(), attributes, events });
    const inherited = { name: "Base", module: "base.js" };
    const generated = jsxElementsTypes({
      modules: [
        {
          declarations: [
            declaration("Own", [{ name: "value" }], [{ name: "change", type: { text: "Event" } }]),
            declaration("Inherited", [{ name: "value", inheritedFrom: inherited }], [{ name: "change", type: { text: "Event" }, inheritedFrom: inherited }]),
            declaration("Plain", [{ name: "value" }], []),
          ],
        },
      ],
    });
    expect(generated).toContain("onChange?: React.ChangeEventHandler<Own>;");
    expect(generated).toContain("onChange?: React.ChangeEventHandler<Inherited>;");
    expect(generated).not.toContain("React.ChangeEventHandler<Plain>");
  });

  it("gives a checkable element React's checkbox props, typing the target as the element, and refuses defaultValue", () => {
    for (const [tag, name] of [["neuwo-checkbox", "NeuwoCheckbox"], ["neuwo-toggle", "NeuwoToggle"]]) {
      const props = block(tag);
      expect(props).toContain("checked?: boolean;");
      expect(props).toContain("defaultChecked?: boolean;");
      expect(props).toContain(`onChange?: React.ChangeEventHandler<${name}>;`);
      expect(props).toContain("defaultValue?: never;");
      expect(props).not.toMatch(/defaultValue\?: string/);
      expect(props.match(/\bchecked\?:/g)).toHaveLength(1);
      expect(props.match(/\bonChange\?:/g)).toHaveLength(1);
    }
  });

  it("gives the radio React's checkbox props and none of the error line's", () => {
    const props = block("neuwo-radio");
    for (const line of [
      "name?: string;",
      "value?: string | number;",
      "checked?: boolean;",
      "disabled?: boolean;",
      "form?: string;",
      "required?: boolean;",
      "defaultChecked?: boolean;",
      "defaultValue?: never;",
      "onChange?: React.ChangeEventHandler<NeuwoRadio>;",
    ])
      expect(props).toContain(line);
    expect(props).not.toMatch(/error/);
  });

  it("gives the radio group a value, a defaultValue and an onChange, and no checked", () => {
    const props = block("neuwo-radio-group");
    for (const line of [
      "name?: string;",
      "value?: string | number;",
      "defaultValue?: string | number;",
      "onChange?: React.ChangeEventHandler<NeuwoRadioGroup>;",
      'orientation?: "horizontal" | "vertical";',
      "form?: string;",
      "label?: string;",
      "required?: boolean;",
      "disabled?: boolean;",
      "error?: string;",
      '"error-muted"?: boolean;',
      '"no-error-line"?: boolean;',
    ])
      expect(props).toContain(line);
    expect(props).not.toMatch(/checked/i);
  });

  it("gives the segmented control a value, a defaultValue, an onChange and a form, and no orientation or checked", () => {
    const props = block("neuwo-segmented");
    for (const line of [
      "name?: string;",
      "value?: string | number;",
      "defaultValue?: string | number;",
      "onChange?: React.ChangeEventHandler<NeuwoSegmented>;",
      "form?: string;",
      "label?: string;",
      "required?: boolean;",
      "disabled?: boolean;",
      "error?: string;",
      '"error-muted"?: boolean;',
      '"no-error-line"?: boolean;',
    ])
      expect(props).toContain(line);
    expect(props).not.toMatch(/orientation|checked/i);
  });

  it("reads a checked attribute whatever its declared type, with or without a change event", () => {
    const generated = jsxElementsTypes({
      modules: [
        {
          declarations: [
            { kind: "class", name: "Check", tagName: "x-check", attributes: [{ name: "checked" }, { name: "value" }], events: [{ name: "change", type: { text: "Event" } }] },
            { kind: "class", name: "Lone", tagName: "x-lone", attributes: [{ name: "checked", type: { text: "boolean" } }] },
          ],
        },
      ],
    });
    expect(generated).toContain("checked?: boolean;");
    expect(generated).not.toContain("checked?: string;");
    expect(generated).toContain("onChange?: React.ChangeEventHandler<Check>;");
    expect(generated).toContain("onChange?: React.ChangeEventHandler<Lone>;");
    expect(generated).not.toContain("defaultValue?: string | number;");
  });

  it("leaves an element with a value but no change event to React's own props", () => {
    const button = block("neuwo-button");
    expect(button).toContain("value?: string;");
    expect(button).not.toContain("defaultValue");
    expect(button).not.toContain("onChange");
  });

  it("leaves native events to React's own handlers", () => {
    expect(types).not.toMatch(/\bonchange\?/);
    expect(types).not.toMatch(/\boninput\?/);
    expect(types).not.toContain("onundefined");
  });

  it("re-exports the production runtime with the element types attached", () => {
    const runtime = jsxRuntimeTypes("jsx-runtime");
    expect(runtime).toContain('import "./jsx-elements.js";');
    expect(runtime).toContain('export { Fragment, jsx, jsxs } from "react/jsx-runtime";');
    expect(runtime).toContain('export type { JSX } from "react/jsx-runtime";');
  });

  it("re-exports the development runtime with jsxDEV", () => {
    const runtime = jsxRuntimeTypes("jsx-dev-runtime");
    expect(runtime).toContain('export { Fragment, jsxDEV } from "react/jsx-dev-runtime";');
    expect(runtime).toContain('export type { JSX } from "react/jsx-dev-runtime";');
  });
});
