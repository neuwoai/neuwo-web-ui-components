import { UnsupportedOperation } from "puppeteer-core";
import { VIEWPORT } from "./checks.mjs";

/** @typedef {import("./checks.mjs").CheckResult} CheckResult */

const STEP_TIMEOUT = 5_000;
const PHONE = { width: 390, height: 800 };

function readSidebar() {
  const host = document.querySelector("neuwo-sidebar");
  const shown = (element) => {
    if (!element?.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true })) return false;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return Boolean(hit && element.contains(hit));
  };
  const list = host?.querySelector(".neuwo-sidebar__list");
  const entries = Array.from(list?.children ?? [], (entry) => entry.querySelector(".neuwo-nav-link"));
  return {
    entries: entries.length,
    shown: entries.filter(shown).length,
    nav: shown(host?.querySelector(".neuwo-sidebar__nav")),
    toggle: shown(host?.querySelector(".neuwo-sidebar__toggle")),
    open: Boolean(host?.menuOpen),
  };
}

function closeMenu() {
  const host = document.querySelector("neuwo-sidebar");
  if (host) host.menuOpen = false;
}

/** @param {{ entries: number, shown: number, nav: boolean, toggle: boolean, open: boolean }} state */
const describe = (state) => `${state.shown} of ${state.entries} entries shown, the nav ${state.nav ? "shown" : "hidden"}, the toggle ${state.toggle ? "shown" : "hidden"}, the menu ${state.open ? "open" : "closed"}`;

/**
 * @param {import("puppeteer-core").Page} page
 * @param {string} step
 * @param {(state: ReturnType<typeof readSidebar>) => boolean} accept
 */
async function until(page, step, accept) {
  const deadline = Date.now() + STEP_TIMEOUT;
  for (;;) {
    const state = await page.evaluate(readSidebar);
    if (accept(state)) return state;
    if (Date.now() > deadline) throw new Error(`${step}: ${describe(state)}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * Runs `steps` at the viewports they set, n/a where the browser cannot set one, and leaves the default viewport and a
 * closed menu behind.
 * @param {import("puppeteer-core").Page} page
 * @param {string} check
 * @param {() => Promise<string>} steps
 * @returns {Promise<CheckResult>}
 */
async function run(page, check, steps) {
  try {
    return { check, status: "pass", detail: await steps() };
  } catch (error) {
    if (error instanceof UnsupportedOperation) return { check, status: "n/a", detail: `no viewport to set: ${error.message}` };
    return { check, status: "fail", detail: error.message };
  } finally {
    await page.evaluate(closeMenu).catch(() => {});
    await page.setViewport(VIEWPORT).catch(() => {});
  }
}

const allShown = (state) => state.entries > 0 && state.shown === state.entries;

/**
 * The sidebar checks for `demo/sidebar/`: the column shows every top-level entry whatever the phone menu was left as,
 * and below 48rem the menu button shows and hides the nav.
 * @param {import("puppeteer-core").Page} page
 * @returns {Promise<CheckResult[]>}
 */
export async function checkSidebar(page) {
  await page.evaluate(() => customElements.whenDefined("neuwo-sidebar"));
  return [
    await run(page, "sidebarDesktop", async () => {
      await page.setViewport(VIEWPORT);
      const closed = await until(page, `at ${VIEWPORT.width}px with the menu closed`, (state) => allShown(state) && !state.toggle && !state.open);
      await page.setViewport(PHONE);
      await until(page, `at ${PHONE.width}px`, (state) => state.toggle);
      await page.click(".neuwo-sidebar__toggle");
      await until(page, `opening the menu at ${PHONE.width}px`, (state) => state.open && state.nav);
      await page.setViewport(VIEWPORT);
      const opened = await until(page, `back at ${VIEWPORT.width}px with the menu open`, (state) => allShown(state) && !state.toggle && state.open);
      return `at ${VIEWPORT.width}px ${describe(closed)}; after opening the menu at ${PHONE.width}px and widening again, ${describe(opened)}`;
    }),
    await run(page, "sidebarPhone", async () => {
      await page.setViewport(PHONE);
      const closed = await until(page, `at ${PHONE.width}px`, (state) => state.toggle && !state.nav && !state.open);
      await page.click(".neuwo-sidebar__toggle");
      const opened = await until(page, "the first click on the menu button", (state) => state.nav && state.open);
      await page.click(".neuwo-sidebar__toggle");
      await until(page, "the second click on the menu button", (state) => !state.nav && !state.open);
      return `at ${PHONE.width}px ${describe(closed)}; a click showed the nav (${opened.shown} of ${opened.entries} entries), a second hid it`;
    }),
  ];
}
