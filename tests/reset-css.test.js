import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { templates } from "../src/templates.js";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/components/reset.css"), "utf8");

describe("components reset", () => {
  it("scopes every rule to exactly the elements that have a template", () => {
    const lists = Array.from(css.matchAll(/^:where\(([^)]*)\)/gm), ([, list]) => list.split(",").map((tag) => tag.trim()));
    expect(lists.length).toBeGreaterThan(0);
    for (const list of lists) expect(list).toEqual(Object.keys(templates).sort());
  });
});
