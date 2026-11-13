import { join } from "node:path";
import { runCommand, serveStatic } from "../serve.mjs";
import { submitSignUps } from "../sign-up.mjs";

const TIMEOUT = 120_000;

export const checks = ["console", "singleCopy"];

export const interact = (page, url) => submitSignUps(page, url, { forms: 2, react: true });

export async function start({ work, log }) {
  const app = join(work, "examples", "react-vite");
  log("example-vite: installing");
  await runCommand("npm", ["install", "--no-audit", "--no-fund"], { cwd: app, timeout: TIMEOUT });
  log("example-vite: building");
  await runCommand("npm", ["run", "build"], { cwd: app, timeout: TIMEOUT });
  const server = await serveStatic(join(app, "dist"));
  return { pages: [`${server.url}/`], stop: server.stop };
}
