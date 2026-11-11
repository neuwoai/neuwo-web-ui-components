import { afterEach, describe, expect, it, vi } from "vitest";
import { Fragment, act, useState } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { adopt, reconcile, render } from "../src/core/adapters/dom.js";
import { renderElement } from "../src/core/adapters/html.js";
import { createRuntime } from "../src/core/adapters/react.js";
import { idScope } from "../src/core/ids.js";
import { CONTROLLED } from "../src/core/marks.js";
import { expand } from "../src/server/index.js";
import { boxTemplate, itemTemplate, withinTemplates } from "./fixtures/within.js";
import { normalise } from "./fixtures/template-cases.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** @typedef {{ tag: string, attrs?: Record<string, string>, children?: Array<Spec | string> }} Spec */

const runtime = createRuntime(withinTemplates);
const server = createRuntime(withinTemplates, { markHost: false, server: true });

/** @type {Array<() => void>} */
let cleanups = [];
afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
  vi.restoreAllMocks();
});

/**
 * @param {string} label
 * @param {Record<string, string>} [attrs]
 * @returns {Spec}
 */
const item = (label, attrs = {}) => ({ tag: "x-item", attrs, children: [label] });

/** @type {Array<[string, Spec]>} */
const CASES = [
  ["an item in a group", { tag: "x-group", attrs: { name: "size", value: "m" }, children: [item("Medium")] }],
  ["an item outside any group", item("Alone")],
  ["items in a group with no value", { tag: "x-group", attrs: { name: "size", tone: "b" }, children: [item("One"), item("Two")] }],
  [
    "nested groups, each item reading the nearest",
    {
      tag: "x-group",
      attrs: { name: "outer", value: "1" },
      children: [item("Outer"), { tag: "x-group", attrs: { name: "inner", value: "2" }, children: [item("Inner")] }, item("Outer again")],
    },
  ],
  ["a lone box, which never reads itself", { tag: "x-box", attrs: { label: "only" }, children: ["Inside"] }],
  [
    "nested boxes",
    { tag: "x-box", attrs: { label: "outer" }, children: [{ tag: "x-box", attrs: { label: "inner" }, children: [{ tag: "x-box", attrs: { label: "core" }, children: ["Deep"] }] }] },
  ],
];

/** @param {Spec | string} spec */
function markup(spec) {
  if (typeof spec === "string") return spec;
  const attrs = Object.entries(spec.attrs ?? {}).map(([name, value]) => ` ${name}="${value}"`).join("");
  return `<${spec.tag}${attrs}>${(spec.children ?? []).map(markup).join("")}</${spec.tag}>`;
}

/**
 * @param {Spec | string} spec
 * @param {{ jsx: Function, jsxs: Function }} create
 * @param {string | undefined} [key]
 */
function toReact(spec, create = runtime, key = undefined) {
  if (typeof spec === "string") return spec;
  const children = (spec.children ?? []).map((child, index) => toReact(child, create, String(index)));
  return children.length > 1 ? create.jsxs(spec.tag, { ...spec.attrs, children }, key) : create.jsx(spec.tag, { ...spec.attrs, children: children[0] }, key);
}

/** @param {string} html */
function mount(html) {
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);
  cleanups.push(() => container.remove());
  return container;
}

/** @param {Spec} spec */
function viaDom(spec) {
  const container = mount(markup(spec));
  for (const host of Array.from(container.querySelectorAll("x-group, x-item, x-box"))) render(host, withinTemplates[host.localName]);
  return container.innerHTML;
}

/**
 * @param {import("../src/core/template.js").Template} template
 * @param {{ withChildren?: boolean }} [options]
 */
function spy(template, { withChildren = false } = {}) {
  /** @type {Array<Record<string, string> | null>} */
  const seen = [];
  /** @type {import("../src/core/template.js").Template} */
  const wrapped = (attrs, ctx) => {
    if (!withChildren || ctx.children.length) seen.push(ctx.within);
    return template(attrs, ctx);
  };
  wrapped.within = template.within;
  return { seen, wrapped };
}

/** @param {Element} el */
const fiberOf = (el) => el[/** @type {string} */ (Object.keys(el).find((key) => key.startsWith("__reactFiber$")))];

/** @param {Element} el */
function componentProps(el) {
  let fiber = fiberOf(el);
  while (fiber && typeof fiber.type !== "function") fiber = fiber.return;
  return fiber.memoizedProps;
}

describe("enclosing-element attributes (within) across the HTML, React and DOM adapters", () => {
  for (const [name, spec] of CASES) {
    it(name, () => {
      const errors = vi.spyOn(console, "error");
      const html = normalise(expand(markup(spec), withinTemplates));
      expect(html).toContain(`<${spec.tag}`);
      expect(normalise(renderToStaticMarkup(toReact(spec)))).toBe(html);
      expect(normalise(viaDom(spec), false)).toBe(html);
      expect(errors).not.toHaveBeenCalled();
    });
  }

  it("renders an item in a group with the group's attributes and a lone item with none", () => {
    const holder = mount(expand(markup(CASES[0][1]) + markup(CASES[1][1]), withinTemplates));
    expect(Array.from(holder.querySelectorAll(".x-item__group"), (el) => el.textContent)).toEqual(["size=m", "none"]);
    expect(holder.querySelector(".x-item").getAttribute("data-value")).toBe("m");
    expect(normalise(holder.innerHTML, false)).toBe(normalise(expand(markup(CASES[0][1]), withinTemplates) + expand(markup(CASES[1][1]), withinTemplates), false));
  });

  it("gives nested items and boxes the nearest enclosing element's attributes", () => {
    const holder = mount(expand(markup(CASES[3][1]) + markup(CASES[5][1]), withinTemplates));
    expect(Array.from(holder.querySelectorAll(".x-item__group"), (el) => el.textContent)).toEqual(["outer=1", "inner=2", "outer=1"]);
    expect(Array.from(holder.querySelectorAll(".x-box"), (el) => el.getAttribute("data-outer"))).toEqual(["none", "outer", "inner"]);
  });
});

describe("within in the HTML adapter", () => {
  it("passes ctx.within to renderElement, null by default", () => {
    const { seen, wrapped } = spy(itemTemplate);
    renderElement("x-item", {}, [], wrapped, idScope("neuwo-s"));
    renderElement("x-item", {}, [], wrapped, idScope("neuwo-s"), { name: "size", value: "s" });
    expect(seen).toEqual([null, { name: "size", value: "s" }]);
  });

  it("gives expand() the attributes of the nearest ancestor of the tag, through plain elements in between", () => {
    const { seen, wrapped } = spy(itemTemplate, { withChildren: true });
    expand(`<x-group name="a" value="1"><div><x-group name="b"><p><x-item>x</x-item></p></x-group><x-item>y</x-item></div></x-group><x-item>z</x-item>`, {
      "x-group": withinTemplates["x-group"],
      "x-item": wrapped,
    });
    expect(seen).toEqual([{ name: "b" }, { name: "a", value: "1" }, null]);
  });
});

describe("within in the DOM adapter", () => {
  const SERVED = `<x-group name="size" value="m" tone="b"><x-item>Medium</x-item></x-group>`;

  it("render, adopt and reconcile read the nearest enclosing element with closest()", () => {
    const { seen, wrapped } = spy(itemTemplate);
    const rendered = mount(SERVED).querySelector("x-item");
    render(rendered, wrapped);
    const adopted = mount(expand(SERVED, withinTemplates)).querySelector("x-item");
    adopt(adopted, wrapped);
    const group = /** @type {Element} */ (adopted.closest("x-group"));
    group.setAttribute("value", "l");
    reconcile(adopted, wrapped);
    const attrs = { name: "size", value: "m", tone: "b" };
    expect(seen.length).toBeGreaterThan(2);
    for (const within of seen.slice(0, -1)) expect(within).toEqual(attrs);
    expect(seen.at(-1)).toEqual({ ...attrs, value: "l" });
    expect(adopted.querySelector(".x-item__group").textContent).toBe("size=l");
    expect(adopted.querySelector(".x-item").getAttribute("data-value")).toBe("l");
  });

  it("never matches the host itself", () => {
    const { seen, wrapped } = spy(boxTemplate);
    const holder = mount(`<x-box label="outer"><x-box label="inner">x</x-box></x-box>`);
    for (const host of Array.from(holder.querySelectorAll("x-box"))) render(host, wrapped);
    expect(seen).toEqual([null, { label: "outer" }]);
  });

  it("gives null to a host with no enclosing element of the tag, and to one that is not connected", () => {
    const { seen, wrapped } = spy(itemTemplate);
    render(mount(`<x-item>a</x-item>`).firstElementChild, wrapped);
    render(document.createElement("x-item"), wrapped);
    expect(seen).toEqual([null, null]);
  });
});

describe("within in the React adapter", () => {
  /** @param {unknown} element */
  async function renderClient(element) {
    const container = document.body.appendChild(document.createElement("div"));
    cleanups.push(() => container.remove());
    const root = createRoot(container);
    cleanups.unshift(() => act(() => root.unmount()));
    await act(async () => root.render(element));
    return { container, rerender: (/** @type {unknown} */ next) => act(async () => root.render(next)) };
  }

  const group = (/** @type {Record<string, unknown>} */ props, /** @type {unknown[]} */ children = [runtime.jsx("x-item", { children: "One" }, "1"), runtime.jsx("x-item", { children: "Two" }, "2")]) =>
    runtime.jsxs("x-group", { name: "size", ...props, children });

  it("never passes the internal prop to the DOM, on the server or the client", async () => {
    const errors = vi.spyOn(console, "error");
    for (const create of [runtime, server]) {
      const html = renderToString(create.jsxs("x-group", { name: "size", value: "m", children: [create.jsx("x-item", { children: "One" }, "1")] }));
      expect(html.toLowerCase()).not.toContain("neuwowithin");
      expect(html).toContain("size=m");
    }
    const { container } = await renderClient(group({ value: "m", onChange() {} }));
    for (const el of container.querySelectorAll("*")) {
      expect(Array.from(el.attributes, ({ name }) => name).filter((name) => name.includes("neuwo"))).toEqual([]);
      expect(Object.keys(el).filter((key) => key.toLowerCase().includes("within"))).toEqual([]);
    }
    expect(Array.from(container.querySelectorAll(".x-item__group"), (el) => el.textContent)).toEqual(["size=m", "size=m"]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("lends each direct item the group's attributes, whether it is controlled, and whether it has onChange", async () => {
    const onChange = () => {};
    const cases = [
      [{ value: "m", onChange }, { attrs: { name: "size", value: "m" }, controlled: true, hasOnChange: true }],
      [{ value: "m" }, { attrs: { name: "size", value: "m" }, controlled: true, hasOnChange: false }],
      [{ defaultValue: "m", onChange }, { attrs: { name: "size", value: "m" }, controlled: false, hasOnChange: true }],
      [{}, { attrs: { name: "size" }, controlled: false, hasOnChange: false }],
    ];
    for (const [props, lent] of cases) {
      const { container } = await renderClient(group(props));
      const items = Array.from(container.querySelectorAll("x-item"));
      expect(items.length).toBe(2);
      for (const host of items) expect(componentProps(host).__neuwoWithin, JSON.stringify(props)).toEqual(lent);
    }
  });

  it("marks a group host controlled by its value alone, though its template has no form control", async () => {
    const { container, rerender } = await renderClient(group({ value: "m", onChange() {} }));
    const host = container.querySelector("x-group");
    expect(host[CONTROLLED]).toBe(true);
    await rerender(group({ defaultValue: "m" }));
    expect(host[CONTROLLED]).toBe(false);
    await rerender(group({ checked: true, onChange() {} }));
    expect(host[CONTROLLED]).toBe(false);
  });

  it("re-renders the items when the group's attributes change", async () => {
    const errors = vi.spyOn(console, "error");
    /** @type {(value: string) => void} */
    let pick = () => {};
    function Picker() {
      const [value, setValue] = useState("m");
      pick = setValue;
      return group({ value, onChange() {} });
    }
    const { container } = await renderClient(runtime.jsx(Picker, {}));
    const shown = () => Array.from(container.querySelectorAll(".x-item__group"), (el) => el.textContent);
    expect(shown()).toEqual(["size=m", "size=m"]);
    await act(async () => pick("l"));
    expect(shown()).toEqual(["size=l", "size=l"]);
    expect(container.querySelector(".x-item").getAttribute("data-value")).toBe("l");
    expect(errors).not.toHaveBeenCalled();
  });

  it("lends to items inside a fragment, which are direct children once flattened, and to nothing else", () => {
    const html = renderToStaticMarkup(
      group({ value: "m" }, [
        runtime.jsxs(Fragment, { children: [runtime.jsx("x-item", { children: "In a fragment" }, "f")] }, "fragment"),
        runtime.jsx("div", { children: runtime.jsx("x-item", { children: "In a div" }) }, "div"),
        runtime.jsx("x-box", { label: "box" }, "box"),
      ]),
    );
    const holder = mount(html);
    expect(Array.from(holder.querySelectorAll(".x-item__group"), (el) => el.textContent)).toEqual(["size=m", "none"]);
    expect(holder.querySelector(".x-box").getAttribute("data-outer")).toBe("none");
  });

  it("strips the internal prop from a host it was handed to directly", () => {
    const html = renderToStaticMarkup(runtime.jsx("x-item", { __neuwoWithin: { attrs: { name: "n", value: "v" }, controlled: false, hasOnChange: false }, children: "x" }));
    expect(html.toLowerCase()).not.toContain("neuwowithin");
    expect(mount(html).querySelector(".x-item__group").textContent).toBe("n=v");
  });
});
