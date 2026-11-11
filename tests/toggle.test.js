import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import "../src/index.js";
import { NeuwoToggle } from "../src/components/selection/toggle/neuwo-toggle.js";
import { NeuwoChoiceElement } from "../src/components/selection/choice-element.js";
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

// Parsed detached, then attached: innerHTML on a connected container upgrades before the children exist.
function make(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return attach(holder).firstElementChild;
}

const rowOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-form-toggle");
const inputOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-form-toggle > .neuwo-form-toggle__input");
const trackOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-form-toggle > .neuwo-form-toggle__track");
const labelOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-form-toggle > .neuwo-form-toggle__label");
const errorOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-choice__error");
const pulsing = (el) => rowOf(el).classList.contains("neuwo-form-toggle--pulse");

describe("<neuwo-toggle>", () => {
  it("registers a light DOM choice element around a native switch and a decorative track", () => {
    expect(customElements.get("neuwo-toggle")).toBe(NeuwoToggle);
    expect(Object.getPrototypeOf(NeuwoToggle)).toBe(NeuwoChoiceElement);
    const el = make(`<neuwo-toggle>Notifications</neuwo-toggle>`);
    expect(el.shadowRoot).toBeNull();
    expect(Array.from(rowOf(el).children, (node) => node.className)).toEqual([
      "neuwo-form-toggle__input",
      "neuwo-form-toggle__track",
      "neuwo-form-toggle__label",
    ]);
    expect(inputOf(el).type).toBe("checkbox");
    expect(inputOf(el).getAttribute("role")).toBe("switch");
    expect(trackOf(el).getAttribute("aria-hidden")).toBe("true");
    expect(labelOf(el).textContent).toBe("Notifications");
    expect(el.control).toBe(inputOf(el));
  });

  it("flips with a click on its label, and lets the switch's change reach a host listener once", () => {
    const el = make(`<neuwo-toggle name="notify">Notifications</neuwo-toggle>`);
    const heard = vi.fn((event) => event.target);
    el.addEventListener("change", heard);
    labelOf(el).click();
    expect(el.checked).toBe(true);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard.mock.results[0].value).toBe(inputOf(el));
  });

  it("shows an error accent on the row and the message on the reserved line", () => {
    const el = make(`<neuwo-toggle error="Turn this on">On</neuwo-toggle>`);
    expect(rowOf(el).classList.contains("neuwo-form-toggle--error")).toBe(true);
    expect(errorOf(el).textContent).toBe("Turn this on");
    expect(document.getElementById(inputOf(el).getAttribute("aria-describedby"))).toBe(errorOf(el));
  });

  it("returns to the checked attribute when its form resets", () => {
    const form = make(`<form><neuwo-toggle checked></neuwo-toggle></form>`);
    const el = form.querySelector("neuwo-toggle");
    el.checked = false;
    form.reset();
    expect(el.checked).toBe(true);
  });

  it("carries the attention pulse on the row, not the host", () => {
    const el = make(`<neuwo-toggle pulse>Bid Enrichment</neuwo-toggle>`);
    expect(pulsing(el)).toBe(true);
    expect(pulsing(make(`<neuwo-toggle></neuwo-toggle>`))).toBe(false);
  });

  it("keeps the pulse class through a flip, since the recipe stops the ring while checked", () => {
    const el = make(`<neuwo-toggle pulse></neuwo-toggle>`);
    const row = rowOf(el);
    inputOf(el).click();
    expect(el.checked).toBe(true);
    expect(rowOf(el)).toBe(row);
    expect(pulsing(el)).toBe(true);
    el.checked = false;
    expect(pulsing(el)).toBe(true);
  });

  it("reflects the pulse property to the attribute", () => {
    const el = make(`<neuwo-toggle></neuwo-toggle>`);
    expect(el.pulse).toBe(false);
    el.pulse = true;
    expect(el.hasAttribute("pulse")).toBe(true);
    expect(pulsing(el)).toBe(true);
    el.pulse = false;
    expect(el.hasAttribute("pulse")).toBe(false);
    expect(pulsing(el)).toBe(false);
  });

  it("adopts a server-rendered pulse toggle without a mutation", () => {
    const holder = document.createElement("div");
    holder.innerHTML = expand(`<neuwo-toggle pulse checked name="enrich">Bid Enrichment</neuwo-toggle>`);
    const records = [];
    const observer = new MutationObserver((list) => records.push(...list));
    observer.observe(holder, { subtree: true, childList: true, attributes: true, characterData: true });
    attach(holder);
    records.push(...observer.takeRecords());
    observer.disconnect();
    expect(records).toEqual([]);
    const el = holder.firstElementChild;
    expect(el.checked).toBe(true);
    expect(pulsing(el)).toBe(true);
  });
});

describe("<neuwo-toggle> under React", () => {
  /** @param {unknown} element */
  async function render(element) {
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => act(() => root.unmount()));
    await act(async () => root.render(element));
    return { container, rerender: (/** @type {unknown} */ next) => act(async () => root.render(next)) };
  }

  it("keeps the pulse on a controlled switch through a flip and a re-render", async () => {
    const errors = vi.spyOn(console, "error");
    function Settings() {
      const [on, setOn] = useState(false);
      return jsx("neuwo-toggle", { pulse: true, checked: on, onChange: (event) => setOn(event.target.checked), children: "Bid Enrichment" });
    }
    const { container } = await render(jsx(Settings, {}));
    const host = container.querySelector("neuwo-toggle");
    const row = rowOf(host);
    expect(pulsing(host)).toBe(true);
    await act(async () => inputOf(host).click());
    expect(inputOf(host).checked).toBe(true);
    expect(rowOf(host)).toBe(row);
    expect(pulsing(host)).toBe(true);
    await act(async () => inputOf(host).click());
    expect(inputOf(host).checked).toBe(false);
    expect(pulsing(host)).toBe(true);
    expect(errors).not.toHaveBeenCalled();
  });

  it("starts an uncontrolled switch from defaultChecked", async () => {
    const errors = vi.spyOn(console, "error");
    const { container, rerender } = await render(jsx("neuwo-toggle", { defaultChecked: true, pulse: true, name: "a" }));
    const host = container.querySelector("neuwo-toggle");
    expect(inputOf(host).checked).toBe(true);
    await act(async () => inputOf(host).click());
    await rerender(jsx("neuwo-toggle", { defaultChecked: true, pulse: true, name: "b" }));
    expect(inputOf(host).checked).toBe(false);
    expect(pulsing(host)).toBe(true);
    expect(errors).not.toHaveBeenCalled();
  });
});
