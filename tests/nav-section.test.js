import { afterEach, describe, expect, it } from "vitest";
import "../src/index.js";
import { NeuwoNavSection } from "../src/components/sidebar/neuwo-nav-section.js";
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

/** Lets the sections' observers see the changes made so far, and see their own answers. */
async function settle() {
  for (let round = 0; round < 4; round++) await Promise.resolve();
}

const TREE =
  `<neuwo-nav-item href="/">Home</neuwo-nav-item>` +
  `<neuwo-nav-section label="Alpha">` +
  `<neuwo-nav-item href="/a/">Introduction</neuwo-nav-item>` +
  `<neuwo-nav-section label="Alpha Deep" id="alpha-deep"><neuwo-nav-item href="/a/one/">One</neuwo-nav-item></neuwo-nav-section>` +
  `</neuwo-nav-section>` +
  `<neuwo-nav-section label="Beta"><neuwo-nav-item href="/b/">Introduction</neuwo-nav-item><neuwo-nav-item href="/b/two/">Two</neuwo-nav-item></neuwo-nav-section>` +
  `<neuwo-nav-section label="Gamma" href="/g/"><neuwo-nav-item href="/g/three/">Three</neuwo-nav-item></neuwo-nav-section>`;

function tree(current = "/a/one/", holder = make(`<neuwo-sidebar current="${current}">${TREE}</neuwo-sidebar>`)) {
  const host = holder.querySelector("neuwo-sidebar");
  const section = (label) => Array.from(host.querySelectorAll("neuwo-nav-section")).find((each) => each.getAttribute("label") === label);
  const details = (label) => section(label).querySelector(":scope > .neuwo-nav-section > .neuwo-nav-section__details");
  const summary = (label) => details(label).querySelector(":scope > summary");
  const name = (label) => section(label).querySelector(":scope > .neuwo-nav-section > .neuwo-nav-section__name, :scope > .neuwo-nav-section > details > summary > .neuwo-nav-section__name");
  const open = () => ["Alpha", "Alpha Deep", "Beta", "Gamma"].filter((label) => details(label).open);
  const marked = () =>
    ["Alpha", "Alpha Deep", "Beta", "Gamma"].filter((label) => {
      const li = section(label).querySelector(":scope > .neuwo-nav-section");
      const both = [li.classList.contains("neuwo-nav-section--active"), name(label).classList.contains("neuwo-nav-link--active")];
      expect(both[0], label).toBe(both[1]);
      return both[0];
    });
  const page = () => Array.from(host.querySelectorAll('[aria-current="page"]'), (link) => link.getAttribute("href"));
  return { holder, host, section, details, summary, name, open, marked, page };
}

describe("<neuwo-nav-section>", () => {
  it("opens the branch holding the page and marks it, at any depth", () => {
    const { section, details, summary, name, open, marked, page } = tree("/a/one/");
    expect(section("Alpha")).toBeInstanceOf(NeuwoNavSection);
    expect(section("Alpha").shadowRoot).toBeNull();
    expect(open()).toEqual(["Alpha", "Alpha Deep"]);
    expect(marked()).toEqual(["Alpha", "Alpha Deep"]);
    expect(page()).toEqual(["/a/one/"]);
    expect(summary("Alpha").className).toBe("neuwo-nav-section__row");
    expect(name("Alpha").localName).toBe("span");
    expect(name("Alpha").textContent).toBe("Alpha");
    const list = details("Alpha").querySelector(":scope > .neuwo-nav-section__list");
    expect(Array.from(list.children, (each) => each.localName)).toEqual(["neuwo-nav-item", "neuwo-nav-section"]);
    expect(details("Alpha Deep").dataset.key).toBe("alpha-deep");
    expect(details("Beta").dataset.key).toBe("Beta");
  });

  it("opens and marks a branch for a page below one of its entries that the nav does not list", () => {
    const { open, marked, page } = tree("/b/two/notes/");
    expect(open()).toEqual(["Beta"]);
    expect(marked()).toEqual(["Beta"]);
    expect(page()).toEqual([]);
  });

  it("adopts served markup with zero writes", async () => {
    const holder = document.createElement("div");
    holder.innerHTML = expand(`<neuwo-sidebar current="/a/one/">${TREE}</neuwo-sidebar>`);
    const stop = watch(holder);
    attach(holder);
    await settle();
    expect(stop()).toEqual([]);
    const { section, open, marked } = tree("/a/one/", holder);
    expect(section("Alpha")).toBeInstanceOf(NeuwoNavSection);
    expect(open()).toEqual(["Alpha", "Alpha Deep"]);
    expect(marked()).toEqual(["Alpha", "Alpha Deep"]);
  });

  it("keeps a branch open when current moves away, and opens the new one", async () => {
    const { host, details, open, marked, page } = tree("/a/one/");
    const alpha = details("Alpha");
    host.current = "/b/two/";
    await settle();
    expect(marked()).toEqual(["Beta"]);
    expect(page()).toEqual(["/b/two/"]);
    expect(open()).toEqual(["Alpha", "Alpha Deep", "Beta"]);
    expect(details("Alpha")).toBe(alpha);
    host.current = "/g/";
    await settle();
    expect(marked()).toEqual(["Gamma"]);
    expect(open()).toEqual(["Alpha", "Alpha Deep", "Beta", "Gamma"]);
  });

  it("keeps a branch the reader closed closed through an unrelated re-render", async () => {
    const { host, section, summary, open, marked } = tree("/a/one/");
    summary("Alpha").click();
    await settle();
    expect(open()).toEqual(["Alpha Deep"]);
    section("Alpha").setAttribute("id", "alpha");
    host.label = "Documentation";
    host.current = "/a/one/";
    host.setAttribute("current", "/a/one/");
    await settle();
    expect(open()).toEqual(["Alpha Deep"]);
    expect(marked()).toEqual(["Alpha", "Alpha Deep"]);

    summary("Beta").click();
    await settle();
    host.current = "/g/three/";
    await settle();
    expect(open()).toEqual(["Alpha Deep", "Beta", "Gamma"]);
  });

  it("lets the reader close and reopen a branch from its summary, with the keyboard too", async () => {
    const { details, summary, name } = tree("/a/one/");
    const chevron = summary("Alpha").querySelector(".neuwo-nav-section__chevron");
    name("Alpha").click();
    await settle();
    expect(details("Alpha").open).toBe(false);
    chevron.click();
    await settle();
    expect(details("Alpha").open).toBe(true);
    // Enter and Space on a focused summary reach it as a click with no pointer behind it, so its detail is 0.
    const key = () => summary("Alpha").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 }));
    key();
    await settle();
    expect(details("Alpha").open).toBe(false);
    key();
    await settle();
    expect(details("Alpha").open).toBe(true);
  });

  it("puts back a close the reader did not make, as a script's or one after a click the page cancelled", async () => {
    const { details, summary } = tree("/a/one/");
    details("Alpha").open = false;
    await settle();
    expect(details("Alpha").open).toBe(true);
    details("Alpha Deep").removeAttribute("open");
    await settle();
    expect(details("Alpha Deep").open).toBe(true);

    const cancel = (event) => event.preventDefault();
    summary("Alpha").addEventListener("click", cancel);
    summary("Alpha").click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    details("Alpha").open = false;
    await settle();
    expect(details("Alpha").open).toBe(true);
    summary("Alpha").removeEventListener("click", cancel);
  });

  it("knows the reader closed a section when a page listener stops the click on its row", async () => {
    const { details, name } = tree("/a/one/");
    const stop = (event) => event.stopPropagation();
    name("Alpha").addEventListener("click", stop);
    name("Alpha").click();
    // happy-dom toggles a details only when the click reaches it; a browser toggles it from the summary however the click was stopped.
    details("Alpha").open = false;
    await settle();
    expect(details("Alpha").open).toBe(false);
    name("Alpha").removeEventListener("click", stop);
  });

  it("keeps a branch open when current moves while the sidebar is out of the page, or as it moves", async () => {
    const { holder, host, open } = tree("/a/one/");
    holder.remove();
    host.current = "/b/two/";
    await settle();
    document.body.append(holder);
    await settle();
    expect(open()).toEqual(["Alpha", "Alpha Deep", "Beta"]);
    host.current = "/g/three/";
    holder.remove();
    document.body.append(holder);
    await settle();
    expect(open()).toEqual(["Alpha", "Alpha Deep", "Beta", "Gamma"]);
  });

  it("starts open with open, which is no more than the starting state", async () => {
    const holder = make(`<neuwo-sidebar current="/"><neuwo-nav-section label="Beta" open><neuwo-nav-item href="/b/">Beta</neuwo-nav-item></neuwo-nav-section></neuwo-sidebar>`);
    const section = holder.querySelector("neuwo-nav-section");
    const details = section.querySelector(".neuwo-nav-section__details");
    expect([section.open, details.open]).toEqual([true, true]);
    expect(section.querySelector(".neuwo-nav-section").classList.contains("neuwo-nav-section--active")).toBe(false);
    section.open = false;
    await settle();
    expect([section.hasAttribute("open"), details.open]).toEqual([false, true]);
  });

  it("reflects label, href and open", () => {
    const { section, name, summary } = tree("/");
    const beta = section("Beta");
    expect([beta.label, beta.href, beta.open]).toEqual(["Beta", "", false]);
    beta.label = "Beta Guides";
    expect([beta.getAttribute("label"), name("Beta Guides").textContent]).toEqual(["Beta Guides", "Beta Guides"]);
    beta.href = "/b/";
    expect(beta.getAttribute("href")).toBe("/b/");
    expect(name("Beta Guides").localName).toBe("a");
    expect(name("Beta Guides").getAttribute("href")).toBe("/b/");
    expect(summary("Beta Guides").className).toBe("neuwo-nav-section__toggle");
    expect(summary("Beta Guides").getAttribute("aria-label")).toBe("Show Beta Guides pages");
    beta.open = true;
    expect(beta.getAttribute("open")).toBe("");
    beta.href = "";
    beta.label = null;
    expect([beta.hasAttribute("href"), beta.hasAttribute("label"), beta.href, beta.label]).toEqual([false, false, "", ""]);
  });

  it("fires navigate for a section's own link, and folds nothing when it is followed", async () => {
    const prevented = followed();
    const { host, section, details, summary, name } = tree("/a/one/");
    const seen = [];
    host.addEventListener("navigate", (event) => seen.push([event.detail.href, event.cancelable]));
    host.menuOpen = true;
    name("Gamma").click();
    await settle();
    expect(seen).toEqual([["/g/", true]]);
    expect(prevented).toEqual([false]);
    expect([details("Gamma").open, host.menuOpen]).toEqual([false, false]);

    summary("Gamma").click();
    await settle();
    expect(details("Gamma").open).toBe(true);
    name("Alpha").click();
    await settle();
    expect(seen).toHaveLength(1);
    expect(section("Gamma").querySelector(":scope > .neuwo-nav-section > a.neuwo-nav-section__name")).toBe(name("Gamma"));
  });
});
