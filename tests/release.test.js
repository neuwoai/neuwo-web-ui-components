import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { distFile } from "./setup/dist.js";
import { templates } from "../src/templates.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const { name, version, files, repository } = JSON.parse(read("package.json"));
const [major, minor] = version.split(".");
const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const CDN = "https://cdn.jsdelivr.net/npm/";
const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20, thirty: 30 };
/** @param {string} words */
const numberOf = (words) => words.split("-").reduce((sum, word) => sum + NUMBER_WORDS[word], 0);

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
  it("every count of the elements in the README is the number the library registers", () => {
    const counts = [...read("README.md").matchAll(/\ball ([a-z]+(?:-[a-z]+)?) elements\b/g)].map(([, words]) => numberOf(words));
    expect(counts.length).toBeGreaterThan(0);
    for (const count of counts) expect(count).toBe(Object.keys(templates).length);
  });

  it("the first versioned CHANGELOG heading is the package version", () => {
    const heading = read("CHANGELOG.md").match(/^## \d+\.\d+\.\d+.*$/m);
    expect(heading?.[0]).toBe(`## ${version}`);
  });

  it("every example's library range is the package's minor version", () => {
    const examples = readdirSync(join(root, "demo"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(root, "demo", entry.name, "package.json")))
      .map((entry) => entry.name);
    expect(examples.length).toBeGreaterThan(0);
    for (const example of examples) {
      const manifest = JSON.parse(read(`demo/${example}/package.json`));
      expect(manifest.dependencies?.[name], example).toBe(`^${major}.${minor}.0`);
    }
  });

  it("every example README's library range and tarball name match the package version", () => {
    const readmes = readdirSync(join(root, "demo"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(root, "demo", entry.name, "README.md")))
      .map((entry) => `demo/${entry.name}/README.md`);
    expect(readmes.length).toBeGreaterThan(0);
    const tarball = name.replace(/^@/, "").replace("/", "-");
    const problems = [];
    for (const readme of readmes) {
      const text = read(readme);
      const ranges = [...text.matchAll(new RegExp(`"${escaped}": "\\^(\\d+\\.\\d+\\.\\d+)"`, "g"))].map(([, range]) => range);
      const tarballs = [...text.matchAll(new RegExp(`${tarball}-(\\d+\\.\\d+\\.\\d+)\\.tgz`, "g"))].map(([, found]) => found);
      if (ranges.length === 0) problems.push(`${readme}: no library range`);
      if (tarballs.length === 0) problems.push(`${readme}: no tarball name`);
      for (const range of ranges) if (range !== `${major}.${minor}.0`) problems.push(`${readme}: range ^${range}`);
      for (const found of tarballs) if (found !== version) problems.push(`${readme}: tarball ${found}`);
    }
    expect(problems).toEqual([]);
  });

  it("the lockfile's top-level version fields are the package version", () => {
    const lock = JSON.parse(read("package-lock.json"));
    expect({ version: lock.version, root: lock.packages[""].version }).toEqual({ version, root: version });
  });

  it("every README link into the repository is absolute, at the release tag, and names a path that exists here", () => {
    const repo = repository.url.replace(/^git\+/, "").replace(/\.git$/, "");
    const targets = [...read("README.md").matchAll(/\]\(([^)\s]+)\)/g)].map(([, target]) => target);
    expect(targets.filter((target) => !/^(https?:|mailto:|#)/.test(target))).toEqual([]);
    const intoRepo = targets.filter((target) => target.startsWith(`${repo}/`));
    expect(intoRepo.length).toBeGreaterThan(0);
    for (const target of intoRepo) {
      const ref = target.slice(repo.length).match(/^\/(?:tree|blob)\/([^/]+)\/(.+)$/);
      expect(ref?.[1], target).toBe(`v${version}`);
      expect(existsSync(join(root, ref?.[2] ?? "")), target).toBe(true);
    }
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
