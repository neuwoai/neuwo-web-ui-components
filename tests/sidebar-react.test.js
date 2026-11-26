import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import "../src/index.js";
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

/** @param {unknown} element */
function render(element) {
  const container = attach(document.createElement("div"));
  const root = createRoot(container);
  cleanup.push(() => act(() => root.unmount()));
  act(() => root.render(element));
  const host = container.querySelector("neuwo-sidebar");
  const link = (href) => host.querySelector(`.neuwo-nav-item__link[href="${href}"]`);
  return { container, host, link, menu: host.querySelector(".neuwo-sidebar__menu") };
}

/** @param {Record<string, unknown>} props */
const sidebar = (props) =>
  jsxs("neuwo-sidebar", {
    ...props,
    children: [
      jsx("a", { slot: "brand", href: "/", children: "Brand" }, "brand"),
      jsx("neuwo-nav-item", { href: "/a/", children: "Alpha" }, "a"),
      jsx("neuwo-nav-item", { href: "/b/", children: "Beta" }, "b"),
      jsx("a", { slot: "footer", href: "https://neuwo.ai/", children: "Back to neuwo.ai" }, "footer"),
    ],
  });

const marked = (link) => [link.getAttribute("aria-current"), link.classList.contains("neuwo-nav-link--active")];

describe("<neuwo-sidebar> under React", () => {
  it("never writes the host React rendered through menuOpen, a link click or a current change", () => {
    const errors = vi.spyOn(console, "error");
    followed();
    let move = null;
    function Sidebar() {
      const [current, setCurrent] = useState("/a/");
      move = setCurrent;
      return sidebar({ current });
    }
    const { container, host, link, menu } = render(jsx(Sidebar, {}));
    expect(marked(link("/a/"))).toEqual(["page", true]);
    const records = watch(container);
    act(() => {
      host.menuOpen = true;
    });
    expect([menu.open, host.menuOpen]).toEqual([true, true]);
    act(() => link("/b/").click());
    expect(host.menuOpen).toBe(false);
    act(() => move("/b/"));
    expect([marked(link("/a/")), marked(link("/b/"))]).toEqual([
      [null, false],
      ["page", true],
    ]);
    const own = records().filter((record) => record.target.localName?.startsWith("neuwo-"));
    expect(own.map((record) => [record.target.localName, record.type, record.attributeName])).toEqual([["neuwo-sidebar", "attributes", "current"]]);
    expect(host.getAttribute("current")).toBe("/b/");
    expect(host.querySelector(".neuwo-sidebar__menu")).toBe(menu);
    expect(errors).not.toHaveBeenCalled();
  });

  it("leaves current unset, marking nothing, when React renders it without one", () => {
    history.replaceState(null, "", "/a/");
    cleanup.push(() => history.replaceState(null, "", "/"));
    const { host, link } = render(sidebar({}));
    expect(host.hasAttribute("current")).toBe(false);
    expect(marked(link("/a/"))).toEqual([null, false]);
  });

  it("keeps the menu open through a re-render React makes", () => {
    let rename = null;
    function Sidebar() {
      const [label, setLabel] = useState("Docs");
      rename = setLabel;
      return sidebar({ current: "/a/", label });
    }
    const { host, menu } = render(jsx(Sidebar, {}));
    act(() => {
      host.menuOpen = true;
    });
    act(() => rename("Documentation"));
    expect(host.querySelector(".neuwo-sidebar__nav").getAttribute("aria-label")).toBe("Documentation");
    expect(menu.open).toBe(true);
  });

  it("hands onnavigate the href", () => {
    const prevented = followed();
    const seen = [];
    const { link } = render(
      sidebar({
        current: "/a/",
        onnavigate: (event) => {
          seen.push(event.detail.href);
          event.preventDefault();
        },
      }),
    );
    act(() => link("/b/").click());
    expect(seen).toEqual(["/b/"]);
    expect(prevented).toEqual([true]);
  });

  it("never hands onnavigate an entry on another origin, which the browser follows, as the Next.js example's Resources entries", () => {
    const prevented = followed();
    const seen = [];
    const { link } = render(
      jsxs("neuwo-sidebar", {
        current: "/a/",
        onnavigate: (event) => {
          seen.push(event.detail.href);
          event.preventDefault();
        },
        children: [
          jsx("neuwo-nav-item", { href: "/a/", children: "Alpha" }, "a"),
          jsx("neuwo-nav-section", { label: "Resources", children: jsx("neuwo-nav-item", { href: "https://github.com/neuwoai/neuwo-web-ui-components", children: "Source Code" }) }, "resources"),
        ],
      }),
    );
    act(() => link("https://github.com/neuwoai/neuwo-web-ui-components").click());
    expect(seen).toEqual([]);
    expect(prevented).toEqual([false]);
  });
});
