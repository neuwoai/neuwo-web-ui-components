import { UnsupportedOperation } from "puppeteer-core";
import { VIEWPORT, judgeConsole, layoutShift, recordErrors, settle } from "./checks.mjs";

/** @typedef {import("./checks.mjs").CheckResult} CheckResult */

const STEP_TIMEOUT = 5_000;
const NAVIGATION_TIMEOUT = 60_000;
const READY_TIMEOUT = 30_000;
const PHONE = { width: 390, height: 800 };
const NARROW = { width: 320, height: 800 };
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
 * What a step reads off the page, with its arguments, and how a failed step words the last reading.
 * @template T
 * @typedef {{ read: (...args: never[]) => T, args?: unknown[], describe: (state: T) => string }} Reading
 */

/**
 * Reads the page until `accept` takes the reading, and fails the step with the last one after `STEP_TIMEOUT`.
 * @template T
 * @param {import("puppeteer-core").Page} page
 * @param {string} step
 * @param {Reading<T>} reading
 * @param {(state: T) => boolean} accept
 * @returns {Promise<T>}
 */
async function poll(page, step, { read, args = [], describe }, accept) {
  const deadline = Date.now() + STEP_TIMEOUT;
  for (;;) {
    const state = await page.evaluate(read, ...args);
    if (accept(state)) return state;
    if (Date.now() > deadline) throw new Error(`${step}: ${describe(state)}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/** @type {Reading<ReturnType<typeof readSidebar>>} */
const SIDEBAR = { read: readSidebar, describe };

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

function readBar() {
  const host = document.querySelector("neuwo-sidebar");
  const edges = (element) => {
    const { left, right, top, bottom } = element.getBoundingClientRect();
    return { left, right, top, bottom };
  };
  const actions = host?.querySelector(".neuwo-sidebar__actions");
  const toggle = host?.querySelector(".neuwo-sidebar__toggle");
  const boxes = actions ? [actions, ...actions.querySelectorAll("*")].map(edges).filter((box) => box.right > box.left && box.bottom > box.top) : [];
  const button = toggle ? edges(toggle) : null;
  const into = (box) => Math.min(box.right, button.right) - Math.max(box.left, button.left) > 0.5 && Math.min(box.bottom, button.bottom) - Math.max(box.top, button.top) > 0.5;
  const round = (box) => box && Object.fromEntries(Object.entries(box).map(([edge, value]) => [edge, Math.round(value * 10) / 10]));
  return { actions: round(boxes[0] ?? null), toggle: round(button), hit: Boolean(button && boxes.some(into)) };
}

/** @param {ReturnType<typeof readBar>} state */
const describeBar = (state) => {
  const span = (box) => (box ? `x ${box.left} to ${box.right}, y ${box.top} to ${box.bottom}` : "none");
  return `the actions at ${span(state.actions)}, the menu button at ${span(state.toggle)}${state.hit ? ", overlapping" : ""}`;
};

/** @type {Reading<ReturnType<typeof readBar>>} */
const BAR = { read: readBar, describe: describeBar };

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

/** @type {Reading<ReturnType<typeof readFold>>} */
const FOLD = { read: readFold, describe: describeFold };

const ROW = 'neuwo-nav-section[label="Guides"] > .neuwo-nav-section > .neuwo-nav-section__details > .neuwo-nav-section__row';
const TOGGLE = 'neuwo-nav-section[label="Reference"] > .neuwo-nav-section > .neuwo-nav-section__details > .neuwo-nav-section__toggle';
const IN_DEPTH = 'neuwo-nav-section[label="In Depth"] > .neuwo-nav-section > .neuwo-nav-section__details';
const REFERENCE = 'neuwo-nav-section[label="Reference"] > .neuwo-nav-section > .neuwo-nav-section__details';
const THEMING = "/docs/guides/in-depth/theming/";
const SECTIONS = "/docs/reference/sections/";

/**
 * Folds Guides, which starts open, from its row with the pointer and the keyboard, and opens Reference from the toggle
 * beside its link. Then, as a router would, moves the mark from Theming, where the page starts, to Sections, and after
 * the reader closes In Depth from its row, back to Theming, reading each next frame.
 * @param {import("puppeteer-core").Page} page
 */
async function fold(page) {
  await page.setViewport(VIEWPORT);
  await poll(page, "Guides and In Depth open at the start", FOLD, (state) => state.open.includes("Guides") && state.open.includes("In Depth"));
  await page.click(ROW);
  await poll(page, "the first click on Guides' row", FOLD, (state) => !state.open.includes("Guides"));
  await page.click(ROW);
  await poll(page, "the second click on Guides' row", FOLD, (state) => state.open.includes("Guides"));
  await page.focus(ROW);
  await page.keyboard.press("Enter");
  await poll(page, "Enter on Guides' row", FOLD, (state) => !state.open.includes("Guides"));
  await page.keyboard.press(" ");
  await poll(page, "Space on Guides' row", FOLD, (state) => state.open.includes("Guides"));
  await page.click(TOGGLE);
  await poll(page, "a click on Reference's toggle", FOLD, (state) => state.open.includes("Reference"));
  const away = await page.evaluate(moveMark, SECTIONS);
  if (!away.open.includes("In Depth") || away.marked.includes("In Depth") || !away.marked.includes("Reference")) {
    await page.evaluate(moveMark, away.was);
    throw new Error(`marking Sections after ${away.was}, at the next frame: ${describeFold(away)}`);
  }
  await page.click(`${IN_DEPTH} > .neuwo-nav-section__row`);
  await poll(page, "a click on In Depth's row", FOLD, (state) => !state.open.includes("In Depth"));
  const into = await page.evaluate(moveMark, THEMING);
  if (!into.open.includes("In Depth") || !into.marked.includes("In Depth")) throw new Error(`marking Theming after In Depth was closed, at the next frame: ${describeFold(into)}`);
  return (
    "a click on Guides' row closed it and a second opened it, Enter closed it and Space opened it, a click on " +
    `Reference's toggle opened it; marking Sections then left, at the next frame, ${describeFold(away)}; ` +
    `after a click on In Depth's row closed it, marking Theming again left ${describeFold(into)}`
  );
}

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

/** @type {Reading<ReturnType<typeof readPlace>>} */
const PLACE = {
  read: readPlace,
  args: [REFERENCE],
  describe: (state) => `Reference ${state.rendered ? (state.open ? "open" : "closed") : "not rendered"}, the nav scrolled ${state.scroll}px`,
};

/**
 * In a new tab, which remembers nothing: opens Reference, which the page leaves closed, from the toggle beside its
 * link, scrolls the nav at a short viewport and loads the same page again, where only the remembered state opens
 * Reference. Then the parser builds the page again with the library already defined, and Reference opens again.
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
    await poll(tab, "Reference in a new tab", PLACE, (state) => state.rendered && !state.open);
    await tab.click(TOGGLE);
    await poll(tab, "a click on Reference's toggle", PLACE, (state) => state.open);
    const scrolled = await tab.evaluate(scrollNav, 48);
    if (scrolled.range <= 0 || scrolled.scroll <= 0) throw new Error(`the nav does not scroll at ${SHORT.height}px: range ${scrolled.range}px`);
    // Not a reload, which Firefox answers by scrolling the nav back itself.
    await tab.goto(tab.url(), { waitUntil: "load", timeout: NAVIGATION_TIMEOUT });
    await tab.evaluate(() => customElements.whenDefined("neuwo-sidebar"));
    const left = Number(await tab.evaluate(() => sessionStorage.getItem("integration.left")));
    const arrived = await poll(tab, "loading the page again", PLACE, (state) => state.rendered);
    if (!arrived.open || left <= 0 || Math.abs(arrived.scroll - left) > 1) {
      throw new Error(`loading the page again: Reference ${arrived.open ? "open" : "closed"}, the nav scrolled ${arrived.scroll}px of the ${left}px it left at`);
    }
    results.push({
      check: "sidebarRemember",
      status: "pass",
      detail: `Reference, closed in a new tab, opened from its toggle; after loading the page again it is open and the nav is scrolled ${arrived.scroll}px, as it was left`,
    });
  } catch (error) {
    results.push({ check: "sidebarRemember", status: "fail", detail: error.message });
  }
  try {
    if (results[0].status !== "pass") throw new Error("needs sidebarRemember to pass first");
    await tab.evaluate(rewrite);
    const again = await poll(tab, "the page built again with the library defined", PLACE, (state) => state.rendered);
    if (!again.open) throw new Error("the page built again with the library defined: Reference closed");
    results.push({ check: "sidebarRememberEarly", status: "pass", detail: "built again by the parser with the library already defined, the page opens Reference from storage" });
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
 * with their expanded state, Guides and In Depth open around Theming and Reference closed, and the page's link is the
 * node carrying `aria-current`, which the tree does not report.
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
    if (states.Guides !== "true" || states["In Depth"] !== "true" || states["Show Reference pages"] !== "false") {
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
      detail: `a navigation named ${label} with ${lists.length} lists holding only list items; disclosures Guides and In Depth expanded, Show Reference pages collapsed; the link ${current[0]} carries aria-current="page"`,
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
 * The sidebar checks for `demo/iframes/sidebar.html`: the column shows every top-level entry whatever the phone menu
 * was left as, and Tab reaches the first from the brand; below 48rem the menu button shows and hides the nav;
 * Chromium's accessibility tree holds the nav's lists and sections; a section folds from its row or toggle, stays open
 * as the mark moves away and opens again as it moves back; and with `remember` the open sections and the nav's scroll
 * come back when the page loads again.
 * @param {import("puppeteer-core").Page} page
 * @returns {Promise<CheckResult[]>}
 */
export async function checkSidebar(page) {
  await page.evaluate(() => customElements.whenDefined("neuwo-sidebar"));
  return [
    await run(page, "sidebarDesktop", async () => {
      await page.setViewport(VIEWPORT);
      const closed = await poll(page, `at ${VIEWPORT.width}px with the menu closed`, SIDEBAR, (state) => allShown(state) && !state.toggle && !state.open);
      await page.focus(".neuwo-sidebar__brand a");
      await page.keyboard.press("Tab");
      const tab = await page.evaluate(readFocus);
      if (tab.focused !== "the first entry") throw new Error(`Tab from the brand at ${VIEWPORT.width}px focused ${tab.focused}, not ${tab.first}`);
      await page.setViewport(PHONE);
      await poll(page, `at ${PHONE.width}px`, SIDEBAR, (state) => state.toggle);
      await page.click(".neuwo-sidebar__toggle");
      await poll(page, `opening the menu at ${PHONE.width}px`, SIDEBAR, (state) => state.open && state.nav);
      await page.setViewport(VIEWPORT);
      const opened = await poll(page, `back at ${VIEWPORT.width}px with the menu open`, SIDEBAR, (state) => allShown(state) && !state.toggle && state.open);
      return `at ${VIEWPORT.width}px ${describe(closed)}, and Tab from the brand focused ${tab.first}; after opening the menu at ${PHONE.width}px and widening again, ${describe(opened)}`;
    }),
    await run(page, "sidebarPhone", async () => {
      await page.setViewport(PHONE);
      const closed = await poll(page, `at ${PHONE.width}px`, SIDEBAR, (state) => state.toggle && !state.nav && !state.open);
      await page.click(".neuwo-sidebar__toggle");
      const opened = await poll(page, "the first click on the menu button", SIDEBAR, (state) => state.nav && state.open);
      await page.click(".neuwo-sidebar__toggle");
      await poll(page, "the second click on the menu button", SIDEBAR, (state) => !state.nav && !state.open);
      await page.setViewport(NARROW);
      const bar = await poll(page, `the bar at ${NARROW.width}px`, BAR, (state) => Boolean(state.actions && state.toggle) && !state.hit);
      return (
        `at ${PHONE.width}px ${describe(closed)}; a click showed the nav (${opened.shown} of ${opened.entries} entries), a second hid it; ` +
        `at ${NARROW.width}px ${describeBar(bar)}`
      );
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
  `at ${state.path}, open: ${state.open.join(", ") || "none"}; marked: ${state.marked.join(", ") || "none"}; aria-current on ${state.current.join(", ") || "nothing"}` +
  (state.around.length ? `; around the entry: ${state.around.join(", ")}` : "");

/**
 * @param {string | null} [href]
 * @returns {Reading<ReturnType<typeof readNav>>}
 */
const navState = (href = null) => ({ read: readNav, args: [href], describe: describeNav });

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
 * logs, naming what it logged beside a step that threw. A step the browser cannot take makes the check n/a, unless
 * the tab logged something first.
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
    const logged = messages.length ? `; the tab logged ${judgeConsole({ messages: [...messages] }).detail}` : "";
    if (error instanceof UnsupportedOperation && !logged) return { check, status: "n/a", detail: error.message };
    return { check, status: "fail", detail: `${error.message}${logged}` };
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
        await poll(tab, `opening the menu at ${PHONE.width}px`, navState(), (state) => state.menu);
      }
      const [label] = (await tab.evaluate(readNav, null)).closed;
      if (!label) throw new Error(`at ${viewport.width}px no section is left closed to open`);
      await tab.click(SUMMARY(label));
      const opened = await poll(tab, `a click on ${label} at ${viewport.width}px`, navState(), (state) => state.open.includes(label));
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
    const opened = await poll(tab, `a click on the menu button at ${PHONE.width}px without JavaScript`, SIDEBAR, (state) => state.nav);
    const links = await tab.$$eval(".neuwo-sidebar__nav a[href]", (anchors) => anchors.map((anchor) => anchor.href));
    const origin = new URL(url).origin;
    const here = links.filter((link) => new URL(link).origin === origin);
    const elsewhere = links.filter((link) => !here.includes(link));
    const answers = await Promise.all(here.map(async (link) => ({ path: new URL(link).pathname, status: (await fetch(link, { redirect: "manual" })).status })));
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
 * On a React app with a client-side router: opens a section the second page is not in, follows the second page's
 * entry while the sections around it are closed, and comes back. Each time the document stays, every open section
 * stays open and the mark moves; arriving opens and marks the sections around the entry, and leaving keeps them open.
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
    if (!start.around.length || start.around.every((label) => start.open.includes(label))) {
      throw new Error(`no closed section around ${SECOND_PAGE} at the start; ${describeNav(start)}`);
    }
    const [home] = start.current;
    await tab.evaluate(() => (window.__neuwoStay = true));
    const [other] = start.closed.filter((label) => !start.around.includes(label));
    if (!other) throw new Error(`no closed section outside ${start.around.join(", ")} to open`);
    await tab.click(SUMMARY(other));
    const opened = await poll(tab, `a click on ${other}`, navState(SECOND_PAGE), (state) => state.open.includes(other));
    /**
     * @param {ReturnType<typeof readNav>} before
     * @param {string} href
     * @param {() => Promise<unknown>} click
     */
    const follow = async (before, href, click) => {
      await click();
      const arrived = (state) => state.path === href && state.current.join() === href && state.around.every((label) => state.open.includes(label) && state.marked.includes(label));
      const after = await poll(tab, `following ${href} until the sections around it are open and marked`, navState(href), arrived);
      if (!after.stay) throw new Error(`following ${href} loaded a new document`);
      const closed = before.open.filter((label) => !after.open.includes(label));
      if (closed.length) throw new Error(`following ${href} closed ${closed.join(", ")}; ${describeNav(after)}`);
      return after;
    };
    const there = await follow(opened, SECOND_PAGE, () => tab.$eval(ENTRY(SECOND_PAGE), (link) => link.click()));
    const back = await follow(there, home, () => tab.click(ENTRY(home)));
    return (
      `with no new document, ${other} opened, and a script click on the hidden ${SECOND_PAGE} entry moved aria-current there ` +
      `and opened ${there.around.join(", ")} by itself, leaving ${there.open.join(", ")} open; following ${home} back moved it again ` +
      `and left ${back.open.join(", ")} open`
    );
  });
}

/**
 * The checks for a server-rendered example: a reload after opening a section shifts nothing at either width, the
 * phone menu works and leads to real pages without JavaScript, and on a React app with a client-side router a client
 * navigation keeps the document and the open sections, opens the branch it arrives in and moves the mark.
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
