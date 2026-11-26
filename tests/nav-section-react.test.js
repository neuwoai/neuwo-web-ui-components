import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import "../src/index.js";
import { NeuwoNavSection } from "../src/components/sidebar/neuwo-nav-section.js";
import { jsx, jsxs } from "../src/react/jsx-runtime.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const cleanup = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop()();
  vi.restoreAllMocks();
});

function attach(node) {
  document.body.appendChild(node);
  cleanup.push(() => node.remove());
  return node;
}

/** @param {Node} target */
function watch(target) {
  const records = [];
  const observer = new MutationObserver((list) => records.push(...list));
  observer.observe(target, { subtree: true, childList: true, attributes: true, characterData: true });
  cleanup.push(() => observer.disconnect());
  return () => {
    records.push(...observer.takeRecords());
    return records.splice(0);
  };
}

/** Lets the sections' observers see the changes made so far, and see their own answers. */
async function settle() {
  for (let round = 0; round < 4; round++) await Promise.resolve();
}

const item = (href, label) => jsx("neuwo-nav-item", { href, children: label }, href);

/** @param {Record<string, unknown>} props */
const sidebar = (props, children = entries()) => jsxs("neuwo-sidebar", { ...props, children });

const entries = () => [
  item("/", "Home"),
  jsxs("neuwo-nav-section", { label: "Alpha", children: [item("/a/", "Introduction"), jsx("neuwo-nav-section", { label: "Alpha Deep", id: "alpha-deep", children: item("/a/one/", "One") }, "deep")] }, "alpha"),
  jsxs("neuwo-nav-section", { label: "Beta", children: [item("/b/", "Introduction"), item("/b/two/", "Two")] }, "beta"),
  jsx("neuwo-nav-section", { label: "Gamma", href: "/g/", children: item("/g/three/", "Three") }, "gamma"),
];

function read(container) {
  const host = container.querySelector("neuwo-sidebar");
  const section = (label) => Array.from(host.querySelectorAll("neuwo-nav-section")).find((each) => each.getAttribute("label") === label);
  const details = (label) => section(label).querySelector(":scope > .neuwo-nav-section > .neuwo-nav-section__details");
  const summary = (label) => details(label).querySelector(":scope > summary");
  const labels = () => Array.from(host.querySelectorAll("neuwo-nav-section"), (each) => each.getAttribute("label"));
  const open = () => labels().filter((label) => details(label).open);
  const marked = () => labels().filter((label) => section(label).querySelector(":scope > .neuwo-nav-section").classList.contains("neuwo-nav-section--active"));
  const page = () => Array.from(host.querySelectorAll('[aria-current="page"]'), (link) => link.getAttribute("href"));
  return { host, section, details, summary, open, marked, page };
}

/** @param {unknown} element */
function render(element) {
  const container = attach(document.createElement("div"));
  const root = createRoot(container);
  cleanup.push(() => act(() => root.unmount()));
  act(() => root.render(element));
  return { container, ...read(container) };
}

function movable(start = "/a/one/") {
  const moves = {};
  function Sidebar() {
    const [current, setCurrent] = useState(start);
    const [label, setLabel] = useState("Docs");
    moves.current = setCurrent;
    moves.label = setLabel;
    return sidebar({ current, label });
  }
  return { App: Sidebar, moves };
}

describe("<neuwo-nav-section> under React", () => {
  it("keeps a branch open when the current prop moves away, and opens the new one", async () => {
    const errors = vi.spyOn(console, "error");
    const { App, moves } = movable();
    const { section, details, open, marked, page } = render(jsx(App, {}));
    expect(section("Alpha")).toBeInstanceOf(NeuwoNavSection);
    expect(open()).toEqual(["Alpha", "Alpha Deep"]);
    expect(marked()).toEqual(["Alpha", "Alpha Deep"]);
    const alpha = details("Alpha");
    act(() => moves.current("/b/two/"));
    await settle();
    expect(marked()).toEqual(["Beta"]);
    expect(page()).toEqual(["/b/two/"]);
    expect(open()).toEqual(["Alpha", "Alpha Deep", "Beta"]);
    expect(details("Alpha")).toBe(alpha);
    act(() => moves.current("/g/three/"));
    await settle();
    expect(marked()).toEqual(["Gamma"]);
    expect(open()).toEqual(["Alpha", "Alpha Deep", "Beta", "Gamma"]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps a branch the reader closed closed through a re-render with the same current", async () => {
    const { App, moves } = movable();
    const { summary, open, marked } = render(jsx(App, {}));
    act(() => summary("Alpha").click());
    await settle();
    expect(open()).toEqual(["Alpha Deep"]);
    act(() => moves.label("Documentation"));
    act(() => moves.current("/a/one/"));
    await settle();
    expect(open()).toEqual(["Alpha Deep"]);
    expect(marked()).toEqual(["Alpha", "Alpha Deep"]);
    act(() => summary("Beta").click());
    await settle();
    act(() => moves.current("/g/three/"));
    await settle();
    expect(open()).toEqual(["Alpha Deep", "Beta", "Gamma"]);
  });

  it("never writes the host React rendered", async () => {
    const errors = vi.spyOn(console, "error");
    const { App, moves } = movable();
    const { container, summary } = render(jsx(App, {}));
    const records = watch(container);
    act(() => summary("Beta").click());
    act(() => moves.current("/b/two/"));
    await settle();
    act(() => moves.label("Documentation"));
    await settle();
    const own = records().filter((record) => record.target.localName?.startsWith("neuwo-"));
    expect(own.map((record) => [record.target.localName, record.type, record.attributeName])).toEqual([
      ["neuwo-sidebar", "attributes", "current"],
      ["neuwo-sidebar", "attributes", "label"],
    ]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("hydrates over branches the reader opened and closed before it, without a warning, and keeps them", async () => {
    const errors = vi.spyOn(console, "error");
    const { App, moves } = movable();
    const container = document.createElement("div");
    container.innerHTML = renderToString(jsx(App, {}));
    attach(container);
    const before = read(container);
    expect(before.section("Alpha")).toBeInstanceOf(NeuwoNavSection);
    before.summary("Beta").click();
    before.summary("Alpha").click();
    await settle();
    expect(before.open()).toEqual(["Alpha Deep", "Beta"]);
    let root;
    act(() => {
      root = hydrateRoot(container, jsx(App, {}));
    });
    cleanup.push(() => act(() => root.unmount()));
    await settle();
    const after = read(container);
    expect(after.details("Beta")).toBe(before.details("Beta"));
    expect(after.open()).toEqual(["Alpha Deep", "Beta"]);
    act(() => moves.current("/g/three/"));
    await settle();
    expect(after.open()).toEqual(["Alpha Deep", "Beta", "Gamma"]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("marks nothing inside an app component wrapping entries, without an error", async () => {
    const errors = vi.spyOn(console, "error");
    function Entries() {
      return [item("/a/", "Alpha"), jsx("neuwo-nav-section", { label: "Inner", children: item("/a/one/", "One") }, "inner")];
    }
    function Wrapped() {
      return jsx("neuwo-nav-section", { label: "Wrapped", children: item("/a/one/", "One") });
    }
    const { open, marked, page } = render(
      sidebar({ current: "/a/one/" }, [
        jsx(Entries, {}, "entries"),
        jsx(Wrapped, {}, "wrapped"),
        jsx("neuwo-nav-section", { label: "Outer", children: jsx(Entries, {}) }, "outer"),
      ]),
    );
    await settle();
    expect(marked()).toEqual([]);
    expect(page()).toEqual([]);
    expect(open()).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
  });
});
