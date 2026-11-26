import { join } from "node:path";
import { CHECKS } from "../checks.mjs";
import { runCommand, serveStatic } from "../serve.mjs";
import { checkSidebarSteady } from "../sidebar.mjs";
import { submitSignUps } from "../sign-up.mjs";

const TIMEOUT = 120_000;

export const checks = CHECKS;

export async function interact(page, url) {
  return [...(await submitSignUps(page, url, { forms: 1, react: false })), ...(await checkSidebarSteady(page, url, { next: false }))];
}

export async function start({ work, log }) {
  const app = join(work, "examples", "eleventy");
  log("example-eleventy: installing");
  await runCommand("npm", ["install", "--no-audit", "--no-fund"], { cwd: app, timeout: TIMEOUT });
  log("example-eleventy: building");
  await runCommand("npm", ["run", "build"], { cwd: app, timeout: TIMEOUT });
  const server = await serveStatic(join(app, "_site"));
  return { pages: [`${server.url}/`], stop: server.stop };
}
