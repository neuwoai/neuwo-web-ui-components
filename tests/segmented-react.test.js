import { afterEach, describe, expect, it, vi } from "vitest";
import { Activity, Profiler, StrictMode, Suspense, act, createContext, useState } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import "../src/index.js";
import { createRuntime } from "./fixtures/runtime.js";
import { CONTROLLED } from "../src/core/marks.js";
import { jsx, jsxs } from "../src/react/jsx-runtime.js";
import { templates } from "../src/templates.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// React warns about `selected` on an <option> as it does under a native <select>; server markup carries it.
const SELECTED_WARNING = "instead of setting `selected` on <option>";

const server = createRuntime(templates, { markHost: false, server: true });

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

// Synchronous act() and microtasks only: happy-dom holds an observer's callback in a WeakRef, which a GC between tasks drops.
async function settled() {
  for (let turn = 0; turn < 3; turn++) await Promise.resolve();
}

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

/** @param {MutationRecord} record */
const writesDisplay = (record) => record.type === "attributes" && ["aria-checked", "tabindex", "style", "data-neuwo-placed"].includes(record.attributeName);

const formValueOf = (host) => host.querySelector(":scope > .neuwo-choice > .neuwo-segmented > .neuwo-segmented__form-value");
const indicatorOf = (host) => host.querySelector(":scope > .neuwo-choice > .neuwo-segmented > .neuwo-segmented__indicator");
const buttonsOf = (host) => Array.from(host.querySelectorAll(".neuwo-segmented__option"));
const buttonOf = (host, value) => buttonsOf(host).find((button) => button.dataset.value === value);
const checkedOf = (host) => buttonsOf(host).filter((button) => button.getAttribute("aria-checked") === "true").map((button) => button.dataset.value);
const stopOf = (host) => buttonsOf(host).filter((button) => button.getAttribute("tabindex") === "0").map((button) => button.dataset.value);
const placed = (host) => indicatorOf(host).hasAttribute("data-neuwo-placed");

const VIEWS = [
  { value: "visual", label: "Visual" },
  { value: "json", label: "JSON" },
  { value: "raw", label: "Raw", disabled: true },
  { value: "table", label: "Table" },
];

/**
 * @param {Record<string, unknown>} props
 * @param {{ selected?: string, create?: typeof jsxs, views?: typeof VIEWS }} [options]
 */
function segmented(props, { selected, create = jsxs, views = VIEWS } = {}) {
  const children = views.map(({ value, label, disabled }) => jsx("option", { value, disabled, selected: value === selected || undefined, children: label }, value));
  return create("neuwo-segmented", { ...props, children });
}

/** @param {unknown} element */
function render(element) {
  const container = attach(document.createElement("div"));
  const root = createRoot(container);
  cleanup.push(() => act(() => root.unmount()));
  act(() => root.render(element));
  return {
    container,
    host: container.querySelector("neuwo-segmented"),
    rerender: (/** @type {unknown} */ next) => act(() => root.render(next)),
  };
}

/** @param {HTMLElement} host @param {string} value */
const pick = (host, value) => act(() => buttonOf(host, value).click());

const unexpected = (spy) => spy.mock.calls.filter(([message]) => !String(message).includes(SELECTED_WARNING));

describe("<neuwo-segmented> under React, controlled", () => {
  it("calls onInput then onChange once per pick, with the element as target carrying the picked value and its name", () => {
    const errors = vi.spyOn(console, "error");
    const seen = [];
    const onInput = vi.fn((event) => void seen.push(["input", event.target, event.target.value]));
    const onChange = vi.fn((event) => void seen.push(["change", event.target, event.target.value, event.target.name]));
    const { host } = render(segmented({ value: "visual", name: "view", onInput, onChange }));
    expect(host[CONTROLLED]).toBe(true);
    pick(host, "json");
    expect(seen).toEqual([
      ["input", host, "json"],
      ["change", host, "json", "view"],
    ]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps showing the consumer's value when the handler ignores a pick, and writes no display of its own", () => {
    const errors = vi.spyOn(console, "error");
    const onChange = vi.fn();
    const { host } = render(segmented({ value: "visual", name: "view", onChange }));
    const records = watch(host);
    pick(host, "json");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(checkedOf(host)).toEqual(["visual"]);
    expect(stopOf(host)).toEqual(["visual"]);
    expect(formValueOf(host).value).toBe("visual");
    expect(host.value).toBe("visual");
    expect(records().filter((record) => writesDisplay(record) && record.target !== indicatorOf(host))).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("shows a pick the consumer accepts once React re-renders it, and slides the pill there", async () => {
    const errors = vi.spyOn(console, "error");
    function Form() {
      const [value, setValue] = useState("visual");
      return segmented({ value, onChange: (event) => setValue(event.target.value) });
    }
    const { host } = render(jsx(Form, {}));
    pick(host, "table");
    await settled();
    expect(checkedOf(host)).toEqual(["table"]);
    expect(stopOf(host)).toEqual(["table"]);
    expect(formValueOf(host).value).toBe("table");
    expect(host.value).toBe("table");
    expect(placed(host)).toBe(true);
    expect(errors).not.toHaveBeenCalled();
  });

  it("writes nothing when a script sets the value of a controlled element", async () => {
    const { host } = render(segmented({ value: "visual", onChange() {} }));
    const records = watch(host);
    host.value = "json";
    await settled();
    expect(host.value).toBe("visual");
    expect(checkedOf(host)).toEqual(["visual"]);
    expect(records()).toEqual([]);
  });

  it("submits the option marked selected for a value that names no enabled option", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container, host } = render(jsx("form", { children: segmented({ value: "raw", name: "view", onChange() {} }, { selected: "table" }) }));
    expect([...new FormData(container.querySelector("form"))]).toEqual([["view", "table"]]);
    expect(checkedOf(host)).toEqual(["table"]);
    expect(unexpected(errors)).toEqual([]);
  });

  it("never lets the hidden form value's own input or change reach onChange", () => {
    const errors = vi.spyOn(console, "error");
    const onChange = vi.fn();
    const { host } = render(segmented({ value: "visual", onChange }));
    act(() => {
      formValueOf(host).dispatchEvent(new Event("input", { bubbles: true }));
      formValueOf(host).dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("<neuwo-segmented> under React, uncontrolled", () => {
  it("shows a pick through the element and keeps it across a parent re-render and a new default", async () => {
    const errors = vi.spyOn(console, "error");
    const seen = [];
    const onChange = vi.fn((event) => void seen.push([event.target, event.target.value]));
    const tree = (name, defaultValue = "visual") => segmented({ defaultValue, name, onChange });
    const { host, rerender } = render(tree("a"));
    expect(host[CONTROLLED]).toBe(false);
    expect(checkedOf(host)).toEqual(["visual"]);
    pick(host, "json");
    expect(seen).toEqual([[host, "json"]]);
    expect(placed(host)).toBe(true);
    rerender(tree("b"));
    await settled();
    expect(formValueOf(host).name).toBe("b");
    expect(host.value).toBe("json");
    expect(checkedOf(host)).toEqual(["json"]);
    expect(stopOf(host)).toEqual(["json"]);
    rerender(tree("b", "table"));
    await settled();
    expect(host.value).toBe("json");
    expect(checkedOf(host)).toEqual(["json"]);
    expect(stopOf(host)).toEqual(["json"]);
    expect(placed(host)).toBe(true);
    expect(errors).not.toHaveBeenCalled();
  });

  it("reads its starting value as defaultValue though the element has no value attribute", () => {
    const { host } = render(segmented({ defaultValue: "json" }));
    expect(host.hasAttribute("value")).toBe(false);
    expect(host.defaultValue).toBe("json");
  });

  it("settles after React's writes without writing again", async () => {
    const { host, rerender } = render(segmented({ label: "View" }));
    pick(host, "json");
    rerender(segmented({ label: "Mode" }));
    await settled();
    const records = watch(host);
    rerender(segmented({ label: "Mode" }));
    await settled();
    expect(records().filter(writesDisplay)).toEqual([]);
  });

  it("writes nothing while React mounts it", async () => {
    const container = attach(document.createElement("div"));
    const records = watch(container);
    const root = createRoot(container);
    cleanup.push(() => act(() => root.unmount()));
    act(() => root.render(segmented({ defaultValue: "json" })));
    await settled();
    expect(records().map((record) => [record.type, record.target])).toEqual([["childList", container]]);
  });

  it("shows a value a form library sets on the element", () => {
    const { host } = render(segmented({ defaultValue: "visual" }));
    host.value = "table";
    expect(checkedOf(host)).toEqual(["table"]);
    expect(formValueOf(host).value).toBe("table");
  });
});

describe("<neuwo-segmented> server rendered", () => {
  it("hydrates with no warning in either mode, the selection in the server string, and the element writes nothing", async () => {
    const errors = vi.spyOn(console, "error");
    const trees = [() => segmented({ value: "json", name: "a", onChange() {} }), () => segmented({ defaultValue: "json", name: "a" }), () => segmented({ name: "a" })];
    for (const [index, tree] of trees.entries()) {
      const parsed = document.createElement("div");
      parsed.innerHTML = renderToString(tree());
      const container = attach(document.createElement("div"));
      container.append(...parsed.childNodes);
      const host = container.querySelector("neuwo-segmented");
      expect(checkedOf(host), String(index)).toEqual(index < 2 ? ["json"] : []);
      const records = watch(container);
      const recoverable = [];
      let root;
      act(() => {
        root = hydrateRoot(container, tree(), { onRecoverableError: (thrown) => void recoverable.push(String(thrown?.message ?? thrown)) });
      });
      cleanup.push(() => act(() => root.unmount()));
      await settled();
      expect(recoverable, String(index)).toEqual([]);
      expect(container.querySelector("neuwo-segmented"), String(index)).toBe(host);
      expect(records().filter(writesDisplay), String(index)).toEqual([]);
      expect(formValueOf(host).value, String(index)).toBe(index < 2 ? "json" : "");
      expect(placed(host), String(index)).toBe(false);
    }
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("<neuwo-segmented> rendered by a Server Component", () => {
  it("shows a pick through the element and keeps it when the server sends new props", async () => {
    const errors = vi.spyOn(console, "error");
    const tree = (value, label) => segmented({ value, name: "a", label }, { create: server.jsxs });
    const { host, rerender } = render(tree("visual", "View"));
    const changes = [];
    host.addEventListener("change", (event) => void changes.push(event.target.value));
    expect(host[CONTROLLED]).toBeUndefined();
    expect(host.hasAttribute("value")).toBe(false);
    expect(checkedOf(host)).toEqual(["visual"]);
    pick(host, "json");
    expect(changes).toEqual(["json"]);
    rerender(tree("table", "Mode"));
    await settled();
    expect(formValueOf(host).value).toBe("json");
    expect(checkedOf(host)).toEqual(["json"]);
    expect(stopOf(host)).toEqual(["json"]);
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("<neuwo-segmented> with options from a component", () => {
  it("warns once when a segmented control's options come from a component", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dev = createRuntime(templates, { dev: true });
    const Options = () => ["visual", "json"].map((value) => dev.jsx("option", { value, children: value }, value));
    renderToString(dev.jsxs("neuwo-segmented", { label: "View", children: [dev.jsx("option", { value: "visual", children: "Visual" }, "v")] }));
    expect(warn).not.toHaveBeenCalled();
    for (const name of ["a", "b"]) renderToString(dev.jsx("neuwo-segmented", { label: "View", name, children: dev.jsx(Options, {}) }));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("<neuwo-segmented>");
  });

  it("lists options inside React's own wrappers and context providers and warns nothing", () => {
    const warn = vi.spyOn(console, "warn");
    const errors = vi.spyOn(console, "error");
    const dev = createRuntime(templates, { dev: true });
    const Theme = createContext("light");
    /** @type {Array<[string, (children: unknown) => unknown]>} */
    const wrappers = [
      ["StrictMode", (children) => dev.jsx(StrictMode, { children })],
      ["Suspense", (children) => dev.jsx(Suspense, { fallback: null, children })],
      ["Profiler", (children) => dev.jsx(Profiler, { id: "p", onRender() {}, children })],
      ["Activity", (children) => dev.jsx(Activity, { mode: "visible", children })],
      ["a context provider", (children) => dev.jsx(Theme, { value: "dark", children })],
    ];
    for (const [name, wrap] of wrappers) {
      const options = VIEWS.slice(0, 2).map(({ value, label }) => dev.jsx("option", { value, children: label }, value));
      const { host } = render(dev.jsx("neuwo-segmented", { label: "View", name: "view", children: wrap(options) }));
      expect(buttonsOf(host).map((button) => `${button.dataset.value}:${button.textContent}`), name).toEqual(["visual:Visual", "json:JSON"]);
    }
    expect(warn).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("<neuwo-segmented> options and validity under React", () => {
  it("reports the selected option from options after a client render", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const picked = (selected) => render(segmented({ value: "visual", onChange() {} }, { selected })).host.options.map((option) => [option.value, option.selected]);
    expect(picked("table")).toEqual([["visual", false], ["json", false], ["raw", false], ["table", true]]);
    expect(picked(undefined)).toEqual([["visual", false], ["json", false], ["raw", false], ["table", false]]);
  });

  it("submits and validates as it did, in a form", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { container, host } = render(jsx("form", { children: segmented({ name: "f", required: true, onChange() {} }, { selected: "table" }) }));
    const form = container.querySelector("form");
    expect([...new FormData(form)]).toEqual([["f", "table"]]);
    expect(host.reportValidity()).toBe(true);
    const empty = render(jsx("form", { children: segmented({ name: "f", required: true, onChange() {} }) }));
    expect([...new FormData(empty.container.querySelector("form"))]).toEqual([["f", ""]]);
    expect(empty.host.reportValidity()).toBe(false);
    expect(empty.host.validity.valueMissing).toBe(true);
  });
});
