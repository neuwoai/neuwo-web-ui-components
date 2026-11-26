import { UnsupportedOperation } from "puppeteer-core";
import { VIEWPORT, judgeConsole, recordErrors } from "./checks.mjs";

/** @typedef {import("./checks.mjs").CheckResult} CheckResult */

const STEP_TIMEOUT = 5_000;
const NAVIGATION_TIMEOUT = 60_000;
const PHONE = { width: 390, height: 800 };
const SHORT = { width: VIEWPORT.width, height: 400 };

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

function readFocus() {
  const host = document.querySelector("neuwo-sidebar");
  const first = host?.querySelector(".neuwo-sidebar__list :is(a[href], summary)");
  const focused = document.activeElement;
  return { first: first?.textContent.trim() ?? null, focused: focused === first ? "the first entry" : (focused?.textContent.trim() || focused?.localName || null) };
}

function readFold() {
  const sections = Array.from(document.querySelectorAll("neuwo-nav-section"));
  const pick = (test) => sections.filter(test).map((section) => section.getAttribute("label"));
  const details = (section) => section.querySelector(":scope > .neuwo-nav-section > .neuwo-nav-section__details");
  return {
    open: pick((section) => details(section)?.open),
    marked: pick((section) => section.querySelector(":scope > .neuwo-nav-section")?.classList.contains("neuwo-nav-section--active")),
  };
}

/**
 * Sets `current` as a client-side router does, and reads the sections at the next frame, before it is painted.
 * @param {string} path
 */
function moveMark(path) {
  const host = document.querySelector("neuwo-sidebar");
  const was = host.current;
  host.current = path;
  return new Promise((resolve) =>
    requestAnimationFrame(() => {
      const sections = Array.from(document.querySelectorAll("neuwo-nav-section"));
      const pick = (test) => sections.filter(test).map((section) => section.getAttribute("label"));
      resolve({
        was,
        open: pick((section) => section.querySelector(":scope > .neuwo-nav-section > .neuwo-nav-section__details")?.open),
        marked: pick((section) => section.querySelector(":scope > .neuwo-nav-section")?.classList.contains("neuwo-nav-section--active")),
      });
    }),
  );
}

/** @param {{ open: string[], marked: string[] }} state */
const describeFold = (state) => `open: ${state.open.join(", ") || "none"}; marked: ${state.marked.join(", ") || "none"}`;

/**
 * @param {import("puppeteer-core").Page} page
 * @param {string} step
 * @param {(state: ReturnType<typeof readFold>) => boolean} accept
 */
async function untilFold(page, step, accept) {
  const deadline = Date.now() + STEP_TIMEOUT;
  for (;;) {
    const state = await page.evaluate(readFold);
    if (accept(state)) return state;
    if (Date.now() > deadline) throw new Error(`${step}: ${describeFold(state)}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

const ROW = 'neuwo-nav-section[label="Guides"] > .neuwo-nav-section > .neuwo-nav-section__details > .neuwo-nav-section__row';
const TOGGLE = 'neuwo-nav-section[label="Reference"] > .neuwo-nav-section > .neuwo-nav-section__details > .neuwo-nav-section__toggle';

/**
 * Folds Guides, which starts open, from its row with the pointer and the keyboard, opens Reference from the toggle
 * beside its link, then moves the mark into In Depth and away again, as a router would, reading each next frame.
 * @param {import("puppeteer-core").Page} page
 */
async function fold(page) {
  await page.setViewport(VIEWPORT);
  await untilFold(page, "Guides open at the start", (state) => state.open.includes("Guides"));
  await page.click(ROW);
  await untilFold(page, "the first click on Guides' row", (state) => !state.open.includes("Guides"));
  await page.click(ROW);
  await untilFold(page, "the second click on Guides' row", (state) => state.open.includes("Guides"));
  await page.focus(ROW);
  await page.keyboard.press("Enter");
  await untilFold(page, "Enter on Guides' row", (state) => !state.open.includes("Guides"));
  await page.keyboard.press(" ");
  await untilFold(page, "Space on Guides' row", (state) => state.open.includes("Guides"));
  await page.click(TOGGLE);
  await untilFold(page, "a click on Reference's toggle", (state) => state.open.includes("Reference"));
  const into = await page.evaluate(moveMark, "/demo/sidebar/theming.html");
  if (!into.open.includes("In Depth") || !into.marked.includes("In Depth")) throw new Error(`marking Theming: ${describeFold(into)}`);
  const away = await page.evaluate(moveMark, "/demo/sidebar/sections.html");
  await page.evaluate(moveMark, into.was);
  if (!away.open.includes("In Depth") || away.marked.includes("In Depth") || !away.marked.includes("Reference")) {
    throw new Error(`marking Sections after Theming, at the next frame: ${describeFold(away)}`);
  }
  return (
    "a click on Guides' row closed it and a second opened it, Enter closed it and Space opened it, a click on " +
    `Reference's toggle opened it; marking Theming opened In Depth, and marking Sections then left, at the next frame, ${describeFold(away)}`
  );
}

const IN_DEPTH = 'neuwo-nav-section[label="In Depth"] > .neuwo-nav-section > .neuwo-nav-section__details';
const INSTALLATION = '.neuwo-nav-item__link[href="/demo/sidebar/installation.html"]';

/** @param {string} selector */
function readPlace(selector) {
  const nav = document.querySelector(".neuwo-sidebar__nav");
  const inDepth = document.querySelector(selector);
  return { rendered: Boolean(inDepth), open: Boolean(inDepth?.open), scroll: nav?.scrollTop ?? 0 };
}

/** @param {number} top */
function scrollNav(top) {
  const nav = document.querySelector(".neuwo-sidebar__nav");
  nav.scrollTop = top;
  addEventListener("pagehide", () => sessionStorage.setItem("integration.left", String(nav.scrollTop)));
  return { range: nav.scrollHeight - nav.clientHeight, scroll: nav.scrollTop };
}

async function rewrite() {
  const source = await (await fetch(location.href)).text();
  document.open();
  document.write(source);
  document.close();
}

/**
 * @param {import("puppeteer-core").Page} tab
 * @param {string} step
 * @param {(state: ReturnType<typeof readPlace>) => boolean} accept
 */
async function untilPlace(tab, step, accept) {
  const deadline = Date.now() + STEP_TIMEOUT;
  for (;;) {
    const state = await tab.evaluate(readPlace, IN_DEPTH);
    if (accept(state)) return state;
    if (Date.now() > deadline) throw new Error(`${step}: In Depth ${state.rendered ? (state.open ? "open" : "closed") : "not rendered"}, the nav scrolled ${state.scroll}px`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * In a new tab, which remembers nothing: opens In Depth, which Getting Started leaves closed, scrolls the nav at a
 * short viewport and follows Installation, where only the remembered state opens In Depth. Then the parser builds that
 * page again with the library already defined, and In Depth opens again.
 * @param {import("puppeteer-core").Page} page
 * @returns {Promise<CheckResult[]>}
 */
async function remember(page) {
  const tab = await page.browserContext().newPage();
  const messages = recordErrors(tab);
  const results = [];
  try {
    await tab.setViewport(SHORT);
    await tab.goto(page.url(), { waitUntil: "load", timeout: NAVIGATION_TIMEOUT });
    await tab.evaluate(() => customElements.whenDefined("neuwo-sidebar"));
    await untilPlace(tab, "In Depth in a new tab", (state) => state.rendered && !state.open);
    await tab.click(`${IN_DEPTH} > .neuwo-nav-section__row`);
    await untilPlace(tab, "a click on In Depth's row", (state) => state.open);
    const scrolled = await tab.evaluate(scrollNav, 48);
    if (scrolled.range <= 0 || scrolled.scroll <= 0) throw new Error(`the nav does not scroll at ${SHORT.height}px: range ${scrolled.range}px`);
    await Promise.all([tab.waitForNavigation({ waitUntil: "load", timeout: NAVIGATION_TIMEOUT }), tab.click(INSTALLATION)]);
    await tab.evaluate(() => customElements.whenDefined("neuwo-sidebar"));
    const left = Number(await tab.evaluate(() => sessionStorage.getItem("integration.left")));
    const arrived = await untilPlace(tab, "arriving on Installation", (state) => state.rendered);
    if (!arrived.open || Math.abs(arrived.scroll - left) > 1) {
      throw new Error(`arriving on Installation: In Depth ${arrived.open ? "open" : "closed"}, the nav scrolled ${arrived.scroll}px of the ${left}px it left at`);
    }
    results.push({
      check: "sidebarRemember",
      status: "pass",
      detail: `In Depth, closed in a new tab, opened from its row; after following Installation it is open and the nav is scrolled ${arrived.scroll}px, as it was left`,
    });
  } catch (error) {
    results.push({ check: "sidebarRemember", status: "fail", detail: error.message });
  }
  try {
    if (results[0].status !== "pass") throw new Error("needs sidebarRemember to pass first");
    await tab.evaluate(rewrite);
    const again = await untilPlace(tab, "the page built again with the library defined", (state) => state.rendered);
    if (!again.open) throw new Error("the page built again with the library defined: In Depth closed");
    results.push({ check: "sidebarRememberEarly", status: "pass", detail: "built again by the parser with the library already defined, Installation opens In Depth from storage" });
  } catch (error) {
    results.push({ check: "sidebarRememberEarly", status: "fail", detail: error.message });
  } finally {
    await tab.close().catch(() => {});
  }
  return [...results, { check: "sidebarRememberConsole", ...judgeConsole({ messages: [...messages] }) }];
}

/** @param {Record<string, unknown>} node */
const nodesIn = (node) => [node, ...(/** @type {Record<string, unknown>[]} */ (node.children ?? [])).flatMap(nodesIn)];

/**
 * Reads the nav from Chromium's accessibility tree: the lists hold only list items, the sections are disclosures
 * with their expanded state, and the page's link is the node carrying `aria-current`, which the tree does not report.
 * @param {import("puppeteer-core").Page} page
 * @returns {Promise<Omit<CheckResult, "check">>}
 */
async function tree(page) {
  await page.setViewport(VIEWPORT);
  let snapshot;
  try {
    snapshot = await page.accessibility.snapshot({ interestingOnly: false });
  } catch (error) {
    if (error instanceof UnsupportedOperation) return { status: "n/a", detail: `no accessibility snapshot: ${error.message}` };
    throw error;
  }
  const label = await page.evaluate(() => document.querySelector("neuwo-sidebar").label);
  const nav = snapshot && nodesIn(snapshot).find((node) => node.role === "navigation" && node.name === label);
  if (!nav) return { status: "fail", detail: `no navigation named ${label}` };
  const lists = nodesIn(nav).filter((node) => node.role === "list");
  const stray = lists.flatMap((list) => (list.children ?? []).filter((child) => child.role !== "listitem").map((child) => child.role));
  if (!lists.length || stray.length) return { status: "fail", detail: `${lists.length} lists in the nav, holding ${stray.join(", ") || "no"} nodes besides list items` };
  const cdp = await page.createCDPSession();
  try {
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    const expanded = (name) => {
      const node = nodes.find((each) => each.role?.value === "DisclosureTriangle" && each.name?.value === name);
      return node ? String(node.properties?.find((property) => property.name === "expanded")?.value?.value ?? "missing") : "absent";
    };
    const states = { Guides: expanded("Guides"), "In Depth": expanded("In Depth"), "Show Reference pages": expanded("Show Reference pages") };
    if (states.Guides !== "true" || states["In Depth"] !== "false" || states["Show Reference pages"] !== "false") {
      return { status: "fail", detail: `the sections' disclosures report expanded ${JSON.stringify(states)}` };
    }
    const links = nodes.filter((each) => each.role?.value === "link" && each.backendDOMNodeId);
    const current = [];
    for (const link of links) {
      const { object } = await cdp.send("DOM.resolveNode", { backendNodeId: link.backendDOMNodeId });
      const { result } = await cdp.send("Runtime.callFunctionOn", { objectId: object.objectId, functionDeclaration: "function () { return this.getAttribute('aria-current'); }", returnByValue: true });
      if (result.value === "page") current.push(link.name?.value);
    }
    if (current.length !== 1) return { status: "fail", detail: `${current.length} links in the tree carry aria-current="page": ${current.join(", ")}` };
    return {
      status: "pass",
      detail: `a navigation named ${label} with ${lists.length} lists holding only list items; disclosures Guides expanded, In Depth and Show Reference pages collapsed; the link ${current[0]} carries aria-current="page"`,
    };
  } finally {
    await cdp.detach();
  }
}

/**
 * @param {import("puppeteer-core").Page} page
 * @returns {Promise<CheckResult>}
 */
async function treeCheck(page) {
  try {
    return { check: "sidebarTree", ...(await tree(page)) };
  } catch (error) {
    return { check: "sidebarTree", status: "fail", detail: error.message };
  } finally {
    await page.setViewport(VIEWPORT).catch(() => {});
  }
}

/**
 * The sidebar checks for `demo/sidebar/`: the column shows every top-level entry whatever the phone menu was left as,
 * and Tab reaches the first from the brand; below 48rem the menu button shows and hides the nav; Chromium's
 * accessibility tree holds the nav's lists and sections; a section folds from its row or toggle and stays open as
 * the mark moves away; and with `remember` the open sections and the nav's scroll follow the reader to the next page.
 * @param {import("puppeteer-core").Page} page
 * @returns {Promise<CheckResult[]>}
 */
export async function checkSidebar(page) {
  await page.evaluate(() => customElements.whenDefined("neuwo-sidebar"));
  return [
    await run(page, "sidebarDesktop", async () => {
      await page.setViewport(VIEWPORT);
      const closed = await until(page, `at ${VIEWPORT.width}px with the menu closed`, (state) => allShown(state) && !state.toggle && !state.open);
      await page.focus(".neuwo-sidebar__brand a");
      await page.keyboard.press("Tab");
      const tab = await page.evaluate(readFocus);
      if (tab.focused !== "the first entry") throw new Error(`Tab from the brand at ${VIEWPORT.width}px focused ${tab.focused}, not ${tab.first}`);
      await page.setViewport(PHONE);
      await until(page, `at ${PHONE.width}px`, (state) => state.toggle);
      await page.click(".neuwo-sidebar__toggle");
      await until(page, `opening the menu at ${PHONE.width}px`, (state) => state.open && state.nav);
      await page.setViewport(VIEWPORT);
      const opened = await until(page, `back at ${VIEWPORT.width}px with the menu open`, (state) => allShown(state) && !state.toggle && state.open);
      return `at ${VIEWPORT.width}px ${describe(closed)}, and Tab from the brand focused ${tab.first}; after opening the menu at ${PHONE.width}px and widening again, ${describe(opened)}`;
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
    await treeCheck(page),
    await run(page, "sidebarFold", () => fold(page)),
    ...(await remember(page)),
  ];
}
