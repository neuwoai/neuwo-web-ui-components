import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "../src/index.js";
import { CHANGE_TARGETS, jsxElementsTypes, jsxRuntimeTypes } from "../scripts/jsx-types.js";

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
    expect(input).toContain("onChange?: NeuwoChangeHandler<NeuwoInput, HTMLInputElement>;");
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
    expect(generated).toContain("onChange?: NeuwoChangeHandler<Own>;");
    expect(generated).toContain("onChange?: NeuwoChangeHandler<Inherited>;");
    expect(generated).not.toContain("NeuwoChangeHandler<Plain>");
  });

  it("gives a checkable element React's checkbox props, typing the target as the element, and refuses defaultValue", () => {
    for (const [tag, name] of [["neuwo-checkbox", "NeuwoCheckbox"], ["neuwo-toggle", "NeuwoToggle"]]) {
      const props = block(tag);
      expect(props).toContain("checked?: boolean;");
      expect(props).toContain("defaultChecked?: boolean;");
      expect(props).toContain(`onChange?: NeuwoChangeHandler<${name}, HTMLInputElement>;`);
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
      "onChange?: NeuwoChangeHandler<NeuwoRadio, HTMLInputElement>;",
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
      "onChange?: NeuwoChangeHandler<NeuwoRadioGroup, HTMLInputElement>;",
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
      "onChange?: NeuwoChangeHandler<NeuwoSegmented>;",
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

  it("reads a checked attribute whatever its declared type on an element with a change event, and leaves one without to React's own props", () => {
    const generated = jsxElementsTypes({
      modules: [
        {
          declarations: [
            { kind: "class", name: "Check", tagName: "x-check", attributes: [{ name: "checked" }, { name: "value" }], events: [{ name: "change", type: { text: "Event" } }] },
            { kind: "class", name: "Lone", tagName: "x-lone", attributes: [{ name: "checked", type: { text: "boolean" } }, { name: "value" }] },
          ],
        },
      ],
    });
    const of = (tag) => generated.slice(generated.indexOf(`"${tag}"`), generated.indexOf("}>;", generated.indexOf(`"${tag}"`)));
    expect(of("x-check")).toContain("checked?: boolean;");
    expect(of("x-check")).toContain("defaultChecked?: boolean;");
    expect(of("x-check")).toContain("onChange?: NeuwoChangeHandler<Check>;");
    expect(of("x-lone")).toContain("checked?: boolean;");
    expect(of("x-lone")).toContain("value?: string;");
    expect(of("x-lone")).not.toMatch(/defaultChecked|defaultValue|onChange/);
    expect(generated).not.toContain("checked?: string;");
    expect(generated).not.toContain("defaultValue?: string | number;");
  });

  it("gives the menu item, which is no form control, none of React's form props, and the form controls theirs", () => {
    const item = block("neuwo-menu-item");
    expect(item).toContain("checked?: boolean;");
    expect(item).toContain("value?: string;");
    expect(item).not.toMatch(/defaultChecked|defaultValue|onChange/);
    for (const [tag, name] of [["neuwo-checkbox", "NeuwoCheckbox"], ["neuwo-toggle", "NeuwoToggle"], ["neuwo-radio", "NeuwoRadio"]]) {
      expect(block(tag), tag).toContain(`defaultChecked?: boolean;\n        defaultValue?: never;\n        onChange?: NeuwoChangeHandler<${name}, HTMLInputElement>;`);
    }
  });

  it("binds the menu's open and select events with their details", () => {
    const menu = block("neuwo-menu");
    expect(menu).toContain("onopen?: (event: CustomEvent<{ trigger: HTMLElement | null }>) => void;");
    expect(menu).toContain("onselect?: (event: CustomEvent<{ value: string; item: NeuwoMenuItem; trigger: HTMLElement | null; checked?: boolean }>) => void;");
  });

  it("binds the sidebar's navigate event with its href, and takes remember as a flag or a storage key", () => {
    const sidebar = block("neuwo-sidebar");
    expect(sidebar).toContain("onnavigate?: (event: CustomEvent<{ href: string }>) => void;");
    expect(sidebar).toContain("remember?: boolean | string;");
    expect(block("neuwo-nav-item")).toContain("href?: string;");
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

describe("JSX change targets", () => {
  const OPTIONS = '<option value="a">A</option><option value="b">B</option>';
  const ACTIONS = {
    "neuwo-checkbox": ["", (host) => host.control.click()],
    "neuwo-toggle": ["", (host) => host.control.click()],
    "neuwo-radio": ["", (host) => host.control.click()],
    "neuwo-radio-group": ['<neuwo-radio value="a">A</neuwo-radio><neuwo-radio value="b">B</neuwo-radio>', (host) => host.querySelector("input[value=b]").click()],
    "neuwo-input": ["", (host) => host.control.dispatchEvent(new Event("change", { bubbles: true }))],
    "neuwo-range": ["", (host) => host.control.dispatchEvent(new Event("change", { bubbles: true }))],
    "neuwo-textarea": ["", (host) => host.control.dispatchEvent(new Event("change", { bubbles: true }))],
    "neuwo-combobox": [OPTIONS, (host) => (host.open(), host.querySelector('.neuwo-combobox__option[data-value="b"]').click())],
    "neuwo-segmented": [OPTIONS, (host) => host.querySelector('.neuwo-segmented__option[data-value="b"]').click()],
  };

  it("lists every element with a change event, so a new one must decide its target", () => {
    const tags = manifest.modules
      .flatMap((module) => module.declarations ?? [])
      .filter((declaration) => declaration.tagName && (declaration.events ?? []).some(({ name }) => name === "change"))
      .map((declaration) => declaration.tagName);
    expect(Object.keys(ACTIONS).sort()).toEqual(tags.sort());
  });

  for (const [tag, [children, act]] of Object.entries(ACTIONS)) {
    it(`types the target of ${tag} as the element the browser dispatches from`, () => {
      const holder = document.createElement("div");
      holder.innerHTML = `<${tag}>${children}</${tag}>`;
      document.body.append(holder);
      const host = holder.firstElementChild;
      /** @type {EventTarget | null} */
      let target = null;
      host.addEventListener("change", (event) => (target = event.target), { once: true });
      act(host);
      holder.remove();
      const typed = CHANGE_TARGETS[tag];
      if (typed) expect(target?.constructor.name).toBe(typed);
      else expect(target).toBe(host);
    });
  }
});
