import { afterEach, describe, expect, it, vi } from "vitest";
import { Activity, act, startTransition, useState } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import "../src/index.js";
import { createRuntime } from "../src/core/adapters/react.js";
import { jsx, jsxs } from "../src/react/jsx-runtime.js";
import { templates } from "../src/templates.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const CONTROLLED = Symbol.for("neuwo.controlled");
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

/** @param {MutationRecord} record */
function writesDisplay(record) {
  if (record.type === "attributes") return record.attributeName === "data-placeholder" || record.attributeName === "aria-selected";
  const node = record.target.nodeType === Node.TEXT_NODE ? record.target.parentElement : record.target;
  return Boolean(node?.closest(".neuwo-combobox__value"));
}

const triggerOf = (host) => host.querySelector(":scope > .neuwo-field > .neuwo-combobox > .neuwo-combobox__trigger");
const formValueOf = (host) => host.querySelector(":scope > .neuwo-field > .neuwo-combobox > .neuwo-combobox__form-value");
const rowOf = (host, value) => Array.from(host.querySelectorAll(".neuwo-combobox__option")).find((row) => row.dataset.value === value);
const shownOf = (host) => host.querySelector(".neuwo-combobox__value").textContent;
const selectedOf = (host) => Array.from(host.querySelectorAll('.neuwo-combobox__option[aria-selected="true"]')).map((row) => row.dataset.value);
const placeholderShown = (host) => triggerOf(host).hasAttribute("data-placeholder");

const COUNTRIES = [
  { value: "fi", label: "Finland" },
  { value: "fr", label: "France" },
  { value: "se", label: "Sweden" },
  { value: "no", label: "Norway", disabled: true },
];

/**
 * @param {Record<string, unknown>} props
 * @param {{ labels?: Record<string, string>, selected?: string, create?: typeof jsxs }} [options]
 */
function combobox(props, { labels = {}, selected, create = jsxs } = {}) {
  const children = COUNTRIES.map(({ value, label, disabled }) =>
    jsx("option", { value, disabled, selected: value === selected || undefined, children: labels[value] ?? label }, value),
  );
  return create("neuwo-combobox", { ...props, children });
}

/** @param {unknown} element */
function render(element) {
  const container = attach(document.createElement("div"));
  const root = createRoot(container);
  cleanup.push(() => act(() => root.unmount()));
  act(() => root.render(element));
  return {
    container,
    host: container.querySelector("neuwo-combobox"),
    rerender: (/** @type {unknown} */ next) => act(() => root.render(next)),
  };
}

/** @param {HTMLElement} host @param {string} value */
const pick = (host, value) => act(() => rowOf(host, value).click());

/** @param {HTMLInputElement} input @param {string} value */
function type(input, value) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

const unexpected = (spy) => spy.mock.calls.filter(([message]) => !String(message).includes(SELECTED_WARNING));

describe("<neuwo-combobox> under React, controlled", () => {
  it("calls onChange once per pick, with the element as target carrying the picked value and its name", () => {
    const errors = vi.spyOn(console, "error");
    const seen = [];
    const onInput = vi.fn((event) => void seen.push(["input", event.target, event.target.value]));
    const onChange = vi.fn((event) => void seen.push(["change", event.target, event.target.value, event.target.name]));
    const { host } = render(combobox({ value: "fi", name: "country", onInput, onChange }));
    expect(host[CONTROLLED]).toBe(true);
    pick(host, "fr");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([
      ["input", host, "fr"],
      ["change", host, "fr", "country"],
    ]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps showing the consumer's value when the handler ignores a pick", () => {
    const errors = vi.spyOn(console, "error");
    const onChange = vi.fn();
    const { host } = render(combobox({ value: "fi", name: "country", onChange }));
    const records = watch(host);
    pick(host, "fr");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(shownOf(host)).toBe("Finland");
    expect(selectedOf(host)).toEqual(["fi"]);
    expect(placeholderShown(host)).toBe(false);
    expect(formValueOf(host).value).toBe("fi");
    expect(host.value).toBe("fi");
    expect(records().filter(writesDisplay)).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("shows a pick the consumer accepts once React re-renders it, and writes no displayed value itself", () => {
    const errors = vi.spyOn(console, "error");
    let records;
    let beforeHandler;
    function Form() {
      const [value, setValue] = useState("fi");
      const onChange = (event) => {
        beforeHandler = records().filter(writesDisplay);
        setValue(event.target.value);
      };
      return combobox({ value, placeholder: "Pick", onChange });
    }
    const { host } = render(jsx(Form, {}));
    records = watch(host);
    pick(host, "fr");
    expect(beforeHandler).toEqual([]);
    const written = records()
      .filter(writesDisplay)
      .map((record) => [record.target.nodeType === Node.TEXT_NODE ? record.target.parentElement : record.target, record.attributeName]);
    expect(written.filter(([node, name], at) => written.findIndex((each) => each[0] === node && each[1] === name) !== at)).toEqual([]);
    expect(shownOf(host)).toBe("France");
    expect(selectedOf(host)).toEqual(["fr"]);
    expect(formValueOf(host).value).toBe("fr");
    expect(host.value).toBe("fr");
    expect(errors).not.toHaveBeenCalled();
  });

  it("submits nothing and shows the placeholder for a value that names no enabled option", () => {
    const errors = vi.spyOn(console, "error");
    for (const value of ["zz", "no"]) {
      const { container, host } = render(
        jsx("form", { children: combobox({ value, name: "country", placeholder: "Pick", onChange() {} }) }),
      );
      expect(formValueOf(host).value, value).toBe("");
      expect([...new FormData(container.querySelector("form"))], value).toEqual([["country", ""]]);
      expect(shownOf(host), value).toBe("Pick");
      expect(placeholderShown(host), value).toBe(true);
      expect(selectedOf(host), value).toEqual([]);
    }
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps React's form value when React assigns the value before the controlled flag is set", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const container = attach(document.createElement("div"));
    const records = watch(container);
    const root = createRoot(container);
    cleanup.push(() => act(() => root.unmount()));
    act(() => root.render(combobox({ value: "zz", placeholder: "Pick", onChange() {} }, { selected: "se" })));
    await settled();
    const host = container.querySelector("neuwo-combobox");
    expect(formValueOf(host).value).toBe("se");
    expect(shownOf(host)).toBe("Sweden");
    expect(selectedOf(host)).toEqual(["se"]);
    expect(records().map((record) => [record.type, record.target])).toEqual([["childList", container]]);
    expect(unexpected(errors)).toEqual([]);
  });

  it("submits the option marked selected for a value that names no enabled option, and a pick of it changes nothing", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const onChange = vi.fn();
    const { container, host } = render(jsx("form", { children: combobox({ value: "zz", name: "country", onChange }, { selected: "se" }) }));
    expect([...new FormData(container.querySelector("form"))]).toEqual([["country", "se"]]);
    expect(shownOf(host)).toBe("Sweden");
    pick(host, "se");
    expect(onChange).not.toHaveBeenCalled();
    expect(unexpected(errors)).toEqual([]);
  });

  it("writes nothing under a hidden Activity, where React has not run its ref, and agrees with React once shown", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const field = () => combobox({ value: "zz", name: "country", placeholder: "Pick", onChange() {} }, { selected: "se" });
    const tree = (mode) => jsx(Activity, { mode, children: field() });
    const { container, rerender } = render(tree("hidden"));
    await settled();
    const host = container.querySelector("neuwo-combobox");
    expect(host[CONTROLLED]).toBeUndefined();
    expect(formValueOf(host).value).toBe("se");
    expect(shownOf(host)).toBe("Sweden");
    rerender(tree("visible"));
    await settled();
    expect(host[CONTROLLED]).toBe(true);
    expect(formValueOf(host).value).toBe("se");
    expect(shownOf(host)).toBe("Sweden");
    expect(placeholderShown(host)).toBe(false);
    expect(selectedOf(host)).toEqual(["se"]);
    expect(unexpected(errors)).toEqual([]);
  });

  it("writes nothing when a script sets the value of a controlled element", async () => {
    const { host } = render(combobox({ value: "fi", onChange() {} }));
    const records = watch(host);
    host.value = "se";
    await settled();
    expect(host.value).toBe("fi");
    expect(formValueOf(host).value).toBe("fi");
    expect(shownOf(host)).toBe("Finland");
    expect(records()).toEqual([]);
  });

  it("never lets the hidden form value's own input or change reach onChange, and React restores it on the next render", () => {
    const errors = vi.spyOn(console, "error");
    const onChange = vi.fn();
    const { host, rerender } = render(combobox({ value: "fi", name: "a", onChange }));
    const records = watch(host);
    act(() => {
      type(formValueOf(host), "se");
      formValueOf(host).dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(records().filter(writesDisplay)).toEqual([]);
    expect(shownOf(host)).toBe("Finland");
    rerender(combobox({ value: "fi", name: "b", onChange }));
    expect(formValueOf(host).value).toBe("fi");
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("<neuwo-combobox> under React, uncontrolled", () => {
  it("shows a pick through the element and keeps it across an unrelated parent re-render", async () => {
    const errors = vi.spyOn(console, "error");
    const seen = [];
    const onChange = vi.fn((event) => void seen.push([event.target, event.target.value]));
    const tree = (name) => combobox({ defaultValue: "fi", name, onChange });
    const { host, rerender } = render(tree("a"));
    expect(host[CONTROLLED]).toBe(false);
    expect(shownOf(host)).toBe("Finland");
    pick(host, "fr");
    expect(seen).toEqual([[host, "fr"]]);
    rerender(tree("b"));
    await settled();
    expect(formValueOf(host).name).toBe("b");
    expect(formValueOf(host).value).toBe("fr");
    expect(host.value).toBe("fr");
    expect(shownOf(host)).toBe("France");
    expect(selectedOf(host)).toEqual(["fr"]);
    expect(placeholderShown(host)).toBe(false);
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps the pick when a re-render changes the placeholder it was started from", async () => {
    const errors = vi.spyOn(console, "error");
    const tree = (placeholder) => combobox({ placeholder });
    const { host, rerender } = render(tree("Pick"));
    expect(shownOf(host)).toBe("Pick");
    pick(host, "fr");
    rerender(tree("Choose"));
    await settled();
    expect(host.value).toBe("fr");
    expect(shownOf(host)).toBe("France");
    expect(placeholderShown(host)).toBe(false);
    expect(selectedOf(host)).toEqual(["fr"]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps the pick when a re-render renames the default option or changes the default", async () => {
    const errors = vi.spyOn(console, "error");
    const { host, rerender } = render(combobox({ defaultValue: "fi" }));
    pick(host, "fr");
    rerender(combobox({ defaultValue: "fi" }, { labels: { fi: "Suomi", fr: "Ranska" } }));
    await settled();
    expect(rowOf(host, "fi").textContent).toBe("Suomi");
    expect(shownOf(host)).toBe("Ranska");
    rerender(combobox({ defaultValue: "se" }));
    await settled();
    expect(formValueOf(host).value).toBe("fr");
    expect(shownOf(host)).toBe("France");
    expect(selectedOf(host)).toEqual(["fr"]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("is uncontrolled with value={null} and a defaultValue, as React's own fields are", async () => {
    const errors = vi.spyOn(console, "error");
    const tree = (name) => combobox({ value: null, defaultValue: "fr", name });
    const { host, rerender } = render(tree("a"));
    expect(host[CONTROLLED]).toBe(false);
    expect(shownOf(host)).toBe("France");
    pick(host, "se");
    rerender(tree("b"));
    await settled();
    expect(host.value).toBe("se");
    expect(shownOf(host)).toBe("Sweden");
    expect(errors).not.toHaveBeenCalled();
  });

  it("clears a pick whose option a re-render removes, without a change event", async () => {
    const errors = vi.spyOn(console, "error");
    const onChange = vi.fn();
    const tree = (countries) =>
      jsxs("neuwo-combobox", { placeholder: "Pick", onChange, children: countries.map(([value, label]) => jsx("option", { value, children: label }, value)) });
    const { host, rerender } = render(tree([["fi", "Finland"], ["fr", "France"]]));
    pick(host, "fr");
    expect(onChange).toHaveBeenCalledTimes(1);
    rerender(tree([["fi", "Finland"]]));
    await settled();
    expect(host.value).toBe("");
    expect(shownOf(host)).toBe("Pick");
    expect(placeholderShown(host)).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(errors).not.toHaveBeenCalled();
  });

  it("settles after React's writes without writing again", async () => {
    const { host, rerender } = render(combobox({ placeholder: "Pick" }));
    pick(host, "fr");
    rerender(combobox({ placeholder: "Choose" }));
    await settled();
    const records = watch(host);
    rerender(combobox({ placeholder: "Choose" }));
    await settled();
    expect(records().filter(writesDisplay)).toEqual([]);
  });

  it("shows a value a form library sets on the element, as React Hook Form's register does on reset", () => {
    const errors = vi.spyOn(console, "error");
    const { host } = render(combobox({ defaultValue: "fi", placeholder: "Pick" }));
    host.value = "se";
    expect(host.value).toBe("se");
    expect(formValueOf(host).value).toBe("se");
    expect(shownOf(host)).toBe("Sweden");
    expect(selectedOf(host)).toEqual(["se"]);
    host.value = "no";
    expect(host.value).toBe("");
    expect(shownOf(host)).toBe("Pick");
    expect(placeholderShown(host)).toBe(true);
    expect(errors).not.toHaveBeenCalled();
  });

  it("shows a value written into its hidden form value, as autofill does, and drops one no enabled option has", () => {
    const errors = vi.spyOn(console, "error");
    const onChange = vi.fn();
    const { host } = render(combobox({ defaultValue: "fi", placeholder: "Pick", onChange }));
    act(() => type(formValueOf(host), "se"));
    expect(shownOf(host)).toBe("Sweden");
    expect(selectedOf(host)).toEqual(["se"]);
    act(() => type(formValueOf(host), "no"));
    expect(formValueOf(host).value).toBe("");
    expect(shownOf(host)).toBe("Pick");
    expect(onChange).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  });

  it("writes nothing while React mounts it", async () => {
    const container = attach(document.createElement("div"));
    const records = watch(container);
    const root = createRoot(container);
    cleanup.push(() => act(() => root.unmount()));
    act(() => root.render(combobox({ defaultValue: "fr", placeholder: "Pick" })));
    await settled();
    expect(records().map((record) => [record.type, record.target])).toEqual([["childList", container]]);
  });
});

describe("<neuwo-combobox> under React Hook Form's register", () => {
  /** Props as `register(name)` returns them; its blur handler finds the field by `event.target.name`. */
  function registerer() {
    const fields = new Map();
    const touched = {};
    const register = (name) => ({
      name,
      ref: (el) => void (el && fields.set(name, el)),
      onChange: () => {},
      onBlur: (event) => {
        const field = fields.get(event.target.name);
        if (field) touched[event.target.name] = field.value;
      },
    });
    return { register, touched };
  }

  it.each([
    ["button", {}],
    ["searchable", { searchable: true }],
  ])("marks the field touched when its %s trigger loses focus", (_, extra) => {
    const errors = vi.spyOn(console, "error");
    const { register, touched } = registerer();
    const { host } = render(combobox({ placeholder: "Pick", defaultValue: "fi", ...extra, ...register("plan") }));
    const trigger = triggerOf(host);
    act(() => trigger.focus());
    act(() => trigger.blur());
    expect(touched).toEqual({ plan: "fi" });
    expect(trigger.hasAttribute("name")).toBe(false);
    expect(trigger.name).toBe("");
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("<neuwo-combobox searchable> under React", () => {
  it("never calls onInput or onChange while the user types into the filter", () => {
    const errors = vi.spyOn(console, "error");
    for (const props of [{ value: "fi" }, { defaultValue: "fi" }]) {
      const onInput = vi.fn();
      const onChange = vi.fn();
      const { host } = render(combobox({ ...props, searchable: true, onInput, onChange }));
      act(() => {
        triggerOf(host).focus();
        type(triggerOf(host), "fr");
        triggerOf(host).dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(onInput).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
      act(() => triggerOf(host).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
      expect(onChange).toHaveBeenCalledTimes(1);
    }
    expect(errors).not.toHaveBeenCalled();
  });

  it("shows the accepted label in a trigger the user typed into, and the old one when the pick is ignored", async () => {
    const errors = vi.spyOn(console, "error");
    function Form({ accept }) {
      const [value, setValue] = useState("fi");
      const onChange = (event) => {
        const picked = event.target.value;
        if (accept === "now") setValue(picked);
        else if (accept === "later") startTransition(() => setValue(picked));
      };
      return combobox({ value, searchable: true, onChange });
    }
    for (const [accept, label] of [
      ["now", "France"],
      ["later", "France"],
      ["never", "Finland"],
    ]) {
      const { host } = render(jsx(Form, { accept }));
      act(() => {
        triggerOf(host).focus();
        type(triggerOf(host), "fr");
      });
      pick(host, "fr");
      await settled();
      expect(triggerOf(host).value, accept).toBe(label);
      expect(formValueOf(host).value, accept).toBe(accept === "never" ? "fi" : "fr");
    }
    expect(errors).not.toHaveBeenCalled();
  });

  it("shows the picked label in an uncontrolled trigger across re-renders, one of which changes only attributes", async () => {
    const errors = vi.spyOn(console, "error");
    const tree = (props) => combobox({ searchable: true, placeholder: "Pick", ...props });
    const { host, rerender } = render(tree({}));
    pick(host, "fr");
    rerender(tree({ placeholder: "Choose" }));
    await settled();
    expect(triggerOf(host).value).toBe("France");
    rerender(tree({ placeholder: "Choose", defaultValue: "se" }));
    await settled();
    expect(triggerOf(host).value).toBe("France");
    expect(formValueOf(host).value).toBe("fr");
    expect(selectedOf(host)).toEqual(["fr"]);
    expect(placeholderShown(host)).toBe(false);
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("<neuwo-combobox> server rendered", () => {
  it("renders the resolved value as the controlled form value in the server string", () => {
    const errors = vi.spyOn(console, "error");
    const html = (value) => {
      const holder = document.createElement("div");
      holder.innerHTML = renderToString(combobox({ value, placeholder: "Pick", onChange() {} }));
      return formValueOf(holder.querySelector("neuwo-combobox")).getAttribute("value");
    };
    expect(html("fr")).toBe("fr");
    expect(html("zz")).toBe("");
    expect(html("no")).toBe("");
    expect(errors).not.toHaveBeenCalled();
  });

  it("hydrates with no warning in either mode, and the element writes nothing", async () => {
    const errors = vi.spyOn(console, "error");
    const trees = [
      () => combobox({ value: "fr", name: "a", placeholder: "Pick", onChange() {} }),
      () => combobox({ defaultValue: "fr", name: "a", placeholder: "Pick" }),
      () => combobox({ value: "zz", name: "a", placeholder: "Pick", onChange() {} }),
      () => combobox({ value: "fr", name: "a", searchable: true, onChange() {} }),
      () => combobox({ defaultValue: "fr", name: "a", searchable: true }),
    ];
    for (const [index, tree] of trees.entries()) {
      const parsed = document.createElement("div");
      parsed.innerHTML = renderToString(tree());
      const container = attach(document.createElement("div"));
      container.append(...parsed.childNodes);
      const host = container.querySelector("neuwo-combobox");
      const value = formValueOf(host).value;
      const records = watch(container);
      const recoverable = [];
      let root;
      act(() => {
        root = hydrateRoot(container, tree(), { onRecoverableError: (thrown) => void recoverable.push(String(thrown?.message ?? thrown)) });
      });
      cleanup.push(() => act(() => root.unmount()));
      await settled();
      expect(recoverable, String(index)).toEqual([]);
      expect(container.querySelector("neuwo-combobox"), String(index)).toBe(host);
      expect(records().filter(writesDisplay), String(index)).toEqual([]);
      expect(formValueOf(host).value, String(index)).toBe(value);
    }
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps a hydrated uncontrolled pick when React re-renders the placeholder", async () => {
    const errors = vi.spyOn(console, "error");
    const tree = (placeholder) => combobox({ placeholder });
    const parsed = document.createElement("div");
    parsed.innerHTML = renderToString(tree("Pick"));
    const container = attach(document.createElement("div"));
    container.append(...parsed.childNodes);
    let root;
    act(() => {
      root = hydrateRoot(container, tree("Pick"));
    });
    cleanup.push(() => act(() => root.unmount()));
    const host = container.querySelector("neuwo-combobox");
    pick(host, "fr");
    act(() => root.render(tree("Choose")));
    await settled();
    expect(shownOf(host)).toBe("France");
    expect(placeholderShown(host)).toBe(false);
    expect(errors).not.toHaveBeenCalled();
  });

  it("shows only what the consumer's state says once hydrated, in a searchable trigger the user typed into too", async () => {
    const errors = vi.spyOn(console, "error");
    function Form({ accept }) {
      const [value, setValue] = useState("fi");
      const onChange = (event) => {
        const picked = event.target.value;
        if (accept === "now") setValue(picked);
        else if (accept === "later") startTransition(() => setValue(picked));
      };
      return combobox({ value, searchable: true, onChange });
    }
    for (const [accept, label] of [
      ["now", "France"],
      ["later", "France"],
      ["never", "Finland"],
    ]) {
      const parsed = document.createElement("div");
      parsed.innerHTML = renderToString(jsx(Form, { accept }));
      const container = attach(document.createElement("div"));
      container.append(...parsed.childNodes);
      let root;
      act(() => {
        root = hydrateRoot(container, jsx(Form, { accept }));
      });
      cleanup.push(() => act(() => root.unmount()));
      const host = container.querySelector("neuwo-combobox");
      expect(host[CONTROLLED], accept).toBe(true);
      act(() => {
        triggerOf(host).focus();
        type(triggerOf(host), "fr");
      });
      pick(host, "fr");
      await settled();
      expect(triggerOf(host).value, accept).toBe(label);
      expect(formValueOf(host).value, accept).toBe(accept === "never" ? "fi" : "fr");
      expect(selectedOf(host), accept).toEqual([accept === "never" ? "fi" : "fr"]);
    }
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("<neuwo-combobox> rendered by a Server Component", () => {
  it("shows a pick through the element and keeps it when the server sends new props", async () => {
    const errors = vi.spyOn(console, "error");
    const tree = (value, placeholder) => combobox({ value, name: "a", placeholder }, { create: server.jsxs });
    const { host, rerender } = render(tree("fi", "Pick"));
    const changes = [];
    host.addEventListener("change", (event) => void changes.push(event.target.value));
    expect(host[CONTROLLED]).toBeUndefined();
    expect(host.hasAttribute("value")).toBe(false);
    pick(host, "fr");
    expect(changes).toEqual(["fr"]);
    rerender(tree("se", "Choose"));
    await settled();
    expect(formValueOf(host).value).toBe("fr");
    expect(shownOf(host)).toBe("France");
    expect(selectedOf(host)).toEqual(["fr"]);
    host.value = "se";
    expect(shownOf(host)).toBe("Sweden");
    expect(formValueOf(host).value).toBe("se");
    expect(errors).not.toHaveBeenCalled();
  });
});
