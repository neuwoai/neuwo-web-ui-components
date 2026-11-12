import { UnsupportedOperation } from "puppeteer-core";

/** @typedef {{ check: string, status: "pass" | "fail" | "n/a", detail: string }} CheckResult */

export const CHECKS = ["console", "layoutShift", "noScript", "adoption"];
export const VIEWPORT = { width: 1280, height: 800 };

const HYDRATION = /hydrat|did not match|server rendered/i;
const NAVIGATION_TIMEOUT = 60_000;
const DEFINITION_TIMEOUT = 10_000;

function watchWrites() {
  const writes = [];
  const hostOf = (node) => {
    for (let current = node; current; current = current.parentNode) if (current.localName?.startsWith("neuwo-")) return current;
    return null;
  };
  const name = (node) => (node.nodeType === 1 ? `${node.localName}${node.classList[0] ? `.${node.classList[0]}` : ""}` : node.nodeName);
  const judge = (records, parsing) => {
    for (const record of records) {
      const host = hostOf(record.target);
      if (!host) continue;
      // The parser only adds nodes; a script's rebuild also removes them, or writes after parsing.
      if (parsing && record.type === "childList" && record.removedNodes.length === 0) continue;
      const what = record.type === "attributes" ? `attribute ${record.attributeName}` : record.type;
      writes.push(`${what} on ${name(record.target)} in ${host.localName}`);
    }
  };
  const observer = new MutationObserver((records) => judge(records, document.readyState === "loading"));
  observer.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
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
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
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

async function loadLive(context, url) {
  const page = await context.newPage();
  await page.setViewport(VIEWPORT);
  const messages = [];
  page.on("console", (message) => {
    const type = message.type();
    if (type === "error" || ((type === "warn" || type === "warning") && HYDRATION.test(message.text()))) messages.push(`console ${type}: ${message.text()}`);
  });
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));
  await page.evaluateOnNewDocument(watchWrites);
  const response = await page.goto(url, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT });
  if (!response?.ok()) return { problem: `HTTP ${response?.status() ?? "no response"} for ${url}` };
  const problem = await page.evaluate(settle, DEFINITION_TIMEOUT);
  if (problem) return { problem };
  return {
    messages: [...messages],
    shift: await page.evaluate(layoutShift),
    writes: await page.evaluate(() => (window.__neuwoWrites ? [...window.__neuwoWrites] : null)),
    hosts: await page.evaluate(() => [...document.querySelectorAll("*")].filter((element) => element.localName.startsWith("neuwo-")).length),
    background: await page.evaluate(buttonBackground),
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
  if (!response?.ok()) return { problem: `HTTP ${response?.status() ?? "no response"} for ${url}` };
  return { background: await page.evaluate(buttonBackground) };
}

function judgeConsole({ messages }) {
  if (messages.length === 0) return { status: "pass", detail: "" };
  return { status: "fail", detail: `${messages.length} message(s); first: ${messages[0]}` };
}

function judgeLayoutShift({ shift }, browserName) {
  if (!shift) return { status: "n/a", detail: `${browserName} reports no layout-shift entries` };
  if (shift.total === 0) return { status: "pass", detail: "0" };
  return { status: "fail", detail: `${Number(shift.total.toPrecision(3))} from ${shift.sources.join(", ")}` };
}

function judgeAdoption({ writes, hosts }) {
  if (!writes) return { status: "fail", detail: "the mutation observer never ran" };
  if (hosts === 0) return { status: "fail", detail: "no neuwo-* element on the page" };
  if (writes.length === 0) return { status: "pass", detail: `no writes inside ${hosts} neuwo-* elements` };
  return { status: "fail", detail: `${writes.length} write(s); first: ${writes[0]}` };
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
      return { check, ...judgeNoScript(live, offline) };
    });
  } catch (error) {
    return names.map((check) => ({ check, status: "fail", detail: error.message }));
  } finally {
    await context.close();
  }
}
