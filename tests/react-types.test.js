import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { reactTypes } from "../scripts/react-types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(__dirname, "../custom-elements.json"), "utf8"));
const types = reactTypes(manifest);

function block(tag) {
  const start = types.indexOf(`"${tag}": NeuwoElementProps<`);
  expect(start, `${tag} is declared`).toBeGreaterThan(-1);
  return types.slice(start, types.indexOf("}>;", start));
}

describe("React JSX types", () => {
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

  it("leaves native events to React's own handlers", () => {
    expect(types).not.toMatch(/\bonchange\?/);
    expect(types).not.toMatch(/\boninput\?/);
    expect(types).not.toContain("onundefined");
  });
});
