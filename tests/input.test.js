import { afterEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import { act, useState } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import "../src/index.js";
import { NeuwoInput } from "../src/components/fields/input/neuwo-input.js";
import { NeuwoFieldElement } from "../src/components/fields/field-element.js";
import { NeuwoTextFieldElement } from "../src/components/fields/text-field-element.js";
import { CONTROLLED } from "../src/core/marks.js";
import { expand } from "../src/server/index.js";
import { jsx, jsxs } from "../src/react/jsx-runtime.js";
import { createRuntime } from "./fixtures/runtime.js";
import { templates } from "../src/templates.js";

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

// Parsed detached, then attached: innerHTML on a connected container upgrades before the children exist.
function make(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return attach(holder).firstElementChild;
}

// Microtasks only: happy-dom holds an observer's callback in a WeakRef, so a GC between tasks can silence it.
async function settled() {
  for (let turn = 0; turn < 3; turn++) await Promise.resolve();
}

function watch(target) {
  const records = [];
  const observer = new MutationObserver((list) => records.push(...list));
  observer.observe(target, { subtree: true, childList: true, attributes: true, characterData: true });
  return () => {
    records.push(...observer.takeRecords());
    observer.disconnect();
    return records;
  };
}

/**
 * @param {HTMLInputElement} control
 * @param {string} value
 */
function type(control, value) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(control, value);
  control.dispatchEvent(new Event("input", { bubbles: true }));
}

const inputOf = (el) => el.querySelector(":scope > .neuwo-field > .neuwo-input");
const labelOf = (el) => el.querySelector(":scope > .neuwo-field > .neuwo-field__label");
const errorOf = (el) => el.querySelector(":scope > .neuwo-field > .neuwo-field__error");

describe("<neuwo-input>", () => {
  it("registers a light DOM field element", () => {
    expect(customElements.get("neuwo-input")).toBe(NeuwoInput);
    expect(Object.getPrototypeOf(NeuwoInput)).toBe(NeuwoTextFieldElement);
    expect(Object.getPrototypeOf(NeuwoTextFieldElement)).toBe(NeuwoFieldElement);
    const el = make(`<neuwo-input></neuwo-input>`);
    expect(el.shadowRoot).toBeNull();
    expect(inputOf(el).type).toBe("text");
    expect(el.querySelector("[part]")).toBeNull();
  });

  it("maps an allowed type onto the inner input and falls back to text for any other", () => {
    expect(inputOf(make(`<neuwo-input type="email"></neuwo-input>`)).type).toBe("email");
    const el = make(`<neuwo-input type="checkbox"></neuwo-input>`);
    expect(inputOf(el).getAttribute("type")).toBe("text");
    el.setAttribute("type", "number");
    expect(inputOf(el).type).toBe("number");
  });

  it("forwards the constraint attributes to the inner input", () => {
    const control = inputOf(make(`<neuwo-input type="number" min="0" max="10" step="2" inputmode="numeric"></neuwo-input>`));
    expect(control.getAttribute("min")).toBe("0");
    expect(control.getAttribute("max")).toBe("10");
    expect(control.getAttribute("step")).toBe("2");
    expect(control.getAttribute("inputmode")).toBe("numeric");
  });

  it("copies aria-* and title to the inner input as they change, and leaves data-* on the element", () => {
    const el = make(`<neuwo-input aria-label="Search" title="Find" data-x="1"></neuwo-input>`);
    expect(inputOf(el).getAttribute("aria-label")).toBe("Search");
    expect(inputOf(el).getAttribute("title")).toBe("Find");
    expect(inputOf(el).hasAttribute("data-x")).toBe(false);
    el.setAttribute("aria-label", "Query");
    el.removeAttribute("title");
    el.refresh();
    expect(inputOf(el).getAttribute("aria-label")).toBe("Query");
    expect(inputOf(el).hasAttribute("title")).toBe(false);
  });

  it("keeps the value property live, while the value attribute moves only a clean input", () => {
    const el = make(`<neuwo-input value="a"></neuwo-input>`);
    const control = inputOf(el);
    expect(el.value).toBe("a");
    el.setAttribute("value", "b");
    expect(control.value).toBe("b");
    expect(el.defaultValue).toBe("b");
    type(control, "typed");
    expect(el.value).toBe("typed");
    el.setAttribute("value", "c");
    expect(control.getAttribute("value")).toBe("c");
    expect(control.value).toBe("typed");
    el.value = "set";
    expect(control.value).toBe("set");
    expect(el.getAttribute("value")).toBe("c");
  });

  it("lets the inner input's native change and input reach a host listener exactly once, with the input as target", () => {
    const el = make(`<neuwo-input></neuwo-input>`);
    for (const name of ["change", "input"]) {
      const heard = vi.fn((event) => [event.target, event.currentTarget]);
      el.addEventListener(name, heard);
      inputOf(el).dispatchEvent(new Event(name, { bubbles: true }));
      expect(heard, name).toHaveBeenCalledTimes(1);
      expect(heard.mock.results[0].value, name).toEqual([inputOf(el), el]);
    }
  });

  it("takes a removed or changed aria-* off the inner input through its observer alone, rendered or adopted", async () => {
    const rendered = make(`<neuwo-input aria-label="Search" aria-describedby="hint"></neuwo-input>`);
    const holder = document.createElement("div");
    holder.innerHTML = expand(`<neuwo-input aria-label="Search" aria-describedby="hint"></neuwo-input>`);
    const adopted = attach(holder).firstElementChild;
    expect(inputOf(adopted).id).toBe("neuwo-s1-control");
    for (const el of [rendered, adopted]) {
      expect(inputOf(el).getAttribute("aria-label")).toBe("Search");
      el.removeAttribute("aria-label");
      el.setAttribute("aria-describedby", "other");
      await settled();
      expect(inputOf(el).hasAttribute("aria-label")).toBe(false);
      expect(inputOf(el).getAttribute("aria-describedby")).toBe("other");
    }
  });

  it("reports required through checkValidity and reportValidity", () => {
    const el = make(`<neuwo-input required></neuwo-input>`);
    expect(el.checkValidity()).toBe(false);
    expect(el.reportValidity()).toBe(false);
    type(inputOf(el), "filled");
    expect(el.checkValidity()).toBe(true);
    expect(el.reportValidity()).toBe(true);
  });

  it("returns to the value attribute when its form resets", () => {
    const form = make(`<form><neuwo-input name="q" value="seed"></neuwo-input></form>`);
    const el = form.querySelector("neuwo-input");
    type(inputOf(el), "typed");
    form.reset();
    expect(el.value).toBe("seed");
  });

  it("focuses the inner input", () => {
    const el = make(`<neuwo-input></neuwo-input>`);
    el.focus();
    expect(document.activeElement).toBe(inputOf(el));
  });

  it("shows a value set before it was connected", () => {
    const el = document.createElement("neuwo-input");
    el.value = "early";
    attach(el);
    expect(inputOf(el).value).toBe("early");
    expect(inputOf(el).hasAttribute("value")).toBe(false);
  });

  it("submits through the native input before the script loads, leaving out disabled and unnamed fields", () => {
    const page = new Window();
    cleanup.push(() => page.happyDOM.close());
    page.document.body.innerHTML = expand(
      `<form>` +
        `<neuwo-input name="email" type="email" value="a@b.c" label="Email"></neuwo-input>` +
        `<neuwo-input name="empty"></neuwo-input>` +
        `<neuwo-input name="off" value="x" disabled></neuwo-input>` +
        `<neuwo-input value="nameless"></neuwo-input>` +
        `<neuwo-input name="q" value="&quot;quoted&quot; &amp; <tagged>"></neuwo-input>` +
        `</form>`,
    );
    expect(page.customElements.get("neuwo-input")).toBeUndefined();
    const form = page.document.querySelector("form");
    expect(form.querySelectorAll(".neuwo-input")).toHaveLength(5);
    expect([...new page.FormData(form)]).toEqual([
      ["email", "a@b.c"],
      ["empty", ""],
      ["q", '"quoted" & <tagged>'],
    ]);
  });

  it("gives server-rendered and script-created inputs distinct ids that resolve inside their own field", () => {
    const holder = document.createElement("div");
    holder.innerHTML = expand(`<neuwo-input label="One" error="First"></neuwo-input><neuwo-input label="Two" error="Second"></neuwo-input>`);
    attach(holder);
    const created = document.createElement("neuwo-input");
    created.setAttribute("label", "Three");
    created.setAttribute("error", "Third");
    holder.append(created);
    const fields = Array.from(holder.querySelectorAll("neuwo-input"));
    expect(fields).toHaveLength(3);
    const ids = Array.from(holder.querySelectorAll("[id]"), (node) => node.id);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
    for (const el of fields) {
      const control = inputOf(el);
      const label = labelOf(el);
      expect(document.getElementById(label.getAttribute("for"))).toBe(control);
      expect(document.getElementById(control.getAttribute("aria-describedby"))).toBe(errorOf(el));
      expect(label.control).toBe(control);
      const clicked = vi.fn();
      control.addEventListener("click", clicked);
      label.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      expect(clicked).toHaveBeenCalledTimes(1);
    }
  });

  it("adopts server markup without a mutation and keeps the server's ids through later error changes", () => {
    const holder = document.createElement("div");
    holder.innerHTML = expand(`<neuwo-input label="Email"></neuwo-input>`);
    const el = holder.firstElementChild;
    const control = inputOf(el);
    const line = errorOf(el);
    const children = Array.from(el.querySelector(".neuwo-field").children);
    expect(control.id).toBe("neuwo-s1-control");
    expect(line.id).toBe("neuwo-s1-error");
    const stop = watch(holder);
    attach(holder);
    expect(stop()).toEqual([]);

    el.setAttribute("error", "Required");
    expect(inputOf(el)).toBe(control);
    expect(control.id).toBe("neuwo-s1-control");
    expect(labelOf(el).getAttribute("for")).toBe("neuwo-s1-control");
    expect(control.getAttribute("aria-describedby")).toBe("neuwo-s1-error");
    expect(errorOf(el)).toBe(line);
    expect(line.id).toBe("neuwo-s1-error");
    expect(line.textContent).toBe("Required");
    expect(Array.from(el.querySelector(".neuwo-field").children)).toEqual(children);

    el.removeAttribute("error");
    expect(control.hasAttribute("aria-describedby")).toBe(false);
    el.setAttribute("error", "Again");
    expect(control.getAttribute("aria-describedby")).toBe("neuwo-s1-error");
    expect(Array.from(document.querySelectorAll("[id]"), (node) => node.id)).toEqual(["neuwo-s1-control", "neuwo-s1-error"]);
  });
});

describe("<neuwo-input> under React", () => {
  /** @param {unknown} element */
  async function render(element) {
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => act(() => root.unmount()));
    await act(async () => root.render(element));
    return { container, rerender: (/** @type {unknown} */ next) => act(async () => root.render(next)) };
  }

  it("calls onChange once per keystroke with the inner input as target, and keeps a value the consumer rejects", async () => {
    const errors = vi.spyOn(console, "error");
    const targets = [];
    const onChange = vi.fn((event) => void targets.push(event.target));
    const { container } = await render(jsx("neuwo-input", { value: "a", onChange, name: "q" }));
    const host = container.querySelector("neuwo-input");
    const control = inputOf(host);
    expect(host[CONTROLLED]).toBe(true);
    expect(control.value).toBe("a");
    await act(async () => type(control, "ab"));
    await act(async () => type(control, "ac"));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(targets).toEqual([control, control]);
    expect(control.value).toBe("a");
    expect(host.value).toBe("a");
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps a number the user is still typing when the consumer's state holds a number", async () => {
    const errors = vi.spyOn(console, "error");
    const onChange = vi.fn();
    function Form() {
      const [n, setN] = useState(1);
      return jsx("neuwo-input", {
        type: "number",
        value: n,
        onChange: (event) => {
          onChange(event.target.value);
          setN(parseFloat(event.target.value));
        },
      });
    }
    const { container } = await render(jsx(Form, {}));
    const control = inputOf(container.querySelector("neuwo-input"));
    expect(control.value).toBe("1");
    await act(async () => type(control, "1.0"));
    expect(control.value).toBe("1.0");
    await act(async () => type(control, "1.05"));
    expect(control.value).toBe("1.05");
    expect(onChange.mock.calls).toEqual([["1.0"], ["1.05"]]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("shows whatever the consumer's state says", async () => {
    const errors = vi.spyOn(console, "error");
    function Form() {
      const [value, setValue] = useState("a");
      return jsx("neuwo-input", { value, onChange: (event) => setValue(event.target.value.toUpperCase()) });
    }
    const { container } = await render(jsx(Form, {}));
    const control = inputOf(container.querySelector("neuwo-input"));
    await act(async () => type(control, "ab"));
    expect(control.value).toBe("AB");
    expect(errors).not.toHaveBeenCalled();
  });

  it("starts from defaultValue and keeps what the user typed across a parent re-render", async () => {
    const errors = vi.spyOn(console, "error");
    const { container, rerender } = await render(jsx("neuwo-input", { defaultValue: "a", name: "q" }));
    const host = container.querySelector("neuwo-input");
    const control = inputOf(host);
    expect(host[CONTROLLED]).toBe(false);
    expect(host.hasAttribute("defaultvalue")).toBe(false);
    expect(control.value).toBe("a");
    await act(async () => type(control, "ab"));
    await rerender(jsx("neuwo-input", { defaultValue: "a", name: "r" }));
    expect(control.name).toBe("r");
    expect(control.value).toBe("ab");
    expect(errors).not.toHaveBeenCalled();
  });

  it("reads its starting value as defaultValue though the element has no value attribute, as every field does", async () => {
    const errors = vi.spyOn(console, "error");
    const options = [jsx("option", { value: "a", children: "A" }, "a"), jsx("option", { value: "b", children: "B" }, "b")];
    for (const [tag, start, children] of [
      ["neuwo-input", "a", undefined],
      ["neuwo-textarea", "draft", undefined],
      ["neuwo-range", "30", undefined],
      ["neuwo-combobox", "b", options],
    ]) {
      const { container } = await render(jsx(tag, { defaultValue: start, name: "q", children }));
      const host = container.querySelector(tag);
      expect(host.hasAttribute("value"), tag).toBe(false);
      expect(host.defaultValue, tag).toBe(start);
    }
    expect(errors).not.toHaveBeenCalled();
  });

  it("takes a form prop as the id of the form the inner input submits with", async () => {
    const errors = vi.spyOn(console, "error");
    const { container } = await render(jsxs("div", { children: [jsx("form", { id: "signup" }), jsx("neuwo-input", { form: "signup", name: "q", defaultValue: "a" })] }));
    const host = container.querySelector("neuwo-input");
    expect(inputOf(host).getAttribute("form")).toBe("signup");
    expect(host.form).toBe(container.querySelector("form"));
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps what the user typed when a Server Component sends a new value, which is only the starting value there", async () => {
    const errors = vi.spyOn(console, "error");
    const server = createRuntime(templates, { markHost: false, server: true });
    const { container, rerender } = await render(server.jsx("neuwo-input", { value: "a", name: "q" }));
    const host = container.querySelector("neuwo-input");
    const control = inputOf(host);
    expect(control.value).toBe("a");
    expect(host.hasAttribute("value")).toBe(false);
    await act(async () => type(control, "ab"));
    await rerender(server.jsx("neuwo-input", { value: "b", name: "q" }));
    expect(control.value).toBe("ab");
    expect(control.defaultValue).toBe("b");
    expect(errors).not.toHaveBeenCalled();
  });

  it("hydrates server markup with no warning and keeps the server's ids", async () => {
    const errors = vi.spyOn(console, "error");
    const tree = () => jsx("neuwo-input", { value: "a", onChange() {}, label: "Email", error: "Taken" });
    const parsed = document.createElement("div");
    parsed.innerHTML = renderToString(tree());
    const container = attach(document.createElement("div"));
    container.append(...parsed.childNodes);
    const control = inputOf(container.querySelector("neuwo-input"));
    const id = control.id;
    const recoverable = [];
    let root;
    await act(async () => {
      root = hydrateRoot(container, tree(), { onRecoverableError: (thrown) => void recoverable.push(String(thrown?.message ?? thrown)) });
    });
    cleanup.push(() => act(() => root.unmount()));
    expect(recoverable).toEqual([]);
    expect(inputOf(container.querySelector("neuwo-input"))).toBe(control);
    expect(control.id).toBe(id);
    expect(control.getAttribute("aria-describedby")).toBe(errorOf(container.querySelector("neuwo-input")).id);
    expect(errors).not.toHaveBeenCalled();
  });
});
