import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
