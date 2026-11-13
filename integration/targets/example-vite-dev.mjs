import { join } from "node:path";
import { runCommand, serveCommand } from "../serve.mjs";
import { submitSignUps } from "../sign-up.mjs";

const TIMEOUT = 120_000;

export const checks = ["console", "singleCopy"];

export const interact = (page, url) => submitSignUps(page, url, { forms: 2, react: true });

export async function start({ work, log }) {
  const app = join(work, "examples", "react-vite");
  log("example-vite-dev: installing");
  await runCommand("npm", ["install", "--no-audit", "--no-fund"], { cwd: app, timeout: TIMEOUT });
  log("example-vite-dev: starting");
  const server = await serveCommand("npx", (port) => ["--no", "--", "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: app, ready: /ready in/i });
  return { pages: [`${server.url}/`], stop: server.stop };
}
