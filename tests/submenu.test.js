import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index.js";
import { HOVER_CLOSE_MS, HOVER_OPEN_MS } from "../src/components/menu/submenu.js";
import { expand } from "../src/server/index.js";
import { installPopovers } from "./fixtures/popover.js";

const cleanup = [];
beforeEach(() => {
  cleanup.push(installPopovers(document));
});
afterEach(() => {
  while (cleanup.length) cleanup.pop()();
  vi.useRealTimers();
  window.innerWidth = 1024;
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const at = (rect) => () => ({ x: rect.left, y: rect.top, width: rect.right - rect.left, height: rect.bottom - rect.top, toJSON() {}, ...rect });

const submenu = (html) => `<neuwo-menu slot="submenu">${html}</neuwo-menu>`;

const TREE = (attrs = "") =>
  `<neuwo-menu id="m"${attrs}><neuwo-menu-group heading="Segment">` +
  `<neuwo-menu-item value="rename">Rename</neuwo-menu-item>` +
  `<neuwo-menu-item value="move">Move To${submenu(
    `<neuwo-menu-group><neuwo-menu-item value="sports">Sports</neuwo-menu-item><neuwo-menu-item value="travel">Travel</neuwo-menu-item>` +
      `<neuwo-menu-item value="past">Past Campaigns${submenu(`<neuwo-menu-item value="2025">2025</neuwo-menu-item><neuwo-menu-item value="2026">2026</neuwo-menu-item>`)}</neuwo-menu-item></neuwo-menu-group>` +
      `<neuwo-menu-group><neuwo-menu-item value="folder">New Folder</neuwo-menu-item></neuwo-menu-group>`,
  )}</neuwo-menu-item>` +
  `<neuwo-menu-item value="export">Export As${submenu(`<neuwo-menu-item value="csv">CSV</neuwo-menu-item><neuwo-menu-item value="json">JSON</neuwo-menu-item>`)}</neuwo-menu-item>` +
  `<neuwo-menu-item value="locked" disabled>Locked${submenu(`<neuwo-menu-item value="key">Key</neuwo-menu-item>`)}</neuwo-menu-item>` +
  `</neuwo-menu-group></neuwo-menu>`;

const itemOf = (menu, value) => Array.from(menu.querySelectorAll("neuwo-menu-item")).find((item) => item.value === value);
const controlOf = (menu, value) => itemOf(menu, value).querySelector(".neuwo-menu-item__control");
const panelOf = (menu, value) => itemOf(menu, value).querySelector(":scope > .neuwo-menu-item > .neuwo-menu-item__submenu > neuwo-menu > .neuwo-menu");
const backOf = (panel) => panel.querySelector(":scope > .neuwo-menu__back");
const isOpen = (panel) => panel.matches(":popover-open");
const focused = () => document.activeElement?.closest("neuwo-menu-item")?.value ?? document.activeElement;

function press(target, key, options = {}) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  return event;
}

const hover = (target) => target.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));

/**
 * Lays the menu out: the root panel at 40 to 248 by 134 to 400, a row 36px tall from 143, and every submenu panel
 * 208 by 120, so a flyout fits beside the root in a wide viewport and not in a 360px one.
 */
function measure(menu) {
  menu.panel.getBoundingClientRect = at({ left: 40, right: 248, top: 134, bottom: 400 });
  menu.panel.style.borderTopWidth = "1px";
  menu.panel.style.borderTopStyle = "solid";
  menu.panel.style.paddingTop = "8px";
  Array.from(menu.querySelectorAll(".neuwo-menu-item__control")).forEach((control, index) => {
    control.getBoundingClientRect = at({ left: 49, right: 239, top: 143 + 36 * index, bottom: 179 + 36 * index });
  });
  for (const panel of menu.querySelectorAll(".neuwo-menu .neuwo-menu")) {
    Object.defineProperty(panel, "offsetWidth", { configurable: true, get: () => (isOpen(panel) ? 208 : 0) });
    Object.defineProperty(panel, "offsetHeight", { configurable: true, get: () => (isOpen(panel) ? 120 : 0) });
  }
}

async function opened(attrs = "", { dir = "" } = {}) {
  const holder = document.createElement("div");
  if (dir) {
    holder.setAttribute("dir", dir);
    // happy-dom computes no direction from the dir attribute, so the inline style says it too.
    holder.style.direction = dir;
  }
  holder.innerHTML = `<button popovertarget="m-panel">Open</button>${TREE(attrs)}`;
  document.body.append(holder);
  cleanup.push(() => holder.remove());
  const button = holder.querySelector("button");
  button.getBoundingClientRect = at({ top: 100, bottom: 130, left: 40, right: 140 });
  const menu = holder.querySelector("neuwo-menu");
  measure(menu);
  button.focus();
  button.click();
  await tick();
  return { holder, button, menu, panel: menu.panel };
}

describe("<neuwo-menu> submenus", () => {
  it("opens a submenu on click, ArrowRight, Enter and Space and focuses its first item", async () => {
    const { menu, panel } = await opened();
    const move = controlOf(menu, "move");
    const sub = panelOf(menu, "move");
    for (const open of [() => move.click(), () => press(move, "ArrowRight"), () => press(move, "Enter"), () => press(move, " ")]) {
      move.focus();
      const event = open();
      expect(isOpen(sub), String(open)).toBe(true);
      if (event instanceof KeyboardEvent) expect(event.defaultPrevented).toBe(true);
      expect(focused()).toBe("sports");
      expect(move.getAttribute("aria-expanded")).toBe("true");
      expect(isOpen(panel)).toBe(true);
      press(document.activeElement, "ArrowLeft");
      expect(isOpen(sub)).toBe(false);
    }
    const locked = controlOf(menu, "locked");
    locked.focus();
    locked.click();
    press(locked, "ArrowRight");
    expect(isOpen(panelOf(menu, "locked"))).toBe(false);
    expect(locked.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes it on ArrowLeft and Escape and focuses its parent item, and Escape on the root closes the menu", async () => {
    const { button, menu, panel } = await opened();
    const move = controlOf(menu, "move");
    const sub = panelOf(menu, "move");
    for (const key of ["ArrowLeft", "Escape"]) {
      move.focus();
      press(move, "ArrowRight");
      expect(focused()).toBe("sports");
      expect(press(document.activeElement, key).defaultPrevented).toBe(true);
      expect(isOpen(sub)).toBe(false);
      expect(isOpen(panel)).toBe(true);
      expect(document.activeElement).toBe(move);
      expect(move.getAttribute("aria-expanded")).toBe("false");
      await tick();
      expect([isOpen(panel), document.activeElement]).toEqual([true, move]);
    }
    expect(press(move, "ArrowLeft").defaultPrevented).toBe(false);
    expect(isOpen(panel)).toBe(true);
    press(move, "Escape");
    expect(isOpen(panel)).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  it("flyout places it beside the parent, its first row level with the item", async () => {
    const { menu } = await opened(' submenu="flyout"');
    controlOf(menu, "move").click();
    const sub = panelOf(menu, "move");
    expect([sub.style.position, sub.style.left, sub.style.right, sub.style.top]).toEqual(["fixed", "244px", "auto", "170px"]); // 248 - 4; 179 - 1 - 8
    expect(panelOf(menu, "move").classList.contains("neuwo-menu--drill")).toBe(false);
    expect(menu.panel.classList.contains("neuwo-menu--covered")).toBe(false);
    expect(backOf(sub).hidden).toBe(true);
  });

  it("flyout overlaps the parent at the viewport's inline end with no room on either side", async () => {
    window.innerWidth = 360;
    const { menu } = await opened(' submenu="flyout"');
    controlOf(menu, "move").click();
    const sub = panelOf(menu, "move");
    expect([sub.style.left, sub.style.right]).toEqual(["auto", "8px"]);
    expect(menu.panel.classList.contains("neuwo-menu--covered")).toBe(false);
  });

  it("drill places it over the parent, covers the parent with neuwo-menu--covered, and fills and shows the Back row with the parent's label", async () => {
    const { menu, panel } = await opened(' submenu="drill"');
    const move = controlOf(menu, "move");
    move.focus();
    press(move, "ArrowRight");
    const sub = panelOf(menu, "move");
    expect([sub.style.left, sub.style.right, sub.style.top, sub.style.minWidth]).toEqual(["40px", "auto", "134px", "208px"]);
    expect(panel.classList.contains("neuwo-menu--covered")).toBe(true);
    expect(sub.classList.contains("neuwo-menu--drill")).toBe(true);
    const back = backOf(sub);
    expect(back.hidden).toBe(false);
    expect(back.querySelector(".neuwo-menu__back-label").textContent).toBe("Move To");
    expect(focused()).toBe("sports");
    press(document.activeElement, "ArrowUp");
    expect(document.activeElement).toBe(back);
    press(back, "ArrowUp");
    expect(focused()).toBe("folder");
    press(document.activeElement, "Home");
    expect(document.activeElement).toBe(back);
  });

  it("Back goes up one level", async () => {
    const { menu, panel } = await opened(' submenu="drill"');
    controlOf(menu, "move").click();
    const sub = panelOf(menu, "move");
    controlOf(menu, "past").click();
    const deeper = panelOf(menu, "past");
    expect(isOpen(deeper)).toBe(true);
    expect([panel.classList.contains("neuwo-menu--covered"), sub.classList.contains("neuwo-menu--covered")]).toEqual([true, true]);
    expect(backOf(deeper).querySelector(".neuwo-menu__back-label").textContent).toBe("Past Campaigns");
    expect(focused()).toBe("2025");

    backOf(deeper).click();
    expect(isOpen(deeper)).toBe(false);
    expect([panel.classList.contains("neuwo-menu--covered"), sub.classList.contains("neuwo-menu--covered")]).toEqual([true, false]);
    expect(document.activeElement).toBe(controlOf(menu, "past"));
    expect(backOf(deeper).hidden).toBe(true);
    expect(backOf(deeper).querySelector(".neuwo-menu__back-label").textContent).toBe("");

    backOf(sub).focus();
    expect(press(backOf(sub), "Escape").defaultPrevented).toBe(true);
    expect(isOpen(sub)).toBe(false);
    expect(panel.classList.contains("neuwo-menu--covered")).toBe(false);
    expect(sub.classList.contains("neuwo-menu--drill")).toBe(false);
    expect(document.activeElement).toBe(controlOf(menu, "move"));
    expect(isOpen(panel)).toBe(true);
  });

  it("auto flies out when roomBeside fits and drills when it does not", async () => {
    const { menu, panel } = await opened();
    const move = controlOf(menu, "move");
    const sub = panelOf(menu, "move");
    move.click();
    expect([sub.style.left, panel.classList.contains("neuwo-menu--covered"), backOf(sub).hidden]).toEqual(["244px", false, true]);
    press(document.activeElement, "ArrowLeft");
    window.innerWidth = 360;
    move.click();
    expect([sub.style.left, sub.style.minWidth, panel.classList.contains("neuwo-menu--covered"), backOf(sub).hidden]).toEqual(["40px", "208px", true, false]);
    backOf(sub).click();
    window.innerWidth = 1024;
    move.click();
    expect([sub.style.left, sub.style.minWidth, panel.classList.contains("neuwo-menu--covered"), backOf(sub).hidden]).toEqual(["244px", "", false, true]);
  });

  it("in dir=rtl, ArrowLeft opens and ArrowRight closes, and a flyout opens on the left", async () => {
    const { menu } = await opened(' submenu="flyout"', { dir: "rtl" });
    menu.panel.getBoundingClientRect = at({ left: 600, right: 808, top: 134, bottom: 400 });
    const move = controlOf(menu, "move");
    const sub = panelOf(menu, "move");
    move.focus();
    expect(press(move, "ArrowRight").defaultPrevented).toBe(false);
    expect(isOpen(sub)).toBe(false);
    expect(press(move, "ArrowLeft").defaultPrevented).toBe(true);
    expect(isOpen(sub)).toBe(true);
    expect(focused()).toBe("sports");
    expect([sub.style.left, sub.style.right]).toEqual(["auto", `${window.innerWidth - 604}px`]);
    expect(press(document.activeElement, "ArrowRight").defaultPrevented).toBe(true);
    expect(isOpen(sub)).toBe(false);
    expect(document.activeElement).toBe(move);
  });

  it("opens on hover after 120 ms and closes after 250 ms when the pointer moves to a sibling, unless it enters the submenu", async () => {
    expect([HOVER_OPEN_MS, HOVER_CLOSE_MS]).toEqual([120, 250]);
    const { menu } = await opened(' submenu="flyout"');
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const rename = controlOf(menu, "rename");
    const move = controlOf(menu, "move");
    const sub = panelOf(menu, "move");
    rename.focus();
    hover(move.querySelector(".neuwo-menu-item__label"));
    vi.advanceTimersByTime(119);
    expect(isOpen(sub)).toBe(false);
    hover(move);
    vi.advanceTimersByTime(1);
    expect(isOpen(sub)).toBe(true);
    expect(move.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(rename);

    hover(rename);
    vi.advanceTimersByTime(249);
    expect(isOpen(sub)).toBe(true);
    vi.advanceTimersByTime(1);
    expect(isOpen(sub)).toBe(false);
    expect(document.activeElement).toBe(rename);

    hover(move);
    vi.advanceTimersByTime(120);
    hover(rename);
    vi.advanceTimersByTime(100);
    hover(controlOf(menu, "sports"));
    vi.advanceTimersByTime(1000);
    expect(isOpen(sub)).toBe(true);

    hover(controlOf(menu, "export"));
    vi.advanceTimersByTime(120);
    expect([isOpen(sub), isOpen(panelOf(menu, "export"))]).toEqual([false, true]);
    hover(controlOf(menu, "locked"));
    vi.advanceTimersByTime(1000);
    expect([isOpen(panelOf(menu, "export")), isOpen(panelOf(menu, "locked"))]).toEqual([false, false]);
  });

  it("never opens on hover where it would drill in", async () => {
    const { menu } = await opened(' submenu="drill"');
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    hover(controlOf(menu, "move"));
    vi.advanceTimersByTime(1000);
    expect(isOpen(panelOf(menu, "move"))).toBe(false);
    controlOf(menu, "move").click();
    expect(isOpen(panelOf(menu, "move"))).toBe(true);
    backOf(panelOf(menu, "move")).click();
    vi.useRealTimers();
    menu.panel.hidePopover();
    window.innerWidth = 360;
    menu.submenu = "auto";
    menu.panel.showPopover();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    hover(controlOf(menu, "move"));
    vi.advanceTimersByTime(1000);
    expect(isOpen(panelOf(menu, "move"))).toBe(false);
    expect(controlOf(menu, "move").getAttribute("aria-expanded")).toBe("false");
    expect(menu.panel.classList.contains("neuwo-menu--covered")).toBe(false);
  });

  it("a pick in a submenu fires select on the root menu and closes every level", async () => {
    const { button, menu, panel } = await opened();
    const seen = [];
    menu.addEventListener("select", (event) => seen.push([event.target, event.detail.value, event.detail.trigger]));
    controlOf(menu, "move").click();
    controlOf(menu, "past").click();
    expect([panelOf(menu, "move"), panelOf(menu, "past")].map(isOpen)).toEqual([true, true]);
    controlOf(menu, "2025").click();
    expect(seen).toEqual([[menu, "2025", button]]);
    expect([panel, panelOf(menu, "move"), panelOf(menu, "past")].map(isOpen)).toEqual([false, false, false]);
    expect(["move", "past"].map((value) => controlOf(menu, value).getAttribute("aria-expanded"))).toEqual(["false", "false"]);
    expect(document.activeElement).toBe(button);
    await tick();
    expect(document.activeElement).toBe(button);
  });

  it("opening one submenu closes its open sibling", async () => {
    const { menu } = await opened();
    controlOf(menu, "move").click();
    controlOf(menu, "past").click();
    const exportAs = controlOf(menu, "export");
    exportAs.focus();
    press(exportAs, "ArrowRight");
    expect([panelOf(menu, "move"), panelOf(menu, "past"), panelOf(menu, "export")].map(isOpen)).toEqual([false, false, true]);
    expect(["move", "past", "export"].map((value) => controlOf(menu, value).getAttribute("aria-expanded"))).toEqual(["false", "false", "true"]);
    expect(focused()).toBe("csv");
  });

  it("nests two levels deep", async () => {
    const { button, menu, panel } = await opened(' submenu="flyout"');
    const move = controlOf(menu, "move");
    move.focus();
    press(move, "ArrowRight");
    press(document.activeElement, "ArrowDown");
    press(document.activeElement, "ArrowDown");
    expect(focused()).toBe("past");
    const level = panelOf(menu, "move");
    level.getBoundingClientRect = at({ left: 244, right: 452, top: 170, bottom: 290 });
    press(document.activeElement, "ArrowRight");
    const deeper = panelOf(menu, "past");
    expect(isOpen(deeper)).toBe(true);
    expect(focused()).toBe("2025");
    expect(deeper.style.left).toBe("448px");
    press(document.activeElement, "ArrowLeft");
    expect([isOpen(deeper), isOpen(level), focused()]).toEqual([false, true, "past"]);
    press(document.activeElement, "ArrowRight");
    press(document.activeElement, "Escape");
    expect(focused()).toBe("past");
    press(document.activeElement, "Escape");
    expect([isOpen(level), isOpen(panel), focused()]).toEqual([false, true, "move"]);
    press(document.activeElement, "Escape");
    expect([isOpen(panel), document.activeElement]).toEqual([false, button]);
  });

  it("closes the whole menu on Tab from a submenu, focus moving on from the trigger", async () => {
    const { button, menu, panel } = await opened();
    controlOf(menu, "move").click();
    expect(focused()).toBe("sports");
    const tab = press(document.activeElement, "Tab");
    expect(tab.defaultPrevented).toBe(false);
    expect([isOpen(panel), isOpen(panelOf(menu, "move")), document.activeElement]).toEqual([false, false, button]);
  });

  it("returns focus to the parent item as a submenu closes only when focus is in it, on the body or nowhere", async () => {
    const { holder, menu } = await opened(' submenu="flyout"');
    const field = holder.appendChild(document.createElement("input"));
    const move = controlOf(menu, "move");
    const sub = panelOf(menu, "move");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    move.click();
    field.focus();
    hover(controlOf(menu, "rename"));
    vi.advanceTimersByTime(HOVER_CLOSE_MS);
    expect(isOpen(sub)).toBe(false);
    expect(document.activeElement).toBe(field);

    move.click();
    document.activeElement.blur();
    hover(controlOf(menu, "rename"));
    vi.advanceTimersByTime(HOVER_CLOSE_MS);
    expect(isOpen(sub)).toBe(false);
    expect(document.activeElement).toBe(move);
  });

  it("follows the root panel as the page scrolls", async () => {
    const { menu, button } = await opened(' submenu="flyout"');
    controlOf(menu, "move").click();
    const sub = panelOf(menu, "move");
    expect(sub.style.left).toBe("244px");
    button.getBoundingClientRect = at({ top: 60, bottom: 90, left: 40, right: 140 });
    menu.panel.getBoundingClientRect = at({ left: 80, right: 288, top: 94, bottom: 360 });
    document.dispatchEvent(new Event("scroll"));
    expect(sub.style.left).toBe("284px");
  });

  it("keeps the Back label and aria-expanded through a re-render while open", async () => {
    const { menu } = await opened(' submenu="drill"');
    controlOf(menu, "move").click();
    const sub = panelOf(menu, "move");
    const group = document.createElement("neuwo-menu-group");
    group.append(Object.assign(document.createElement("neuwo-menu-item"), { textContent: "Later" }));
    sub.parentElement.append(group);
    itemOf(menu, "move").setAttribute("hint", "M");
    await Promise.resolve();
    expect(backOf(sub).querySelector(".neuwo-menu__back-label").textContent).toBe("Move To");
    expect(controlOf(menu, "move").getAttribute("aria-expanded")).toBe("true");
    expect(isOpen(sub)).toBe(true);
  });

  it("gives a bare item in a submenu no role from its parent's select group, and one in the submenu's own group that group's", () => {
    const html =
      `<neuwo-menu id="v"><neuwo-menu-group select="one"><neuwo-menu-item value="name" checked>Name</neuwo-menu-item>` +
      `<neuwo-menu-item value="more">More${submenu(`<neuwo-menu-item value="reach">Reach</neuwo-menu-item>`)}</neuwo-menu-item></neuwo-menu-group></neuwo-menu>` +
      `<neuwo-menu id="w"><neuwo-menu-item value="show">Show${submenu(`<neuwo-menu-group select="many"><neuwo-menu-item value="live">Live</neuwo-menu-item></neuwo-menu-group>`)}</neuwo-menu-item></neuwo-menu>`;
    const roles = (holder) => Object.fromEntries(Array.from(holder.querySelectorAll("neuwo-menu-item"), (item) => [item.value, item.querySelector(".neuwo-menu-item__control").getAttribute("role")]));
    const served = document.createElement("div");
    served.innerHTML = expand(html);
    expect(roles(served)).toEqual({ name: "menuitemradio", more: "menuitemradio", reach: "menuitem", show: "menuitem", live: "menuitemcheckbox" });
    const holder = document.createElement("div");
    holder.innerHTML = html;
    document.body.append(holder);
    cleanup.push(() => holder.remove());
    expect(roles(holder)).toEqual(roles(served));
    holder.querySelector("neuwo-menu-group").select = "many";
    expect(roles(holder)).toEqual({ name: "menuitemcheckbox", more: "menuitemcheckbox", reach: "menuitem", show: "menuitem", live: "menuitemcheckbox" });
  });

  describe("a submenu the browser hides without an event, as it does one removed from the page", () => {
    const stale = (menu) => ({
      covered: menu.querySelectorAll(".neuwo-menu--covered").length,
      drill: menu.querySelectorAll(".neuwo-menu--drill").length,
      expanded: menu.querySelectorAll('[aria-expanded="true"]').length,
    });

    it("leaves nothing behind once the menu closes, so it opens again visible, on its first item", async () => {
      const { button, menu, panel } = await opened(' submenu="drill"');
      controlOf(menu, "move").click();
      expect(stale(menu)).toEqual({ covered: 1, drill: 1, expanded: 1 });
      const nested = panelOf(menu, "move").parentElement;
      const fresh = document.createElement("div");
      fresh.innerHTML = submenu(`<neuwo-menu-item value="sports">Sports</neuwo-menu-item>`);
      nested.replaceWith(fresh.firstElementChild);
      await Promise.resolve();
      button.focus();
      menu.close();
      expect(isOpen(panel)).toBe(false);
      expect(stale(menu)).toEqual({ covered: 0, drill: 0, expanded: 0 });
      button.click();
      await tick();
      expect(isOpen(panel)).toBe(true);
      expect(panel.classList.contains("neuwo-menu--covered")).toBe(false);
      expect(focused()).toBe("rename");
      controlOf(menu, "move").click();
      expect([isOpen(panelOf(menu, "move")), panel.classList.contains("neuwo-menu--covered"), focused()]).toEqual([true, true, "sports"]);
    });

    it("stops placing a removed submenu and uncovers its parent at the next placing, as the page scrolls", async () => {
      const { menu, panel } = await opened(' submenu="drill"');
      controlOf(menu, "move").click();
      const sub = panelOf(menu, "move");
      sub.parentElement.remove();
      menu.panel.getBoundingClientRect = at({ left: 80, right: 288, top: 94, bottom: 360 });
      document.dispatchEvent(new Event("scroll"));
      expect(sub.style.left).toBe("40px");
      expect(isOpen(panel)).toBe(true);
      expect(panel.classList.contains("neuwo-menu--covered")).toBe(false);
      expect(controlOf(menu, "move").getAttribute("aria-expanded")).not.toBe("true");
    });

    it("leaves nothing behind when the whole menu leaves the page with a submenu open, so it opens again visible", async () => {
      const { holder, button, menu, panel } = await opened(' submenu="drill"');
      controlOf(menu, "move").click();
      controlOf(menu, "past").click();
      expect(stale(menu)).toEqual({ covered: 2, drill: 2, expanded: 2 });
      menu.remove();
      expect(stale(menu)).toEqual({ covered: 0, drill: 0, expanded: 0 });
      expect([panel, panelOf(menu, "move"), panelOf(menu, "past")].map(isOpen)).toEqual([false, false, false]);
      holder.append(menu);
      button.focus();
      button.click();
      await tick();
      expect([isOpen(panel), panel.classList.contains("neuwo-menu--covered"), focused()]).toEqual([true, false, "rename"]);
      expect(Array.from(menu.querySelectorAll(".neuwo-menu__back"), (back) => back.hidden)).toEqual([true, true, true, true]);
    });
  });
});

