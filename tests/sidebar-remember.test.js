// @vitest-environment-options {"settings":{"enableJavaScriptEvaluation":true,"suppressInsecureJavaScriptEnvironmentWarning":true}}
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../src/index.js";
import { sidebarTemplate } from "../src/components/sidebar/sidebar.template.js";
import { jsx } from "../src/react/jsx-runtime.js";
import { expand } from "../src/server/index.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const SNIPPET = "src/components/sidebar/remember.snippet.js";

const TREE =
  `<neuwo-nav-item href="/">Home</neuwo-nav-item>` +
  `<neuwo-nav-section label="Alpha">` +
  `<neuwo-nav-item href="/a/">Introduction</neuwo-nav-item>` +
  `<neuwo-nav-section label="Deep" id="alpha-deep"><neuwo-nav-item href="/a/one/">One</neuwo-nav-item></neuwo-nav-section>` +
  `</neuwo-nav-section>` +
  `<neuwo-nav-section label="Beta">` +
  `<neuwo-nav-item href="/b/">Introduction</neuwo-nav-item>` +
  `<neuwo-nav-section label="Deep"><neuwo-nav-item href="/b/two/">Two</neuwo-nav-item></neuwo-nav-section>` +
  `</neuwo-nav-section>` +
  `<neuwo-nav-section label="Gamma" href="/g/" open><neuwo-nav-item href="/g/three/">Three</neuwo-nav-item></neuwo-nav-section>`;

const cleanup = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop()();
  vi.restoreAllMocks();
});

/** @param {string} key */
const stored = (key) => JSON.parse(sessionStorage.getItem(key));

/** @param {Element} host */
function sidebar(host) {
  const sections = () => Array.from(host.querySelectorAll("neuwo-nav-section"));
  const name = (section) => {
    const names = [];
    for (let at = section; at; at = at.parentElement?.closest("neuwo-nav-section")) names.unshift(at.getAttribute("label"));
    return names.join(" > ");
  };
  const details = (path) => sections().find((section) => name(section) === path).querySelector(":scope > .neuwo-nav-section > .neuwo-nav-section__details");
  const open = () => sections().map(name).filter((path) => details(path).open);
  const summary = (path) => details(path).querySelector(":scope > summary");
  return { host, details, open, summary, nav: host.querySelector(".neuwo-sidebar__nav") };
}

/** @param {string} html */
function attach(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  document.body.append(holder);
  cleanup.push(() => holder.remove());
  return holder;
}

/**
 * Puts served markup in the page, then runs each remember script where it stands, as the parser does once it has
 * parsed the nav. A script parsed by innerHTML never runs, in happy-dom as in a browser, so each is put back fresh.
 * @param {string} html
 */
async function serve(html) {
  const holder = attach(expand(html));
  for (const parsed of Array.from(holder.querySelectorAll("script.neuwo-sidebar__remember"))) {
    const script = document.createElement("script");
    script.className = parsed.className;
    script.textContent = parsed.textContent;
    parsed.replaceWith(script);
  }
  await Promise.resolve();
  return Array.from(holder.querySelectorAll("neuwo-sidebar"), sidebar);
}

/** Fails the test on anything the page logs or reports as an error. */
function silent() {
  const logged = ["error", "warn", "log", "info"].map((level) => vi.spyOn(console, level));
  const errors = [];
  const report = (event) => errors.push(event.message ?? String(event));
  window.addEventListener("error", report);
  cleanup.push(() => window.removeEventListener("error", report));
  return () => {
    for (const spy of logged) expect(spy).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
  };
}

describe("<neuwo-sidebar remember>", () => {
  it("renders the script and the key only with remember, defaulting the key to neuwo.sidebar", () => {
    const text = readFileSync(SNIPPET, "utf8");
    expect(text).not.toMatch(/<\/script|<!--/i);
    const ctx = { id: (suffix) => suffix, children: [], within: null };
    const script = (node) => node.children.find((child) => child.tag === "script");
    const without = sidebarTemplate({}, ctx);
    expect([without.props["data-remember"], script(without)]).toEqual([undefined, undefined]);
    const empty = sidebarTemplate({ remember: "" }, ctx);
    expect(empty.props["data-remember"]).toBe("neuwo.sidebar");
    expect(empty.children.at(-1)).toEqual({ tag: "script", props: { class: "neuwo-sidebar__remember" }, children: [{ raw: text }] });
    expect(sidebarTemplate({ remember: "docs" }, ctx).props["data-remember"]).toBe("docs");
    const served = expand(`<neuwo-sidebar current="/" remember="docs"></neuwo-sidebar>`);
    expect(served).toContain(`<aside class="neuwo-sidebar" data-remember="docs">`);
    expect(served).toContain(`</details><script class="neuwo-sidebar__remember">${text}</script></aside>`);
    expect(expand(`<neuwo-sidebar current="/"></neuwo-sidebar>`)).not.toMatch(/data-remember|<script/);
  });

  it("restores the remembered sections and the nav's scroll", async () => {
    sessionStorage.setItem("restores", JSON.stringify({ open: ["Beta", "Alpha/alpha-deep"], scroll: 120 }));
    const [{ open, nav }] = await serve(`<neuwo-sidebar current="/" remember="restores">${TREE}</neuwo-sidebar>`);
    expect(open()).toEqual(["Alpha > Deep", "Beta", "Gamma"]);
    expect(nav.scrollTop).toBe(120);
  });

  it("saves the open sections and the scroll on a toggle and on pagehide", async () => {
    const [{ host, open, summary, nav }] = await serve(`<neuwo-sidebar current="/b/two/" remember="saves">${TREE}</neuwo-sidebar>`);
    expect(open()).toEqual(["Beta", "Beta > Deep", "Gamma"]);
    summary("Alpha").click();
    expect(stored("saves")).toEqual({ open: ["Alpha", "Beta", "Beta/Deep", "Gamma"], scroll: 0 });
    nav.scrollTop = 64;
    window.dispatchEvent(new Event("pagehide"));
    expect(stored("saves")).toEqual({ open: ["Alpha", "Beta", "Beta/Deep", "Gamma"], scroll: 64 });
    summary("Beta").click();
    expect(stored("saves")).toEqual({ open: ["Alpha", "Beta/Deep", "Gamma"], scroll: 64 });
    host.remember = "renamed";
    summary("Alpha").click();
    expect(stored("renamed")).toEqual({ open: ["Beta/Deep", "Gamma"], scroll: 64 });
    host.remember = false;
    summary("Alpha").click();
    window.dispatchEvent(new Event("pagehide"));
    expect(stored("renamed")).toEqual({ open: ["Beta/Deep", "Gamma"], scroll: 64 });
  });

  it("keys a nested section by its path, and uses id over label", async () => {
    sessionStorage.setItem("keys", JSON.stringify({ open: ["Beta/Deep", "Alpha/Deep", "alpha-deep", "Deep"], scroll: 0 }));
    const [{ open, summary }] = await serve(`<neuwo-sidebar current="/" remember="keys">${TREE}</neuwo-sidebar>`);
    expect(open()).toEqual(["Beta > Deep", "Gamma"]);
    summary("Alpha > Deep").click();
    expect(stored("keys").open).toEqual(["Alpha/alpha-deep", "Beta/Deep", "Gamma"]);
  });

  it("never closes a section the server opened", async () => {
    sessionStorage.setItem("server", JSON.stringify({ open: [], scroll: 0 }));
    const [{ open }] = await serve(`<neuwo-sidebar current="/a/one/" remember="server">${TREE}</neuwo-sidebar>`);
    expect(open()).toEqual(["Alpha", "Alpha > Deep", "Gamma"]);
  });

  it("keeps two sidebars apart by their keys", async () => {
    sessionStorage.setItem("one", JSON.stringify({ open: ["Beta"], scroll: 10 }));
    sessionStorage.setItem("two", JSON.stringify({ open: ["Alpha"], scroll: 20 }));
    const [first, second] = await serve(`<neuwo-sidebar current="/" remember="one">${TREE}</neuwo-sidebar><neuwo-sidebar current="/" remember="two">${TREE}</neuwo-sidebar>`);
    expect([first.open(), first.nav.scrollTop]).toEqual([["Beta", "Gamma"], 10]);
    expect([second.open(), second.nav.scrollTop]).toEqual([["Alpha", "Gamma"], 20]);
    first.summary("Beta > Deep").click();
    expect(stored("one")).toEqual({ open: ["Beta", "Beta/Deep", "Gamma"], scroll: 10 });
    expect(stored("two")).toEqual({ open: ["Alpha"], scroll: 20 });
  });

  it("works and logs nothing when storage throws, holds junk, names sections that are gone or a scroll past the end", async () => {
    const quiet = silent();
    const denied = () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    };
    // happy-dom's Storage is a Proxy that a spy on its methods never reaches, so the window hands out a stand-in.
    const throwing = { getItem: vi.fn(denied), setItem: vi.fn(denied) };
    const swapped = vi.spyOn(window, "sessionStorage", "get").mockReturnValue(throwing);
    const [blocked] = await serve(`<neuwo-sidebar current="/b/two/" remember="blocked">${TREE}</neuwo-sidebar>`);
    expect(blocked.open()).toEqual(["Beta", "Beta > Deep", "Gamma"]);
    blocked.summary("Alpha").click();
    blocked.summary("Beta").click();
    window.dispatchEvent(new Event("pagehide"));
    expect(blocked.open()).toEqual(["Alpha", "Beta > Deep", "Gamma"]);
    expect(throwing.getItem).toHaveBeenCalledWith("blocked");
    expect(throwing.setItem.mock.calls.filter(([key]) => key === "blocked").length).toBeGreaterThan(0);
    swapped.mockRestore();

    const unreachable = vi.spyOn(window, "sessionStorage", "get").mockImplementation(denied);
    const [off] = await serve(`<neuwo-sidebar current="/" remember="off">${TREE}</neuwo-sidebar>`);
    off.summary("Alpha").click();
    window.dispatchEvent(new Event("pagehide"));
    expect(off.open()).toEqual(["Alpha", "Gamma"]);
    expect(unreachable).toHaveBeenCalled();
    unreachable.mockRestore();

    const junk = ["{not json", "5", "null", '"Beta"', "[]", '{"open":"Beta","scroll":"far"}', '{"open":[1,null,{}],"scroll":{}}'];
    for (const [index, value] of junk.entries()) {
      sessionStorage.setItem(`junk-${index}`, value);
      const [{ open, summary }] = await serve(`<neuwo-sidebar current="/" remember="junk-${index}">${TREE}</neuwo-sidebar>`);
      expect(open(), value).toEqual(["Gamma"]);
      summary("Beta").click();
      expect(stored(`junk-${index}`), value).toEqual({ open: ["Beta", "Gamma"], scroll: 0 });
    }

    sessionStorage.setItem("gone", JSON.stringify({ open: ["Gone", "Alpha/Gone", "Beta", "Beta/Deep/Gone"], scroll: 1e9 }));
    const [gone] = await serve(`<neuwo-sidebar current="/" remember="gone">${TREE}</neuwo-sidebar>`);
    expect(gone.open()).toEqual(["Beta", "Gamma"]);
    gone.summary("Alpha").click();
    expect(stored("gone").open).toEqual(["Alpha", "Beta", "Gamma"]);
    quiet();
  });

  it("runs on a hand-written page when the element renders it", async () => {
    sessionStorage.setItem("hand", JSON.stringify({ open: ["Beta/Deep"], scroll: 40 }));
    const holder = attach(`<neuwo-sidebar current="/" remember="hand">${TREE}</neuwo-sidebar>`);
    await Promise.resolve();
    const { host, open, nav, summary } = sidebar(holder.querySelector("neuwo-sidebar"));
    expect(host.querySelector(":scope > .neuwo-sidebar > .neuwo-sidebar__menu + script.neuwo-sidebar__remember")).not.toBeNull();
    expect(open()).toEqual(["Beta > Deep", "Gamma"]);
    expect(nav.scrollTop).toBe(40);
    summary("Alpha").click();
    expect(stored("hand")).toEqual({ open: ["Alpha", "Beta/Deep", "Gamma"], scroll: 40 });
  });

  it("is not run by a client-side React render, which warns about the script", () => {
    sessionStorage.setItem("react", JSON.stringify({ open: ["Beta"], scroll: 0 }));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const container = attach("");
    const root = createRoot(container);
    cleanup.push(() => act(() => root.unmount()));
    const section = (label, href) => jsx("neuwo-nav-section", { label, children: jsx("neuwo-nav-item", { href, children: label }) });
    act(() => root.render(jsx("neuwo-sidebar", { current: "/", remember: "react", children: [section("Alpha", "/a/"), section("Beta", "/b/")] })));
    const { host, open } = sidebar(container.querySelector("neuwo-sidebar"));
    expect(host.querySelector("script.neuwo-sidebar__remember")).not.toBeNull();
    expect(open()).toEqual([]);
    expect(errors.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining("Encountered a script tag while rendering React component")]);
  });

  it("README carries the script's CSP hash", () => {
    const hash = createHash("sha256").update(readFileSync(SNIPPET, "utf8")).digest("base64");
    expect(readFileSync("README.md", "utf8")).toContain(`'sha256-${hash}'`);
  });
});
