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
    return `<${node.localName}${attributes}>${[...node.childNodes].map(markup).join("")}</${node.localName}>`;
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
    served: await page.evaluate(compareServed),
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

function judgeAdoption({ writes, served }) {
  if (!writes) return { status: "fail", detail: "the mutation observer never ran" };
  if (served.hosts === 0) return { status: "fail", detail: "no neuwo-* element on the page" };
  const problems = [];
  if (writes.length) problems.push(`${writes.length} write(s); first: ${writes[0]}`);
  if (served.difference) problems.push(served.difference);
  if (problems.length) return { status: "fail", detail: problems.join("; ") };
  return { status: "pass", detail: `${served.hosts} neuwo-* elements as served, with no writes` };
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
