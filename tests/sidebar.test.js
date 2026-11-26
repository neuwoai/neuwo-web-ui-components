import { afterEach, describe, expect, it } from "vitest";
import "../src/index.js";
import { NeuwoNavItem } from "../src/components/sidebar/neuwo-nav-item.js";
import { NeuwoSidebar } from "../src/components/sidebar/neuwo-sidebar.js";
import { expand } from "../src/server/index.js";

const cleanup = [];
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

function watch(target, options = { subtree: true, childList: true, attributes: true, characterData: true }) {
  const records = [];
  const observer = new MutationObserver((list) => records.push(...list));
  observer.observe(target, options);
  return () => {
    records.push(...observer.takeRecords());
    observer.disconnect();
    return records;
  };
}

/** Records whether each click reached the document with its default prevented, then stops happy-dom navigating. */
function followed() {
  const seen = [];
  const stop = (event) => {
    seen.push(event.defaultPrevented);
    event.preventDefault();
  };
  document.addEventListener("click", stop);
  cleanup.push(() => document.removeEventListener("click", stop));
  return seen;
}

function at(path) {
  history.replaceState(null, "", path);
  cleanup.push(() => history.replaceState(null, "", "/"));
}

const SIDEBAR =
  `<a slot="brand" href="/">Brand</a><a slot="actions" href="/setup/">Setup</a>` +
  `<neuwo-nav-item href="/a/">Alpha</neuwo-nav-item><neuwo-nav-item href="/b/">Beta <span class="tag">New</span></neuwo-nav-item>` +
  `<a slot="after-nav" href="/keys/">Keys</a><a slot="footer" href="https://neuwo.ai/">Back to neuwo.ai</a>`;

function sidebar(attrs = 'current="/a/"') {
  const holder = make(`<neuwo-sidebar ${attrs}>${SIDEBAR}</neuwo-sidebar>`);
  const host = holder.querySelector("neuwo-sidebar");
  const link = (href) => host.querySelector(`.neuwo-nav-item__link[href="${href}"]`);
  return { holder, host, link, menu: host.querySelector(".neuwo-sidebar__menu") };
}

const marked = (link) => [link.getAttribute("aria-current"), link.classList.contains("neuwo-nav-link--active")];

const click = (target, init = {}) => target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init }));

describe("<neuwo-sidebar> and <neuwo-nav-item>", () => {
  it("adopts served markup with zero writes", async () => {
    const holder = document.createElement("div");
    holder.innerHTML = expand(`<neuwo-sidebar label="Docs" current="/b/" menu-label="Open Navigation" remember="docs">${SIDEBAR}</neuwo-sidebar>`);
    const stop = watch(holder);
    attach(holder);
    await Promise.resolve();
    expect(stop()).toEqual([]);
    const host = holder.querySelector("neuwo-sidebar");
    expect(host).toBeInstanceOf(NeuwoSidebar);
    expect(holder.querySelector("neuwo-nav-item")).toBeInstanceOf(NeuwoNavItem);
    expect(host.shadowRoot).toBeNull();
    expect(host.querySelector(".neuwo-sidebar__nav").getAttribute("aria-label")).toBe("Docs");
    expect(Array.from(host.querySelectorAll(".neuwo-nav-item__link"), marked)).toEqual([
      [null, false],
      ["page", true],
    ]);
  });

  it("renders a hand-written sidebar into its places, each entry a list item in the nav's list", () => {
    const { host } = sidebar();
    const aside = host.querySelector(":scope > .neuwo-sidebar");
    const text = (selector) => aside.querySelector(selector).textContent;
    expect([text(".neuwo-sidebar__brand"), text(".neuwo-sidebar__actions"), text(".neuwo-sidebar__after-nav"), text(".neuwo-sidebar__footer")]).toEqual([
      "Brand",
      "Setup",
      "Keys",
      "Back to neuwo.ai",
    ]);
    const list = aside.querySelector(".neuwo-sidebar__nav > .neuwo-sidebar__list");
    expect(Array.from(list.children, (each) => each.localName)).toEqual(["neuwo-nav-item", "neuwo-nav-item"]);
    expect(Array.from(list.querySelectorAll(".neuwo-nav-item > .neuwo-nav-item__link"), (each) => each.textContent)).toEqual(["Alpha", "Beta New"]);
    expect(aside.querySelector(".neuwo-sidebar__menu").open).toBe(false);
  });

  it("takes current from location when the attribute is absent, on a host React did not render", () => {
    at("/b/index.html");
    const { host, link } = sidebar("");
    expect(host.getAttribute("current")).toBe("/b/index.html");
    expect(host.current).toBe("/b/index.html");
    expect([marked(link("/a/")), marked(link("/b/"))]).toEqual([
      [null, false],
      ["page", true],
    ]);
  });

  it("keeps a current it was given over the location", () => {
    at("/b/");
    const { host, link } = sidebar('current="/a/"');
    expect(host.current).toBe("/a/");
    expect(marked(link("/a/"))).toEqual(["page", true]);
  });

  it("moves the mark when current changes", () => {
    const { host, link } = sidebar();
    expect([marked(link("/a/")), marked(link("/b/"))]).toEqual([
      ["page", true],
      [null, false],
    ]);
    host.current = "/b/";
    expect(host.getAttribute("current")).toBe("/b/");
    expect([marked(link("/a/")), marked(link("/b/"))]).toEqual([
      [null, false],
      ["page", true],
    ]);
    host.setAttribute("current", "/c/");
    expect([marked(link("/a/")), marked(link("/b/"))]).toEqual([
      [null, false],
      [null, false],
    ]);
  });

  it("reflects label, menu-label, remember and href", () => {
    const { host } = sidebar();
    expect([host.label, host.menuLabel, host.remember]).toEqual(["Main", "Menu", null]);
    host.label = "Documentation";
    host.menuLabel = "Open Navigation";
    host.remember = true;
    expect([host.getAttribute("label"), host.getAttribute("menu-label"), host.getAttribute("remember")]).toEqual(["Documentation", "Open Navigation", ""]);
    expect(host.querySelector(".neuwo-sidebar__nav").getAttribute("aria-label")).toBe("Documentation");
    expect(host.querySelector(".neuwo-sidebar__toggle").getAttribute("aria-label")).toBe("Open Navigation");
    host.remember = "docs";
    expect(host.remember).toBe("docs");
    host.remember = false;
    host.label = null;
    expect([host.hasAttribute("remember"), host.remember, host.hasAttribute("label")]).toEqual([false, null, false]);
    const item = host.querySelector("neuwo-nav-item");
    item.href = "/z/";
    expect([item.getAttribute("href"), item.querySelector(".neuwo-nav-item__link").getAttribute("href")]).toEqual(["/z/", "/z/"]);
    item.href = "";
    expect([item.hasAttribute("href"), item.href]).toEqual([false, ""]);
  });

  it("opens and closes the phone menu through menuOpen without writing the host", () => {
    const { host, menu } = sidebar();
    const stop = watch(host, { attributes: true });
    expect(host.menuOpen).toBe(false);
    host.menuOpen = true;
    expect([menu.open, host.menuOpen]).toEqual([true, true]);
    host.menuOpen = false;
    expect([menu.open, host.menuOpen]).toEqual([false, false]);
    menu.open = true;
    expect(host.menuOpen).toBe(true);
    expect(stop()).toEqual([]);
  });

  it("keeps the menu's open state through a re-render", () => {
    const { host, menu } = sidebar();
    host.menuOpen = true;
    host.label = "Documentation";
    host.current = "/b/";
    expect(host.querySelector(".neuwo-sidebar__menu")).toBe(menu);
    expect(menu.open).toBe(true);
  });

  it("closes the phone menu when a link inside the nav is followed", () => {
    followed();
    const { host, link } = sidebar();
    host.menuOpen = true;
    host.querySelector(".neuwo-sidebar__brand a").click();
    host.querySelector(".neuwo-sidebar__list").click();
    expect(host.menuOpen).toBe(true);
    link("/b/").querySelector(".tag").click();
    expect(host.menuOpen).toBe(false);
  });

  it("fires a cancelable navigate with the href on a plain click of an entry, and cancelling it prevents the link's default", () => {
    const prevented = followed();
    const { host, link } = sidebar();
    const seen = [];
    const record = (event) => seen.push([event.target, event.detail.href, event.cancelable]);
    document.addEventListener("navigate", record);
    cleanup.push(() => document.removeEventListener("navigate", record));
    link("/b/").querySelector(".tag").click();
    expect(seen).toEqual([[host, "/b/", true]]);
    expect(prevented).toEqual([false]);

    const cancel = (event) => event.preventDefault();
    host.addEventListener("navigate", cancel);
    link("/a/").click();
    expect(seen.map(([, href]) => href)).toEqual(["/b/", "/a/"]);
    expect(prevented).toEqual([false, true]);
    host.removeEventListener("navigate", cancel);
  });

  it("fires no navigate for a modified or middle click, or for a link in the brand, actions, after-nav or footer", () => {
    followed();
    const { host, link } = sidebar();
    const seen = [];
    host.addEventListener("navigate", (event) => seen.push(event.detail.href));
    for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) click(link("/a/"), init);
    for (const selector of [".neuwo-sidebar__brand a", ".neuwo-sidebar__actions a", ".neuwo-sidebar__after-nav a", ".neuwo-sidebar__footer a"]) {
      host.querySelector(selector).click();
    }
    expect(seen).toEqual([]);
    link("/a/").click();
    expect(seen).toEqual(["/a/"]);
  });

  it("fires no navigate for a click whose default a handler already prevented", () => {
    followed();
    const { host, link } = sidebar();
    const seen = [];
    host.addEventListener("navigate", (event) => seen.push(event.detail.href));
    link("/a/").addEventListener("click", (event) => event.preventDefault());
    host.menuOpen = true;
    link("/a/").click();
    expect(seen).toEqual([]);
    expect(host.menuOpen).toBe(false);
  });
});
