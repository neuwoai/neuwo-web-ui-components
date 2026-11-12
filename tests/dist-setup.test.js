// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import setup, { BUILT, buildIfStale, staleness } from "./setup/dist.js";

let roots = [];
afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots = [];
  vi.restoreAllMocks();
});

const now = () => Date.now() / 1000;

/**
 * @param {Record<string, number>} files - each path and its age in seconds
 * @param {Record<string, number>} [folders] - the age of a folder, where it is not a minute
 */
function project(files, folders = {}) {
  const root = mkdtempSync(join(tmpdir(), "neuwo-dist-"));
  roots.push(root);
  for (const [file, age] of Object.entries(files)) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "");
    utimesSync(path, now() - age, now() - age);
  }
  for (const entry of readdirSync(root, { recursive: true, withFileTypes: true }).filter((each) => each.isDirectory())) {
    const path = join(entry.parentPath, entry.name);
    const age = folders[path.slice(root.length + 1)] ?? 60;
    utimesSync(path, now() - age, now() - age);
  }
  return root;
}

const built = (age) => Object.fromEntries([...BUILT, "components/badge/badge.css"].map((file) => [`dist/${file}`, age]));
const SOURCES = { "src/index.js": 60, "src/components/badge/badge.css": 60, "scripts/build.js": 60, "custom-elements-manifest.config.js": 60, "tsconfig.json": 60, "package.json": 60 };
const node = (code) => `"${process.execPath}" -e "${code}"`;

describe("dist freshness before the tests", () => {
  it("is current when every built file is newer than every source", () => {
    expect(staleness(project({ ...SOURCES, ...built(10) }))).toBeNull();
  });

  it("builds when there is no dist", () => {
    expect(staleness(project({ "src/index.js": 60 }))).toBe("dist/neuwo.js is missing");
  });

  it("builds when a build step left its output out", () => {
    const files = built(10);
    delete files["dist/index.d.ts"];
    expect(staleness(project({ "src/index.js": 60, ...files }))).toBe("dist/index.d.ts is missing");
  });

  it.each(["src/components/badge/badge.css", "scripts/light-css.js", "custom-elements-manifest.config.js", "tsconfig.json", "package.json"])(
    "builds when %s is newer than the oldest built file",
    (source) => {
      const root = project({ ...SOURCES, ...built(10), "dist/neuwo.css": 30, [source]: 20 });
      expect(staleness(root)).toBe(`${source} is newer than dist`);
    },
  );

  it("builds when a source folder is newer than the oldest built file, as a deleted or renamed file leaves it", () => {
    const root = project({ ...SOURCES, ...built(10) }, { "src/components/badge": 5 });
    expect(staleness(root)).toBe("src/components/badge is newer than dist");
  });
});

describe("building dist before the tests", () => {
  it("runs nothing when dist is current", () => {
    expect(() => buildIfStale(project({ ...SOURCES, ...built(10) }), node("process.exit(1)"))).not.toThrow();
  });

  it("rethrows a failed build with what it printed on both streams", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const failing = node("process.stdout.write(['error', 'TS2322'].join(' ')); process.stderr.write(['npm error', 'code 2'].join(' ')); process.exit(2)");
    expect(() => buildIfStale(project({ "src/index.js": 60 }), failing)).toThrow(/error TS2322[\s\S]*npm error code 2/);
  });

  it("builds again before a rerun when a source changed after the first run", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const root = project({ ...SOURCES, ...built(10) });
    const handlers = [];
    setup({ onTestsRerun: (handler) => handlers.push(handler) }, root, node("require('fs').writeFileSync('built', '')"));
    expect(existsSync(join(root, "built"))).toBe(false);
    expect(handlers).toHaveLength(1);
    utimesSync(join(root, "src/index.js"), now(), now());
    handlers[0]();
    expect(existsSync(join(root, "built"))).toBe(true);
  });
});
