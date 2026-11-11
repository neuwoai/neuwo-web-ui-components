import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = existsSync(join(root, "dist/jsx-runtime.react-server.js"));

const importsOf = (file) =>
  [...readFileSync(join(root, "dist", file), "utf8").matchAll(/(?:\bfrom|\bimport)\s*"([^"]+)"/g)].map((match) => match[1]).sort();

describe("built JSX runtimes", () => {
  for (const [file, own] of [
    ["jsx-runtime.js", "react/jsx-runtime"],
    ["jsx-runtime.react-server.js", "react/jsx-runtime"],
    ["jsx-dev-runtime.js", "react/jsx-dev-runtime"],
    ["jsx-dev-runtime.react-server.js", "react/jsx-dev-runtime"],
  ]) {
    it.runIf(built)(`imports only its own React runtime: ${file}`, () => {
      expect([...new Set(importsOf(file))]).toEqual(["react", own].sort());
    });
  }
});
