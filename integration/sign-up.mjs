const NAVIGATION_TIMEOUT = 60_000;
const READY_TIMEOUT = 30_000;
const STEP_TIMEOUT = 5_000;
const BLOCKED_WAIT = 300;
const EMAIL = "reader@example.com";
const FORM = 'form:has(neuwo-button[type="submit"])';

function watchLoading(form) {
  const button = form.querySelector("neuwo-button");
  window.__loadingSeen = false;
  new MutationObserver(() => {
    if (button.hasAttribute("loading")) window.__loadingSeen = true;
  }).observe(button, { attributes: true, attributeFilter: ["loading"] });
}

function readState(form) {
  return {
    loadingSeen: window.__loadingSeen,
    loading: form.querySelector("neuwo-button").hasAttribute("loading"),
    noticeVisible: form.querySelector("neuwo-notice").checkVisibility(),
  };
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function submitForm(page, index) {
  const fail = (step) => {
    throw new Error(`form ${index + 1}: ${step}`);
  };
  const form = (await page.$$(FORM))[index];
  const state = () => form.evaluate(readState);
  if ((await state()).noticeVisible) fail("the confirmation was visible before any submission");
  await form.evaluate(watchLoading);
  const submit = await form.$('neuwo-button[type="submit"] button');
  if (!submit) fail("no submit button");
  await submit.click();
  await pause(BLOCKED_WAIT);
  const blocked = await state();
  if (blocked.loadingSeen) fail("the empty submit set loading");
  if (blocked.noticeVisible) fail("the empty submit showed the confirmation");
  const field = await form.$('input[name="email"]');
  const label = await form.$('neuwo-checkbox[name="updates"] label');
  if (!field || !label) fail("no email input or updates checkbox label");
  await field.type(EMAIL);
  await label.click();
  await submit.click();
  const deadline = Date.now() + STEP_TIMEOUT;
  let done = await state();
  while (!done.noticeVisible && Date.now() < deadline) {
    await pause(50);
    done = await state();
  }
  if (!done.noticeVisible) fail("the confirmation did not appear within 5 s of a valid submit");
  if (!done.loadingSeen) fail("the valid submit never set loading");
  if (done.loading) fail("loading was still set when the confirmation appeared");
  return `form ${index + 1}: empty submit blocked, loading shown, confirmation shown`;
}

/**
 * @param {import("puppeteer-core").Page} page
 * @param {string} url
 * @param {{ forms: number, react: boolean }} options
 * @returns {Promise<import("./checks.mjs").CheckResult[]>}
 */
export async function submitSignUps(page, url, { forms, react }) {
  const result = (status, detail) => ({ check: "signUp", status, detail });
  const response = await page.goto(url, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT });
  if (!response?.ok()) return [result("fail", `HTTP ${response?.status() ?? "no response"} for ${url}`)];
  try {
    if (react) {
      // The examples carry no readiness marker, and React sets this property on every node it has rendered or hydrated.
      await page.waitForFunction(
        (selector) => {
          const found = [...document.querySelectorAll(selector)];
          return found.length > 0 && found.every((form) => Object.keys(form).some((key) => key.startsWith("__reactProps$")));
        },
        { timeout: READY_TIMEOUT },
        FORM,
      );
    }
    const count = await page.$$eval(FORM, (found) => found.length);
    if (count !== forms) return [result("fail", `expected ${forms} sign-up forms, found ${count}`)];
  } catch (error) {
    return [result("fail", `no sign-up form became ready: ${error.message}`)];
  }
  const results = [];
  for (let index = 0; index < forms; index += 1) {
    try {
      results.push(result("pass", await submitForm(page, index)));
    } catch (error) {
      results.push(result("fail", error.message));
    }
  }
  return results;
}
