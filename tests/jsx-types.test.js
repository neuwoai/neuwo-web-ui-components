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
    expect(block("neuwo-textarea")).toContain("rows?: number;");
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
