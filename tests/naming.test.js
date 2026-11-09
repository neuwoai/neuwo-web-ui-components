import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const src = join(dirname(fileURLToPath(import.meta.url)), "../src");
const allCss = readdirSync(src, { recursive: true }).filter((file) => file.endsWith(".css"));
const read = (file) => readFileSync(join(src, file), "utf8");

describe("custom property naming", () => {
  it("declares every custom property with exactly one neuwo- prefix", () => {
    expect(allCss.length).toBeGreaterThan(0);
    for (const file of allCss) {
      for (const [, name] of read(file).matchAll(/(?<![\w-])--([a-z0-9-]+)\s*:/g)) {
        expect(name, `${file}: --${name}`).toMatch(/^neuwo-(?!neuwo-)/);
      }
    }
  });
});
