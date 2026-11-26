import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { distFile } from "./setup/dist.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

describe("published declarations", () => {
  it("name no any type", () => {
    distFile("index.d.ts");
    const declarations = readdirSync(dist, { recursive: true }).filter((file) => String(file).endsWith(".d.ts"));
    expect(declarations.length).toBeGreaterThan(0);
    for (const file of declarations) {
      const code = readFileSync(join(dist, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(code, String(file)).not.toMatch(/\bany\b/);
    }
  });

  it("compile on their own with library checking on", () => {
    distFile("index.d.ts");
    const tsc = join(root, "node_modules/typescript/bin/tsc");
    let report = "";
    try {
      execFileSync(process.execPath, [tsc, "-p", join(root, "tests/dist-types/tsconfig.json")], { cwd: root, encoding: "utf8", stdio: "pipe" });
    } catch (error) {
      report = String(error.stdout || error.message);
    }
    expect(report).toBe("");
  }, 60000);

  it("include, of the hand-authored ones, only the tag map", () => {
    distFile("types/elements.d.ts");
    for (const file of readdirSync(join(root, "src/types"))) {
      expect(existsSync(join(dist, "types", file)), file).toBe(file === "elements.d.ts");
    }
  });

  it("leave out the sidebar's remember script, which declares nothing", () => {
    distFile("index.d.ts");
    expect(existsSync(join(dist, "components/sidebar/remember.snippet.d.ts"))).toBe(false);
  });

  it("the server entry publishes only its two functions", () => {
    const code = readFileSync(distFile("server/index.d.ts"), "utf8");
    const names = [...code.matchAll(/export\s+(?:declare\s+)?(?:function|const|type|interface|class)\s+(\w+)/g)].map((match) => match[1]);
    const listed = [...code.matchAll(/export\s*\{([^}]*)\}/g)].flatMap((match) => match[1].split(",").map((part) => part.trim().split(/\s+as\s+/).pop()).filter(Boolean));
    expect([...names, ...listed].sort()).toEqual(["eleventyPlugin", "expand"]);
    for (const word of ["Page", "Foreign", "renderElement"]) expect(code).not.toMatch(new RegExp(`\\b${word}\\b`));
  });
});
