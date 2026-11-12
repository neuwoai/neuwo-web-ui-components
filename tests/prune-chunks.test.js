// @vitest-environment node
import { afterEach, beforeEach, expect, it } from "vitest";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pruneChunks } from "../scripts/prune-chunks.js";

let dir;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "prune-"));
  for (const file of ["chunk-OLD.js", "chunk-NEW.js", "neuwo.js", "notes.txt", "chunk-OLD.js.map"]) writeFileSync(join(dir, file), "");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

it("removes a chunk the build no longer names and returns it", () => {
  expect(pruneChunks(dir, [join(dir, "chunk-NEW.js"), join(dir, "neuwo.js")])).toEqual(["chunk-OLD.js"]);
  expect(existsSync(join(dir, "chunk-OLD.js"))).toBe(false);
});

it("keeps the current chunks and everything that is not a chunk", () => {
  pruneChunks(dir, [join(dir, "chunk-NEW.js")]);
  expect(readdirSync(dir).sort()).toEqual(["chunk-NEW.js", "chunk-OLD.js.map", "neuwo.js", "notes.txt"]);
});
