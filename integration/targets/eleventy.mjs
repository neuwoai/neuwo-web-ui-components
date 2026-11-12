import { join } from "node:path";
import { CHECKS } from "../checks.mjs";
import { runCommand, serveStatic } from "../serve.mjs";

const TIMEOUT = 120_000;

export const checks = CHECKS;

export async function start({ work, log }) {
  const app = join(work, "apps", "eleventy");
  log("eleventy: installing");
  await runCommand("npm", ["install", "--no-audit", "--no-fund"], { cwd: app, timeout: TIMEOUT });
  log("eleventy: building");
  await runCommand("npx", ["--no", "@11ty/eleventy"], { cwd: app, timeout: TIMEOUT });
  const server = await serveStatic(join(app, "_site"));
  return { pages: [`${server.url}/`], stop: server.stop };
}
