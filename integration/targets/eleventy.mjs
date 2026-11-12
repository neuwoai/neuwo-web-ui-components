import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { CHECKS } from "../checks.mjs";
import { serveStatic } from "../serve.mjs";

const exec = promisify(execFile);
const TIMEOUT = 120_000;

export const checks = CHECKS;

export async function start({ work, log }) {
  const app = join(work, "apps", "eleventy");
  log("eleventy: installing");
  await exec("npm", ["install", "--no-audit", "--no-fund"], { cwd: app, timeout: TIMEOUT });
  log("eleventy: building");
  await exec("npx", ["--no", "@11ty/eleventy"], { cwd: app, timeout: TIMEOUT });
  const server = await serveStatic(join(app, "_site"));
  return { pages: [`${server.url}/`], stop: server.stop };
}
