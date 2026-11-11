import { afterEach, describe, expect, it, vi } from "vitest";
import { NeuwoElement } from "../src/core/element.js";
import { NeuwoControlElement } from "../src/components/control-element.js";
import { CONTROLLED } from "../src/core/marks.js";
import { NeuwoChoiceElement } from "../src/components/selection/choice-element.js";
import { NeuwoCheckbox } from "../src/components/selection/checkbox/neuwo-checkbox.js";

class ResetChoice extends NeuwoCheckbox {
  resets = [];
  formReset() {
    this.resets.push(this.checked);
  }
}
customElements.define("reset-choice", ResetChoice);

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

const inputOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-form-check > .neuwo-form-check__input");
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("NeuwoChoiceElement", () => {
  it("is a light DOM element with no form association, internals or parts", () => {
    // happy-dom has no attachInternals, so a stand-in records any call.
    const internals = vi.fn();
    HTMLElement.prototype.attachInternals = internals;
    cleanup.push(() => delete HTMLElement.prototype.attachInternals);
    const el = make(`<neuwo-checkbox>Agree</neuwo-checkbox>`);
    expect(Object.getPrototypeOf(Object.getPrototypeOf(NeuwoChoiceElement))).toBe(NeuwoElement);
    expect(Object.getPrototypeOf(NeuwoChoiceElement)).toBe(NeuwoControlElement);
    expect(Object.getPrototypeOf(NeuwoCheckbox)).toBe(NeuwoChoiceElement);
    expect(el.shadowRoot).toBeNull();
    expect(internals).not.toHaveBeenCalled();
    expect(NeuwoChoiceElement.formAssociated).toBeUndefined();
    expect(el.querySelector("[part]")).toBeNull();
  });

  it("has no control before it renders", () => {
    expect(document.createElement("neuwo-checkbox").control).toBeNull();
  });

  it("finds its own control, not one in its label content", () => {
    const el = make(`<neuwo-checkbox>Outer <neuwo-checkbox checked>Inner</neuwo-checkbox></neuwo-checkbox>`);
    const inner = el.querySelector(".neuwo-form-check__label neuwo-checkbox");
    expect(el.control).toBe(inputOf(el));
    expect(inner.control).toBe(inputOf(inner));
    expect(el.checked).toBe(false);
    expect(inner.checked).toBe(true);
  });

  it("starts the control from the checked attribute and keeps the checked property live on it", () => {
    const el = make(`<neuwo-checkbox checked></neuwo-checkbox>`);
    const control = inputOf(el);
    expect(control.checked).toBe(true);
    expect(el.checked).toBe(true);
    el.checked = false;
    expect(control.checked).toBe(false);
    expect(el.checked).toBe(false);
    expect(el.hasAttribute("checked")).toBe(true);
    expect(control.hasAttribute("checked")).toBe(true);
    control.click();
    expect(el.checked).toBe(true);
  });

  it("moves only a control the user or a script has not changed when the checked attribute changes", () => {
    const el = make(`<neuwo-checkbox></neuwo-checkbox>`);
    el.setAttribute("checked", "");
    expect(inputOf(el).checked).toBe(true);
    el.removeAttribute("checked");
    expect(inputOf(el).checked).toBe(false);
    inputOf(el).click();
    el.setAttribute("checked", "");
    el.removeAttribute("checked");
    expect(inputOf(el).hasAttribute("checked")).toBe(false);
    expect(el.checked).toBe(true);
  });

  it("reflects defaultChecked to the checked attribute", () => {
    const el = make(`<neuwo-checkbox></neuwo-checkbox>`);
    expect(el.defaultChecked).toBe(false);
    el.defaultChecked = true;
    expect(el.hasAttribute("checked")).toBe(true);
    expect(inputOf(el).defaultChecked).toBe(true);
    expect(el.checked).toBe(true);
    el.defaultChecked = false;
    expect(el.hasAttribute("checked")).toBe(false);
    expect(el.defaultChecked).toBe(false);
  });

  it("keeps checked set before the first render and applies it as a property on connect", () => {
    const el = document.createElement("neuwo-checkbox");
    el.checked = true;
    expect(el.checked).toBe(true);
    attach(el);
    expect(inputOf(el).checked).toBe(true);
    expect(inputOf(el).hasAttribute("checked")).toBe(false);
    expect(el.hasAttribute("checked")).toBe(false);
    const late = document.createElement("neuwo-checkbox");
    late.setAttribute("checked", "");
    expect(late.checked).toBe(true);
  });

  it("writes nothing for checked set while React controls it", () => {
    const el = make(`<neuwo-checkbox checked></neuwo-checkbox>`);
    el[CONTROLLED] = true;
    el.checked = false;
    expect(inputOf(el).checked).toBe(true);
    el[CONTROLLED] = false;
    el.checked = false;
    expect(inputOf(el).checked).toBe(false);
  });

  it("submits on by default, or the value attribute, which it carries onto the control", () => {
    const el = make(`<neuwo-checkbox></neuwo-checkbox>`);
    expect(el.value).toBe("on");
    expect(inputOf(el).hasAttribute("value")).toBe(false);
    el.value = "yes";
    expect(el.getAttribute("value")).toBe("yes");
    expect(inputOf(el).value).toBe("yes");
    expect(el.value).toBe("yes");
  });

  it("reflects name, disabled and noErrorLine to their attributes and the markup", () => {
    const el = make(`<neuwo-checkbox></neuwo-checkbox>`);
    expect(el.name).toBe("");
    el.name = "terms";
    expect(inputOf(el).name).toBe("terms");
    el.name = null;
    expect(el.hasAttribute("name")).toBe(false);
    expect(inputOf(el).hasAttribute("name")).toBe(false);
    expect(el.disabled).toBe(false);
    el.disabled = true;
    expect(inputOf(el).disabled).toBe(true);
    el.disabled = false;
    expect(inputOf(el).disabled).toBe(false);
    expect(el.noErrorLine).toBe(false);
    el.noErrorLine = true;
    expect(el.hasAttribute("no-error-line")).toBe(true);
    expect(el.querySelector(".neuwo-choice__error")).toBeNull();
  });

  it("reflects form to the attribute the control submits by", () => {
    const holder = make(`<div><form id="signup"></form><neuwo-checkbox name="terms" checked></neuwo-checkbox></div>`);
    const el = holder.querySelector("neuwo-checkbox");
    expect(el.form).toBeNull();
    el.form = "signup";
    expect(el.getAttribute("form")).toBe("signup");
    expect(inputOf(el).getAttribute("form")).toBe("signup");
    expect(el.form).toBe(holder.querySelector("form"));
    expect([...new FormData(holder.querySelector("form"))]).toEqual([["terms", "on"]]);
    el.form = null;
    expect(el.hasAttribute("form")).toBe(false);
    expect(el.form).toBeNull();
  });

  it("delegates validity and its messages to the control", () => {
    const form = make(`<form><neuwo-checkbox required></neuwo-checkbox></form>`);
    const el = form.querySelector("neuwo-checkbox");
    expect(el.form).toBe(form);
    expect(el.validity).toBe(inputOf(el).validity);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.checkValidity()).toBe(false);
    expect(el.reportValidity()).toBe(false);
    inputOf(el).click();
    expect(el.checkValidity()).toBe(true);
    el.setCustomValidity("Not yet");
    expect(inputOf(el).validity.customError).toBe(true);
    expect(el.validationMessage).toBe("Not yet");
    expect(el.checkValidity()).toBe(false);
  });

  it("answers as valid with no form before it renders", () => {
    const el = document.createElement("neuwo-checkbox");
    expect(el.form).toBeNull();
    expect(el.validity).toBeUndefined();
    expect(el.checkValidity()).toBe(true);
    expect(el.reportValidity()).toBe(true);
    expect(el.validationMessage).toBe("");
  });

  it("focuses and blurs the control, passing the options on", () => {
    const el = make(`<neuwo-checkbox></neuwo-checkbox>`);
    const focus = vi.spyOn(inputOf(el), "focus");
    el.focus({ preventScroll: true });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(inputOf(el));
    el.blur();
    expect(document.activeElement).not.toBe(inputOf(el));
  });

  it("returns to the checked attribute when its form resets, and leaves error alone", () => {
    const form = make(`<form><neuwo-checkbox name="a" checked error="Required"></neuwo-checkbox><neuwo-checkbox name="b"></neuwo-checkbox></form>`);
    const [on, off] = form.querySelectorAll("neuwo-checkbox");
    inputOf(on).click();
    inputOf(off).click();
    expect([on.checked, off.checked]).toEqual([false, true]);
    form.reset();
    expect([on.checked, off.checked]).toEqual([true, false]);
    expect(on.getAttribute("error")).toBe("Required");
    expect(on.querySelector(".neuwo-choice__error").textContent).toBe("Required");
  });

  it("runs formReset in the task after its form resets, and stops when it leaves", async () => {
    const form = make(`<form><reset-choice name="a" checked></reset-choice></form>`);
    const el = form.querySelector("reset-choice");
    inputOf(el).click();
    form.reset();
    expect(el.resets).toEqual([]);
    await tick();
    expect(el.resets).toEqual([true]);
    el.remove();
    form.reset();
    await tick();
    expect(el.resets).toEqual([true]);
    const other = attach(document.createElement("form"));
    other.append(el);
    other.reset();
    await tick();
    expect(el.resets).toEqual([true, true]);
  });

  it("lets the control's native input and change reach a host listener exactly once, with the control as target", () => {
    const el = make(`<neuwo-checkbox></neuwo-checkbox>`);
    const heard = { input: [], change: [] };
    for (const name of ["input", "change"]) el.addEventListener(name, (event) => heard[name].push([event.target, event.currentTarget]));
    inputOf(el).click();
    expect(heard.input).toEqual([[inputOf(el), el]]);
    expect(heard.change).toEqual([[inputOf(el), el]]);
    el.checked = false;
    expect(heard.change).toHaveLength(1);
  });

  it("copies aria-* and title onto the control as they change, and leaves data-* on the element", () => {
    const el = make(`<neuwo-checkbox aria-label="Agree" title="Tip" data-testid="terms"></neuwo-checkbox>`);
    expect(inputOf(el).getAttribute("aria-label")).toBe("Agree");
    expect(inputOf(el).getAttribute("title")).toBe("Tip");
    expect(inputOf(el).hasAttribute("data-testid")).toBe(false);
    expect(document.querySelectorAll('[data-testid="terms"]')).toHaveLength(1);
    el.setAttribute("aria-label", "Consent");
    el.removeAttribute("title");
    el.refresh();
    expect(inputOf(el).getAttribute("aria-label")).toBe("Consent");
    expect(inputOf(el).hasAttribute("title")).toBe(false);
  });
});
