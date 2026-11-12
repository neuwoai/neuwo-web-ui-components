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
const CDN = "https://cdn.jsdelivr.net/npm/";

/**
 * @param {string} text
 * @returns {{ urls: number, problems: string[] }}
 */
function checkCdnUrls(text) {
  const pattern = new RegExp(`cdn\\.jsdelivr\\.net/npm/${escaped}(?![\\w.-])[^\\s"'<>)\`]*`, "g");
  const urls = [...text.matchAll(pattern)];
  const problems = [];
  for (const [url] of urls) {
    const versioned = url.slice(url.indexOf(name) + name.length).match(/^@([^/?#]+)\/([^?#]*)/);
    const path = versioned?.[2].replace(/\/?\+esm$/, "") ?? "";
    if (versioned?.[1] !== `${major}.${minor}`) problems.push(`${url}: not at @${major}.${minor}/`);
    else if (!path) problems.push(`${url}: names no file`);
    else if (path.startsWith("dist/")) {
      try {
        distFile(path.slice("dist/".length));
      } catch {
        problems.push(`${url}: no such built file`);
      }
    } else if (!files.includes(path) || !existsSync(join(root, path))) problems.push(`${url}: not a published file`);
  }
  return { urls: urls.length, problems };
}

describe("release", () => {
  it("the first versioned CHANGELOG heading is the package version", () => {
    const heading = read("CHANGELOG.md").match(/^## \d+\.\d+\.\d+.*$/m);
    expect(heading?.[0]).toBe(`## ${version}`);
  });

  it("every README CDN URL names a built file at the package's minor version", () => {
    const { urls, problems } = checkCdnUrls(read("README.md"));
    expect(urls).toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });

  it("the CDN URL check refuses a URL without the minor version or a file, and reads past `+esm`, a query and a fragment", () => {
    const at = `${CDN}${name}@${major}.${minor}`;
    const bad = [`${CDN}${name}/dist/neuwo.js`, `${CDN}${name}@${major}.${minor}`, `${CDN}${name}@${version}/dist/neuwo.js`, `${at}/dist/missing.js`];
    for (const url of bad) expect(checkCdnUrls(`<script src="${url}"></script>`).problems, url).toHaveLength(1);
    const good = [`${at}/dist/neuwo.js/+esm`, `${at}/dist/neuwo.css?v=1`, `${at}/dist/neuwo-components.css#top`];
    for (const url of good) expect(checkCdnUrls(`<link href="${url}" />`), url).toEqual({ urls: 1, problems: [] });
    expect(checkCdnUrls(`${CDN}${name}-extra@${major}.${minor}/dist/neuwo.js`).urls).toBe(0);
  });
});
