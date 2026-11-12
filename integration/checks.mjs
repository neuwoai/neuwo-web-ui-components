import { UnsupportedOperation } from "puppeteer-core";

/** @typedef {{ check: string, status: "pass" | "fail" | "n/a", detail: string }} CheckResult */

export const CHECKS = ["console", "layoutShift", "noScript", "adoption", "singleCopy"];
export const VIEWPORT = { width: 1280, height: 800 };

const HYDRATION = /hydrat|did not match|server rendered/i;
const NAVIGATION_TIMEOUT = 60_000;
const DEFINITION_TIMEOUT = 10_000;
// Only the button template holds this as a quoted literal; the standalone bundle's inlined CSS holds it as a selector.
const MARKER = "neuwo-btn__spinner";

function watchWrites() {
  const writes = [];
  const hostOf = (node) => {
    for (let current = node; current; current = current.parentNode) if (current.localName?.startsWith("neuwo-")) return current;
    return null;
  };
  const name = (node) => (node.nodeType === 1 ? `${node.localName}${node.classList[0] ? `.${node.classList[0]}` : ""}` : node.nodeName);
  // React's hydration sets these controls' attributes again to the values they hold; nothing else may.
  const resetByReact = new Set(["input", "textarea", "select"]);
  const unchanged = (records) => {
    const same = new Set();
    const later = new Map();
    for (const record of [...records].reverse()) {
      if (record.type !== "attributes" || !resetByReact.has(record.target.localName)) continue;
      const key = `${record.attributeNamespace} ${record.attributeName}`;
      if (!later.has(record.target)) later.set(record.target, new Map());
      const values = later.get(record.target);
      // A record keeps only the old value; its new one is the next record's old value, or the current one.
      const value = values.has(key) ? values.get(key) : record.target.getAttributeNS(record.attributeNamespace, record.attributeName);
      if (value === record.oldValue) same.add(record);
      values.set(key, record.oldValue);
    }
    return same;
  };
  const judge = (records, parsing) => {
    const same = unchanged(records);
    for (const record of records) {
      const host = hostOf(record.target);
      if (!host || same.has(record)) continue;
      // The parser only adds nodes; a script's rebuild also removes them, or writes after parsing.
      if (parsing && record.type === "childList" && record.removedNodes.length === 0) continue;
      const what = record.type === "attributes" ? `attribute ${record.attributeName}` : record.type;
      writes.push(`${what} on ${name(record.target)} in ${host.localName}`);
    }
  };
  const observer = new MutationObserver((records) => judge(records, document.readyState === "loading"));
  observer.observe(document, { subtree: true, childList: true, attributes: true, attributeOldValue: true, characterData: true });
  // Firefox delivers the parser's records only after the document stops loading, so take them as it stops.
  document.addEventListener("readystatechange", () => {
    if (document.readyState === "interactive") judge(observer.takeRecords(), true);
  });
  Object.defineProperty(window, "__neuwoWrites", { value: writes });
}

async function settle(timeout) {
  const tags = [...new Set([...document.querySelectorAll("*")].map((element) => element.localName))].filter((tag) => tag.startsWith("neuwo-"));
  const expired = new Promise((resolve) => setTimeout(resolve, timeout, "expired"));
  if ((await Promise.race([Promise.all(tags.map((tag) => customElements.whenDefined(tag))), expired])) === "expired") {
    return `never defined: ${tags.filter((tag) => !customElements.get(tag)).join(", ")}`;
  }
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  await frame();
  await document.fonts.ready;
  await frame();
  await frame();
  return null;
}

function buttonBackground() {
  const button = document.querySelector(".neuwo-btn");
  if (!button) return null;
  const read = (element) => {
    const style = getComputedStyle(element);
    return `${style.backgroundColor} ${style.backgroundImage}`;
  };
  const plain = document.createElement(button.localName);
  document.body.append(plain);
  const backgrounds = { recipe: read(button), plain: read(plain) };
  plain.remove();
  return backgrounds;
}

function layoutShift() {
  if (!PerformanceObserver.supportedEntryTypes.includes("layout-shift")) return null;
  const observer = new PerformanceObserver(() => {});
  observer.observe({ type: "layout-shift", buffered: true });
  const shifts = observer.takeRecords().filter((entry) => !entry.hadRecentInput);
  observer.disconnect();
  const name = (node) => (!node ? "a removed node" : node.nodeType === 1 ? `${node.localName}${node.classList[0] ? `.${node.classList[0]}` : ""}` : node.nodeName);
  return {
    total: shifts.reduce((sum, entry) => sum + entry.value, 0),
    sources: [...new Set(shifts.flatMap((entry) => entry.sources.map((source) => name(source.node))))],
  };
}

async function compareServed() {
  const hostsOf = (root) => [...root.querySelectorAll("*")].filter((element) => element.localName.startsWith("neuwo-"));
  const live = hostsOf(document);
  const response = await fetch(location.href, { cache: "no-store" });
  if (!response.ok) return { hosts: live.length, difference: `fetching the page again gave HTTP ${response.status}` };
  const served = hostsOf(new DOMParser().parseFromString(await response.text(), "text/html"));
  if (served.length !== live.length) return { hosts: live.length, difference: `${served.length} neuwo-* elements served, ${live.length} live` };
  const markup = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.data;
    if (node.nodeType === Node.COMMENT_NODE) return `<!--${node.data}-->`;
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const attributes = [...node.attributes].map(({ name, value }) => ` ${name}="${value}"`).sort().join("");
    // DOMParser keeps scripting off, so a noscript holds elements there and raw text on the live page.
    const inner = node.localName === "noscript" ? "" : [...node.childNodes].map(markup).join("");
    return `<${node.localName}${attributes}>${inner}</${node.localName}>`;
  };
  for (const [index, host] of live.entries()) {
    const before = markup(served[index]);
    const after = markup(host);
    if (before === after) continue;
    let at = 0;
    while (before[at] === after[at]) at++;
    const from = Math.max(0, at - 30);
    return { hosts: live.length, difference: `${host.localName} #${index + 1} differs from its served markup at "${before.slice(from, at + 30)}", now "${after.slice(from, at + 30)}"` };
  }
  return { hosts: live.length, difference: null };
}

async function countCopies(marker) {
  const literal = new RegExp(`["'\`]${marker}["'\`]`, "g");
  const count = (text) => text.match(literal)?.length ?? 0;
  const local = (url) => (url.startsWith(location.origin) ? url.slice(location.origin.length) : url);
  // Vite fetches its chunks through modulepreload links, which report the initiator "link".
  const urls = performance
    .getEntriesByType("resource")
    .filter((entry) => entry.initiatorType === "script" || /\.m?js$/.test(new URL(entry.name).pathname))
    .map((entry) => entry.name);
  const scripts = await Promise.all(
    [...new Set(urls)].map(async (url) => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return { source: local(url), problem: `HTTP ${response.status}` };
        return { source: local(url), count: count(await response.text()) };
      } catch (error) {
        return { source: local(url), problem: error.message };
      }
    }),
  );
  const inline = [...document.querySelectorAll('script[type="module"]:not([src])')].map((script, index) => ({
    source: `inline module script ${index + 1}`,
    count: count(script.text),
  }));
  return [...scripts, ...inline];
}

export function recordErrors(page) {
  const messages = [];
  page.on("console", (message) => {
    const type = message.type();
    if (type === "error" || ((type === "warn" || type === "warning") && HYDRATION.test(message.text()))) messages.push(`console ${type}: ${message.text()}`);
  });
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));
  return messages;
}

async function loadLive(context, url) {
  const page = await context.newPage();
  await page.setViewport(VIEWPORT);
  const messages = recordErrors(page);
  await page.evaluateOnNewDocument(watchWrites);
  const response = await page.goto(url, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT });
  if (!response?.ok()) return { problem: `HTTP ${response?.status() ?? "no response"} for ${url}` };
  const problem = await page.evaluate(settle, DEFINITION_TIMEOUT);
  if (problem) return { problem };
  return {
    shift: await page.evaluate(layoutShift),
    writes: await page.evaluate(() => (window.__neuwoWrites ? [...window.__neuwoWrites] : null)),
    served: await page.evaluate(compareServed),
    background: await page.evaluate(buttonBackground),
    copies: await page.evaluate(countCopies, MARKER),
    // Copied last, so a message logged while the evaluations above fetch and measure still counts.
    messages: [...messages],
  };
}

async function loadWithoutScript(context, url) {
  const page = await context.newPage();
  try {
    await page.setJavaScriptEnabled(false);
  } catch (error) {
    if (error instanceof UnsupportedOperation) return { unsupported: error.message };
    throw error;
  }
  await page.setViewport(VIEWPORT);
  const response = await page.goto(url, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT });
  // The live load in this context cached the page, so a server that sends validators answers 304.
  if (!response?.ok() && response?.status() !== 304) return { problem: `HTTP ${response?.status() ?? "no response"} for ${url}` };
  return { background: await page.evaluate(buttonBackground) };
}

export function judgeConsole({ messages }) {
  if (messages.length === 0) return { status: "pass", detail: "" };
  return { status: "fail", detail: `${messages.length} message(s): ${messages.slice(0, 3).join("; ")}` };
}

function judgeLayoutShift({ shift }, browserName) {
  if (!shift) return { status: "n/a", detail: `${browserName} reports no layout-shift entries` };
  if (shift.total === 0) return { status: "pass", detail: "0" };
  return { status: "fail", detail: `${Number(shift.total.toPrecision(3))} from ${shift.sources.join(", ")}` };
}

function judgeAdoption({ writes, served }) {
  if (!writes) return { status: "fail", detail: "the mutation observer never ran" };
  if (served.hosts === 0) return { status: "fail", detail: "no neuwo-* element on the page" };
  const problems = [];
  if (writes.length) problems.push(`${writes.length} write(s); first: ${writes[0]}`);
  if (served.difference) problems.push(served.difference);
  if (problems.length) return { status: "fail", detail: problems.join("; ") };
  return { status: "pass", detail: `${served.hosts} neuwo-* elements as served, with no writes` };
}

function judgeSingleCopy({ copies }) {
  const unread = copies.filter((script) => script.problem);
  if (unread.length) return { status: "fail", detail: `could not read ${unread.map(({ source, problem }) => `${source} (${problem})`).join(", ")}` };
  const holders = copies.filter((script) => script.count > 0);
  const total = holders.reduce((sum, script) => sum + script.count, 0);
  if (total === 0) return { status: "fail", detail: `no copy of the library code in ${copies.length} script(s)` };
  if (total > 1) return { status: "fail", detail: `${total} copies: ${holders.map(({ source, count }) => `${source} ${count}`).join(", ")}` };
  return { status: "pass", detail: `1 copy, in ${holders[0].source}, of ${copies.length} script(s)` };
}

function judgeNoScript(live, offline) {
  if (offline.unsupported) return { status: "n/a", detail: `cannot disable JavaScript: ${offline.unsupported}` };
  if (offline.problem) return { status: "fail", detail: offline.problem };
  if (!offline.background) return { status: "fail", detail: "no .neuwo-btn in the served markup" };
  const { recipe, plain } = offline.background;
  if (recipe === plain) return { status: "fail", detail: `the browser default ${recipe}` };
  if (recipe !== live.background?.recipe) return { status: "fail", detail: `${recipe}, but ${live.background?.recipe ?? "no .neuwo-btn"} with JavaScript` };
  return { status: "pass", detail: recipe };
}

export async function runChecks(browser, browserName, url, names) {
  const unknown = names.filter((name) => !CHECKS.includes(name));
  if (unknown.length) throw new Error(`Unknown checks: ${unknown.join(", ")}`);
  const context = await browser.createBrowserContext();
  try {
    const live = await loadLive(context, url);
    const offline = names.includes("noScript") && !live.problem ? await loadWithoutScript(context, url) : {};
    return names.map((check) => {
      if (live.problem) return { check, status: "fail", detail: live.problem };
      if (check === "console") return { check, ...judgeConsole(live) };
      if (check === "layoutShift") return { check, ...judgeLayoutShift(live, browserName) };
      if (check === "adoption") return { check, ...judgeAdoption(live) };
      if (check === "singleCopy") return { check, ...judgeSingleCopy(live) };
      return { check, ...judgeNoScript(live, offline) };
    });
  } catch (error) {
    return names.map((check) => ({ check, status: "fail", detail: error.message }));
  } finally {
    await context.close();
  }
}
