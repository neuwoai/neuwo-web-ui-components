import { join } from "node:path";
import { CHECKS } from "../checks.mjs";
import { runCommand, serveStatic } from "../serve.mjs";

export { interact } from "../forms.mjs";

const TIMEOUT = 120_000;

export const checks = CHECKS;

export async function start({ work, log }) {
  const app = join(work, "apps", "vite");
  log("vite: installing");
  await runCommand("npm", ["install", "--no-audit", "--no-fund"], { cwd: app, timeout: TIMEOUT });
  log("vite: prerendering");
  await runCommand(process.execPath, ["prerender.mjs"], { cwd: app, timeout: TIMEOUT });
  const server = await serveStatic(join(app, "dist"));
  return { pages: [`${server.url}/`], stop: server.stop };
}
