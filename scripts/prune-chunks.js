import { readdirSync, rmSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * @param {string} dir
 * @param {string[]} outputs
 * @returns {string[]}
 */
export function pruneChunks(dir, outputs) {
  const kept = new Set(outputs.map((output) => basename(output)));
  const removed = readdirSync(dir).filter((file) => /^chunk-.*\.js$/.test(file) && !kept.has(file));
  for (const file of removed) rmSync(join(dir, file));
  return removed;
}
