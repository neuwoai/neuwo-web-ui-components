import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { checkForms } from "./forms.mjs";
import { blockNetwork, serveCommand } from "./serve.mjs";

const exec = promisify(execFile);
const TIMEOUT = 300_000;
const NAVIGATION_TIMEOUT = 60_000;

export async function startNext(name, command, { work, log }) {
  const app = join(work, "apps", "next");
  const next = join(app, "node_modules", "next", "dist", "bin", "next");
  log(`${name}: installing`);
  await exec("npm", ["install", "--no-audit", "--no-fund"], { cwd: app, timeout: TIMEOUT });
  const network = await blockNetwork();
  const env = { ...network.env, NEXT_TELEMETRY_DISABLED: "1" };
  const close = async () => {
    await network.close();
    if (network.attempts.length) log(`${name}: refused ${network.attempts.join("; ")}`);
  };
  try {
    if (command === "start") {
      log(`${name}: building`);
      await exec(process.execPath, [next, "build"], { cwd: app, env: { ...process.env, ...env }, timeout: TIMEOUT, maxBuffer: 64 * 1024 * 1024 });
    }
    log(`${name}: starting`);
    const server = await serveCommand(process.execPath, (port) => [next, command, "-H", "127.0.0.1", "-p", String(port)], { cwd: app, env, ready: /Ready in/ });
    return {
      pages: [`${server.url}/`],
      stop: async () => {
        await server.stop();
        await close();
      },
    };
  } catch (error) {
    await close();
    throw error;
  }
}

export async function interact(page, url) {
  const response = await page.goto(url, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT });
  if (!response?.ok()) return [{ check: "forms", status: "fail", detail: `HTTP ${response?.status() ?? "no response"} for ${url}` }];
  return [await checkForms(page)];
}
