import { afterEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import { act, useState } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import "../src/index.js";
import { NeuwoRange } from "../src/components/fields/range/neuwo-range.js";
import { NeuwoFieldElement } from "../src/components/fields/field-element.js";
import { CONTROLLED } from "../src/core/marks.js";
import { expand } from "../src/server/index.js";
import { jsx } from "../src/react/jsx-runtime.js";

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

function make(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return attach(holder).firstElementChild;
}

const rangeOf = (el) => el.querySelector(":scope > .neuwo-field > .neuwo-input");
const fillOf = (el) => rangeOf(el).style.getPropertyValue("--neuwo-range-fill");

/** @param {HTMLInputElement} control @param {string} value */
function drag(control, value) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(control, value);
  control.dispatchEvent(new Event("input", { bubbles: true }));
}

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("<neuwo-range>", () => {
  it("registers a light DOM field element with a native range input on the prefixed classes", () => {
    expect(customElements.get("neuwo-range")).toBe(NeuwoRange);
    expect(Object.getPrototypeOf(NeuwoRange)).toBe(NeuwoFieldElement);
    const el = make(`<neuwo-range></neuwo-range>`);
    expect(el.shadowRoot).toBeNull();
    const control = rangeOf(el);
    expect(control.type).toBe("range");
    expect(control.classList.contains("neuwo-input")).toBe(true);
    expect(control.classList.contains("neuwo-range")).toBe(true);
    expect(el.querySelector("[part]")).toBeNull();
  });

  it("forwards the bounds to the control", () => {
    const control = rangeOf(make(`<neuwo-range min="10" max="90" step="5"></neuwo-range>`));
    expect(control.getAttribute("min")).toBe("10");
    expect(control.getAttribute("max")).toBe("90");
    expect(control.getAttribute("step")).toBe("5");
  });

  it("does not forward the text-field attributes that a slider has no use for", () => {
    const control = rangeOf(make(`<neuwo-range placeholder="nope" autocomplete="off" readonly required></neuwo-range>`));
    for (const name of ["placeholder", "autocomplete", "readonly", "required"]) expect(control.hasAttribute(name)).toBe(false);
  });

  it("forwards aria-valuetext, and a rewrite of it, without another trigger", () => {
    const el = make(`<neuwo-range min="0" max="100" value="40" aria-valuetext="40 views"></neuwo-range>`);
    expect(rangeOf(el).getAttribute("aria-valuetext")).toBe("40 views");
    el.setAttribute("aria-valuetext", "40 per cent");
    expect(rangeOf(el).getAttribute("aria-valuetext")).toBe("40 per cent");
  });

  it("seeds a value outside the default 0-100 window", () => {
    const el = make(`<neuwo-range min="1000" max="100000" value="50000"></neuwo-range>`);
    expect(el.value).toBe("50000");
  });

  it("fills the track in the first render, against the bounds", () => {
    expect(fillOf(make(`<neuwo-range min="0" max="200" value="50"></neuwo-range>`))).toBe("25%");
    expect(fillOf(make(`<neuwo-range min="100" max="300" value="150"></neuwo-range>`))).toBe("25%");
    expect(fillOf(make(`<neuwo-range min="0" max="10"></neuwo-range>`))).toBe("50%");
    expect(fillOf(make(`<neuwo-range min="0" max="100" value="500"></neuwo-range>`))).toBe("100%");
  });

  it("follows the thumb as it is dragged", () => {
    const el = make(`<neuwo-range min="0" max="100" value="10"></neuwo-range>`);
    drag(rangeOf(el), "80");
    expect(fillOf(el)).toBe("80%");
    expect(el.value).toBe("80");
  });

  it("updates the fill when the value property is set", () => {
    const el = make(`<neuwo-range min="0" max="100" value="10"></neuwo-range>`);
    el.value = "80";
    expect(fillOf(el)).toBe("80%");
  });

  it("keeps the live fill when a bound changes after the user moved the thumb", () => {
    const el = make(`<neuwo-range min="0" max="100" value="10"></neuwo-range>`);
    drag(rangeOf(el), "50");
    el.setAttribute("max", "200");
    expect(el.value).toBe("50");
    expect(fillOf(el)).toBe("25%");
    el.setAttribute("min", "40");
    expect(fillOf(el)).toBe(`${Math.round(((50 - 40) / 160) * 10000) / 100}%`);
  });

  it("writes the style only when the fill differs", () => {
    const el = make(`<neuwo-range min="0" max="100" value="10"></neuwo-range>`);
    const style = rangeOf(el).style;
    const set = vi.spyOn(style, "setProperty");
    drag(rangeOf(el), "10");
    el.setAttribute("label", "Views");
    expect(set).not.toHaveBeenCalled();
  });

  it("returns to the value attribute and its fill when its form resets", async () => {
    const form = make(`<form><neuwo-range name="r" min="0" max="100" value="20"></neuwo-range></form>`);
    const el = form.querySelector("neuwo-range");
    drag(rangeOf(el), "90");
    expect(fillOf(el)).toBe("90%");
    form.reset();
    await nextTask();
    expect(el.value).toBe("20");
    expect(fillOf(el)).toBe("20%");
  });

  it("starts an unvalued range at the native midpoint, which a bound set after the default would otherwise clamp", () => {
    const el = make(`<neuwo-range min="0" max="10"></neuwo-range>`);
    expect(rangeOf(el).getAttribute("value")).toBe("5");
    expect(el.value).toBe("5");
    expect(el.defaultValue).toBe("");
    el.setAttribute("label", "Views");
    expect(fillOf(el)).toBe("50%");
  });

  it("stops listening for the reset once disconnected, and listens again on reconnect", async () => {
    const form = make(`<form><neuwo-range min="0" max="100" value="20"></neuwo-range></form>`);
    const el = form.querySelector("neuwo-range");
    el.remove();
    drag(rangeOf(el), "90");
    form.append(el);
    drag(rangeOf(el), "70");
    form.reset();
    await nextTask();
    expect(el.value).toBe("20");
    expect(fillOf(el)).toBe("20%");
  });

  it("submits through FormData, with and without a value attribute", () => {
    const form = make(`<form><neuwo-range name="a" min="0" max="10" value="3"></neuwo-range><neuwo-range name="b" min="0" max="10"></neuwo-range></form>`);
    const entries = [...new FormData(form)];
    expect(entries[0]).toEqual(["a", "3"]);
    expect(entries[1][0]).toBe("b");
    expect(entries[1][1]).toBe("5");
  });

  it("submits through the native input before the script loads", () => {
    const page = new Window();
    cleanup.push(() => page.happyDOM.close());
    page.document.body.innerHTML = expand(
      `<form><neuwo-range name="a" min="0" max="10" value="3"></neuwo-range><neuwo-range name="b" min="0" max="10"></neuwo-range></form>`,
    );
    expect(page.customElements.get("neuwo-range")).toBeUndefined();
    const entries = [...new page.FormData(page.document.querySelector("form"))];
    expect(entries[0]).toEqual(["a", "3"]);
    expect(entries[1][0]).toBe("b");
    expect(entries[1][1]).toBe("5");
  });

  it("carries the shared label and disabled behaviour", () => {
    const el = make(`<neuwo-range label="Page views" value="1"></neuwo-range>`);
    expect(el.querySelector("label.neuwo-field__label").textContent).toBe("Page views");
    el.disabled = true;
    expect(rangeOf(el).disabled).toBe(true);
  });

  it("drops the reserved error line on request", () => {
    expect(make(`<neuwo-range no-error-line></neuwo-range>`).querySelector(".neuwo-field__error")).toBeNull();
  });

  it("shows the live fill of served markup whose thumb moved before the element adopted it", () => {
    const holder = document.createElement("div");
    holder.innerHTML = expand(`<neuwo-range name="v" min="0" max="100" value="20"></neuwo-range>`);
    const control = holder.querySelector(".neuwo-range");
    control.value = "80";
    attach(holder);
    expect(control.value).toBe("80");
    expect(control.style.getPropertyValue("--neuwo-range-fill")).toBe("80%");
  });
});

describe("<neuwo-range> under React", () => {
  async function render(element) {
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => act(() => root.unmount()));
    await act(async () => root.render(element));
    return { container, rerender: (next) => act(async () => root.render(next)) };
  }

  it("shows the consumer's fill after a re-render, and writes none itself", async () => {
    const errors = vi.spyOn(console, "error");
    const { container, rerender } = await render(jsx("neuwo-range", { min: 0, max: 100, value: 20, onChange() {} }));
    const host = container.querySelector("neuwo-range");
    const control = rangeOf(host);
    expect(host[CONTROLLED]).toBe(true);
    expect(fillOf(host)).toBe("20%");
    await act(async () => drag(control, "70"));
    expect(control.value).toBe("20");
    expect(fillOf(host)).toBe("20%");
    await rerender(jsx("neuwo-range", { min: 0, max: 100, value: 60, onChange() {} }));
    expect(control.value).toBe("60");
    expect(fillOf(host)).toBe("60%");
    expect(errors).not.toHaveBeenCalled();
  });

  it("follows the thumb when uncontrolled", async () => {
    const errors = vi.spyOn(console, "error");
    const { container } = await render(jsx("neuwo-range", { min: 0, max: 100, defaultValue: 20 }));
    const host = container.querySelector("neuwo-range");
    expect(host[CONTROLLED]).toBe(false);
    expect(fillOf(host)).toBe("20%");
    await act(async () => drag(rangeOf(host), "70"));
    expect(fillOf(host)).toBe("70%");
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps the live fill after a bound change", async () => {
    const errors = vi.spyOn(console, "error");
    const tree = (max) => jsx("neuwo-range", { min: 0, max, defaultValue: 20 });
    const { container, rerender } = await render(tree(100));
    const host = container.querySelector("neuwo-range");
    await act(async () => drag(rangeOf(host), "70"));
    expect(fillOf(host)).toBe("70%");
    await rerender(tree(200));
    await nextTask();
    expect(rangeOf(host).value).toBe("70");
    expect(fillOf(host)).toBe("35%");
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps the live fill after a defaultValue change", async () => {
    const errors = vi.spyOn(console, "error");
    const tree = (defaultValue) => jsx("neuwo-range", { min: 0, max: 100, defaultValue });
    const { container, rerender } = await render(tree(20));
    const host = container.querySelector("neuwo-range");
    await act(async () => drag(rangeOf(host), "70"));
    await rerender(tree(30));
    await nextTask();
    expect(rangeOf(host).value).toBe("70");
    expect(fillOf(host)).toBe("70%");
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps the live fill across an unrelated parent re-render", async () => {
    const errors = vi.spyOn(console, "error");
    const tree = (name) => jsx("neuwo-range", { min: 0, max: 100, defaultValue: 20, name });
    const { container, rerender } = await render(tree("a"));
    const host = container.querySelector("neuwo-range");
    await act(async () => drag(rangeOf(host), "70"));
    await rerender(tree("b"));
    await nextTask();
    expect(fillOf(host)).toBe("70%");
    expect(errors).not.toHaveBeenCalled();
  });

  it("never writes the fill on a controlled host, from the setter or updated()", async () => {
    const { container } = await render(jsx("neuwo-range", { min: 0, max: 100, value: 20, onChange() {} }));
    const host = container.querySelector("neuwo-range");
    const set = vi.spyOn(rangeOf(host).style, "setProperty");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(rangeOf(host), "80");
    host.value = "80";
    host.updated();
    expect(set).not.toHaveBeenCalled();
    expect(fillOf(host)).toBe("20%");
  });

  it("is uncontrolled with value={null} and a defaultValue, as React's own input is", async () => {
    const errors = vi.spyOn(console, "error");
    const tree = (name) => jsx("neuwo-range", { min: 0, max: 100, value: null, defaultValue: 40, name });
    const { container, rerender } = await render(tree("a"));
    const host = container.querySelector("neuwo-range");
    expect(host[CONTROLLED]).toBe(false);
    expect(rangeOf(host).value).toBe("40");
    await act(async () => drag(rangeOf(host), "70"));
    await rerender(tree("b"));
    expect(rangeOf(host).name).toBe("b");
    expect(rangeOf(host).value).toBe("70");
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps the live fill after a bound change on markup it adopted before React hydrated it", async () => {
    const errors = vi.spyOn(console, "error");
    let setMax;
    function App() {
      const [max, set] = useState(100);
      setMax = set;
      return jsx("neuwo-range", { min: 0, max, defaultValue: 20 });
    }
    const container = document.createElement("div");
    container.innerHTML = renderToString(jsx(App, {}));
    attach(container);
    const host = container.querySelector("neuwo-range");
    expect(host).toBeInstanceOf(NeuwoRange);
    expect(fillOf(host)).toBe("20%");
    let root;
    await act(async () => {
      root = hydrateRoot(container, jsx(App, {}));
    });
    cleanup.push(() => act(() => root.unmount()));
    expect(container.querySelector("neuwo-range")).toBe(host);
    await act(async () => drag(rangeOf(host), "70"));
    expect(fillOf(host)).toBe("70%");
    await act(async () => setMax(200));
    await nextTask();
    expect(rangeOf(host).value).toBe("70");
    expect(fillOf(host)).toBe("35%");
    expect(errors).not.toHaveBeenCalled();
  });

  it("renders the fill in the server string", () => {
    expect(renderToString(jsx("neuwo-range", { min: 0, max: 200, value: 50, onChange() {} }))).toContain("--neuwo-range-fill:25%");
  });
});
