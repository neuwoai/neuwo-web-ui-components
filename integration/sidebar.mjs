import { UnsupportedOperation } from "puppeteer-core";
import { VIEWPORT, judgeConsole, layoutShift, recordErrors, settle } from "./checks.mjs";

/** @typedef {import("./checks.mjs").CheckResult} CheckResult */

const STEP_TIMEOUT = 5_000;
const NAVIGATION_TIMEOUT = 60_000;
const READY_TIMEOUT = 30_000;
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

const SECOND_PAGE = "/second";
const SUMMARY = (label) => `neuwo-nav-section[label="${label}"] > .neuwo-nav-section > .neuwo-nav-section__details > summary`;
const ENTRY = (href) => `.neuwo-nav-item__link[href="${href}"]`;

/**
 * Reads the sections and the page's mark, and what shows whether the document is still the one the check started on.
 * @param {string | null} href an entry whose enclosing sections to name, outermost first
 */
function readNav(href) {
  const sections = Array.from(document.querySelectorAll("neuwo-nav-section"));
  const details = (section) => section.querySelector(":scope > .neuwo-nav-section > .neuwo-nav-section__details");
  const label = (section) => section.getAttribute("label");
  const reachable = (section) => !section.parentElement?.closest(".neuwo-nav-section__details:not([open])");
  const around = [];
  for (let at = href ? document.querySelector(`.neuwo-nav-item__link[href="${href}"]`)?.closest("neuwo-nav-section") : null; at; at = at.parentElement?.closest("neuwo-nav-section")) {
    around.unshift(label(at));
  }
  return {
    path: location.pathname,
    stay: window.__neuwoStay === true,
    navigations: performance.getEntriesByType("navigation").length,
    menu: Boolean(document.querySelector(".neuwo-sidebar__menu")?.open),
    open: sections.filter((section) => details(section)?.open).map(label),
    closed: sections.filter((section) => !details(section)?.open && reachable(section)).map(label),
    marked: sections.filter((section) => section.querySelector(":scope > .neuwo-nav-section")?.classList.contains("neuwo-nav-section--active")).map(label),
    current: Array.from(document.querySelectorAll('neuwo-sidebar [aria-current="page"]'), (link) => link.getAttribute("href")),
    around,
  };
}

/** @param {ReturnType<typeof readNav>} state */
const describeNav = (state) =>
  `at ${state.path}, open: ${state.open.join(", ") || "none"}; marked: ${state.marked.join(", ") || "none"}; aria-current on ${state.current.join(", ") || "nothing"}`;

/**
 * @param {import("puppeteer-core").Page} tab
 * @param {string} step
 * @param {(state: ReturnType<typeof readNav>) => boolean} accept
 * @param {string | null} [href]
 */
async function untilNav(tab, step, accept, href = null) {
  const deadline = Date.now() + STEP_TIMEOUT;
  for (;;) {
    const state = await tab.evaluate(readNav, href);
    if (accept(state)) return state;
    if (Date.now() > deadline) throw new Error(`${step}: ${describeNav(state)}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * Waits until every element is defined and painted, and on a React page until React has hydrated the sidebar, so a
 * click reaches the app's `navigate` handler.
 * @param {import("puppeteer-core").Page} tab
 * @param {boolean} react
 */
async function ready(tab, react) {
  const problem = await tab.evaluate(settle, READY_TIMEOUT);
  if (problem) throw new Error(problem);
  if (!react) return;
  await tab.waitForFunction(
    () => {
      const host = document.querySelector("neuwo-sidebar");
      return Boolean(host) && Object.keys(host).some((key) => key.startsWith("__reactProps$"));
    },
    { timeout: READY_TIMEOUT },
  );
  await tab.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

/**
 * Runs `steps` in a new tab of the page's context, which remembers nothing, and fails the check on anything the tab
 * logs. A step the browser cannot take makes the check n/a.
 * @param {import("puppeteer-core").Page} page
 * @param {string} check
 * @param {(tab: import("puppeteer-core").Page) => Promise<string | Omit<CheckResult, "check">>} steps
 * @returns {Promise<CheckResult>}
 */
async function inTab(page, check, steps) {
  const tab = await page.browserContext().newPage();
  const messages = recordErrors(tab);
  try {
    const outcome = await steps(tab);
    if (messages.length) return { check, ...judgeConsole({ messages: [...messages] }) };
    return { check, ...(typeof outcome === "string" ? { status: "pass", detail: outcome } : outcome) };
  } catch (error) {
    if (error instanceof UnsupportedOperation) return { check, status: "n/a", detail: error.message };
    return { check, status: "fail", detail: error.message };
  } finally {
    await tab.close().catch(() => {});
  }
}

/**
 * At each width, opens the first section the page leaves closed, with the phone menu opened first, reloads, and
 * reads the reloaded page's buffered layout shifts: none, with the section open from the first paint.
 * @param {import("puppeteer-core").Page} page
 * @param {string} url
 * @param {boolean} react
 */
function steady(page, url, react) {
  return inTab(page, "sidebarSteady", async (tab) => {
    const read = [];
    await tab.setViewport(VIEWPORT);
    await tab.goto(url, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT });
    for (const viewport of [VIEWPORT, PHONE]) {
      await tab.setViewport(viewport);
      await ready(tab, react);
      if (viewport === PHONE) {
        await tab.click(".neuwo-sidebar__toggle");
        await untilNav(tab, `opening the menu at ${PHONE.width}px`, (state) => state.menu);
      }
      const [label] = (await tab.evaluate(readNav, null)).closed;
      if (!label) throw new Error(`at ${viewport.width}px no section is left closed to open`);
      await tab.click(SUMMARY(label));
      const opened = await untilNav(tab, `a click on ${label} at ${viewport.width}px`, (state) => state.open.includes(label));
      await tab.reload({ waitUntil: "load", timeout: NAVIGATION_TIMEOUT });
      await ready(tab, react);
      const shift = await tab.evaluate(layoutShift);
      const after = await tab.evaluate(readNav, null);
      const lost = opened.open.filter((name) => !after.open.includes(name));
      if (lost.length) throw new Error(`after the reload at ${viewport.width}px, ${lost.join(", ")} closed; ${describeNav(after)}`);
      if (after.menu) throw new Error(`after the reload at ${viewport.width}px the menu is open`);
      if (shift && shift.total !== 0) throw new Error(`the reload at ${viewport.width}px shifted ${Number(shift.total.toPrecision(3))} from ${shift.sources.join(", ")}`);
      read.push({ width: viewport.width, label, shift, open: after.open });
    }
    const said = read.map(({ width, label, shift, open }) => `at ${width}px ${label} opened, and after the reload ${open.join(", ")} open${shift ? " with no layout shift" : ""}`).join("; ");
    if (read.some(({ shift }) => !shift)) return { status: "n/a", detail: `no layout-shift entries to read; ${said}` };
    return said;
  });
}

/**
 * With JavaScript off at phone width, the menu button shows the nav, and every link in it points at a page: one on
 * the site that answers, or an https page elsewhere.
 * @param {import("puppeteer-core").Page} page
 * @param {string} url
 */
function withoutScript(page, url) {
  return inTab(page, "sidebarNoScript", async (tab) => {
    await tab.setJavaScriptEnabled(false);
    await tab.setViewport(PHONE);
    const response = await tab.goto(url, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT });
    if (!response?.ok() && response?.status() !== 304) throw new Error(`HTTP ${response?.status() ?? "no response"} for ${url}`);
    const closed = await tab.evaluate(readSidebar);
    if (!closed.toggle || closed.nav) throw new Error(`at ${PHONE.width}px without JavaScript, before a click: ${describe(closed)}`);
    await tab.click(".neuwo-sidebar__toggle");
    const opened = await until(tab, `a click on the menu button at ${PHONE.width}px without JavaScript`, (state) => state.nav);
    const links = await tab.$$eval(".neuwo-sidebar__nav a[href]", (anchors) => anchors.map((anchor) => anchor.href));
    const origin = new URL(url).origin;
    const here = links.filter((link) => new URL(link).origin === origin);
    const elsewhere = links.filter((link) => !here.includes(link));
    const answers = await Promise.all(here.map(async (link) => ({ path: new URL(link).pathname, status: (await fetch(link)).status })));
    const broken = answers.filter((answer) => answer.status !== 200);
    if (!here.length || broken.length) throw new Error(`of ${here.length} links on the site, ${broken.map(({ path, status }) => `${path} answers ${status}`).join(", ") || "none answer"}`);
    const unsafe = elsewhere.filter((link) => new URL(link).protocol !== "https:");
    if (unsafe.length) throw new Error(`links to ${unsafe.join(", ")}`);
    return (
      `at ${PHONE.width}px without JavaScript, a click on the menu button showed the nav (${opened.shown} of ${opened.entries} top-level entries); ` +
      `its ${links.length} links point at ${answers.map(({ path }) => path).join(", ")}, each answering 200, and ${elsewhere.length} https pages elsewhere`
    );
  });
}

/**
 * On a React app with a client-side router: opens a section the second page is not in, and the sections around the
 * second page's entry, follows the entry and comes back. Each time the document stays, every open section stays
 * open, the one the mark left included, and the mark moves.
 * @param {import("puppeteer-core").Page} page
 * @param {string} url
 */
function clientNavigation(page, url) {
  return inTab(page, "sidebarClientNav", async (tab) => {
    await tab.setViewport(VIEWPORT);
    await tab.goto(url, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT });
    await ready(tab, true);
    const start = await tab.evaluate(readNav, SECOND_PAGE);
    if (start.current.length !== 1) throw new Error(`at the start ${describeNav(start)}`);
    const [home] = start.current;
    await tab.evaluate(() => (window.__neuwoStay = true));
    const [other] = start.closed.filter((label) => !start.around.includes(label));
    if (!other) throw new Error(`no closed section outside ${start.around.join(", ") || "the top level"} to open`);
    for (const label of [other, ...start.around.filter((name) => start.closed.includes(name))]) {
      await tab.click(SUMMARY(label));
      await untilNav(tab, `a click on ${label}`, (state) => state.open.includes(label));
    }
    /**
     * @param {ReturnType<typeof readNav>} before
     * @param {string} href
     */
    const follow = async (before, href) => {
      await tab.click(ENTRY(href));
      const after = await untilNav(tab, `following ${href}`, (state) => state.path === href && state.current.join() === href, SECOND_PAGE);
      if (!after.stay || after.navigations !== 1) throw new Error(`following ${href} loaded a new document`);
      const closed = before.open.filter((label) => !after.open.includes(label));
      if (closed.length) throw new Error(`following ${href} closed ${closed.join(", ")}; ${describeNav(after)}`);
      return after;
    };
    const opened = await tab.evaluate(readNav, SECOND_PAGE);
    const there = await follow(opened, SECOND_PAGE);
    const unmarked = there.around.filter((label) => !there.marked.includes(label));
    if (unmarked.length) throw new Error(`at ${SECOND_PAGE}, ${unmarked.join(", ")} not marked; ${describeNav(there)}`);
    const back = await follow(there, home);
    return (
      `with no new document, ${other} opened and following ${SECOND_PAGE} moved aria-current there and left ${there.open.join(", ")} open; ` +
      `following ${home} back moved it again and left ${back.open.join(", ")} open`
    );
  });
}

/**
 * The checks for a server-rendered example: a reload after opening a section shifts nothing at either width, the
 * phone menu works and leads to real pages without JavaScript, and on a React app with a client-side router a client
 * navigation keeps the document, the open sections and moves the mark.
 * @param {import("puppeteer-core").Page} page
 * @param {string} url
 * @param {{ next: boolean }} options
 * @returns {Promise<CheckResult[]>}
 */
export async function checkSidebarSteady(page, url, { next }) {
  const results = [await steady(page, url, next), await withoutScript(page, url)];
  if (next) results.push(await clientNavigation(page, url));
  return results;
}
