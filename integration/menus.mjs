import { UnsupportedOperation } from "puppeteer-core";

const STEP_TIMEOUT = 5_000;
const PANEL = "demo-kinds-panel";
const TRIGGER = `button[popovertarget="${PANEL}"]`;
const FIRST = "csv";
const ITEM_ROLES = ["menuitem", "menuitemradio", "menuitemcheckbox"];

function readMenu(id) {
  const panel = document.getElementById(id);
  const focused = document.activeElement;
  const item = focused?.closest?.("neuwo-menu-item");
  let at = focused?.localName ?? null;
  if (item) at = item.value;
  else if (focused?.getAttribute?.("popovertarget") === id) at = "trigger";
  return { open: Boolean(panel?.matches(":popover-open")), focused: at, picks: window.__menuPicks ?? null };
}

function hideMenu(id) {
  const panel = document.getElementById(id);
  if (panel?.matches(":popover-open")) panel.hidePopover();
}

async function until(page, step, accept) {
  const deadline = Date.now() + STEP_TIMEOUT;
  for (;;) {
    const state = await page.evaluate(readMenu, PANEL);
    if (accept(state)) return state;
    if (Date.now() > deadline) throw new Error(`${step}: the menu is ${state.open ? "open" : "closed"}, focus on ${state.focused}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function openFromTrigger(page) {
  await page.evaluate(hideMenu, PANEL);
  await until(page, "closing the menu", (state) => !state.open);
  await page.click(TRIGGER);
  return until(page, "clicking the trigger", (state) => state.open && state.focused === FIRST);
}

async function run(check, steps) {
  try {
    return { check, status: "pass", detail: await steps() };
  } catch (error) {
    return { check, status: "fail", detail: error.message };
  }
}

function nodesIn(node, out = []) {
  if (!node) return out;
  out.push(node);
  for (const child of node.children ?? []) nodesIn(child, out);
  return out;
}

async function menuTree(page) {
  await openFromTrigger(page);
  let snapshot;
  try {
    snapshot = await page.accessibility.snapshot();
  } catch (error) {
    if (error instanceof UnsupportedOperation) return { status: "n/a", detail: `no accessibility snapshot: ${error.message}` };
    throw error;
  }
  const nodes = nodesIn(snapshot);
  const menu = nodes.find((node) => node.role === "menu");
  if (!menu) return { status: "fail", detail: "no node with the menu role while the menu is open" };
  const roles = new Set(nodesIn(menu).map((node) => node.role));
  const missing = ITEM_ROLES.filter((role) => !roles.has(role));
  const trigger = nodes.find((node) => node.role === "button" && node.name === "Item Kinds");
  let expanded = "is not in the tree";
  if (trigger) expanded = "expanded" in trigger ? `reports expanded ${trigger.expanded}` : "reports no expanded state";
  if (missing.length) return { status: "fail", detail: `the menu holds no ${missing.join(" or ")}; the plain trigger ${expanded}` };
  return { status: "pass", detail: `a menu holding ${ITEM_ROLES.join(", ")}; the plain trigger ${expanded}` };
}

/**
 * Drives the demo's every-kind menu, `#demo-kinds`, from its plain trigger.
 * @param {import("puppeteer-core").Page} page
 * @returns {Promise<import("./checks.mjs").CheckResult[]>}
 */
export async function checkMenus(page) {
  await page.evaluate(() => customElements.whenDefined("neuwo-menu"));
  const results = [];
  results.push(
    await run("menuOpens", async () => {
      const state = await openFromTrigger(page);
      return `a click on the trigger opened it, focus on ${state.focused}`;
    }),
  );
  results.push(
    await run("menuKeys", async () => {
      await openFromTrigger(page);
      await page.keyboard.press("ArrowDown");
      const moved = await until(page, "ArrowDown", (state) => state.focused === "json");
      await page.keyboard.press("Escape");
      const closed = await until(page, "Escape", (state) => !state.open && state.focused === "trigger");
      return `ArrowDown moved focus to ${moved.focused}; Escape closed it, focus on the ${closed.focused}`;
    }),
  );
  results.push(
    await run("menuPick", async () => {
      await openFromTrigger(page);
      const before = (await page.evaluate(readMenu, PANEL)).picks?.length ?? 0;
      await page.click('#demo-kinds neuwo-menu-item[value="copy-request"] .neuwo-menu-item__control');
      const state = await until(page, "picking Copy API Request", (each) => !each.open && each.focused === "trigger" && each.picks?.length === before + 1);
      const pick = state.picks.at(-1);
      if (pick.value !== "copy-request") throw new Error(`select reported ${JSON.stringify(pick)}`);
      return `select reported ${JSON.stringify(pick)}, the menu closed, focus on the ${state.focused}`;
    }),
  );
  try {
    results.push({ check: "menuTree", ...(await menuTree(page)) });
  } catch (error) {
    results.push({ check: "menuTree", status: "fail", detail: error.message });
  }
  await page.evaluate(hideMenu, PANEL);
  return results;
}
