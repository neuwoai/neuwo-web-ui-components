import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { distFile } from "./setup/dist.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const { name, version, files } = JSON.parse(read("package.json"));
const [major, minor] = version.split(".");
const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("release", () => {
  it("the first versioned CHANGELOG heading is the package version", () => {
    const heading = read("CHANGELOG.md").match(/^## \d+\.\d+\.\d+.*$/m);
    expect(heading?.[0]).toBe(`## ${version}`);
  });

  it("every README CDN URL names a built file at the package's minor version", () => {
    const pattern = new RegExp(`cdn\\.jsdelivr\\.net/npm/${escaped}@([^/\\s]+)/([^\\s"'<>)\`]+)`, "g");
    const urls = [...read("README.md").matchAll(pattern)];
    expect(urls.length).toBeGreaterThan(0);
    for (const [url, tag, path] of urls) {
      expect(tag, url).toBe(`${major}.${minor}`);
      if (path.startsWith("dist/")) {
        expect(() => distFile(path.slice("dist/".length)), url).not.toThrow();
      } else {
        expect(files, url).toContain(path);
        expect(existsSync(join(root, path)), url).toBe(true);
      }
    }
  });
});
