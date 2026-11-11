import { afterEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import { act, useState } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import "../src/index.js";
import { NeuwoCheckbox } from "../src/components/selection/checkbox/neuwo-checkbox.js";
import { NeuwoChoiceElement } from "../src/components/selection/choice-element.js";
import { CONTROLLED } from "../src/core/marks.js";
import { expand } from "../src/server/index.js";
import { jsx } from "../src/react/jsx-runtime.js";
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

const rowOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-form-check");
const inputOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-form-check > .neuwo-form-check__input");
const labelOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-form-check > .neuwo-form-check__label");
const errorOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-choice__error");

describe("<neuwo-checkbox>", () => {
  it("registers a light DOM choice element around a native checkbox", () => {
    expect(customElements.get("neuwo-checkbox")).toBe(NeuwoCheckbox);
    expect(Object.getPrototypeOf(NeuwoCheckbox)).toBe(NeuwoChoiceElement);
    const el = make(`<neuwo-checkbox>Subscribe</neuwo-checkbox>`);
    expect(el.shadowRoot).toBeNull();
    expect(Array.from(el.querySelector(":scope > .neuwo-choice").children, (node) => node.className)).toEqual(["neuwo-form-check", "neuwo-choice__error"]);
    expect(inputOf(el).type).toBe("checkbox");
    expect(el.control).toBe(inputOf(el));
  });

  it("puts its children in the label, so a click on the text toggles it", () => {
    const el = make(`<neuwo-checkbox>I accept the <a href="#terms">terms</a></neuwo-checkbox>`);
    expect(labelOf(el).innerHTML).toBe('I accept the <a href="#terms">terms</a>');
    expect(rowOf(el).localName).toBe("label");
    labelOf(el).click();
    expect(el.checked).toBe(true);
  });

  it("delegates indeterminate to the checkbox, writes no aria-checked, and lets a click clear it", () => {
    const el = make(`<neuwo-checkbox></neuwo-checkbox>`);
    expect(el.indeterminate).toBe(false);
    el.indeterminate = true;
    expect(inputOf(el).indeterminate).toBe(true);
    expect(el.indeterminate).toBe(true);
    expect(inputOf(el).hasAttribute("aria-checked")).toBe(false);
    inputOf(el).click();
    expect(el.indeterminate).toBe(false);
    expect(el.checked).toBe(true);
    inputOf(el).indeterminate = true;
    expect(el.indeterminate).toBe(true);
  });

  it("keeps indeterminate set before the first render and applies it on connect", () => {
    const el = document.createElement("neuwo-checkbox");
    el.indeterminate = true;
    expect(el.indeterminate).toBe(true);
    attach(el);
    expect(inputOf(el).indeterminate).toBe(true);
    expect(inputOf(el).hasAttribute("aria-checked")).toBe(false);
  });

  it("keeps indeterminate through an attribute change", () => {
    const el = make(`<neuwo-checkbox></neuwo-checkbox>`);
    el.indeterminate = true;
    el.setAttribute("error", "Pick some");
    expect(inputOf(el).indeterminate).toBe(true);
  });

  it("shows an error message and accent, wired to the checkbox, and softens or drops them", () => {
    const el = make(`<neuwo-checkbox error="You must accept">Accept</neuwo-checkbox>`);
    expect(errorOf(el).textContent).toBe("You must accept");
    expect(rowOf(el).classList.contains("neuwo-form-check--error")).toBe(true);
    expect(inputOf(el).getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(inputOf(el).getAttribute("aria-describedby"))).toBe(errorOf(el));
    el.setAttribute("error-muted", "");
    expect(rowOf(el).classList.contains("neuwo-form-check--error")).toBe(false);
    expect(inputOf(el).getAttribute("aria-invalid")).toBe("true");
    el.removeAttribute("error");
    expect(inputOf(el).hasAttribute("aria-invalid")).toBe(false);
    expect(inputOf(el).hasAttribute("aria-describedby")).toBe(false);
    expect(errorOf(el).textContent).toBe("");
  });

  it("submits through the native checkbox before the script loads, leaving out unchecked, disabled and unnamed ones", () => {
    const page = new Window();
    cleanup.push(() => page.happyDOM.close());
    page.document.body.innerHTML = expand(
      `<form>` +
        `<neuwo-checkbox name="terms" checked>Terms</neuwo-checkbox>` +
        `<neuwo-checkbox name="news" value="weekly" checked>News</neuwo-checkbox>` +
        `<neuwo-checkbox name="spam" value="yes">Spam</neuwo-checkbox>` +
        `<neuwo-checkbox name="off" checked disabled>Off</neuwo-checkbox>` +
        `<neuwo-checkbox checked>Nameless</neuwo-checkbox>` +
        `<neuwo-toggle name="notify" checked>Notify</neuwo-toggle>` +
        `<neuwo-toggle name="quiet">Quiet</neuwo-toggle>` +
        `</form>`,
    );
    expect(page.customElements.get("neuwo-checkbox")).toBeUndefined();
    const form = page.document.querySelector("form");
    expect(form.querySelectorAll("input[type=checkbox]")).toHaveLength(7);
    expect([...new page.FormData(form)]).toEqual([
      ["terms", "on"],
      ["news", "weekly"],
      ["notify", "on"],
    ]);
  });

  it("adopts server markup without a mutation and keeps the server's ids through later error changes", () => {
    const holder = document.createElement("div");
    holder.innerHTML = expand(`<neuwo-checkbox name="terms" checked>Accept</neuwo-checkbox>`);
    const el = holder.firstElementChild;
    const control = inputOf(el);
    const line = errorOf(el);
    expect(line.id).toBe("neuwo-s1-error");
    const stop = watch(holder);
    attach(holder);
    expect(stop()).toEqual([]);
    expect(el.checked).toBe(true);
    el.setAttribute("error", "Required");
    expect(inputOf(el)).toBe(control);
    expect(errorOf(el)).toBe(line);
    expect(control.getAttribute("aria-describedby")).toBe("neuwo-s1-error");
    expect(line.textContent).toBe("Required");
    expect(labelOf(el).textContent).toBe("Accept");
  });

  it("names the native control's type, read-only, as a native checkbox does", () => {
    for (const tag of ["neuwo-checkbox", "neuwo-toggle"]) {
      const el = document.createElement(tag);
      expect(el.type, tag).toBe("checkbox");
      expect(() => {
        el.type = "radio";
      }, tag).toThrow(TypeError);
    }
  });

  it("focuses the native checkbox", () => {
    const el = make(`<neuwo-checkbox></neuwo-checkbox>`);
    el.focus();
    expect(document.activeElement).toBe(inputOf(el));
  });
});

describe("<neuwo-checkbox> under React", () => {
  /** @param {unknown} element */
  async function render(element) {
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => act(() => root.unmount()));
    await act(async () => root.render(element));
    return { container, rerender: (/** @type {unknown} */ next) => act(async () => root.render(next)) };
  }

  it("calls onChange once per click with the checkbox as target, and keeps a checked state the consumer rejects", async () => {
    const errors = vi.spyOn(console, "error");
    const targets = [];
    const onChange = vi.fn((event) => void targets.push(event.target));
    const { container } = await render(jsx("neuwo-checkbox", { checked: false, onChange, name: "terms", children: "Accept" }));
    const host = container.querySelector("neuwo-checkbox");
    const control = inputOf(host);
    expect(host[CONTROLLED]).toBe(true);
    expect(control.checked).toBe(false);
    await act(async () => control.click());
    await act(async () => labelOf(host).click());
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(targets).toEqual([control, control]);
    expect(control.checked).toBe(false);
    expect(host.checked).toBe(false);
    expect(errors).not.toHaveBeenCalled();
  });

  it("shows whatever the consumer's state says", async () => {
    const errors = vi.spyOn(console, "error");
    function Form() {
      const [agreed, setAgreed] = useState(false);
      return jsx("neuwo-checkbox", { checked: agreed, onChange: (event) => setAgreed(event.target.checked), children: "Accept" });
    }
    const { container } = await render(jsx(Form, {}));
    const host = container.querySelector("neuwo-checkbox");
    await act(async () => inputOf(host).click());
    expect(inputOf(host).checked).toBe(true);
    expect(host.checked).toBe(true);
    await act(async () => inputOf(host).click());
    expect(inputOf(host).checked).toBe(false);
    expect(errors).not.toHaveBeenCalled();
  });

  it("starts from defaultChecked and keeps the user's choice across a parent re-render", async () => {
    const errors = vi.spyOn(console, "error");
    const { container, rerender } = await render(jsx("neuwo-checkbox", { defaultChecked: true, name: "a", value: "yes" }));
    const host = container.querySelector("neuwo-checkbox");
    const control = inputOf(host);
    expect(host[CONTROLLED]).toBe(false);
    expect(host.hasAttribute("checked")).toBe(false);
    expect(host.hasAttribute("defaultchecked")).toBe(false);
    expect(host.defaultChecked).toBe(true);
    expect(control.checked).toBe(true);
    expect(control.value).toBe("yes");
    await act(async () => control.click());
    await rerender(jsx("neuwo-checkbox", { defaultChecked: true, name: "b", value: "yes" }));
    expect(control.name).toBe("b");
    expect(control.checked).toBe(false);
    expect(host.checked).toBe(false);
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps the user's choice when a Server Component sends a new checked, which is only the starting state there", async () => {
    const errors = vi.spyOn(console, "error");
    const server = createRuntime(templates, { markHost: false, server: true });
    const { container, rerender } = await render(server.jsx("neuwo-checkbox", { checked: true, name: "a" }));
    const host = container.querySelector("neuwo-checkbox");
    const control = inputOf(host);
    expect(control.checked).toBe(true);
    expect(host.hasAttribute("checked")).toBe(false);
    await act(async () => control.click());
    await rerender(server.jsx("neuwo-checkbox", { checked: true, name: "b" }));
    expect(control.checked).toBe(false);
    expect(control.name).toBe("b");
    expect(errors).not.toHaveBeenCalled();
  });

  it("hydrates server markup with no warning and keeps the server's ids", async () => {
    const errors = vi.spyOn(console, "error");
    const tree = () => jsx("neuwo-checkbox", { checked: true, onChange() {}, name: "terms", error: "Required", children: "Accept" });
    const parsed = document.createElement("div");
    parsed.innerHTML = renderToString(tree());
    const container = attach(document.createElement("div"));
    container.append(...parsed.childNodes);
    const control = inputOf(container.querySelector("neuwo-checkbox"));
    const id = errorOf(container.querySelector("neuwo-checkbox")).id;
    const recoverable = [];
    let root;
    await act(async () => {
      root = hydrateRoot(container, tree(), { onRecoverableError: (thrown) => void recoverable.push(String(thrown?.message ?? thrown)) });
    });
    cleanup.push(() => act(() => root.unmount()));
    const host = container.querySelector("neuwo-checkbox");
    expect(recoverable).toEqual([]);
    expect(inputOf(host)).toBe(control);
    expect(control.checked).toBe(true);
    expect(errorOf(host).id).toBe(id);
    expect(control.getAttribute("aria-describedby")).toBe(id);
    expect(errors).not.toHaveBeenCalled();
  });

  it("clears indeterminate on a click the consumer rejects, as React's own checkbox does", async () => {
    const errors = vi.spyOn(console, "error");
    const { container } = await render(jsx("neuwo-checkbox", { checked: false, onChange() {}, children: "All" }));
    const host = container.querySelector("neuwo-checkbox");
    host.indeterminate = true;
    await act(async () => inputOf(host).click());
    expect(inputOf(host).checked).toBe(false);
    expect(host.indeterminate).toBe(false);
    expect(errors).not.toHaveBeenCalled();
  });
});
