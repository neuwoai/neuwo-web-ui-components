import { execSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCES = ["src", "scripts", "custom-elements-manifest.config.js"];

/** One output of each step of `npm run build`: the bundles, the declarations and the JSX types. */
export const BUILT = ["neuwo.js", "index.d.ts", "types/jsx-elements.d.ts"];

/** @param {string} path */
const filesIn = (path) =>
  statSync(path).isDirectory()
    ? readdirSync(path, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => join(entry.parentPath, entry.name))
    : [path];

/** @param {string} path */
const modified = (path) => statSync(path).mtimeMs;

/**
 * Why `dist` must be built before the tests read it, or null when it is current: a build step's output is
 * missing, or a source is newer than the oldest built file.
 * @param {string} root
 * @returns {string | null}
 */
export function staleness(root) {
  const missing = BUILT.find((file) => !existsSync(join(root, "dist", file)));
  if (missing) return `dist/${missing} is missing`;
  const built = Math.min(...filesIn(join(root, "dist")).map(modified));
  const newer = SOURCES.map((source) => join(root, source))
    .filter((path) => existsSync(path))
    .flatMap(filesIn)
    .find((file) => modified(file) > built);
  return newer ? `${relative(root, newer)} is newer than dist` : null;
}

/**
 * The path of a built file. The test setup builds `dist` when it is stale, so a missing file means the build failed.
 * @param {string} file
 * @returns {string}
 */
export function distFile(file) {
  const path = join(ROOT, "dist", file);
  if (!existsSync(path)) throw new Error(`dist/${file} is missing: run npm run build`);
  return path;
}

export default function setup() {
  const reason = staleness(ROOT);
  if (!reason) return;
  console.log(`Building dist before the tests, as ${reason}.`);
  execSync("npm run build", { cwd: ROOT, stdio: "pipe" });
}
