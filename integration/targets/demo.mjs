import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serveStatic } from "../serve.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HOTPINK = "rgb(255, 105, 180)";
const PAGE_GREEN = "rgb(0, 128, 0)";
const HOLD_MS = 500;
const BUNDLE = "/dist/neuwo.js";
const NAVIGATION_TIMEOUT = 60_000;

export const checks = ["console", "singleCopy"];

export async function start() {
  const server = await serveStatic(ROOT, { delay: { [BUNDLE]: HOLD_MS } });
  return { pages: [`${server.url}/demo/index.html`], stop: server.stop };
}

function readPageRules() {
  const style = (element) => (element ? getComputedStyle(element) : {});
  const inside = (selector) => [...document.querySelectorAll(`neuwo-button ${selector}`)];
  return {
    plainClass: style(document.getElementById("control-class")).backgroundColor,
    plainElement: style(document.getElementById("control-plain")).color,
    components: inside(".neuwo-btn").map((element) => style(element).backgroundColor),
    componentButtons: [...document.querySelectorAll("neuwo-button button, neuwo-copy button")].map((element) => style(element).color),
    restyled: style(document.querySelector("neuwo-button.square .neuwo-btn")).borderRadius,
    untouched: style(document.querySelector("neuwo-button:not(.square) .neuwo-btn")).borderRadius,
  };
}

function judgePageRules({ plainClass, components }) {
  if (plainClass === undefined) return { status: "fail", detail: "no #control-class button outside a component" };
  if (plainClass !== HOTPINK) return { status: "fail", detail: `a plain .btn computes ${plainClass}, so the page rule is not live` };
  if (components.length === 0) return { status: "fail", detail: "no .neuwo-btn inside a neuwo-button" };
  const hit = components.filter((colour) => colour === HOTPINK).length;
  if (hit) return { status: "fail", detail: `${hit} of ${components.length} .neuwo-btn computes the page's hotpink` };
  return { status: "pass", detail: `${components.length} .neuwo-btn untouched, a plain .btn is ${HOTPINK}` };
}

function judgeElementRule({ plainElement, componentButtons }) {
  if (plainElement === undefined) return { status: "fail", detail: "no #control-plain button outside a component" };
  if (plainElement !== PAGE_GREEN) return { status: "fail", detail: `a plain button computes ${plainElement}, so the page rule is not live` };
  if (componentButtons.length === 0) return { status: "fail", detail: "no button inside a component" };
  const hit = componentButtons.filter((colour) => colour === PAGE_GREEN).length;
  if (hit) return { status: "fail", detail: `${hit} of ${componentButtons.length} component buttons take the bare button rule` };
  return { status: "pass", detail: `${componentButtons.length} component buttons untouched, a plain button is ${PAGE_GREEN}` };
}

function judgeHostRestyle({ restyled, untouched }) {
  if (restyled === undefined) return { status: "fail", detail: "no neuwo-button.square on the page" };
  if (restyled !== "0px") return { status: "fail", detail: `the host rule left a border-radius of ${restyled}` };
  if (untouched === "0px") return { status: "fail", detail: "an unscoped button lost its border-radius too" };
  return { status: "pass", detail: `restyled 0px, others ${untouched}` };
}

function recordBeforeDefinition() {
  document.addEventListener("readystatechange", () => {
    if (document.readyState !== "interactive") return;
    const output = document.getElementById("demo-views-value");
    window.__beforeDefinition = { defined: Boolean(customElements.get("neuwo-range")), readout: output ? output.value : null };
  });
}

function judgeReadout(name, { defined, readout }, expectDefined) {
  if (defined !== expectDefined) return { check: name, status: "fail", detail: `neuwo-range ${defined ? "was" : "was not"} defined at the reading` };
  if (!readout) return { check: name, status: "fail", detail: "the readout is empty" };
  if (/NaN/.test(readout)) return { check: name, status: "fail", detail: `the readout shows ${readout}` };
  return { check: name, status: "pass", detail: readout };
}

export async function interact(page, url) {
  const results = [];
  await page.evaluateOnNewDocument(recordBeforeDefinition);
  await page.goto(url, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT });
  await page.evaluate(() => customElements.whenDefined("neuwo-range"));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  const rules = await page.evaluate(readPageRules);
  results.push({ check: "pageClassRule", ...judgePageRules(rules) });
  results.push({ check: "pageElementRule", ...judgeElementRule(rules) });
  results.push({ check: "hostRestyle", ...judgeHostRestyle(rules) });

  const before = await page.evaluate(() => window.__beforeDefinition ?? null);
  if (!before) results.push({ check: "readoutBeforeDefinition", status: "fail", detail: "the readout was never read before definition" });
  else results.push(judgeReadout("readoutBeforeDefinition", before, false));
  const readout = await page.evaluate(() => ({ defined: Boolean(customElements.get("neuwo-range")), readout: document.getElementById("demo-views-value").value }));
  results.push(judgeReadout("readoutAfterDefinition", readout, true));
  return results;
}
