import { join } from "node:path";
import { checkForms } from "./forms.mjs";
import { blockNetwork, runCommand, serveCommand } from "./serve.mjs";

const NAVIGATION_TIMEOUT = 60_000;

export async function startNext(name, command, { work, log }) {
  const app = join(work, "apps", "next");
  const next = join(app, "node_modules", "next", "dist", "bin", "next");
  log(`${name}: installing`);
  await runCommand("npm", ["install", "--no-audit", "--no-fund"], { cwd: app });
  const network = await blockNetwork();
  const env = { ...network.env, NEXT_TELEMETRY_DISABLED: "1" };
  const close = async () => {
    await network.close();
    if (network.attempts.length) log(`${name}: refused ${network.attempts.join("; ")}`);
  };
  try {
    if (command === "start") {
      log(`${name}: building`);
      await runCommand(process.execPath, [next, "build"], { cwd: app, env });
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
