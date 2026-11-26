import { afterEach, describe, expect, it, vi } from "vitest";
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

/** Stops happy-dom following links without preventing a click's default, which the sidebar reads after the click. */
function stay() {
  const navigation = happyDOM.settings.navigation;
  const was = { main: navigation.disableMainFrameNavigation, fallback: navigation.disableFallbackToSetURL };
  navigation.disableMainFrameNavigation = true;
  navigation.disableFallbackToSetURL = true;
  cleanup.push(() => {
    navigation.disableMainFrameNavigation = was.main;
    navigation.disableFallbackToSetURL = was.fallback;
  });
}

/** Waits for the task after the click, when the whole dispatch is over. */
const later = () => new Promise((resolve) => setTimeout(resolve));

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

  it("closes the phone menu when any link in the sidebar is followed, and not on a click that hits no link", () => {
    followed();
    const { host, link } = sidebar();
    host.menuOpen = true;
    host.querySelector(".neuwo-sidebar__list").click();
    host.querySelector(".neuwo-sidebar__brand").click();
    expect(host.menuOpen).toBe(true);
    for (const selector of [".neuwo-sidebar__brand a", ".neuwo-sidebar__actions a", ".neuwo-sidebar__after-nav a", ".neuwo-sidebar__footer a"]) {
      host.menuOpen = true;
      host.querySelector(selector).click();
      expect(host.menuOpen, selector).toBe(false);
    }
    host.menuOpen = true;
    link("/b/").querySelector(".tag").click();
    expect(host.menuOpen).toBe(false);
  });

  it("leaves the phone menu as it is on a modified or middle click, which opens the link elsewhere, and closes it on a plain one", () => {
    followed();
    const { host, link } = sidebar();
    host.menuOpen = true;
    for (const target of [link("/a/"), host.querySelector(".neuwo-sidebar__brand a"), host.querySelector(".neuwo-sidebar__footer a")]) {
      for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
        click(target, init);
        expect(host.menuOpen, `${target.textContent} ${JSON.stringify(init)}`).toBe(true);
      }
    }
    click(link("/a/"));
    expect(host.menuOpen).toBe(false);
  });

  it("closes the phone menu on a click of the brand's link whose default a client router prevents, before the sidebar or after it, and leaves focus there", async () => {
    stay();
    const { host } = sidebar();
    const brand = host.querySelector(".neuwo-sidebar__brand a");
    const route = (event) => event.preventDefault();
    brand.addEventListener("click", route);
    host.menuOpen = true;
    brand.focus();
    expect(click(brand)).toBe(false);
    expect(host.menuOpen).toBe(false);
    brand.removeEventListener("click", route);
    document.addEventListener("click", route);
    cleanup.push(() => document.removeEventListener("click", route));
    host.menuOpen = true;
    expect(click(brand)).toBe(false);
    expect(host.menuOpen).toBe(false);
    await later();
    expect(document.activeElement).toBe(brand);
  });

  it("returns focus to the menu button, without scrolling, when a click in the open menu closes it and a client router keeps the page", async () => {
    stay();
    const { host, link } = sidebar();
    const toggle = host.querySelector(".neuwo-sidebar__toggle");
    const focus = vi.spyOn(toggle, "focus");
    host.addEventListener("navigate", (event) => event.preventDefault());
    host.menuOpen = true;
    link("/b/").focus();
    expect(click(link("/b/"))).toBe(false);
    expect(host.menuOpen).toBe(false);
    await later();
    expect(document.activeElement).toBe(toggle);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });

    const footer = host.querySelector(".neuwo-sidebar__footer a");
    const route = (event) => event.preventDefault();
    document.addEventListener("click", route);
    cleanup.push(() => document.removeEventListener("click", route));
    host.menuOpen = true;
    footer.focus();
    expect(click(footer)).toBe(false);
    expect(host.menuOpen).toBe(false);
    await later();
    expect(document.activeElement).toBe(toggle);
    expect(focus).toHaveBeenCalledTimes(2);
  });

  it("leaves focus where it is when the browser follows the link, to another page or within this one, or when no menu was open to close", async () => {
    at("/a/");
    stay();
    const holder = make(`<neuwo-sidebar current="/a/"><neuwo-nav-item href="/b/">Beta</neuwo-nav-item><neuwo-nav-item href="#heading">Heading</neuwo-nav-item></neuwo-sidebar>`);
    const host = holder.querySelector("neuwo-sidebar");
    const toggle = host.querySelector(".neuwo-sidebar__toggle");
    const focus = vi.spyOn(toggle, "focus");
    for (const href of ["/b/", "#heading"]) {
      const entry = host.querySelector(`.neuwo-nav-item__link[href="${href}"]`);
      host.menuOpen = true;
      entry.focus();
      expect(click(entry), href).toBe(true);
      expect(host.menuOpen, href).toBe(false);
      await later();
      expect(document.activeElement, href).toBe(entry);
    }
    host.addEventListener("navigate", (event) => event.preventDefault());
    const entry = host.querySelector('.neuwo-nav-item__link[href="/b/"]');
    entry.focus();
    expect(click(entry)).toBe(false);
    await later();
    expect(document.activeElement).toBe(entry);
    expect(focus).not.toHaveBeenCalled();
  });

  it("closes the phone menu on a modified click whose default a handler already prevented, as a client router's", () => {
    followed();
    const { host, link } = sidebar();
    link("/a/").addEventListener("click", (event) => event.preventDefault());
    host.menuOpen = true;
    click(link("/a/"), { ctrlKey: true });
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

  it("fires navigate only for a page of the same origin that leaves the document, letting the browser follow the rest and still closing the menu", () => {
    at("/a/");
    stay();
    const here = location.origin;
    const entries = ["https://example.com/guide/", "#heading", "/a/#part", "/b/", `${here}/c/`, "/a/?page=2", "/b/#part"];
    const holder = make(
      `<neuwo-sidebar current="/a/">${entries.map((href) => `<neuwo-nav-item href="${href}">${href}</neuwo-nav-item>`).join("")}` +
        `<neuwo-nav-section label="Partner" href="https://example.com/"><neuwo-nav-item href="https://example.com/one/">One</neuwo-nav-item></neuwo-nav-section></neuwo-sidebar>`,
    );
    const host = holder.querySelector("neuwo-sidebar");
    const seen = [];
    host.addEventListener("navigate", (event) => {
      seen.push(event.detail.href);
      event.preventDefault();
    });
    const kept = [];
    for (const href of [...entries, "https://example.com/"]) {
      host.menuOpen = true;
      if (click(host.querySelector(`.neuwo-sidebar__nav a[href="${href}"]`))) kept.push(href);
      expect(host.menuOpen, href).toBe(false);
    }
    expect(seen).toEqual(["/b/", `${here}/c/`, "/a/?page=2", "/b/#part"]);
    expect(kept).toEqual(["https://example.com/guide/", "#heading", "/a/#part", "https://example.com/"]);
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
