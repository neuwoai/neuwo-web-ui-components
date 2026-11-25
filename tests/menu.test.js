import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index.js";
import { NeuwoMenu } from "../src/components/menu/neuwo-menu.js";
import { NeuwoMenuGroup } from "../src/components/menu/neuwo-menu-group.js";
import { NeuwoMenuItem } from "../src/components/menu/neuwo-menu-item.js";
import { expand } from "../src/server/index.js";
import { installPopovers } from "./fixtures/popover.js";

const cleanup = [];
beforeEach(() => {
  cleanup.push(installPopovers(document));
});
afterEach(() => {
  while (cleanup.length) cleanup.pop()();
});

function attach(node) {
  document.body.appendChild(node);
  cleanup.push(() => node.remove());
  return node;
}

// Parsed detached, then attached: innerHTML on a connected container upgrades before the children exist.
function make(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return attach(holder);
}

function watch(target) {
  const records = [];
  const observer = new MutationObserver((list) => records.push(...list));
  observer.observe(target, { subtree: true, childList: true, attributes: true, characterData: true });
  return () => {
    records.push(...observer.takeRecords());
    observer.disconnect();
    return records;
  };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const at = (rect) => () => ({ x: rect.left, y: rect.top, width: rect.right - rect.left, height: rect.bottom - rect.top, toJSON() {}, ...rect });
const viewportWidth = () => (document.scrollingElement ?? document.documentElement).clientWidth || window.innerWidth;
const viewportHeight = () => (document.scrollingElement ?? document.documentElement).clientHeight || window.innerHeight;

const MENU = `<neuwo-menu id="m"><neuwo-menu-item value="rename">Rename</neuwo-menu-item><neuwo-menu-item>Delete</neuwo-menu-item></neuwo-menu>`;

function opener(html = MENU) {
  const holder = make(`<button popovertarget="m-panel">Open</button>${html}`);
  const button = holder.querySelector("button");
  button.getBoundingClientRect = at({ top: 100, bottom: 130, left: 40, right: 140 });
  const menu = holder.querySelector("neuwo-menu");
  return { holder, button, menu, panel: menu.panel };
}

describe("<neuwo-menu>", () => {
  it("adopts served markup with zero writes", async () => {
    const holder = document.createElement("div");
    holder.innerHTML = expand(
      `<button popovertarget="m-panel">Open</button>` +
        `<neuwo-menu id="m" align="end">` +
        `<neuwo-menu-group heading="Export As"><neuwo-menu-item value="csv" hint=".csv"><svg slot="start"></svg>CSV</neuwo-menu-item><neuwo-menu-item disabled>PDF</neuwo-menu-item></neuwo-menu-group>` +
        `<neuwo-menu-group heading="Sort By" select="one"><neuwo-menu-item checked>Name</neuwo-menu-item><neuwo-menu-item>Reach</neuwo-menu-item></neuwo-menu-group>` +
        `<neuwo-menu-group select="many" no-divider><neuwo-menu-item checked>Live</neuwo-menu-item></neuwo-menu-group>` +
        `<neuwo-menu-group><neuwo-menu-item href="/docs" target="_blank">Docs</neuwo-menu-item><neuwo-menu-item tone="red">Delete</neuwo-menu-item>` +
        `<neuwo-menu-item>Move To<neuwo-menu slot="submenu"><neuwo-menu-item>Sports</neuwo-menu-item></neuwo-menu></neuwo-menu-item></neuwo-menu-group>` +
        `</neuwo-menu>`,
    );
    const stop = watch(holder);
    attach(holder);
    await Promise.resolve();
    expect(stop()).toEqual([]);
    const menu = holder.querySelector("neuwo-menu");
    expect(menu).toBeInstanceOf(NeuwoMenu);
    expect(menu.panel.id).toBe("m-panel");
    expect(holder.querySelectorAll(".neuwo-menu")).toHaveLength(2);
    expect(holder.querySelector('[role="menuitemradio"][aria-checked="true"]').textContent).toBe("Name");
  });

  it("renders a hidden popover panel named after its id", () => {
    const { menu, panel } = opener();
    expect(menu.shadowRoot).toBeNull();
    expect(panel.id).toBe("m-panel");
    expect(panel.getAttribute("popover")).toBe("auto");
    expect(panel.getAttribute("role")).toBe("menu");
    expect(panel.matches(":popover-open")).toBe(false);
    expect(Array.from(panel.querySelectorAll('[role="menuitem"]'), (control) => control.textContent)).toEqual(["Rename", "Delete"]);
  });

  it("opens from a plain popovertarget button and positions against it", async () => {
    const { button, panel } = opener();
    button.click();
    expect(panel.matches(":popover-open")).toBe(true);
    await tick();
    expect(panel.style.position).toBe("fixed");
    expect(panel.style.top).toBe("134px");
    expect(panel.style.left).toBe("40px");
    expect(panel.style.minWidth).toBe("");
  });

  it("keeps the panel inside the viewport, its height capped to the room below the trigger less a margin", async () => {
    const { button, panel } = opener();
    button.click();
    await tick();
    expect(panel.style.maxHeight).toBe(`${viewportHeight() - 130 - 4 - 8}px`);
  });

  it("positions the panel as it opens, before the toggle event that comes a task later", () => {
    const { button, panel } = opener();
    button.click();
    expect(panel.style.top).toBe("134px");
    expect(panel.style.left).toBe("40px");
  });

  it("positions against the trigger that opened it, of several", async () => {
    const { holder, panel } = opener();
    const second = document.createElement("button");
    second.setAttribute("popovertarget", "m-panel");
    second.getBoundingClientRect = at({ top: 300, bottom: 320, left: 500, right: 560 });
    holder.append(second);
    second.click();
    await tick();
    expect(panel.style.top).toBe("324px");
    expect(panel.style.left).toBe("500px");
  });

  it("aligns the panel's end with the trigger's end with align=end", async () => {
    const { button, panel } = opener(MENU.replace('id="m"', 'id="m" align="end"'));
    button.click();
    await tick();
    expect(panel.style.left).toBe("auto");
    expect(panel.style.right).toBe(`${viewportWidth() - 140}px`);
    expect(panel.style.top).toBe("134px");
  });

  it("repositions on scroll while open, and stops once closed", async () => {
    const { button, panel } = opener();
    button.click();
    await tick();
    expect(panel.style.top).toBe("134px");
    button.getBoundingClientRect = at({ top: 60, bottom: 90, left: 40, right: 140 });
    document.dispatchEvent(new Event("scroll"));
    expect(panel.style.top).toBe("94px");
    button.getBoundingClientRect = at({ top: 20, bottom: 50, left: 40, right: 140 });
    window.dispatchEvent(new Event("resize"));
    expect(panel.style.top).toBe("54px");
    panel.hidePopover();
    await tick();
    button.getBoundingClientRect = at({ top: 0, bottom: 10, left: 40, right: 140 });
    document.dispatchEvent(new Event("scroll"));
    expect(panel.style.top).toBe("54px");
  });

  it("does not reposition for a scroll inside its own panel, which moves no trigger", async () => {
    const { button, panel } = opener();
    button.click();
    await tick();
    const style = panel.getAttribute("style");
    button.getBoundingClientRect = at({ top: 60, bottom: 90, left: 40, right: 140 });
    panel.dispatchEvent(new Event("scroll"));
    panel.querySelector(".neuwo-menu-item__control").dispatchEvent(new Event("scroll"));
    expect(panel.getAttribute("style")).toBe(style);
    document.dispatchEvent(new Event("scroll"));
    expect(panel.style.top).toBe("94px");
  });

  it("stops repositioning once removed from the page while open", async () => {
    const { button, menu, panel } = opener();
    button.click();
    await tick();
    menu.remove();
    button.getBoundingClientRect = at({ top: 0, bottom: 10, left: 40, right: 140 });
    document.dispatchEvent(new Event("scroll"));
    expect(panel.style.top).toBe("134px");
  });

  it("reflects submenu, align, heading, select, no-divider, hint, tone, disabled, checked", () => {
    const holder = make(
      `<neuwo-menu id="m"><neuwo-menu-group><neuwo-menu-item>Name</neuwo-menu-item></neuwo-menu-group></neuwo-menu>`,
    );
    const menu = holder.querySelector("neuwo-menu");
    const group = holder.querySelector("neuwo-menu-group");
    const item = holder.querySelector("neuwo-menu-item");
    expect([menu, group, item].map((el) => el.constructor)).toEqual([NeuwoMenu, NeuwoMenuGroup, NeuwoMenuItem]);
    const control = () => item.querySelector(".neuwo-menu-item__control");

    expect([menu.submenu, menu.align]).toEqual(["auto", "start"]);
    menu.submenu = "drill";
    menu.align = "end";
    expect([menu.getAttribute("submenu"), menu.getAttribute("align")]).toEqual(["drill", "end"]);
    menu.submenu = "";
    menu.align = null;
    expect([menu.hasAttribute("submenu"), menu.hasAttribute("align")]).toEqual([false, false]);
    expect([menu.submenu, menu.align]).toEqual(["auto", "start"]);

    expect([group.heading, group.select, group.noDivider]).toEqual(["", "", false]);
    group.heading = "Sort By";
    expect(group.getAttribute("heading")).toBe("Sort By");
    expect(group.querySelector(".neuwo-menu-group__heading").textContent).toBe("Sort By");
    group.select = "one";
    expect(group.getAttribute("select")).toBe("one");
    expect(control().getAttribute("role")).toBe("menuitemradio");
    group.noDivider = true;
    expect(group.hasAttribute("no-divider")).toBe(true);
    expect(group.querySelector(".neuwo-menu-group").classList.contains("neuwo-menu-group--no-divider")).toBe(true);
    group.heading = "";
    group.select = null;
    group.noDivider = false;
    expect(["heading", "select", "no-divider"].map((name) => group.hasAttribute(name))).toEqual([false, false, false]);
    expect(control().getAttribute("role")).toBe("menuitem");

    expect([item.hint, item.tone, item.disabled, item.checked, item.href]).toEqual(["", "", false, false, ""]);
    item.hint = "F2";
    item.tone = "red";
    item.disabled = true;
    item.href = "/docs";
    expect(["hint", "tone", "href"].map((name) => item.getAttribute(name))).toEqual(["F2", "red", "/docs"]);
    expect(item.hasAttribute("disabled")).toBe(true);
    expect(item.querySelector(".neuwo-menu-item__hint").textContent).toBe("F2");
    expect(item.querySelector(".neuwo-menu-item").classList.contains("neuwo-menu-item--red")).toBe(true);
    expect(control().localName).toBe("button");
    expect(control().getAttribute("aria-disabled")).toBe("true");
    item.disabled = false;
    expect(control().localName).toBe("a");
    expect(control().getAttribute("href")).toBe("/docs");
    group.select = "many";
    item.checked = true;
    expect(item.hasAttribute("checked")).toBe(true);
    expect(control().getAttribute("aria-checked")).toBe("true");
    item.checked = false;
    expect(control().getAttribute("aria-checked")).toBe("false");
    for (const name of ["hint", "tone", "href"]) item[name] = "";
    expect(["hint", "tone", "href", "checked", "disabled"].map((name) => item.hasAttribute(name))).toEqual([false, false, false, false, false]);
  });

  it("reads value from the attribute, else the label text", () => {
    const holder = make(
      `<neuwo-menu-item value="csv">CSV File</neuwo-menu-item>` +
        `<neuwo-menu-item><svg slot="start"></svg>\n  Move <b>To</b>\n  <neuwo-menu slot="submenu"><neuwo-menu-item>Sports</neuwo-menu-item></neuwo-menu></neuwo-menu-item>`,
    );
    const [named, labelled] = holder.querySelectorAll(":scope > neuwo-menu-item");
    expect(named.value).toBe("csv");
    expect(labelled.value).toBe("Move To");
    labelled.value = "move";
    expect(labelled.getAttribute("value")).toBe("move");
    expect(labelled.value).toBe("move");
    labelled.value = null;
    expect(labelled.hasAttribute("value")).toBe(false);
    expect(labelled.value).toBe("Move To");
    expect(document.createElement("neuwo-menu-item").value).toBe("");
  });

  it("gives the panel getter null before it renders", () => {
    expect(document.createElement("neuwo-menu").panel).toBeNull();
  });
});

const KINDS =
  `<neuwo-menu id="m">` +
  `<neuwo-menu-group><neuwo-menu-item value="a" disabled>A</neuwo-menu-item><neuwo-menu-item value="b">B</neuwo-menu-item>` +
  `<neuwo-menu-item value="h" hidden>H</neuwo-menu-item><neuwo-menu-item value="c">C</neuwo-menu-item></neuwo-menu-group>` +
  `<neuwo-menu-group select="one"><neuwo-menu-item value="name" checked>Name</neuwo-menu-item><neuwo-menu-item value="reach">Reach</neuwo-menu-item></neuwo-menu-group>` +
  `<neuwo-menu-group select="many"><neuwo-menu-item value="live" checked>Live</neuwo-menu-item><neuwo-menu-item value="draft">Draft</neuwo-menu-item></neuwo-menu-group>` +
  `<neuwo-menu-group><neuwo-menu-item value="docs" href="/docs">Docs</neuwo-menu-item><neuwo-menu-item value="z" disabled>Z</neuwo-menu-item></neuwo-menu-group>` +
  `</neuwo-menu>`;

const itemOf = (menu, value) => Array.from(menu.querySelectorAll("neuwo-menu-item")).find((item) => item.value === value);
const controlOf = (menu, value) => itemOf(menu, value).querySelector(".neuwo-menu-item__control");
const focused = () => document.activeElement?.closest("neuwo-menu-item")?.value ?? document.activeElement;

function press(target, key, options = {}) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  return event;
}

async function opened(html = KINDS) {
  const parts = opener(html);
  parts.button.focus();
  parts.button.click();
  await tick();
  return parts;
}

describe("<neuwo-menu> picks, events and keyboard", () => {
  it("fires open with the trigger before showing, and stays closed when cancelled", async () => {
    const { button, menu, panel } = opener();
    const seen = [];
    const onOpen = (event) => seen.push({ event, trigger: event.detail.trigger, showing: panel.matches(":popover-open") });
    menu.addEventListener("open", onOpen);
    button.click();
    expect(seen).toHaveLength(1);
    expect(seen[0].event).toBeInstanceOf(CustomEvent);
    expect([seen[0].event.bubbles, seen[0].event.cancelable]).toEqual([true, true]);
    expect([seen[0].trigger, seen[0].showing]).toEqual([button, false]);
    expect([menu.isOpen, menu.trigger]).toEqual([true, button]);
    panel.hidePopover();
    await tick();
    expect([menu.isOpen, menu.trigger]).toEqual([false, null]);

    menu.addEventListener("open", (event) => event.preventDefault());
    button.focus();
    button.click();
    expect(seen).toHaveLength(2);
    expect(panel.matches(":popover-open")).toBe(false);
    expect([menu.isOpen, menu.trigger]).toEqual([false, null]);
    await tick();
    expect(document.activeElement).toBe(button);
    expect(press(button, "ArrowDown").defaultPrevented).toBe(true);
    expect(panel.matches(":popover-open")).toBe(false);
    expect(seen).toHaveLength(3);
  });

  it("focuses the first enabled item when it opens", async () => {
    await opened();
    expect(focused()).toBe("b");
  });

  it("focuses the last enabled item with ArrowUp on the trigger, and the first with ArrowDown", async () => {
    const { button, menu, panel } = opener(KINDS);
    button.focus();
    expect(press(button, "ArrowUp").defaultPrevented).toBe(true);
    expect(panel.matches(":popover-open")).toBe(true);
    expect(menu.trigger).toBe(button);
    expect(focused()).toBe("docs");
    await tick();
    expect(focused()).toBe("docs");
    expect(panel.style.top).toBe("134px");

    press(document.activeElement, "Escape");
    await tick();
    expect(document.activeElement).toBe(button);
    expect(press(button, "ArrowDown").defaultPrevented).toBe(true);
    expect(focused()).toBe("b");
    expect(press(button, "ArrowDown", { altKey: true }).defaultPrevented).toBe(false);
  });

  it("moves with ArrowDown and ArrowUp, wrapping, and Home and End, skipping hidden items", async () => {
    const { menu } = await opened();
    const walk = (key, times) =>
      Array.from({ length: times }, () => {
        const event = press(document.activeElement, key);
        expect(event.defaultPrevented, key).toBe(true);
        return focused();
      });
    expect(walk("ArrowDown", 9)).toEqual(["c", "name", "reach", "live", "draft", "docs", "z", "a", "b"]);
    expect(walk("ArrowUp", 3)).toEqual(["a", "z", "docs"]);
    expect(walk("Home", 1)).toEqual(["a"]);
    expect(walk("End", 1)).toEqual(["z"]);
    itemOf(menu, "live").closest("neuwo-menu-group").hidden = true;
    itemOf(menu, "c").hidden = true;
    expect(walk("Home", 1)).toEqual(["a"]);
    expect(walk("ArrowDown", 5)).toEqual(["b", "name", "reach", "docs", "z"]);
  });

  it("fires select with value, item and trigger, then closes and focuses the trigger", async () => {
    const { button, menu, panel } = await opened(MENU);
    const seen = [];
    menu.addEventListener("select", (event) => seen.push({ event, detail: event.detail, showing: panel.matches(":popover-open") }));
    const [rename, remove] = menu.querySelectorAll("neuwo-menu-item");
    remove.querySelector(".neuwo-menu-item__control").click();
    expect(seen).toHaveLength(1);
    expect(seen[0].event).toBeInstanceOf(CustomEvent);
    expect([seen[0].event.bubbles, seen[0].event.cancelable, seen[0].showing]).toEqual([true, true, true]);
    expect(seen[0].detail).toEqual({ value: "Delete", item: remove, trigger: button });
    expect("checked" in seen[0].detail).toBe(false);
    expect(panel.matches(":popover-open")).toBe(false);
    expect(document.activeElement).toBe(button);
    await tick();
    expect(document.activeElement).toBe(button);
    expect([menu.isOpen, menu.trigger]).toEqual([false, null]);

    button.click();
    await tick();
    rename.querySelector(".neuwo-menu-item__control").click();
    expect(seen[1].detail).toEqual({ value: "rename", item: rename, trigger: button });
  });

  it("stays open when select is cancelled", async () => {
    const { menu, panel } = await opened();
    menu.addEventListener("select", (event) => event.preventDefault());
    const control = controlOf(menu, "c");
    control.focus();
    control.click();
    expect(panel.matches(":popover-open")).toBe(true);
    await tick();
    expect(panel.matches(":popover-open")).toBe(true);
    expect(document.activeElement).toBe(control);
  });

  it("keeps a checkable item's state when select is cancelled", async () => {
    const { menu } = await opened();
    const seen = [];
    menu.addEventListener("select", (event) => {
      seen.push([event.detail.value, event.detail.checked]);
      event.preventDefault();
    });
    controlOf(menu, "reach").click();
    controlOf(menu, "live").click();
    expect(seen).toEqual([
      ["reach", true],
      ["live", false],
    ]);
    expect(["name", "reach", "live"].map((value) => itemOf(menu, value).checked)).toEqual([true, false, true]);
    expect(["name", "reach", "live"].map((value) => controlOf(menu, value).getAttribute("aria-checked"))).toEqual(["true", "false", "true"]);
  });

  it("does not navigate a link item when select is cancelled", async () => {
    const { button, menu, panel } = await opened();
    const link = controlOf(menu, "docs");
    expect(link.localName).toBe("a");
    let prevented = null;
    const stop = (event) => {
      prevented = event.defaultPrevented;
      event.preventDefault();
    };
    document.addEventListener("click", stop);
    cleanup.push(() => document.removeEventListener("click", stop));
    const cancel = (event) => event.preventDefault();
    menu.addEventListener("select", cancel);
    link.click();
    expect(prevented).toBe(true);
    expect(panel.matches(":popover-open")).toBe(true);

    menu.removeEventListener("select", cancel);
    const seen = [];
    menu.addEventListener("select", (event) => seen.push(event.detail));
    link.click();
    expect(prevented).toBe(false);
    expect(seen).toEqual([{ value: "docs", item: itemOf(menu, "docs"), trigger: button }]);
    expect(panel.matches(":popover-open")).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  it("activates a link item with Space, which a link leaves to the page, as Enter does", async () => {
    const { menu } = await opened();
    const link = controlOf(menu, "docs");
    const clicks = [];
    link.addEventListener("click", (event) => {
      clicks.push(event.type);
      event.preventDefault();
    });
    link.focus();
    expect(press(link, " ").defaultPrevented).toBe(true);
    expect(clicks).toEqual(["click"]);
    expect(press(controlOf(menu, "c"), " ").defaultPrevented).toBe(false);
  });

  it("checks one item of a select=one group and toggles a select=many item, staying open", async () => {
    const { menu, panel } = await opened();
    const seen = [];
    menu.addEventListener("select", (event) => seen.push([event.detail.value, event.detail.checked, event.detail.item.checked]));
    const states = () => ["name", "reach", "live", "draft"].map((value) => [itemOf(menu, value).checked, controlOf(menu, value).getAttribute("aria-checked")]);
    const reach = controlOf(menu, "reach");
    reach.focus();
    reach.click();
    controlOf(menu, "live").click();
    controlOf(menu, "draft").click();
    reach.click();
    expect(seen).toEqual([
      ["reach", true, false],
      ["live", false, true],
      ["draft", true, false],
      ["reach", true, true],
    ]);
    expect(states()).toEqual([
      [false, "false"],
      [true, "true"],
      [false, "false"],
      [true, "true"],
    ]);
    expect(panel.matches(":popover-open")).toBe(true);
    await tick();
    expect(panel.matches(":popover-open")).toBe(true);
    expect(document.activeElement).toBe(reach);
  });

  it("does nothing for a disabled item, which keeps focus", async () => {
    const { menu, panel } = await opened();
    const select = vi.fn();
    menu.addEventListener("select", select);
    const disabled = controlOf(menu, "a");
    disabled.focus();
    disabled.click();
    await tick();
    expect(select).not.toHaveBeenCalled();
    expect(panel.matches(":popover-open")).toBe(true);
    expect(document.activeElement).toBe(disabled);
  });

  it("leaves an item that opens a submenu to its submenu, firing no select", async () => {
    const { menu, panel } = await opened(
      `<neuwo-menu id="m"><neuwo-menu-item value="move">Move To<neuwo-menu slot="submenu"><neuwo-menu-item value="sports">Sports</neuwo-menu-item></neuwo-menu></neuwo-menu-item></neuwo-menu>`,
    );
    const select = vi.fn();
    menu.addEventListener("select", select);
    controlOf(menu, "move").click();
    expect(select).not.toHaveBeenCalled();
    expect(panel.matches(":popover-open")).toBe(true);
  });

  it("closes on Escape and focuses the trigger", async () => {
    const { button, menu, panel } = await opened();
    expect(press(document.activeElement, "Escape").defaultPrevented).toBe(true);
    expect(panel.matches(":popover-open")).toBe(false);
    expect(document.activeElement).toBe(button);
    await tick();
    expect(document.activeElement).toBe(button);
    expect(menu.trigger).toBeNull();
  });

  it("closes on Tab and moves focus to the trigger first, leaving Tab's default", async () => {
    const { button, panel } = await opened();
    let focusedAsItCloses = null;
    panel.addEventListener("beforetoggle", (event) => {
      if (event.newState === "closed") focusedAsItCloses = document.activeElement;
    });
    const tab = press(document.activeElement, "Tab", { shiftKey: true });
    expect(tab.defaultPrevented).toBe(false);
    expect(focusedAsItCloses).toBe(button);
    expect(panel.matches(":popover-open")).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  it("keeps the menu open and focus on the item when an item attribute changes while open", async () => {
    const { menu, panel } = await opened();
    const control = controlOf(menu, "reach");
    control.focus();
    itemOf(menu, "reach").setAttribute("hint", "R");
    itemOf(menu, "reach").tone = "green";
    itemOf(menu, "live").checked = false;
    itemOf(menu, "c").hidden = true;
    itemOf(menu, "h").hidden = false;
    itemOf(menu, "name").closest("neuwo-menu-group").setAttribute("heading", "Sort By");
    await Promise.resolve();
    await tick();
    expect(panel.matches(":popover-open")).toBe(true);
    expect(document.activeElement).toBe(control);
    expect(control.isConnected).toBe(true);
    expect(control.querySelector(".neuwo-menu-item__hint").textContent).toBe("R");
    expect(press(control, "ArrowUp").defaultPrevented).toBe(true);
    expect(focused()).toBe("name");
  });

  it("never writes to a plain popovertarget trigger", async () => {
    const { button, menu } = opener(KINDS);
    const stop = watch(button);
    button.focus();
    button.click();
    await tick();
    press(document.activeElement, "ArrowDown");
    controlOf(menu, "reach").click();
    controlOf(menu, "c").click();
    await tick();
    press(button, "ArrowUp");
    press(document.activeElement, "Escape");
    await tick();
    menu.open(button);
    press(document.activeElement, "Tab");
    await tick();
    menu.open(button);
    menu.close();
    await tick();
    expect(stop()).toEqual([]);
  });

  it("opens against the trigger open() is given, focusing its first item, and close() returns focus to it", async () => {
    const { holder, button, menu, panel } = opener(KINDS);
    const second = document.createElement("button");
    second.setAttribute("popovertarget", "m-panel");
    second.getBoundingClientRect = at({ top: 300, bottom: 320, left: 500, right: 560 });
    holder.append(second);
    const triggers = [];
    menu.addEventListener("open", (event) => triggers.push(event.detail.trigger));
    menu.open(second);
    expect([menu.isOpen, menu.trigger, triggers]).toEqual([true, second, [second]]);
    expect(panel.style.top).toBe("324px");
    expect(focused()).toBe("b");
    await tick();
    expect(panel.style.top).toBe("324px");
    menu.close();
    expect(panel.matches(":popover-open")).toBe(false);
    await tick();
    expect(document.activeElement).toBe(second);
    expect(menu.trigger).toBeNull();

    button.click();
    await tick();
    menu.close();
    await tick();
    button.getBoundingClientRect = at({ top: 600, bottom: 620, left: 40, right: 140 });
    second.remove();
    menu.open();
    expect([menu.isOpen, menu.trigger]).toEqual([true, null]);
    expect(panel.style.top).toBe("134px");
    expect(triggers).toEqual([second, button, null]);
  });

  it("opens from the button inside an element open() is given, which takes focus back on close", async () => {
    const { button, menu, panel } = opener(KINDS);
    const wrapper = document.createElement("span");
    button.replaceWith(wrapper);
    wrapper.append(button);
    menu.open(wrapper);
    expect(menu.trigger).toBe(button);
    expect(panel.style.top).toBe("134px");
    menu.close();
    await tick();
    expect(document.activeElement).toBe(button);
  });

  it("reopens from a second trigger clicked while it is open, as that trigger's menu", async () => {
    const { holder, button, menu, panel } = opener(KINDS);
    const second = document.createElement("button");
    second.setAttribute("popovertarget", "m-panel");
    second.getBoundingClientRect = at({ top: 300, bottom: 320, left: 500, right: 560 });
    holder.append(second);
    const triggers = [];
    menu.addEventListener("open", (event) => triggers.push(event.detail.trigger));
    button.click();
    await tick();
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    second.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect([panel.matches(":popover-open"), menu.trigger]).toEqual([true, second]);
    expect(triggers).toEqual([button, second]);
    expect(panel.style.top).toBe("324px");
    await tick();
    expect([panel.matches(":popover-open"), menu.trigger]).toEqual([true, second]);
    second.click();
    expect(panel.matches(":popover-open")).toBe(false);
  });

  it("shows the panel from script with its trigger as the source, so a popover holding the trigger stays open", async () => {
    const { holder, button, menu, panel } = opener(KINDS);
    const second = document.createElement("button");
    second.setAttribute("popovertarget", "m-panel");
    holder.append(second);
    const show = vi.spyOn(panel, "showPopover");
    cleanup.push(() => vi.restoreAllMocks());
    button.focus();
    press(button, "ArrowDown");
    expect(show).toHaveBeenLastCalledWith({ source: button });
    second.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(show).toHaveBeenLastCalledWith({ source: second });
    menu.close();
    await tick();
    menu.open(button);
    expect(show).toHaveBeenLastCalledWith({ source: button });
    menu.close();
    await tick();
    menu.open();
    expect(show).toHaveBeenLastCalledWith({ source: undefined });
    expect(show).toHaveBeenCalledTimes(4);
  });

  it("measures the panel in the frame it first paints, flipping it above a trigger with no room below", async () => {
    const frames = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => frames.push(callback));
    cleanup.push(() => vi.restoreAllMocks());
    const { button, panel } = opener();
    const height = viewportHeight();
    button.getBoundingClientRect = at({ top: height - 60, bottom: height - 30, left: 40, right: 140 });
    for (const name of ["offsetHeight", "scrollHeight", "clientHeight"]) {
      Object.defineProperty(panel, name, { configurable: true, get: () => (panel.matches(":popover-open") ? 300 : 0) });
    }
    button.click();
    expect(panel.style.top).toBe(`${height - 26}px`);
    expect(frames).toHaveLength(1);
    frames.shift()();
    expect(panel.style.top).toBe("auto");
    expect(panel.style.bottom).toBe("64px");
    await tick();
    expect(panel.style.bottom).toBe("64px");
  });
});

describe("<neuwo-menu> focus on close", () => {
  it("returns focus to the trigger after a pick only when focus is still in the menu, on the body or nowhere", async () => {
    const { holder, button, menu, panel } = await opened(MENU);
    const field = holder.appendChild(document.createElement("input"));
    const rename = (event) => {
      if (event.detail.value === "rename") field.focus();
      else document.activeElement.blur();
    };
    menu.addEventListener("select", rename);
    controlOf(menu, "rename").click();
    expect(panel.matches(":popover-open")).toBe(false);
    expect(document.activeElement).toBe(field);
    await tick();
    expect(document.activeElement).toBe(field);

    button.click();
    await tick();
    controlOf(menu, "Delete").click();
    expect(panel.matches(":popover-open")).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  it("moves focus to the trigger before hiding on close(), when focus is inside, as Escape does", async () => {
    const { holder, button, menu, panel } = opener(KINDS);
    const field = holder.appendChild(document.createElement("input"));
    let focusedAsItCloses = null;
    panel.addEventListener("beforetoggle", (event) => {
      if (event.newState === "closed") focusedAsItCloses = document.activeElement;
    });
    field.focus();
    menu.open(button);
    expect(focused()).toBe("b");
    menu.close();
    expect(focusedAsItCloses).toBe(button);
    expect(document.activeElement).toBe(button);

    menu.open(button);
    field.focus();
    menu.close();
    expect(focusedAsItCloses).toBe(field);
    expect(document.activeElement).toBe(field);
  });

  it("opens only from a button naming its panel, by click and by key alike", async () => {
    const { holder, menu, panel } = opener(KINDS);
    const fake = holder.appendChild(document.createElement("span"));
    fake.setAttribute("popovertarget", "m-panel");
    fake.tabIndex = 0;
    fake.focus();
    expect(press(fake, "ArrowDown").defaultPrevented).toBe(false);
    fake.click();
    expect(panel.matches(":popover-open")).toBe(false);
    expect(menu.trigger).toBeNull();
  });
});
