import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { templates } from "../src/templates.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "tests/fixtures/flight-render.mjs");

describe("JSX runtime in React Server Components", () => {
  it.runIf(existsSync(join(root, "dist/jsx-runtime.react-server.js")))(
    "renders every light element through jsx and jsxDEV with no error",
    () => {
      const blocks = Object.fromEntries(
        Object.entries(templates).map(([tag, template]) => [tag, String(template({}, { id: (suffix) => suffix, children: [] }).props.class).split(" ")[0]]),
      );
      const out = execFileSync(process.execPath, ["--conditions=react-server", script, JSON.stringify(blocks)], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      const classes = Object.values(blocks);
      expect(classes).toContain("neuwo-btn");
      expect(JSON.parse(out)).toEqual({ jsx: classes, jsxDEV: classes });
    },
  );
});
