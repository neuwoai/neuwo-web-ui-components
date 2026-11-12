// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { BUILT, staleness } from "./setup/dist.js";

let roots = [];
afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots = [];
});

/** @param {Record<string, number>} files - each path and its age in seconds */
function project(files) {
  const root = mkdtempSync(join(tmpdir(), "neuwo-dist-"));
  roots.push(root);
  const now = Date.now() / 1000;
  for (const [file, age] of Object.entries(files)) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "");
    utimesSync(path, now - age, now - age);
  }
  return root;
}

const built = (age) => Object.fromEntries([...BUILT, "components/badge/badge.css"].map((file) => [`dist/${file}`, age]));

describe("dist freshness before the tests", () => {
  it("is current when every built file is newer than every source", () => {
    const root = project({ "src/index.js": 60, "scripts/build.js": 60, "custom-elements-manifest.config.js": 60, ...built(10) });
    expect(staleness(root)).toBeNull();
  });

  it("builds when there is no dist", () => {
    expect(staleness(project({ "src/index.js": 60 }))).toBe("dist/neuwo.js is missing");
  });

  it("builds when a build step left its output out", () => {
    const files = built(10);
    delete files["dist/index.d.ts"];
    expect(staleness(project({ "src/index.js": 60, ...files }))).toBe("dist/index.d.ts is missing");
  });

  it.each(["src/components/badge/badge.css", "scripts/light-css.js", "custom-elements-manifest.config.js"])(
    "builds when %s is newer than the oldest built file",
    (source) => {
      const root = project({ "src/index.js": 60, ...built(10), "dist/neuwo.css": 30, [source]: 20 });
      expect(staleness(root)).toBe(`${source} is newer than dist`);
    },
  );
});
