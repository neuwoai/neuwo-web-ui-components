// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { NeuwoElement } from "../src/core/element.js";
import { NeuwoControlElement } from "../src/components/control-element.js";
import { NeuwoFieldElement } from "../src/components/fields/field-element.js";
import { NeuwoChoiceElement } from "../src/components/selection/choice-element.js";
import { NeuwoInput } from "../src/components/fields/input/neuwo-input.js";
import { NeuwoCheckbox } from "../src/components/selection/checkbox/neuwo-checkbox.js";
import { NeuwoToggle } from "../src/components/selection/toggle/neuwo-toggle.js";

const cleanup = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop()();
});

function attach(node) {
  document.body.appendChild(node);
  cleanup.push(() => node.remove());
  return node;
}

let count = 0;
/** A tag of its own for each test, defined only when the test says so, as a page's deferred module does. */
function later(base) {
  const tag = `early-${++count}-control`;
  return { tag, define: () => customElements.define(tag, class extends base {}) };
}

describe("NeuwoControlElement", () => {
  it("is the light base the fields and the choices share", () => {
    expect(Object.getPrototypeOf(NeuwoControlElement)).toBe(NeuwoElement);
    expect(Object.getPrototypeOf(NeuwoFieldElement)).toBe(NeuwoControlElement);
    expect(Object.getPrototypeOf(NeuwoChoiceElement)).toBe(NeuwoControlElement);
  });
});

describe("a property set before the element is defined, in jsdom", () => {
  it("puts checked and indeterminate on the checkbox once the element upgrades", () => {
    const { tag, define } = later(NeuwoCheckbox);
    const el = attach(document.createElement(tag));
    el.checked = true;
    el.indeterminate = true;
    expect(Object.hasOwn(el, "checked")).toBe(true);
    define();
    expect(el).toBeInstanceOf(NeuwoCheckbox);
    expect(Object.hasOwn(el, "checked")).toBe(false);
    expect(Object.hasOwn(el, "indeterminate")).toBe(false);
    expect(el.control.checked).toBe(true);
    expect(el.control.hasAttribute("checked")).toBe(false);
    expect(el.checked).toBe(true);
    expect(el.control.indeterminate).toBe(true);
    expect(el.indeterminate).toBe(true);
  });

  it("puts value on the field's control and reflects name and disabled", () => {
    const { tag, define } = later(NeuwoInput);
    const el = attach(document.createElement(tag));
    el.value = "x";
    el.name = "q";
    el.disabled = true;
    define();
    expect(Object.keys(el)).toEqual([]);
    expect(el.control.value).toBe("x");
    expect(el.control.hasAttribute("value")).toBe(false);
    expect(el.value).toBe("x");
    expect(el.getAttribute("name")).toBe("q");
    expect(el.control.name).toBe("q");
    expect(el.hasAttribute("disabled")).toBe(true);
    expect(el.control.disabled).toBe(true);
  });

  it("reflects a toggle's pulse onto its row", () => {
    const { tag, define } = later(NeuwoToggle);
    const el = attach(document.createElement(tag));
    el.pulse = true;
    define();
    expect(el.hasAttribute("pulse")).toBe(true);
    expect(el.querySelector(".neuwo-form-toggle").classList.contains("neuwo-form-toggle--pulse")).toBe(true);
  });

  it("keeps the value for a host that upgrades only when it is inserted", () => {
    const { tag, define } = later(NeuwoCheckbox);
    const el = document.createElement(tag);
    el.checked = true;
    define();
    expect(Object.hasOwn(el, "checked")).toBe(true);
    attach(el);
    expect(el.control.checked).toBe(true);
    expect(el.checked).toBe(true);
  });

  it("holds the value for a host upgraded while detached, and puts it on the control when it connects", async () => {
    const { tag, define } = later(NeuwoInput);
    const el = document.createElement(tag);
    el.value = "early";
    define();
    customElements.upgrade(el);
    expect(Object.hasOwn(el, "value")).toBe(false);
    await Promise.resolve();
    expect(el.value).toBe("early");
    expect(el.control).toBeNull();
    attach(el);
    expect(el.control.value).toBe("early");
    expect(el.control.hasAttribute("value")).toBe(false);
  });

  it("leaves a property with no setter on the element alone", () => {
    const { tag, define } = later(NeuwoCheckbox);
    const el = attach(document.createElement(tag));
    el.extra = 1;
    el.validity = "mine";
    define();
    expect(el.extra).toBe(1);
    expect(Object.getOwnPropertyDescriptor(el, "validity")?.value).toBe("mine");
  });

  it("finds nothing to take on an element created after its definition", () => {
    const el = attach(document.createElement("neuwo-checkbox"));
    expect(Object.keys(el)).toEqual([]);
    el.checked = true;
    expect(el.control.checked).toBe(true);
  });
});
