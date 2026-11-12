import { access, constants } from "node:fs/promises";
import { delimiter, join } from "node:path";
import puppeteer from "puppeteer-core";

const BROWSERS = {
  chromium: { variable: "NEUWO_CHROMIUM", commands: ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable"] },
  firefox: { variable: "NEUWO_FIREFOX", commands: ["firefox"] },
};

async function onPath(commands) {
  const directories = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  for (const command of commands) {
    for (const directory of directories) {
      const file = join(directory, command);
      try {
        await access(file, constants.X_OK);
        return file;
      } catch {}
    }
  }
  return null;
}

export async function launch(name) {
  const browser = BROWSERS[name];
  if (!browser) throw new Error(`Unknown browser "${name}"; use chromium or firefox.`);
  const executablePath = process.env[browser.variable] || (await onPath(browser.commands));
  if (!executablePath) {
    throw new Error(`No ${name} found: set ${browser.variable} to its executable, or put ${browser.commands.join(", ")} on PATH.`);
  }
  const options = { executablePath, headless: true, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false };
  return name === "firefox"
    ? puppeteer.launch({ ...options, browser: "firefox", protocol: "webDriverBiDi" })
    : puppeteer.launch({ ...options, browser: "chrome" });
}
