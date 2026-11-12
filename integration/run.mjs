import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launch } from "./browsers.mjs";
import { CHECKS, VIEWPORT, judgeConsole, recordErrors, runChecks } from "./checks.mjs";
import { Finishing, closeCommands, runCommand, serveStatic } from "./serve.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const PACKAGE = "@neuwo/web-ui-library--demo";
const BROWSERS = ["chromium", "firefox"];
const INTERACT_CONSOLE = "interactConsole";
const SELF_TEST = {
  "good.html": [],
  "console-error.html": ["console", INTERACT_CONSOLE],
  "interact-error.html": [INTERACT_CONSOLE],
  "layout-shift.html": ["layoutShift"],
  "rebuild.html": ["adoption"],
  "loading-write.html": ["adoption"],
  "unstyled.html": ["noScript"],
  "noscript-host.html": [],
  "noscript-loading-write.html": ["adoption"],
  "attribute-reset.html": [],
  "attribute-reset-button.html": ["adoption"],
  "attribute-write.html": ["adoption"],
  "two-copies.html": ["singleCopy"],
  "no-copy.html": ["singleCopy"],
};
const pressButton = {
  async interact(page, url) {
    await page.goto(url, { waitUntil: "load" });
    await page.click("neuwo-button .neuwo-btn");
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    return [];
  },
};
const USAGE = "Usage: node integration/run.mjs [--self-test] [--browser=chromium|firefox|all] [--keep] [target ...]";

const SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"];
const live = { app: null, browsers: new Map(), work: null, keep: false };
let finishing = null;
let signalled = false;

class Halt extends Error {}

const log = (message) => process.stderr.write(`${message}\n`);
const oneLine = (text) => String(text).replace(/\s+/g, " ").trim();

function print(target, browser, page, { check, status, detail }) {
  const columns = [target.padEnd(10), browser.padEnd(9), page.padEnd(19), check.padEnd(12), status.padEnd(5), oneLine(detail)];
  console.log(columns.join(" ").trimEnd());
}

function parse(args, known) {
  const options = { selfTest: false, browsers: BROWSERS, keep: false, targets: [] };
  for (const arg of args) {
    if (arg === "--self-test") options.selfTest = true;
    else if (arg === "--keep") options.keep = true;
    else if (arg.startsWith("--browser=")) {
      const value = arg.slice("--browser=".length);
      if (value !== "all" && !BROWSERS.includes(value)) throw new Halt(`Unknown browser "${value}".\n${USAGE}`);
      options.browsers = value === "all" ? BROWSERS : [value];
    } else if (arg.startsWith("-")) throw new Halt(`Unknown option "${arg}".\n${USAGE}`);
    else if (!known.includes(arg)) throw new Halt(`Unknown target "${arg}"; the targets are ${known.join(", ")}.`);
    else options.targets.push(arg);
  }
  if (!options.selfTest && options.targets.length === 0) options.targets = known;
  return options;
}

async function pack(work) {
  log("Packing the library");
  await runCommand("npm", ["pack", "--pack-destination", work], { cwd: ROOT });
  const tarball = (await readdir(work)).find((name) => name.endsWith(".tgz"));
  if (!tarball) throw new Error("npm pack wrote no tarball.");
  return join(work, tarball);
}

async function copyApps(work, tarball) {
  const apps = join(work, "apps");
  await cp(join(HERE, "apps"), apps, { recursive: true, filter: (source) => !/[\\/](node_modules|_site|dist|\.next)$/.test(source) });
  for (const name of await readdir(apps)) {
    const file = join(apps, name, "package.json");
    const text = await readFile(file, "utf8").catch(() => null);
    if (text === null) continue;
    const manifest = JSON.parse(text);
    // An app's own copy resolves the imports in it from that app's node_modules.
    for (const folder of manifest.neuwoIntegration?.copy ?? []) await cp(join(apps, folder), join(apps, name, folder), { recursive: true });
    manifest.dependencies = { ...manifest.dependencies, [PACKAGE]: `file:${tarball}` };
    await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

async function selfTest(browsers) {
  const { expand } = await import(pathToFileURL(join(ROOT, "dist", "server.js")).href);
  const server = await serveStatic(ROOT, { html: expand });
  const broken = [];
  const skipped = new Map([...CHECKS, INTERACT_CONSOLE].map((check) => [check, new Set()]));
  const own = new Map(Object.entries(SELF_TEST).map(([page, failing]) => [page, new Map(failing.map((check) => [check, []]))]));
  try {
    for (const [name, browser] of browsers) {
      for (const [page, failing] of Object.entries(SELF_TEST)) {
        const url = `${server.url}/integration/self-test/${page}`;
        const results = [...(await runChecks(browser, name, url, CHECKS)), ...(await interactWith(browser, pressButton, url))];
        for (const result of results) {
          print("self-test", name, page, result);
          if (result.status === "n/a") skipped.get(result.check)?.add(name);
          own.get(page).get(result.check)?.push(result.status);
          const expected = failing.includes(result.check) ? "fail" : "pass";
          if (result.status !== expected && result.status !== "n/a") {
            broken.push(`broken: ${name} ${page} ${result.check}: expected ${expected}, got ${result.status}`);
          }
        }
      }
    }
  } finally {
    await server.stop();
  }
  for (const [page, checks] of own) {
    for (const [check, statuses] of checks) {
      if (statuses.length === 0) broken.push(`unproven: ${check} on ${page} (it never ran)`);
      else if (statuses.every((status) => status === "n/a")) broken.push(`unproven: ${check} on ${page} (n/a in ${[...skipped.get(check)].join(", ")})`);
    }
  }
  for (const line of broken) console.log(`self-test ${line}`);
  if (broken.length === 0) console.log("self-test held: every page met its expectation, and each check failed on its own page in at least one browser");
  const notApplicable = [...skipped].filter(([, names]) => names.size).map(([check, names]) => `${check} in ${[...names].join(", ")}`);
  if (notApplicable.length) console.log(`self-test n/a: ${notApplicable.join("; ")}`);
  return broken.length === 0;
}

async function interactWith(browser, target, url) {
  const context = await browser.createBrowserContext();
  let messages = [];
  try {
    const page = await context.newPage();
    messages = recordErrors(page);
    await page.setViewport(VIEWPORT);
    const results = await target.interact(page, url);
    return [...results, { check: INTERACT_CONSOLE, ...judgeConsole({ messages: [...messages] }) }];
  } catch (error) {
    const results = [{ check: "interact", status: "fail", detail: error.message }];
    if (messages.length) results.push({ check: INTERACT_CONSOLE, ...judgeConsole({ messages: [...messages] }) });
    return results;
  } finally {
    await context.close();
  }
}

function finish() {
  finishing ??= (async () => {
    await Promise.allSettled([Promise.resolve().then(() => live.app?.stop()), closeCommands()]);
    await Promise.allSettled([...live.browsers.values()].map((browser) => browser.close()));
    if (!live.work) return;
    if (live.keep) return log(`Kept the work folder ${live.work}`);
    try {
      await rm(live.work, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch (error) {
      log(`Could not remove the work folder ${live.work}: ${error.message}`);
    }
  })();
  return finishing;
}

function stopOnSignals() {
  for (const signal of SIGNALS) {
    process.once(signal, () => {
      signalled = true;
      log(`Stopping on ${signal}`);
      finish()
        .catch((error) => log(String(error?.stack ?? error)))
        .finally(() => process.exit(130));
    });
  }
}

async function runTarget(name, browsers, context) {
  const target = await import(pathToFileURL(join(HERE, "targets", `${name}.mjs`)).href);
  log(`Starting ${name}`);
  let app;
  try {
    app = await target.start(context);
  } catch (error) {
    if (error instanceof Finishing) return false;
    log(String(error?.stack ?? error));
    print(name, "-", "-", { check: "start", status: "fail", detail: error.message });
    return false;
  }
  if (!app.pages?.length) {
    await app.stop().catch((error) => log(String(error?.stack ?? error)));
    print(name, "-", "-", { check: "start", status: "fail", detail: "the target returned no pages" });
    return false;
  }
  let stopping = null;
  const stop = () => (stopping ??= Promise.resolve().then(() => app.stop()));
  live.app = { stop };
  let passed = true;
  try {
    for (const [browserName, browser] of browsers) {
      for (const url of app.pages) {
        const results = await runChecks(browser, browserName, url, target.checks);
        if (target.interact) results.push(...(await interactWith(browser, target, url)));
        if (finishing) return false;
        for (const result of results) {
          print(name, browserName, new URL(url).pathname, result);
          if (result.status === "fail") passed = false;
        }
      }
    }
  } finally {
    await stop();
    live.app = null;
  }
  return passed;
}

async function main() {
  const known = (await readdir(join(HERE, "targets"))).filter((name) => name.endsWith(".mjs")).map((name) => name.slice(0, -4)).sort();
  const options = parse(process.argv.slice(2), known);
  const started = Date.now();
  stopOnSignals();
  live.keep = options.keep;
  const work = (live.work = await mkdtemp(join(tmpdir(), "neuwo-integration-")));
  const browsers = live.browsers;
  let passed = true;
  try {
    for (const name of options.browsers) {
      try {
        browsers.set(name, await launch(name));
      } catch (error) {
        passed = false;
        print("-", name, "-", { check: "launch", status: "fail", detail: error.message });
      }
    }
    if (browsers.size === 0) throw new Halt("No browser launched, so nothing was checked.");
    const tarball = await pack(work);
    if (options.targets.length) await copyApps(work, tarball);
    if (options.selfTest && !(await selfTest(browsers))) passed = false;
    for (const name of options.targets) {
      if (finishing) break;
      if (!(await runTarget(name, browsers, { tarball, work, log }))) passed = false;
    }
  } finally {
    await finish();
  }
  if (signalled) return;
  log(`${passed ? "Passed" : "Failed"} in ${Math.round((Date.now() - started) / 1000)} s`);
  process.exitCode = passed ? 0 : 1;
}

main().catch((error) => {
  if (error instanceof Finishing) return;
  log(error instanceof Halt ? error.message : String(error?.stack ?? error));
  process.exitCode = 1;
});
