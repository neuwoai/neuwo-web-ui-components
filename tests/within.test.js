import { afterEach, describe, expect, it, vi } from "vitest";
import { Activity, Fragment, Profiler, StrictMode, Suspense, act, createContext, createElement, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { adopt, reconcile, render } from "../src/core/adapters/dom.js";
import { renderElement } from "../src/core/adapters/html.js";
import { createRuntime } from "../src/core/adapters/react.js";
import { idScope } from "../src/core/ids.js";
import { CONTROLLED } from "../src/core/marks.js";
import { control, h } from "../src/core/template.js";
import { expand } from "../src/server/index.js";
import { templates } from "../src/templates.js";
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

/** @param {string} html */
function viaDom(html) {
  const container = mount(html);
  for (const host of Array.from(container.querySelectorAll(Object.keys(withinTemplates).join(",")))) render(host, withinTemplates[host.localName]);
  return container.innerHTML;
}

/** @typedef {{ jsx: Function, jsxs: Function }} Factories */
/**
 * @param {Factories} create
 * @param {string} [label]
 * @param {string} [key]
 */
const reader = (create, label = "One", key = undefined) => create.jsx("x-item", { children: label }, key);

const Theme = createContext("light");

/**
 * Where a reader sits inside `<x-group name="size" value="m">`, as markup and as React children, with what each
 * reader shows.
 * @type {Array<[string, string, (create: Factories) => unknown, string[]]>}
 */
const WRAPPERS = [
  ["directly", `<x-item>One</x-item>`, (create) => reader(create), ["size=m"]],
  ["in a <div>", `<div class="w"><x-item>One</x-item></div>`, (create) => create.jsx("div", { className: "w", children: reader(create) }), ["size=m"]],
  ["in a <label>", `<label><x-item>One</x-item></label>`, (create) => create.jsx("label", { children: reader(create) }), ["size=m"]],
  [
    "in a <label> beside text, with no keys",
    `<label><x-item>A</x-item> or <x-item>B</x-item></label>`,
    (create) => create.jsxs("label", { children: [reader(create, "A"), " or ", reader(create, "B")] }),
    ["size=m", "size=m"],
  ],
  ["in a <Suspense>", `<x-item>One</x-item>`, (create) => create.jsx(Suspense, { children: reader(create) }), ["size=m"]],
  ["in a context provider", `<x-item>One</x-item>`, (create) => create.jsx(Theme, { value: "dark", children: reader(create) }), ["size=m"]],
  ["in a context's <Provider>", `<x-item>One</x-item>`, (create) => create.jsx(Theme.Provider, { value: "dark", children: reader(create) }), ["size=m"]],
  ["in a <StrictMode>", `<x-item>One</x-item>`, (create) => create.jsx(StrictMode, { children: reader(create) }), ["size=m"]],
  ["in a <Profiler>", `<x-item>One</x-item>`, (create) => create.jsx(Profiler, { id: "plan", onRender() {}, children: reader(create) }), ["size=m"]],
  ["in an <Activity>", `<x-item>One</x-item>`, (create) => create.jsx(Activity, { mode: "visible", children: reader(create) }), ["size=m"]],
  [
    "in a nested array in a <div>",
    `<div><x-item>A</x-item><x-item>B</x-item><x-item>C</x-item></div>`,
    (create) => create.jsxs("div", { children: [[reader(create, "A", "a"), reader(create, "B", "b")], reader(create, "C", "c")] }),
    ["size=m", "size=m", "size=m"],
  ],
  ["in a fragment in a <span>", `<span><x-item>One</x-item></span>`, (create) => create.jsx("span", { children: create.jsx(Fragment, { children: reader(create) }) }), ["size=m"]],
  ["in another Neuwo element", `<x-wrap><x-item>One</x-item></x-wrap>`, (create) => create.jsx("x-wrap", { children: reader(create) }), ["size=m"]],
  [
    "in a fragment in another Neuwo element",
    `<x-wrap><x-item>One</x-item></x-wrap>`,
    (create) => create.jsx("x-wrap", { children: create.jsx(Fragment, { children: reader(create) }) }),
    ["size=m"],
  ],
  [
    "in a <label> in another Neuwo element in a <Suspense>",
    `<x-wrap><label><x-item>One</x-item></label></x-wrap>`,
    (create) => create.jsx(Suspense, { children: create.jsx("x-wrap", { children: create.jsx("label", { children: reader(create) }) }) }),
    ["size=m"],
  ],
  [
    "beside a group nested in a <div>, which lends its own",
    `<div><x-group name="inner" value="2"><x-item>In</x-item></x-group></div><x-item>Out</x-item>`,
    (create) => [
      create.jsx("div", { children: create.jsx("x-group", { name: "inner", value: "2", children: reader(create, "In") }) }, "div"),
      reader(create, "Out", "out"),
    ],
    ["inner=2", "size=m"],
  ],
];

/**
 * @param {Factories} create
 * @param {unknown} children
 */
const groupOf = (create, children) => create.jsx("x-group", { name: "size", value: "m", onChange() {}, children });

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

describe("enclosing-element attributes (within) across the HTML, React and DOM adapters", () => {
  for (const [name, spec] of CASES) {
    it(name, () => {
      const errors = vi.spyOn(console, "error");
      const html = normalise(expand(markup(spec), withinTemplates));
      expect(html).toContain(`<${spec.tag}`);
      expect(normalise(renderToStaticMarkup(toReact(spec)))).toBe(html);
      expect(normalise(viaDom(markup(spec)), false)).toBe(html);
      expect(errors).not.toHaveBeenCalled();
    });
  }

  for (const [name, inner, children, shown] of WRAPPERS) {
    it(`gives a reader ${name} its group's attributes`, () => {
      const errors = vi.spyOn(console, "error");
      const source = `<x-group name="size" value="m">${inner}</x-group>`;
      const html = normalise(expand(source, withinTemplates));
      expect(Array.from(mount(html).querySelectorAll(".x-item__group"), (el) => el.textContent)).toEqual(shown);
      expect(normalise(renderToStaticMarkup(groupOf(runtime, children(runtime))))).toBe(html);
      expect(normalise(viaDom(source), false)).toBe(html);
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

  it("never puts what it lends on the DOM, on the server or the client", async () => {
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
    /** @type {import("../src/core/template.js").Template} */
    const pickTemplate = (attrs, ctx) => {
      const input = { class: "x-pick__input", type: "radio", name: ctx.within?.name, value: attrs.value, checked: ctx.within?.value === attrs.value };
      return h("label", { class: "x-pick" }, control(h("input", input)));
    };
    pickTemplate.within = "x-group";
    const { seen, wrapped } = spy(pickTemplate);
    const create = createRuntime({ ...withinTemplates, "x-pick": wrapped });
    // React warns about a controlled radio with no onChange, as it does for its own.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onChange = () => {};
    const cases = [
      [{ value: "m", onChange }, { name: "size", value: "m" }, true, true],
      [{ value: "m" }, { name: "size", value: "m" }, true, false],
      [{ defaultValue: "m", onChange }, { name: "size", value: "m" }, false, false],
      [{}, { name: "size" }, false, false],
    ];
    for (const [props, attrs, controlled, handled] of cases) {
      seen.length = 0;
      const picks = ["m", "l"].map((value) => create.jsx("x-pick", { value }, value));
      const { container } = await renderClient(create.jsxs("x-group", { name: "size", ...props, children: picks }));
      const hosts = Array.from(container.querySelectorAll("x-pick"));
      const label = JSON.stringify(props);
      expect(hosts.length).toBe(2);
      expect(seen.length, label).toBeGreaterThan(0);
      for (const within of seen) expect(within, label).toEqual(attrs);
      for (const host of hosts) {
        expect(host[CONTROLLED], label).toBe(controlled);
        expect(typeof fiberOf(host.querySelector(".x-pick__input")).memoizedProps.onChange, label).toBe(handled ? "function" : "undefined");
      }
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

  it("keeps a row the app maps to an array of nodes when the list grows, though a reader in it is lent", async () => {
    const errors = vi.spyOn(console, "error");
    const rows = (/** @type {number} */ count) =>
      runtime.jsx("dl", {
        children: Array.from({ length: count }, (_, index) => [
          runtime.jsx("dt", { children: `Term ${index}` }, "t"),
          runtime.jsx("dd", { children: reader(runtime, `Item ${index}`) }, "d"),
        ]),
      });
    const { container, rerender } = await renderClient(groupOf(runtime, rows(1)));
    const term = container.querySelector("dt");
    const first = container.querySelector("x-item");
    await rerender(groupOf(runtime, rows(2)));
    expect(container.querySelector("dt")).toBe(term);
    expect(container.querySelector("x-item")).toBe(first);
    expect(Array.from(container.querySelectorAll(".x-item__group"), (el) => el.textContent)).toEqual(["size=m", "size=m"]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps React's missing-key warning for an unkeyed list in an element under a group", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const list = ["A", "B"].map((label) => reader(runtime, label));
    await renderClient(groupOf(runtime, runtime.jsx("menu", { children: list })));
    expect(errors.mock.calls.filter(([message]) => String(message).includes('"key"'))).toHaveLength(1);
  });

  it("lends nothing to a reader of another tag, and keeps what it lends out of the children a Neuwo element describes", () => {
    /** @type {unknown[]} */
    const described = [];
    const { jsx, jsxs } = createRuntime({
      ...withinTemplates,
      "x-wrap": (attrs, ctx) => {
        described.push(ctx.children);
        return withinTemplates["x-wrap"](attrs, ctx);
      },
    });
    const wrapped = jsxs("x-wrap", { children: [jsx("x-item", { children: "One" }, "1"), jsx("x-box", { label: "box" }, "2")] });
    const holder = mount(renderToStaticMarkup(jsx("x-group", { name: "size", value: "m", children: wrapped })));
    expect(holder.querySelector(".x-item__group").textContent).toBe("size=m");
    expect(holder.querySelector(".x-box").getAttribute("data-outer")).toBe("none");
    expect(described.length).toBeGreaterThan(0);
    expect(JSON.stringify(described)).not.toMatch(/within/i);
  });

  it("cannot see into a component of the app's own, so its reader gets no attributes there", () => {
    const Row = ({ children }) => runtime.jsx("div", { children });
    const holder = mount(renderToStaticMarkup(groupOf(runtime, runtime.jsx(Row, { children: reader(runtime) }))));
    expect(holder.querySelector(".x-item__group").textContent).toBe("none");
  });

  it("warns once in development, naming the reader and the reason, when a component of the app's own hides readers from their group", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dev = createRuntime(withinTemplates, { dev: true });
    const Row = ({ children }) => dev.jsx("div", { children });
    const rows = [dev.jsx(Row, { children: reader(dev, "A") }, "a"), dev.jsx(Row, { children: reader(dev, "B") }, "b")];
    await renderClient(dev.jsxs("x-group", { name: "size", value: "m", onChange() {}, children: rows }));
    expect(warn).toHaveBeenCalledTimes(1);
    const [message] = warn.mock.calls[0];
    expect(message).toContain("<x-item>");
    expect(message).toContain("<x-group>");
    expect(message).toMatch(/component/);
  });

  it("lends the group's attributes to a radio in a Suspense fallback", async () => {
    const never = new Promise(() => {});
    const Wait = () => {
      throw never;
    };
    const { jsx } = createRuntime(templates);
    const fallback = jsx("neuwo-radio", { value: "a", children: "A" });
    const plan = () => jsx("neuwo-radio-group", { name: "plan", children: jsx(Suspense, { fallback, children: jsx(Wait, {}) }) });
    const served = mount(renderToString(plan())).querySelector("neuwo-radio input");
    expect([served.name, served.value]).toEqual(["plan", "a"]);
    const { container } = await renderClient(plan());
    const input = container.querySelector("neuwo-radio input");
    expect([input.name, input.value]).toEqual(["plan", "a"]);
  });

  it("warns in development, naming a component of the app's own, a portal and another React root, when a portal puts a reader in a group", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dev = createRuntime(withinTemplates, { dev: true });
    function Page() {
      const [target, setTarget] = useState(/** @type {Element | null} */ (null));
      return dev.jsxs(Fragment, { children: [groupOf(dev, dev.jsx("div", { ref: setTarget })), target && createPortal(reader(dev), target)] });
    }
    const { container } = await renderClient(dev.jsx(Page, {}));
    expect(container.querySelector("x-group x-item .x-item__group").textContent).toBe("none");
    expect(warn).toHaveBeenCalledTimes(1);
    const [message] = warn.mock.calls[0];
    expect(message).toContain("<x-item>");
    expect(message).toContain("<x-group>");
    expect(message).toMatch(/component of your own/);
    expect(message).toMatch(/portal/);
    expect(message).toMatch(/another React root/);
    expect(message).not.toMatch(/Suspense/);
  });

  it("warns once in development, naming the cause and the fix, when a group is handed readers already rendered", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dev = createRuntime(withinTemplates, { dev: true });
    const rendered = (/** @type {string} */ label) =>
      createElement("x-item", { key: label }, createElement("span", { className: "x-item" }, createElement("b", { className: "x-item__group" }, "none"), label));
    const box = createElement("x-box", { key: "box" }, createElement("div", { className: "x-box", "data-outer": "none" }));
    for (const create of [runtime, dev]) {
      await renderClient(create.jsx("x-group", { name: "size", value: "m", children: [rendered("A"), create.jsx("div", { children: rendered("B") }, "b"), box] }));
    }
    expect(warn).toHaveBeenCalledTimes(1);
    const [message] = warn.mock.calls[0];
    expect(message).toContain("<x-item>");
    expect(message).toContain("<x-group>");
    expect(message).toMatch(/Server Component/);
    expect(message).toMatch(/React\.createElement/);
    expect(message).toMatch(/jsxImportSource/);
    expect(message).toMatch(/same component/);
    expect(message).toMatch(/JSX runtime/);
  });

  it("stays silent where a reader receives its group's attributes, outside any group, and in production", async () => {
    const warn = vi.spyOn(console, "warn");
    const errors = vi.spyOn(console, "error");
    const dev = createRuntime(withinTemplates, { dev: true });
    for (const [, , children] of WRAPPERS) await renderClient(groupOf(dev, children(dev)));
    await renderClient(dev.jsx("div", { children: reader(dev) }));
    const Row = ({ children }) => runtime.jsx("div", { children });
    await renderClient(groupOf(runtime, runtime.jsx(Row, { children: reader(runtime) })));
    expect(warn).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  });
});
