const NAVIGATION_TIMEOUT = 60_000;
const READY_TIMEOUT = 30_000;
const STEP_TIMEOUT = 5_000;
const FIRST_ECHO = { email: "", plan: "free", terms: false, volume: "30" };
const FIRST_FIELDS = { email: "", plan: "Free", terms: false, volume: "30" };
const LAST_ECHO = { email: "abc", plan: "pro", terms: true, volume: "31" };
const LAST_FIELDS = { email: "abc", plan: "Pro", terms: true, volume: "31" };
const DEFAULTS = { name: "Ada", plan: "pro", news: "on", volume: "60" };
const CHANGED = { name: "Ada Lovelace", plan: "team", volume: "59" };

function readControlled() {
  const find = (selector) => document.querySelector(`#controlled ${selector}`);
  return {
    echo: find("#controlled-echo")?.textContent ?? null,
    fields: {
      email: find("neuwo-input input")?.value ?? null,
      plan: find(".neuwo-combobox__value")?.textContent.trim() ?? null,
      terms: find("neuwo-checkbox input")?.checked ?? null,
      volume: find("neuwo-range input")?.value ?? null,
    },
  };
}

function readResult() {
  const text = (selector) => document.querySelector(selector)?.textContent.trim() ?? null;
  return { submitted: text("#uncontrolled-result"), entries: text("#uncontrolled-entries"), shown: text("#uncontrolled .neuwo-combobox__value") };
}

function parse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const holds = (actual, expected) => Boolean(actual) && Object.entries(expected).every(([key, value]) => actual[key] === value);
const equals = (actual, expected) => holds(actual, expected) && Object.keys(actual).length === Object.keys(expected).length;
const once = (entries, expected) => Array.isArray(entries) && entries.length === Object.keys(expected).length && new Set(entries.map(([name]) => name)).size === entries.length;

async function until(page, step, read, accept, describe) {
  const deadline = Date.now() + STEP_TIMEOUT;
  for (;;) {
    const state = await page.evaluate(read);
    if (accept(state)) return state;
    if (Date.now() > deadline) throw new Error(`${step}: ${describe(state)}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function pick(page, form, value) {
  await page.click(`#${form} neuwo-combobox [role="combobox"]`);
  const option = `#${form} neuwo-combobox [role="option"][data-value="${value}"]`;
  await page.waitForSelector(option, { visible: true, timeout: STEP_TIMEOUT });
  await page.click(option);
}

async function nudge(page, form, key) {
  await page.focus(`#${form} neuwo-range input`);
  await page.keyboard.press(key);
}

async function controlled(page) {
  const shows = async (step, echo, fields) => {
    const accept = (state) => holds(parse(state.echo), echo) && holds(state.fields, fields);
    const state = await until(page, step, readControlled, accept, (state) => `the echo reads ${state.echo}, the fields show ${JSON.stringify(state.fields)}`);
    return state.echo;
  };
  await shows("the first render", FIRST_ECHO, FIRST_FIELDS);
  await page.type("#controlled neuwo-input input", "abc");
  await shows('typing "abc"', { email: "abc" }, { email: "abc" });
  await pick(page, "controlled", "pro");
  await shows("picking a combobox option", { plan: "pro" }, { plan: "Pro" });
  await page.click("#controlled neuwo-checkbox label");
  await shows("ticking the checkbox", { terms: true }, { terms: true });
  await nudge(page, "controlled", "ArrowRight");
  return shows("moving the range", LAST_ECHO, LAST_FIELDS);
}

async function uncontrolled(page) {
  const submit = async (step, expected, shown) => {
    await page.click('#uncontrolled button[type="submit"]');
    const accept = (state) => equals(parse(state.submitted), expected) && once(parse(state.entries), expected) && (!shown || state.shown === shown);
    const state = await until(page, step, readResult, accept, (state) => `submitted ${state.entries || "nothing"}, with ${state.shown} shown`);
    return state.submitted;
  };
  await submit("submitting the defaults", DEFAULTS);
  await page.focus("#uncontrolled neuwo-input input");
  await page.keyboard.press("End");
  await page.keyboard.type(" Lovelace");
  await pick(page, "uncontrolled", "team");
  await page.click("#uncontrolled neuwo-checkbox label");
  await nudge(page, "uncontrolled", "ArrowLeft");
  const changed = await submit("submitting changed values", CHANGED);
  await page.click('#uncontrolled button[type="reset"]');
  const reset = await submit("submitting after a reset", DEFAULTS, "Pro");
  return { changed, reset };
}

export async function checkForms(page) {
  try {
    await page.waitForSelector("#forms[data-ready]", { timeout: READY_TIMEOUT });
    const echo = await controlled(page);
    const { changed, reset } = await uncontrolled(page);
    return { check: "forms", status: "pass", detail: `echo ${echo}; submitted ${changed}; reset to ${reset}` };
  } catch (error) {
    return { check: "forms", status: "fail", detail: error.message };
  }
}

export async function interact(page, url) {
  const response = await page.goto(url, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT });
  if (!response?.ok()) return [{ check: "forms", status: "fail", detail: `HTTP ${response?.status() ?? "no response"} for ${url}` }];
  return [await checkForms(page)];
}
