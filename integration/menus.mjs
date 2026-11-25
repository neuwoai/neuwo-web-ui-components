import { UnsupportedOperation } from "puppeteer-core";
import { VIEWPORT } from "./checks.mjs";

const STEP_TIMEOUT = 5_000;
const PANEL = "demo-kinds-panel";
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

async function until(page, step, accept, id = PANEL) {
  const deadline = Date.now() + STEP_TIMEOUT;
  for (;;) {
    const state = await page.evaluate(readMenu, id);
    if (accept(state)) return state;
    if (Date.now() > deadline) throw new Error(`${step}: the menu is ${state.open ? "open" : "closed"}, focus on ${state.focused}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function openFromTrigger(page, id = PANEL, first = FIRST) {
  await page.evaluate(hideMenu, id);
  await until(page, "closing the menu", (state) => !state.open, id);
  await page.click(`button[popovertarget="${id}"]`);
  return until(page, "clicking the trigger", (state) => state.open && state.focused === first, id);
}

async function edgesOf(id, value) {
  const panel = document.getElementById(id);
  const item = Array.from(panel.querySelectorAll("neuwo-menu-item")).find((each) => each.value === value);
  const sub = item.querySelector(":scope > .neuwo-menu-item > .neuwo-menu-item__submenu > neuwo-menu > .neuwo-menu");
  // The drill-in slide translates the panel, which its bounding box includes until the slide ends.
  await Promise.all(sub.getAnimations().map((animation) => animation.finished));
  const [parent, opened] = [panel, sub].map((each) => each.getBoundingClientRect());
  return { parent: { left: parent.left, right: parent.right }, sub: { left: opened.left, right: opened.right }, covered: panel.classList.contains("neuwo-menu--covered") };
}

/**
 * Opens the menu whose panel is `id` from its trigger and its Move To submenu with ArrowRight, and measures both.
 * @param {import("puppeteer-core").Page} page
 * @param {string} id
 */
async function openMoveTo(page, id) {
  await openFromTrigger(page, id, "rename");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await until(page, "ArrowDown to Move To", (state) => state.focused === "move", id);
  await page.keyboard.press("ArrowRight");
  await until(page, "ArrowRight on Move To", (state) => state.focused === "sports", id);
  return page.evaluate(edgesOf, id, "move");
}

const px = (value) => `${Math.round(value)}px`;

async function submenuFlyout(page) {
  const { parent, sub } = await openMoveTo(page, "demo-flyout-panel");
  if (sub.left < parent.right - 8) return { status: "fail", detail: `the submenu's left edge, ${px(sub.left)}, is left of the menu's right edge, ${px(parent.right)}, less 8` };
  return { status: "pass", detail: `ArrowRight on Move To opened its submenu at ${px(sub.left)}, beside the menu ending at ${px(parent.right)}` };
}

async function submenuAuto(page) {
  try {
    await page.setViewport({ width: 360, height: 800 });
  } catch (error) {
    if (error instanceof UnsupportedOperation) return { status: "n/a", detail: `no viewport to set: ${error.message}` };
    throw error;
  }
  try {
    const { parent, sub, covered } = await openMoveTo(page, "demo-auto-panel");
    const shared = Math.abs(sub.left - parent.left) < 1;
    if (!shared || !covered) return { status: "fail", detail: `at 360px the submenu starts at ${px(sub.left)} and the menu at ${px(parent.left)}, the menu ${covered ? "" : "not "}covered` };
    return { status: "pass", detail: `at 360px the submenu drilled in over the menu, both starting at ${px(sub.left)}` };
  } finally {
    await page.evaluate(hideMenu, "demo-auto-panel");
    await page.setViewport(VIEWPORT);
  }
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
 * Drives the demo's every-kind menu, `#demo-kinds`, from its plain trigger, then the flyout and auto submenu menus,
 * the auto one at 360px, after which the viewport is restored.
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
  for (const [check, steps] of [
    ["submenuFlyout", submenuFlyout],
    ["submenuAuto", submenuAuto],
  ]) {
    try {
      results.push({ check, ...(await steps(page)) });
    } catch (error) {
      results.push({ check, status: "fail", detail: error.message });
    }
  }
  await page.evaluate(hideMenu, "demo-flyout-panel");
  return results;
}
