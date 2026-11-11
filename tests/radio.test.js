import { afterEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import { act, useState } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import "../src/index.js";
import { NeuwoRadio } from "../src/components/selection/radio/neuwo-radio.js";
import { NeuwoRadioGroup } from "../src/components/selection/radio/neuwo-radio-group.js";
import { NeuwoCheckableElement } from "../src/components/selection/checkable-element.js";
import { NeuwoControlElement } from "../src/components/control-element.js";
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

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const RADIOS = `<neuwo-radio value="free">Free</neuwo-radio><neuwo-radio value="pro">Pro</neuwo-radio><neuwo-radio value="team" disabled>Team</neuwo-radio>`;

const groupOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-radio-group");
const legendOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-radio-group > .neuwo-radio-group__legend");
const optionsOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-radio-group > .neuwo-radio-group__options");
const errorOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-choice__error");
const inputOf = (radio) => radio.querySelector(":scope > .neuwo-form-check > .neuwo-form-check__input");
const labelOf = (radio) => radio.querySelector(":scope > .neuwo-form-check > .neuwo-form-check__label");
const radiosOf = (el) => Array.from(el.querySelectorAll("neuwo-radio"));
const inputsOf = (el) => radiosOf(el).map(inputOf);
const checkedOf = (el) => inputsOf(el).map((input) => input.checked);

describe("<neuwo-radio-group> and <neuwo-radio>", () => {
  it("register light DOM elements, the radio on the checkable base and the group on the control base, with no form association", () => {
    expect(customElements.get("neuwo-radio")).toBe(NeuwoRadio);
    expect(customElements.get("neuwo-radio-group")).toBe(NeuwoRadioGroup);
    expect(Object.getPrototypeOf(NeuwoRadio)).toBe(NeuwoCheckableElement);
    expect(Object.getPrototypeOf(NeuwoRadioGroup)).toBe(NeuwoControlElement);
    expect(NeuwoRadioGroup.formAssociated).toBeUndefined();
    const el = make(`<neuwo-radio-group name="plan" label="Plan">${RADIOS}</neuwo-radio-group>`);
    expect(el.shadowRoot).toBeNull();
    expect(Array.from(el.querySelector(":scope > .neuwo-choice").children, (node) => node.className)).toEqual(["neuwo-radio-group", "neuwo-choice__error"]);
    for (const radio of radiosOf(el)) {
      expect(radio.shadowRoot).toBeNull();
      expect(radio.parentElement).toBe(optionsOf(el));
      expect(radio.control).toBe(inputOf(radio));
      expect(inputOf(radio).type).toBe("radio");
    }
    expect(el.querySelector("[part]")).toBeNull();
  });

  it("gives every radio the group's name, so the browser groups them, inside a radiogroup labelled by its legend", () => {
    const el = make(`<neuwo-radio-group name="plan" label="Plan">${RADIOS}</neuwo-radio-group>`);
    expect(inputsOf(el).map((input) => input.name)).toEqual(["plan", "plan", "plan"]);
    expect(groupOf(el).getAttribute("role")).toBe("radiogroup");
    expect(document.getElementById(groupOf(el).getAttribute("aria-labelledby"))).toBe(legendOf(el));
    expect(legendOf(el).textContent).toBe("Plan");
    expect(legendOf(el).hidden).toBe(false);
  });

  it("starts the radio the group's value names checked, else the radio carrying checked", () => {
    const named = make(`<neuwo-radio-group name="a" value="pro">${RADIOS}</neuwo-radio-group>`);
    expect(checkedOf(named)).toEqual([false, true, false]);
    expect(named.value).toBe("pro");
    const seeded = make(`<neuwo-radio-group name="b"><neuwo-radio value="x">X</neuwo-radio><neuwo-radio value="y" checked>Y</neuwo-radio></neuwo-radio-group>`);
    expect(seeded.value).toBe("y");
    expect(seeded.hasAttribute("value")).toBe(false);
    const overruled = make(`<neuwo-radio-group name="c" value="x"><neuwo-radio value="x">X</neuwo-radio><neuwo-radio value="y" checked>Y</neuwo-radio></neuwo-radio-group>`);
    expect(checkedOf(overruled)).toEqual([true, false]);
  });

  it("checks one radio at a time, and the picked radio's own change reaches the group once, with that radio as target", () => {
    const el = make(`<neuwo-radio-group name="plan" value="pro">${RADIOS}</neuwo-radio-group>`);
    const changes = [];
    const inputs = [];
    el.addEventListener("change", (event) => void changes.push(event.target));
    el.addEventListener("input", (event) => void inputs.push(event.target));
    const [free, pro, team] = radiosOf(el);
    inputOf(free).click();
    expect(checkedOf(el)).toEqual([true, false, false]);
    expect(changes).toEqual([inputOf(free)]);
    expect(inputs).toEqual([inputOf(free)]);
    labelOf(pro).click();
    expect(checkedOf(el)).toEqual([false, true, false]);
    inputOf(team).click();
    expect(checkedOf(el)).toEqual([false, true, false]);
    expect(changes).toEqual([inputOf(free), inputOf(pro)]);
  });

  it("reads the checked radio as value and checks the matching one when value is set, firing nothing and writing no attribute", () => {
    const el = make(`<neuwo-radio-group name="plan" value="pro">${RADIOS}</neuwo-radio-group>`);
    const changes = vi.fn();
    el.addEventListener("change", changes);
    el.addEventListener("input", changes);
    const stop = watch(el);
    el.value = "free";
    expect(checkedOf(el)).toEqual([true, false, false]);
    expect(el.value).toBe("free");
    el.value = "nothing";
    expect(checkedOf(el)).toEqual([false, false, false]);
    expect(el.value).toBe("");
    el.value = "pro";
    expect(el.value).toBe("pro");
    expect(stop()).toEqual([]);
    expect(changes).not.toHaveBeenCalled();
    expect(el.getAttribute("value")).toBe("pro");
  });

  it("follows a radio whose checked property is set, as a native group does", () => {
    const el = make(`<neuwo-radio-group name="plan" value="pro">${RADIOS}</neuwo-radio-group>`);
    radiosOf(el)[0].checked = true;
    expect(el.value).toBe("free");
    expect(radiosOf(el)[1].checked).toBe(false);
  });

  it("keeps a value set before its radios render and checks that radio once they have", async () => {
    const el = document.createElement("neuwo-radio-group");
    el.setAttribute("name", "plan");
    el.value = "pro";
    expect(el.value).toBe("pro");
    el.innerHTML = RADIOS;
    attach(el);
    await Promise.resolve();
    expect(checkedOf(el)).toEqual([false, true, false]);
    expect(el.value).toBe("pro");
    expect(el.hasAttribute("value")).toBe(false);
  });

  it("reads the starting value as defaultValue, its radios' or the attribute, and sets the attribute", () => {
    const el = make(`<neuwo-radio-group name="plan" value="pro">${RADIOS}</neuwo-radio-group>`);
    expect(el.defaultValue).toBe("pro");
    el.value = "free";
    expect(el.defaultValue).toBe("pro");
    el.defaultValue = "team";
    expect(el.getAttribute("value")).toBe("team");
    expect(el.defaultValue).toBe("team");
    expect(el.value).toBe("free");
    const seeded = make(`<neuwo-radio-group name="b"><neuwo-radio value="x">X</neuwo-radio><neuwo-radio value="y" checked>Y</neuwo-radio></neuwo-radio-group>`);
    expect(seeded.defaultValue).toBe("y");
    expect(document.createElement("neuwo-radio-group").defaultValue).toBe("");
  });

  it("focuses the checked radio, else the first enabled one", () => {
    const el = make(`<neuwo-radio-group name="plan" value="pro">${RADIOS}</neuwo-radio-group>`);
    el.focus();
    expect(document.activeElement).toBe(inputOf(radiosOf(el)[1]));
    const blocked = make(
      `<neuwo-radio-group name="tier" value="a"><neuwo-radio value="a" disabled>A</neuwo-radio><neuwo-radio value="b" disabled>B</neuwo-radio><neuwo-radio value="c">C</neuwo-radio></neuwo-radio-group>`,
    );
    blocked.focus();
    expect(document.activeElement).toBe(inputOf(radiosOf(blocked)[2]));
    const empty = make(`<neuwo-radio-group name="size">${RADIOS}</neuwo-radio-group>`);
    empty.focus();
    expect(document.activeElement).toBe(inputOf(radiosOf(empty)[0]));
  });

  it("submits the checked radio of each group through the form before the script loads, leaving out unpicked and disabled ones", () => {
    const page = new Window();
    cleanup.push(() => page.happyDOM.close());
    page.document.body.innerHTML = expand(
      `<form>` +
        `<neuwo-radio-group name="plan" value="pro" label="Plan">${RADIOS}</neuwo-radio-group>` +
        `<neuwo-radio-group name="size"><neuwo-radio value="s">S</neuwo-radio><neuwo-radio value="m" checked>M</neuwo-radio></neuwo-radio-group>` +
        `<neuwo-radio-group name="unpicked">${RADIOS}</neuwo-radio-group>` +
        `<neuwo-radio-group name="off" value="a" disabled><neuwo-radio value="a">A</neuwo-radio></neuwo-radio-group>` +
        `<neuwo-radio name="agree" value="yes" checked>Agree</neuwo-radio>` +
        `</form>`,
    );
    expect(page.customElements.get("neuwo-radio")).toBeUndefined();
    expect(page.customElements.get("neuwo-radio-group")).toBeUndefined();
    const form = page.document.querySelector("form");
    expect(form.querySelectorAll("input[type=radio]")).toHaveLength(10);
    expect([...new page.FormData(form)]).toEqual([
      ["plan", "pro"],
      ["size", "m"],
      ["agree", "yes"],
    ]);
  });

  it("keeps two groups of the same name in two forms apart, and a lone radio submits on its own", () => {
    const holder = make(
      `<div><form id="first"><neuwo-radio-group name="plan" value="free">${RADIOS}</neuwo-radio-group></form>` +
        `<form id="second"><neuwo-radio-group name="plan" value="pro">${RADIOS}</neuwo-radio-group></form>` +
        `<form id="third"><neuwo-radio name="solo" value="x">Solo</neuwo-radio></form></div>`,
    );
    const [first, second] = Array.from(holder.querySelectorAll("neuwo-radio-group"));
    inputOf(radiosOf(first)[1]).click();
    expect([first.value, second.value]).toEqual(["pro", "pro"]);
    inputOf(radiosOf(second)[0]).click();
    expect([first.value, second.value]).toEqual(["pro", "free"]);
    const solo = holder.querySelector("#third neuwo-radio");
    expect(inputOf(solo).name).toBe("solo");
    inputOf(solo).click();
    expect(solo.checked).toBe(true);
    expect([first.value, second.value]).toEqual(["pro", "free"]);
    expect([...new FormData(holder.querySelector("#first"))]).toEqual([["plan", "pro"]]);
    expect([...new FormData(holder.querySelector("#second"))]).toEqual([["plan", "free"]]);
    expect([...new FormData(holder.querySelector("#third"))]).toEqual([["solo", "x"]]);
  });

  for (const [source, served] of [
    ["rendered by the elements", false],
    ["served", true],
  ]) {
    it(`keeps the original's pick when a renamed copy of a group ${source} is appended to the same form, as an "add another" row does`, () => {
      const row = `<div class="row"><neuwo-radio-group name="tier-0" label="Tier" value="pro">${RADIOS}</neuwo-radio-group></div>`;
      const form = make(`<form>${served ? expand(row) : row}</form>`);
      const copy = form.querySelector(".row").cloneNode(true);
      const group = copy.querySelector("neuwo-radio-group");
      group.setAttribute("name", "tier-1");
      expect(inputsOf(group).map((input) => input.name)).toEqual(["tier-1", "tier-1", "tier-1"]);
      form.append(copy);
      const [original] = form.querySelectorAll("neuwo-radio-group");
      expect([original.value, group.value]).toEqual(["pro", "pro"]);
      expect([...new FormData(form)]).toEqual([
        ["tier-0", "pro"],
        ["tier-1", "pro"],
      ]);
      const ids = Array.from(form.querySelectorAll("[id]"), (el) => el.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(document.getElementById(groupOf(group).getAttribute("aria-labelledby"))).toBe(legendOf(group));
    });
  }

  // happy-dom does not uncheck a group's radio when a checked one is inserted, so the name is read before insertion.
  it("keeps the original lone radio checked when a renamed copy is appended to the same form", () => {
    const form = make(`<form><neuwo-radio name="agree-0" value="yes" checked>Agree</neuwo-radio></form>`);
    const copy = form.firstElementChild.cloneNode(true);
    copy.setAttribute("name", "agree-1");
    expect(inputOf(copy).name).toBe("agree-1");
    form.append(copy);
    expect([...new FormData(form)]).toEqual([
      ["agree-0", "yes"],
      ["agree-1", "yes"],
    ]);
  });

  it("updates every radio when the group's value, name or disabled changes", () => {
    const el = make(`<neuwo-radio-group name="plan" value="pro">${RADIOS}</neuwo-radio-group>`);
    el.setAttribute("value", "free");
    expect(checkedOf(el)).toEqual([true, false, false]);
    el.setAttribute("name", "tier");
    expect(inputsOf(el).map((input) => input.name)).toEqual(["tier", "tier", "tier"]);
    el.setAttribute("disabled", "");
    expect(inputsOf(el).map((input) => input.disabled)).toEqual([true, true, true]);
    el.removeAttribute("disabled");
    expect(inputsOf(el).map((input) => input.disabled)).toEqual([false, false, true]);
    el.setAttribute("required", "");
    expect(inputsOf(el).every((input) => input.required)).toBe(true);
  });

  it("keeps the user's pick through an error change, which writes nothing inside the radios", () => {
    const el = make(`<neuwo-radio-group name="plan" value="pro" label="Plan">${RADIOS}</neuwo-radio-group>`);
    inputOf(radiosOf(el)[0]).click();
    const stops = radiosOf(el).map(watch);
    el.setAttribute("error", "Pick again");
    expect(stops.flatMap((stop) => stop())).toEqual([]);
    expect(el.value).toBe("free");
    expect(groupOf(el).classList.contains("neuwo-radio-group--error")).toBe(true);
    expect(groupOf(el).getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(groupOf(el).getAttribute("aria-describedby"))).toBe(errorOf(el));
    expect(errorOf(el).textContent).toBe("Pick again");
    el.setAttribute("error-muted", "");
    expect(groupOf(el).classList.contains("neuwo-radio-group--error")).toBe(false);
    el.removeAttribute("error");
    expect(groupOf(el).hasAttribute("aria-invalid")).toBe(false);
    expect(el.value).toBe("free");
  });

  it("reflects noErrorLine on the group, which renders the error line, and gives the radio none", () => {
    const el = make(`<neuwo-radio-group name="plan" no-error-line>${RADIOS}</neuwo-radio-group>`);
    expect(el.noErrorLine).toBe(true);
    expect(errorOf(el)).toBeNull();
    el.noErrorLine = false;
    expect(el.hasAttribute("no-error-line")).toBe(false);
    expect(errorOf(el)).not.toBeNull();
    expect("noErrorLine" in radiosOf(el)[0]).toBe(false);
  });

  it("lays the radios out in a row for orientation horizontal", () => {
    const el = make(`<neuwo-radio-group name="size" orientation="horizontal">${RADIOS}</neuwo-radio-group>`);
    expect(groupOf(el).classList.contains("neuwo-radio-group--horizontal")).toBe(true);
    el.setAttribute("orientation", "vertical");
    expect(groupOf(el).classList.contains("neuwo-radio-group--horizontal")).toBe(false);
  });

  it("warns once, naming the problem and the fix, when a group with radios has no name, and stays silent with one", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const nameless = make(`<neuwo-radio-group label="Plan">${RADIOS}</neuwo-radio-group>`);
    expect(warn).toHaveBeenCalledTimes(1);
    const [message, element] = warn.mock.calls[0];
    expect(message).toContain("<neuwo-radio-group>");
    expect(message).toMatch(/no name/);
    expect(message).toMatch(/Give the group a name/);
    expect(element).toBe(nameless);
    document.body.append(nameless);
    cleanup.push(() => nameless.remove());
    nameless.setAttribute("label", "Tier");
    expect(warn).toHaveBeenCalledTimes(1);
    make(`<neuwo-radio-group name="plan">${RADIOS}</neuwo-radio-group>`);
    make(`<neuwo-radio-group></neuwo-radio-group>`);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does not warn when every radio has its own name", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    make(`<neuwo-radio-group label="Plan"><neuwo-radio name="pick" value="a">A</neuwo-radio><div><neuwo-radio name="pick" value="b">B</neuwo-radio></div></neuwo-radio-group>`);
    expect(warn).not.toHaveBeenCalled();
    make(`<neuwo-radio-group label="Plan"><neuwo-radio name="pick" value="a">A</neuwo-radio><neuwo-radio name="" value="b">B</neuwo-radio></neuwo-radio-group>`);
    expect(warn).toHaveBeenCalledTimes(1);
    make(
      `<neuwo-radio-group label="Plan"><neuwo-radio name="pick" value="a">A</neuwo-radio>` +
        `<neuwo-radio-group name="inner"><neuwo-radio value="b">B</neuwo-radio></neuwo-radio-group></neuwo-radio-group>`,
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("groups radios that carry a name of their own in a group that has none", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const form = make(`<form><neuwo-radio-group value="b"><neuwo-radio name="pick" value="a">A</neuwo-radio><neuwo-radio name="pick" value="b">B</neuwo-radio></neuwo-radio-group></form>`);
    const el = form.querySelector("neuwo-radio-group");
    expect(inputsOf(el).map((input) => input.name)).toEqual(["pick", "pick"]);
    inputOf(radiosOf(el)[0]).click();
    expect(checkedOf(el)).toEqual([true, false]);
    expect([...new FormData(form)]).toEqual([["pick", "a"]]);
  });

  it("answers validity from the first enabled radio, since a disabled one is barred from validation", () => {
    const el = make(
      `<neuwo-radio-group name="tier" required><neuwo-radio value="a" disabled>A</neuwo-radio><neuwo-radio value="b">B</neuwo-radio><neuwo-radio value="c">C</neuwo-radio></neuwo-radio-group>`,
    );
    expect(el.control).toBe(inputOf(radiosOf(el)[1]));
    expect(el.checkValidity()).toBe(false);
    expect(el.reportValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    inputOf(radiosOf(el)[2]).click();
    expect(el.checkValidity()).toBe(true);
    const off = make(`<neuwo-radio-group name="off" disabled><neuwo-radio value="a">A</neuwo-radio></neuwo-radio-group>`);
    expect(off.control).toBe(inputOf(radiosOf(off)[0]));
  });

  it("sets a custom error on every radio, so clearing it while the first radio is disabled leaves the form valid", () => {
    const form = make(`<form><neuwo-radio-group name="tier"><neuwo-radio value="a">A</neuwo-radio><neuwo-radio value="b">B</neuwo-radio></neuwo-radio-group></form>`);
    const el = form.querySelector("neuwo-radio-group");
    const [first] = radiosOf(el);
    el.setCustomValidity("Pick again");
    expect(inputsOf(el).map((input) => input.validationMessage)).toEqual(["Pick again", "Pick again"]);
    expect(form.checkValidity()).toBe(false);
    first.disabled = true;
    el.setCustomValidity("");
    first.disabled = false;
    expect(inputsOf(el).map((input) => input.validationMessage)).toEqual(["", ""]);
    expect(el.checkValidity()).toBe(true);
    expect(form.checkValidity()).toBe(true);
  });

  it("validates required natively, through the group's validity API", () => {
    const el = make(`<neuwo-radio-group name="tier" required>${RADIOS}</neuwo-radio-group>`);
    expect(inputsOf(el).every((input) => input.required)).toBe(true);
    expect(groupOf(el).getAttribute("aria-required")).toBe("true");
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    inputOf(radiosOf(el)[0]).click();
    expect(el.checkValidity()).toBe(true);
    el.setCustomValidity("Not this one");
    expect(el.validationMessage).toBe("Not this one");
    expect(el.checkValidity()).toBe(false);
  });

  it("returns to the starting radio on a form reset and keeps error", async () => {
    const form = make(`<form><neuwo-radio-group name="plan" value="pro" error="Pick one">${RADIOS}</neuwo-radio-group></form>`);
    const el = form.querySelector("neuwo-radio-group");
    expect(el.form).toBe(form);
    inputOf(radiosOf(el)[0]).click();
    form.reset();
    await tick();
    expect(checkedOf(el)).toEqual([false, true, false]);
    expect(el.value).toBe("pro");
    expect(el.getAttribute("error")).toBe("Pick one");
  });

  it("adopts server markup without a mutation and keeps the server's ids through later changes", () => {
    const holder = document.createElement("div");
    holder.innerHTML = expand(`<neuwo-radio-group name="plan" value="pro" label="Plan">${RADIOS}</neuwo-radio-group><neuwo-radio name="solo" value="x">Solo</neuwo-radio>`);
    const el = holder.firstElementChild;
    const inputs = inputsOf(el);
    const legend = legendOf(el);
    expect(legend.id).toBe("neuwo-s1-legend");
    const stop = watch(holder);
    attach(holder);
    expect(stop()).toEqual([]);
    expect(el.value).toBe("pro");
    el.setAttribute("error", "Pick one");
    expect(inputsOf(el)).toEqual(inputs);
    expect(legendOf(el)).toBe(legend);
    expect(groupOf(el).getAttribute("aria-labelledby")).toBe("neuwo-s1-legend");
    expect(labelOf(radiosOf(el)[0]).textContent).toBe("Free");
  });

  it("reaches radios inside other markup, and leaves a nested group's radios to that group", () => {
    const el = make(
      `<neuwo-radio-group name="outer" value="b"><div class="pair"><neuwo-radio value="a">A</neuwo-radio></div><neuwo-radio value="b">B</neuwo-radio>` +
        `<neuwo-radio-group name="inner" value="a"><neuwo-radio value="a">Inner A</neuwo-radio></neuwo-radio-group></neuwo-radio-group>`,
    );
    const [a, b, inner] = radiosOf(el);
    expect([inputOf(a).name, inputOf(b).name, inputOf(inner).name]).toEqual(["outer", "outer", "inner"]);
    expect(el.value).toBe("b");
    el.value = "a";
    expect([a.checked, b.checked, inner.checked]).toEqual([true, false, true]);
    el.querySelector("neuwo-radio-group neuwo-radio-group").value = "";
    expect([a.checked, inner.checked]).toEqual([true, false]);
  });

  it("forwards a radio's aria-* and title to its input, live, and keeps data-* on the element", async () => {
    const el = make(`<neuwo-radio-group name="plan">` + `<neuwo-radio value="a" aria-label="Plan A" title="Tip" data-testid="a">A</neuwo-radio></neuwo-radio-group>`);
    const radio = radiosOf(el)[0];
    expect(inputOf(radio).getAttribute("aria-label")).toBe("Plan A");
    expect(inputOf(radio).getAttribute("title")).toBe("Tip");
    expect(inputOf(radio).hasAttribute("data-testid")).toBe(false);
    expect(el.querySelectorAll('[data-testid="a"]')).toHaveLength(1);
    radio.setAttribute("aria-label", "Plan B");
    await Promise.resolve();
    expect(inputOf(radio).getAttribute("aria-label")).toBe("Plan B");
  });

  it("names the radio's native type, read-only, and gives the group none", () => {
    const radio = document.createElement("neuwo-radio");
    expect(radio.type).toBe("radio");
    expect(() => {
      radio.type = "checkbox";
    }).toThrow(TypeError);
    expect("type" in document.createElement("neuwo-radio-group")).toBe(false);
  });

  it("is a radio of its own outside a group, with its own name and live checked state", () => {
    const radio = make(`<neuwo-radio name="agree" value="yes" required>Agree</neuwo-radio>`);
    const control = inputOf(radio);
    expect(control.name).toBe("agree");
    expect(control.value).toBe("yes");
    expect(control.required).toBe(true);
    expect(radio.checkValidity()).toBe(false);
    labelOf(radio).click();
    expect(radio.checked).toBe(true);
    expect(radio.hasAttribute("checked")).toBe(false);
    expect(radio.defaultChecked).toBe(false);
    radio.focus();
    expect(document.activeElement).toBe(control);
  });
});

describe("<neuwo-radio-group> under React", () => {
  /** @param {unknown} element */
  async function render(element) {
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => act(() => root.unmount()));
    await act(async () => root.render(element));
    return { container, rerender: (/** @type {unknown} */ next) => act(async () => root.render(next)) };
  }

  const radios = (create = { jsx }) => [
    create.jsx("neuwo-radio", { value: "free", children: "Free" }, "free"),
    create.jsx("neuwo-radio", { value: "pro", children: "Pro" }, "pro"),
    create.jsx("neuwo-radio", { value: "team", disabled: true, children: "Team" }, "team"),
  ];

  it("calls the group's onChange once per pick with the radio as target, and keeps a value the consumer rejects", async () => {
    const errors = vi.spyOn(console, "error");
    const seen = [];
    const onChange = vi.fn((event) => void seen.push({ target: event.target, value: event.target.value, name: event.target.name, current: event.currentTarget }));
    const { container } = await render(jsxs("neuwo-radio-group", { name: "plan", value: "pro", onChange, children: radios() }));
    const group = container.querySelector("neuwo-radio-group");
    expect(group[CONTROLLED]).toBe(true);
    for (const radio of radiosOf(group)) expect(radio[CONTROLLED]).toBe(true);
    expect(checkedOf(group)).toEqual([false, true, false]);
    await act(async () => inputOf(radiosOf(group)[0]).click());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([{ target: inputOf(radiosOf(group)[0]), value: "free", name: "plan", current: group }]);
    expect(checkedOf(group)).toEqual([false, true, false]);
    expect(group.value).toBe("pro");
    group.value = "free";
    radiosOf(group)[0].checked = true;
    expect(group.value).toBe("pro");
    expect(errors).not.toHaveBeenCalled();
  });

  it("shows whatever the consumer's state says", async () => {
    const errors = vi.spyOn(console, "error");
    function Form() {
      const [plan, setPlan] = useState("pro");
      return jsxs("neuwo-radio-group", { name: "plan", value: plan, onChange: (event) => setPlan(event.target.value), children: radios() });
    }
    const { container } = await render(jsx(Form, {}));
    const group = container.querySelector("neuwo-radio-group");
    await act(async () => inputOf(radiosOf(group)[0]).click());
    expect(checkedOf(group)).toEqual([true, false, false]);
    expect(group.value).toBe("free");
    await act(async () => inputOf(radiosOf(group)[1]).click());
    expect(checkedOf(group)).toEqual([false, true, false]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("controls radios inside other elements in the group", async () => {
    const errors = vi.spyOn(console, "error");
    const children = [
      jsx("div", { className: "pair", children: jsx("neuwo-radio", { value: "a", children: "A" }) }, "a"),
      jsx("neuwo-radio", { value: "b", children: "B" }, "b"),
    ];
    const { container } = await render(jsxs("neuwo-radio-group", { name: "pair", value: "b", onChange() {}, children }));
    const group = container.querySelector("neuwo-radio-group");
    const [a] = radiosOf(group);
    expect(a[CONTROLLED]).toBe(true);
    await act(async () => inputOf(a).click());
    expect(checkedOf(group)).toEqual([false, true]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("starts from defaultValue and keeps the user's pick across a parent re-render", async () => {
    const errors = vi.spyOn(console, "error");
    const { container, rerender } = await render(jsxs("neuwo-radio-group", { name: "plan", defaultValue: "pro", children: radios() }));
    const group = container.querySelector("neuwo-radio-group");
    expect(group[CONTROLLED]).toBe(false);
    for (const radio of radiosOf(group)) expect(radio[CONTROLLED]).toBe(false);
    expect(group.hasAttribute("value")).toBe(false);
    expect(group.defaultValue).toBe("pro");
    expect(checkedOf(group)).toEqual([false, true, false]);
    await act(async () => inputOf(radiosOf(group)[0]).click());
    await rerender(jsxs("neuwo-radio-group", { name: "tier", defaultValue: "pro", children: radios() }));
    expect(inputsOf(group).map((input) => input.name)).toEqual(["tier", "tier", "tier"]);
    expect(group.value).toBe("free");
    expect(errors).not.toHaveBeenCalled();
  });

  it("takes register-style name, onChange and ref on the group, whose value reads and writes the picked radio", async () => {
    const errors = vi.spyOn(console, "error");
    const seen = [];
    const ref = vi.fn();
    const onChange = (event) => void seen.push([event.target.name, event.target.value, event.target.type]);
    const { container } = await render(jsx("form", { children: jsxs("neuwo-radio-group", { name: "plan", onChange, ref, children: radios() }) }));
    const group = container.querySelector("neuwo-radio-group");
    expect(ref).toHaveBeenCalledWith(group);
    expect(group.value).toBe("");
    await act(async () => inputOf(radiosOf(group)[1]).click());
    expect(seen).toEqual([["plan", "pro", "radio"]]);
    expect(group.value).toBe("pro");
    group.value = "free";
    expect(checkedOf(group)).toEqual([true, false, false]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps the user's pick when a Server Component sends a new value, which is only the starting one there", async () => {
    const errors = vi.spyOn(console, "error");
    const server = createRuntime(templates, { markHost: false, server: true });
    const { container, rerender } = await render(server.jsxs("neuwo-radio-group", { name: "plan", value: "pro", children: radios(server) }));
    const group = container.querySelector("neuwo-radio-group");
    expect(group.hasAttribute("value")).toBe(false);
    expect(checkedOf(group)).toEqual([false, true, false]);
    await act(async () => inputOf(radiosOf(group)[0]).click());
    await rerender(server.jsxs("neuwo-radio-group", { name: "tier", value: "pro", children: radios(server) }));
    expect(group.value).toBe("free");
    expect(inputsOf(group).map((input) => input.name)).toEqual(["tier", "tier", "tier"]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("hydrates server markup with no warning and keeps the server's ids", async () => {
    const errors = vi.spyOn(console, "error");
    const tree = () => jsxs("neuwo-radio-group", { name: "plan", value: "pro", onChange() {}, label: "Plan", error: "Pick one", children: radios() });
    const parsed = document.createElement("div");
    parsed.innerHTML = renderToString(tree());
    const container = attach(document.createElement("div"));
    container.append(...parsed.childNodes);
    const inputs = inputsOf(container.querySelector("neuwo-radio-group"));
    const legend = legendOf(container.querySelector("neuwo-radio-group")).id;
    const recoverable = [];
    let root;
    await act(async () => {
      root = hydrateRoot(container, tree(), { onRecoverableError: (thrown) => void recoverable.push(String(thrown?.message ?? thrown)) });
    });
    cleanup.push(() => act(() => root.unmount()));
    const group = container.querySelector("neuwo-radio-group");
    expect(recoverable).toEqual([]);
    expect(inputsOf(group)).toEqual(inputs);
    expect(checkedOf(group)).toEqual([false, true, false]);
    expect(legendOf(group).id).toBe(legend);
    expect(groupOf(group).getAttribute("aria-labelledby")).toBe(legend);
    expect(errors).not.toHaveBeenCalled();
  });

  it("controls a lone radio by its own checked", async () => {
    const errors = vi.spyOn(console, "error");
    const { container } = await render(jsx("neuwo-radio", { name: "solo", value: "x", checked: false, onChange() {}, children: "Solo" }));
    const radio = container.querySelector("neuwo-radio");
    expect(radio[CONTROLLED]).toBe(true);
    await act(async () => inputOf(radio).click());
    expect(inputOf(radio).checked).toBe(false);
    expect(errors).not.toHaveBeenCalled();
  });
});
