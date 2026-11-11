import { afterEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import "../src/index.js";
import { NeuwoCombobox } from "../src/components/fields/combobox/neuwo-combobox.js";
import { NeuwoFieldElement } from "../src/components/fields/field-element.js";
import { expand } from "../src/server/index.js";

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

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

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

const triggerOf = (el) => el.querySelector(":scope > .neuwo-field > .neuwo-combobox > .neuwo-combobox__trigger");
const formValueOf = (el) => el.querySelector(":scope > .neuwo-field > .neuwo-combobox > .neuwo-combobox__form-value");
const listboxOf = (el) => el.querySelector(".neuwo-combobox__listbox");
const rowsOf = (el) => Array.from(el.querySelectorAll(".neuwo-combobox__option"));
const rowOf = (el, value) => rowsOf(el).find((row) => row.dataset.value === value);
const activeOf = (el) => el.querySelector(".neuwo-combobox__option--active");
const emptyOf = (el) => el.querySelector(".neuwo-combobox__empty");
const labelOf = (el) => el.querySelector(":scope > .neuwo-field > .neuwo-field__label");
const shownOf = (el) => el.querySelector(".neuwo-combobox__value").textContent;

function key(el, name) {
  triggerOf(el).dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }));
}

/** @param {HTMLInputElement} input @param {string} value */
function type(input, value) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

const OPTS = `<option value="a">Apple</option><option value="b">Banana</option><option value="c" disabled>Cherry</option>`;

describe("<neuwo-combobox>", () => {
  it("registers a light DOM field element that is not form-associated", () => {
    expect(customElements.get("neuwo-combobox")).toBe(NeuwoCombobox);
    expect(Object.getPrototypeOf(NeuwoCombobox)).toBe(NeuwoFieldElement);
    expect(NeuwoCombobox.formAssociated).toBeUndefined();
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector("[part]")).toBeNull();
    expect(el.control).toBe(formValueOf(el));
    expect(el.trigger).toBe(triggerOf(el));
    expect(el.listbox).toBe(listboxOf(el));
    expect(el.popup).toBe(el.querySelector(".neuwo-combobox__popup"));
  });

  it("renders a combobox trigger and a listbox of options", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    const trigger = triggerOf(el);
    expect(trigger.getAttribute("role")).toBe("combobox");
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
    expect(trigger.getAttribute("aria-controls")).toBe(listboxOf(el).id);
    expect(listboxOf(el).querySelectorAll('[role="option"]')).toHaveLength(3);
  });

  it("keeps the author's options in the hidden select, the nodes unchanged", () => {
    const holder = document.createElement("div");
    holder.innerHTML = `<neuwo-combobox>${OPTS}</neuwo-combobox>`;
    const options = Array.from(holder.querySelectorAll("option"));
    const el = attach(holder).firstElementChild;
    const select = el.querySelector(".neuwo-combobox__options");
    expect(select.hidden).toBe(true);
    expect(Array.from(select.children)).toEqual(options);
  });

  it("shows the placeholder when nothing is selected", () => {
    const el = make(`<neuwo-combobox placeholder="Pick one">${OPTS}</neuwo-combobox>`);
    expect(shownOf(el)).toBe("Pick one");
    expect(triggerOf(el).hasAttribute("data-placeholder")).toBe(true);
  });

  it("selects the option named by the value attribute and exposes it", () => {
    const el = make(`<neuwo-combobox value="b">${OPTS}</neuwo-combobox>`);
    expect(el.value).toBe("b");
    expect(shownOf(el)).toBe("Banana");
    expect(triggerOf(el).hasAttribute("data-placeholder")).toBe(false);
    expect(el.querySelector('[role="option"][aria-selected="true"]').dataset.value).toBe("b");
  });

  it("selects the option marked selected when no value attribute is set", () => {
    const el = make(`<neuwo-combobox><option value="a">Apple</option><option value="b" selected>Banana</option></neuwo-combobox>`);
    expect(el.value).toBe("b");
    expect(shownOf(el)).toBe("Banana");
  });

  it("marks disabled options aria-disabled", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    expect(rowOf(el, "c").getAttribute("aria-disabled")).toBe("true");
  });

  it("exposes an optgroup as a labelled role=group containing its options", () => {
    const el = make(`<neuwo-combobox><option value="a">Apple</option><optgroup label="Citrus"><option value="o">Orange</option></optgroup></neuwo-combobox>`);
    const group = el.querySelector('[role="group"]');
    expect(document.getElementById(group.getAttribute("aria-labelledby")).textContent).toBe("Citrus");
    expect(group.querySelector('[role="option"]').dataset.value).toBe("o");
  });

  it("names the listbox by the field label", () => {
    const el = make(`<neuwo-combobox label="Fruit">${OPTS}</neuwo-combobox>`);
    const id = listboxOf(el).getAttribute("aria-labelledby");
    expect(document.getElementById(id)).toBe(labelOf(el));
    expect(labelOf(el).textContent).toBe("Fruit");
  });

  it("lists its options, read from the author's option and optgroup children", () => {
    const el = make(`<neuwo-combobox><option value="a" selected>Apple</option><optgroup label="Citrus"><option disabled>Lemon</option></optgroup></neuwo-combobox>`);
    expect(el.options).toEqual([
      { value: "a", label: "Apple", disabled: false, selected: true, group: "", index: 0 },
      { value: "Lemon", label: "Lemon", disabled: true, selected: false, group: "Citrus", index: 1 },
    ]);
  });

  it("swaps the trigger through the template when searchable changes", () => {
    const el = make(`<neuwo-combobox value="b">${OPTS}</neuwo-combobox>`);
    el.setAttribute("searchable", "");
    expect(triggerOf(el).localName).toBe("input");
    expect(triggerOf(el).value).toBe("Banana");
    el.removeAttribute("searchable");
    expect(triggerOf(el).localName).toBe("button");
    expect(shownOf(el)).toBe("Banana");
  });
});

describe("<neuwo-combobox> form", () => {
  it("submits through the native form value with JavaScript off, leaving out the trigger, the select and disabled fields", () => {
    const page = new Window();
    cleanup.push(() => page.happyDOM.close());
    page.document.body.innerHTML = expand(
      `<form id="f">` +
        `<neuwo-combobox name="fruit" value="b" label="Fruit">${OPTS}</neuwo-combobox>` +
        `<neuwo-combobox name="citrus"><option value="a">A</option><optgroup label="G"><option value="o" selected>Orange</option></optgroup></neuwo-combobox>` +
        `<neuwo-combobox name="search" searchable value="a">${OPTS}</neuwo-combobox>` +
        `<neuwo-combobox name="none">${OPTS}</neuwo-combobox>` +
        `<neuwo-combobox name="off" value="a" disabled>${OPTS}</neuwo-combobox>` +
        `<neuwo-combobox value="a">${OPTS}</neuwo-combobox>` +
        `</form>` +
        `<neuwo-combobox name="outside" form="f" value="b">${OPTS}</neuwo-combobox>`,
    );
    expect(page.customElements.get("neuwo-combobox")).toBeUndefined();
    expect([...new page.FormData(page.document.querySelector("form"))]).toEqual([
      ["fruit", "b"],
      ["citrus", "o"],
      ["search", "a"],
      ["none", ""],
      ["outside", "b"],
    ]);
  });

  it("submits the live value after a pick", () => {
    const form = make(`<form><neuwo-combobox name="fruit">${OPTS}</neuwo-combobox></form>`);
    const el = form.querySelector("neuwo-combobox");
    el.open();
    rowOf(el, "b").click();
    expect([...new FormData(form)]).toEqual([["fruit", "b"]]);
  });

  it("submits and reports validity natively, with no option selected by the hidden select", () => {
    const form = make(`<form><neuwo-combobox name="f" required>${OPTS}</neuwo-combobox></form>`);
    const el = form.querySelector("neuwo-combobox");
    expect([...new FormData(form)]).toEqual([["f", ""]]);
    expect(el.reportValidity()).toBe(false);
    el.value = "b";
    expect([...new FormData(form)]).toEqual([["f", el.value]]);
    expect(el.value).not.toBe("");
    expect(el.reportValidity()).toBe(true);
  });

  it("is invalid while required and empty, natively, and valid once a value is set", () => {
    const form = make(`<form><neuwo-combobox name="fruit" required>${OPTS}</neuwo-combobox></form>`);
    const el = form.querySelector("neuwo-combobox");
    expect(form.checkValidity()).toBe(false);
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).not.toBe("Please select an option.");
    el.value = "a";
    expect(el.checkValidity()).toBe(true);
    expect(form.checkValidity()).toBe(true);
  });

  it("moves focus that lands on the form value, as the browser's validation does, to the trigger", () => {
    const el = make(`<neuwo-combobox name="fruit" required>${OPTS}</neuwo-combobox>`);
    formValueOf(el).focus();
    expect(document.activeElement).toBe(triggerOf(el));
    el.focus();
    expect(document.activeElement).toBe(triggerOf(el));
  });

  it("returns to the selected option and its display when its form resets", async () => {
    const form = make(`<form><neuwo-combobox name="fruit"><option value="a">Apple</option><option value="b" selected>Banana</option></neuwo-combobox></form>`);
    const el = form.querySelector("neuwo-combobox");
    el.open();
    rowOf(el, "a").click();
    expect(el.value).toBe("a");
    expect(shownOf(el)).toBe("Apple");
    form.reset();
    await nextTask();
    expect(el.value).toBe("b");
    expect(shownOf(el)).toBe("Banana");
    expect(rowOf(el, "b").getAttribute("aria-selected")).toBe("true");
    expect(rowOf(el, "a").getAttribute("aria-selected")).toBe("false");
  });

  it("re-applies the placeholder after a reset to nothing, and the searchable label", async () => {
    const form = make(`<form><neuwo-combobox placeholder="Pick">${OPTS}</neuwo-combobox><neuwo-combobox searchable value="a">${OPTS}</neuwo-combobox></form>`);
    const [plain, search] = form.querySelectorAll("neuwo-combobox");
    plain.value = "b";
    search.value = "b";
    expect(triggerOf(search).value).toBe("Banana");
    form.reset();
    await nextTask();
    expect(plain.value).toBe("");
    expect(shownOf(plain)).toBe("Pick");
    expect(triggerOf(plain).hasAttribute("data-placeholder")).toBe(true);
    expect(search.value).toBe("a");
    expect(triggerOf(search).value).toBe("Apple");
  });

  it("keeps the form value's own input and change from the element, and shows what was written to it", () => {
    const form = make(`<form><neuwo-combobox name="fruit" placeholder="Pick">${OPTS}</neuwo-combobox></form>`);
    const el = form.querySelector("neuwo-combobox");
    const heard = vi.fn();
    for (const name of ["input", "change"]) {
      el.addEventListener(name, heard);
      document.addEventListener(name, heard);
      cleanup.push(() => document.removeEventListener(name, heard));
    }
    const formValue = formValueOf(el);
    formValue.value = "b";
    formValue.dispatchEvent(new Event("input", { bubbles: true }));
    expect(shownOf(el)).toBe("Banana");
    expect(rowOf(el, "b").getAttribute("aria-selected")).toBe("true");
    expect(triggerOf(el).hasAttribute("data-placeholder")).toBe(false);
    formValue.value = "c";
    formValue.dispatchEvent(new Event("change", { bubbles: true }));
    expect(el.value).toBe("");
    expect(shownOf(el)).toBe("Pick");
    expect(heard).not.toHaveBeenCalled();
  });

  it("only accepts an enabled option's value, and shows a value set before it was connected", () => {
    const el = make(`<neuwo-combobox value="a">${OPTS}</neuwo-combobox>`);
    el.value = "c";
    expect(el.value).toBe("");
    el.value = "b";
    expect(el.value).toBe("b");
    expect(shownOf(el)).toBe("Banana");
    const early = document.createElement("neuwo-combobox");
    early.innerHTML = OPTS;
    early.value = "b";
    attach(early);
    expect(early.value).toBe("b");
    expect(shownOf(early)).toBe("Banana");
  });
});

describe("<neuwo-combobox> blur", () => {
  it.each([
    ["button", ""],
    ["searchable", " searchable"],
  ])("names its %s trigger after the field while a blur from it is dispatched, once per listener, and only then", (_, extra) => {
    const form = make(`<form><neuwo-combobox name="plan" value="b"${extra}>${OPTS}</neuwo-combobox></form>`);
    const el = form.querySelector("neuwo-combobox");
    const trigger = triggerOf(el);
    const seen = [];
    const read = (event) => void seen.push([event.type, event.target === trigger, event.target.name]);
    el.addEventListener("focusout", read);
    el.addEventListener("blur", read, true);
    form.addEventListener("focusout", read);
    trigger.focus();
    trigger.blur();
    expect(seen).toEqual([
      ["blur", true, "plan"],
      ["focusout", true, "plan"],
      ["focusout", true, "plan"],
    ]);
    expect(trigger.name).toBe("");
    expect(trigger.hasAttribute("name")).toBe(false);
    expect([...new FormData(form)]).toEqual([["plan", "b"]]);
  });

  it("names a trigger the template replaced, after the field's current name", () => {
    const el = make(`<neuwo-combobox name="plan">${OPTS}</neuwo-combobox>`);
    el.setAttribute("searchable", "");
    el.name = "tier";
    const names = [];
    el.addEventListener("focusout", (event) => void names.push(event.target.name));
    triggerOf(el).focus();
    triggerOf(el).blur();
    expect(triggerOf(el)).toBeInstanceOf(HTMLInputElement);
    expect(names).toEqual(["tier"]);
  });
});

describe("<neuwo-combobox> options as they change", () => {
  it("renders a row for an option appended to the element, in one reconcile", async () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    const updated = vi.spyOn(el, "updated");
    const option = document.createElement("option");
    option.value = "d";
    option.textContent = "Date";
    el.append(option);
    await settled();
    expect(rowOf(el, "d").textContent).toBe("Date");
    expect(el.querySelector(".neuwo-combobox__options").lastElementChild).toBe(option);
    expect(updated).toHaveBeenCalledTimes(1);
  });

  it("clears the value when the selected option is removed, in one reconcile", async () => {
    const el = make(`<neuwo-combobox placeholder="Pick">${OPTS}</neuwo-combobox>`);
    el.value = "b";
    const updated = vi.spyOn(el, "updated");
    el.querySelector('option[value="b"]').remove();
    await settled();
    expect(rowOf(el, "b")).toBeUndefined();
    expect(el.value).toBe("");
    expect(shownOf(el)).toBe("Pick");
    expect(updated).toHaveBeenCalledTimes(1);
  });

  it("re-renders an edit inside an optgroup, and stays settled after its own writes", async () => {
    const el = make(`<neuwo-combobox value="o"><optgroup label="Citrus"><option value="o">Orange</option></optgroup></neuwo-combobox>`);
    const updated = vi.spyOn(el, "updated");
    const group = el.querySelector("optgroup");
    group.setAttribute("label", "Sour");
    const lemon = document.createElement("option");
    lemon.value = "l";
    lemon.textContent = "Lemon";
    group.append(lemon);
    await settled();
    expect(el.querySelector(".neuwo-combobox__group").textContent).toBe("Sour");
    expect(rowOf(el, "l").textContent).toBe("Lemon");
    expect(el.value).toBe("o");
    expect(updated).toHaveBeenCalledTimes(1);
    el.open();
    key(el, "ArrowDown");
    rowOf(el, "l").click();
    await settled();
    expect(updated).toHaveBeenCalledTimes(1);
  });

  it("keeps a picked value across a re-render that changes the template's own default", () => {
    const el = make(`<neuwo-combobox value="a" placeholder="Pick">${OPTS}</neuwo-combobox>`);
    el.value = "b";
    el.setAttribute("value", "c");
    expect(el.value).toBe("b");
    expect(el.getAttribute("value")).toBe("c");
    expect(el.defaultValue).toBe("");
    expect(shownOf(el)).toBe("Banana");
    expect(triggerOf(el).hasAttribute("data-placeholder")).toBe(false);
    expect(rowOf(el, "b").getAttribute("aria-selected")).toBe("true");
    expect(rowOf(el, "a").getAttribute("aria-selected")).toBe("false");
    expect(formValueOf(el).getAttribute("value")).toBe("");
  });
});

describe("<neuwo-combobox> ids and adoption", () => {
  it("gives two comboboxes unique ids whose references resolve inside their own field", () => {
    const holder = document.createElement("div");
    holder.innerHTML = expand(`<neuwo-combobox label="One" error="First"><optgroup label="G"><option>A</option></optgroup></neuwo-combobox>`);
    attach(holder);
    const created = document.createElement("neuwo-combobox");
    created.setAttribute("label", "Two");
    created.setAttribute("error", "Second");
    created.innerHTML = `<optgroup label="G"><option>A</option></optgroup>`;
    holder.append(created);
    const fields = Array.from(holder.querySelectorAll("neuwo-combobox"));
    const ids = Array.from(holder.querySelectorAll("[id]"), (node) => node.id);
    expect(ids.length).toBeGreaterThan(10);
    expect(new Set(ids).size).toBe(ids.length);
    for (const el of fields) {
      const trigger = triggerOf(el);
      expect(document.getElementById(labelOf(el).getAttribute("for"))).toBe(trigger);
      expect(document.getElementById(trigger.getAttribute("aria-controls"))).toBe(listboxOf(el));
      expect(document.getElementById(listboxOf(el).getAttribute("aria-labelledby"))).toBe(labelOf(el));
      expect(document.getElementById(trigger.getAttribute("aria-describedby"))).toBe(el.querySelector(".neuwo-field__error"));
      const group = el.querySelector('[role="group"]');
      expect(document.getElementById(group.getAttribute("aria-labelledby"))).toBe(el.querySelector(".neuwo-combobox__group"));
      el.open();
      expect(document.getElementById(trigger.getAttribute("aria-activedescendant"))).toBe(rowsOf(el)[0]);
      el.close();
    }
  });

  it("adopts server markup without a mutation and keeps the server's ids after a placeholder change", () => {
    const holder = document.createElement("div");
    holder.innerHTML = expand(`<neuwo-combobox label="Fruit" name="fruit" value="b" placeholder="Pick">${OPTS}</neuwo-combobox>`);
    const el = holder.firstElementChild;
    const trigger = triggerOf(el);
    expect(trigger.id).toBe("neuwo-s1-control");
    const stop = watch(holder);
    attach(holder);
    expect(stop()).toEqual([]);
    expect(el.value).toBe("b");

    el.setAttribute("placeholder", "Choose");
    el.value = "";
    expect(triggerOf(el)).toBe(trigger);
    expect(shownOf(el)).toBe("Choose");
    expect(trigger.id).toBe("neuwo-s1-control");
    expect(trigger.getAttribute("aria-controls")).toBe("neuwo-s1-listbox");
    expect(listboxOf(el).id).toBe("neuwo-s1-listbox");
    expect(listboxOf(el).getAttribute("aria-labelledby")).toBe("neuwo-s1-label");
    expect(labelOf(el).id).toBe("neuwo-s1-label");
    expect(rowsOf(el).map((row) => row.id)).toEqual(["neuwo-s1-option-0", "neuwo-s1-option-1", "neuwo-s1-option-2"]);
  });

  it("reconnects without a write to its markup", () => {
    const el = make(`<neuwo-combobox value="b">${OPTS}</neuwo-combobox>`);
    const parent = el.parentNode;
    el.remove();
    const stop = watch(el);
    parent.append(el);
    expect(stop()).toEqual([]);
  });
});

describe("<neuwo-combobox> open and close", () => {
  it("removes aria-activedescendant when closed", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    el.open();
    expect(triggerOf(el).hasAttribute("aria-activedescendant")).toBe(true);
    el.close();
    expect(triggerOf(el).hasAttribute("aria-activedescendant")).toBe(false);
    expect(activeOf(el)).toBeNull();
  });

  it("toggles aria-expanded and open state when the trigger is clicked", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    const trigger = triggerOf(el);
    expect(el.isOpen).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.click();
    expect(el.isOpen).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    trigger.click();
    expect(el.isOpen).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("does not open when disabled", () => {
    const el = make(`<neuwo-combobox disabled>${OPTS}</neuwo-combobox>`);
    triggerOf(el).click();
    el.open();
    expect(el.isOpen).toBe(false);
  });

  it("does not open when there are no options", () => {
    const el = make(`<neuwo-combobox></neuwo-combobox>`);
    triggerOf(el).click();
    expect(el.isOpen).toBe(false);
  });

  it("mirrors a browser-driven popover dismissal back into its state", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    el.open();
    const toggle = new Event("toggle");
    toggle.newState = "closed";
    el.popup.dispatchEvent(toggle);
    expect(el.isOpen).toBe(false);
    expect(triggerOf(el).getAttribute("aria-expanded")).toBe("false");
  });

  it("positions the popup against the trigger while open", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    el.open();
    expect(el.popup.style.position).toBe("fixed");
    expect(el.popup.style.top).not.toBe("");
  });

  it("keeps its open state through a re-render", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    key(el, "ArrowDown");
    el.setAttribute("label", "Fruit");
    expect(triggerOf(el).getAttribute("aria-expanded")).toBe("true");
    expect(activeOf(el).dataset.value).toBe("a");
    expect(triggerOf(el).getAttribute("aria-activedescendant")).toBe(activeOf(el).id);
  });
});

describe("<neuwo-combobox> keyboard and selection", () => {
  it("opens and highlights the first option on ArrowDown", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    key(el, "ArrowDown");
    expect(el.isOpen).toBe(true);
    expect(activeOf(el).dataset.value).toBe("a");
    expect(triggerOf(el).getAttribute("aria-activedescendant")).toBe(activeOf(el).id);
  });

  it("skips disabled options when navigating", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    key(el, "ArrowDown");
    key(el, "ArrowDown");
    key(el, "ArrowDown");
    expect(activeOf(el).dataset.value).toBe("b");
  });

  it("commits the highlighted option on Enter and dispatches input then change on the element, once each", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    const heard = [];
    for (const name of ["input", "change"]) el.addEventListener(name, (event) => heard.push([event.type, event.target, event.bubbles, el.value]));
    key(el, "ArrowDown");
    key(el, "Enter");
    expect(el.value).toBe("a");
    expect(el.isOpen).toBe(false);
    expect(heard).toEqual([
      ["input", el, true, "a"],
      ["change", el, true, "a"],
    ]);
    el.commit("a");
    expect(heard).toHaveLength(2);
  });

  it("reverts on Escape", () => {
    const el = make(`<neuwo-combobox value="b">${OPTS}</neuwo-combobox>`);
    key(el, "ArrowDown");
    key(el, "ArrowUp");
    key(el, "Escape");
    expect(el.isOpen).toBe(false);
    expect(el.value).toBe("b");
  });

  it("selects an option on click and shows it", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    el.open();
    rowOf(el, "b").click();
    expect(el.value).toBe("b");
    expect(el.isOpen).toBe(false);
    expect(shownOf(el)).toBe("Banana");
    expect(triggerOf(el).hasAttribute("data-placeholder")).toBe(false);
    expect(rowOf(el, "b").getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(triggerOf(el));
  });

  it("does not change the value while navigating (commit model)", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    key(el, "ArrowDown");
    key(el, "ArrowDown");
    expect(el.value).toBe("");
  });

  it("opens at the last selectable option when ArrowUp is pressed while closed", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    key(el, "ArrowUp");
    expect(el.isOpen).toBe(true);
    expect(activeOf(el).dataset.value).toBe("b");
  });

  it("jumps to first and last selectable options with Home and End", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    el.open();
    key(el, "End");
    expect(activeOf(el).dataset.value).toBe("b");
    key(el, "Home");
    expect(activeOf(el).dataset.value).toBe("a");
  });

  it("opens and typeahead-jumps to a matching option", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    key(el, "b");
    expect(el.isOpen).toBe(true);
    expect(activeOf(el).dataset.value).toBe("b");
  });

  it("commits the highlighted option on Tab", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    key(el, "ArrowDown");
    key(el, "Tab");
    expect(el.value).toBe("a");
    expect(el.isOpen).toBe(false);
  });

  it("navigates into grouped options with the keyboard", () => {
    const el = make(`<neuwo-combobox><option value="a">Apple</option><optgroup label="Citrus"><option value="o">Orange</option></optgroup></neuwo-combobox>`);
    key(el, "ArrowDown");
    key(el, "ArrowDown");
    expect(activeOf(el).dataset.value).toBe("o");
  });

  it("ignores clicks on disabled options", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    el.open();
    rowOf(el, "c").click();
    expect(el.value).toBe("");
    expect(el.isOpen).toBe(true);
  });
});

describe("<neuwo-combobox searchable>", () => {
  const FRUIT = `<option value="apple">Apple</option><option value="apricot">Apricot</option><option value="banana">Banana</option>`;

  it("renders a text input trigger with aria-autocomplete", () => {
    const el = make(`<neuwo-combobox searchable>${FRUIT}</neuwo-combobox>`);
    expect(triggerOf(el).localName).toBe("input");
    expect(triggerOf(el).getAttribute("aria-autocomplete")).toBe("list");
  });

  it("opens on focus", () => {
    const el = make(`<neuwo-combobox searchable>${FRUIT}</neuwo-combobox>`);
    triggerOf(el).dispatchEvent(new Event("focus"));
    expect(el.isOpen).toBe(true);
  });

  it("filters options as you type", () => {
    const el = make(`<neuwo-combobox searchable>${FRUIT}</neuwo-combobox>`);
    type(triggerOf(el), "ap");
    expect(rowsOf(el).filter((row) => !row.hidden).map((row) => row.dataset.value)).toEqual(["apple", "apricot"]);
    expect(emptyOf(el).hidden).toBe(true);
  });

  it("never lets the filter's own input or change reach the element", () => {
    const el = make(`<neuwo-combobox searchable>${FRUIT}</neuwo-combobox>`);
    const heard = vi.fn();
    for (const name of ["input", "change"]) {
      el.addEventListener(name, heard);
      document.addEventListener(name, heard);
      cleanup.push(() => document.removeEventListener(name, heard));
    }
    type(triggerOf(el), "ban");
    triggerOf(el).dispatchEvent(new Event("change", { bubbles: true }));
    expect(heard).not.toHaveBeenCalled();
    expect(rowsOf(el).filter((row) => !row.hidden)).toHaveLength(1);
    key(el, "Enter");
    expect(el.value).toBe("banana");
    expect(heard.mock.calls.map(([event]) => event.type)).toEqual(["input", "input", "change", "change"]);
  });

  it("shows the empty row when nothing matches", () => {
    const el = make(`<neuwo-combobox searchable>${FRUIT}</neuwo-combobox>`);
    expect(emptyOf(el).hidden).toBe(true);
    type(triggerOf(el), "zzz");
    expect(emptyOf(el).hidden).toBe(false);
    expect(emptyOf(el).textContent).toBe("No matches");
  });

  it("shows the selected label in the input after commit", () => {
    const el = make(`<neuwo-combobox searchable>${FRUIT}</neuwo-combobox>`);
    el.value = "banana";
    expect(triggerOf(el).value).toBe("Banana");
    expect(triggerOf(el).hasAttribute("data-placeholder")).toBe(false);
  });

  it("does not commit on Space in searchable mode (space is a filter character)", () => {
    const el = make(`<neuwo-combobox searchable>${FRUIT}</neuwo-combobox>`);
    el.open();
    key(el, "ArrowDown");
    key(el, " ");
    expect(el.isOpen).toBe(true);
    expect(el.value).toBe("");
  });

  it("highlights the current selection when opened by focus", () => {
    const el = make(`<neuwo-combobox searchable value="banana">${FRUIT}</neuwo-combobox>`);
    triggerOf(el).dispatchEvent(new Event("focus"));
    expect(activeOf(el).dataset.value).toBe("banana");
  });

  it("clears the filter, hides the empty row and reverts the label on close", () => {
    const el = make(`<neuwo-combobox searchable value="banana">${FRUIT}</neuwo-combobox>`);
    const input = triggerOf(el);
    type(input, "zzz");
    expect(emptyOf(el).hidden).toBe(false);
    el.close();
    expect(emptyOf(el).hidden).toBe(true);
    expect(rowsOf(el).every((row) => row.hidden === false)).toBe(true);
    expect(input.value).toBe("Banana");
  });

  it("reverts free text in the input on blur", () => {
    const el = make(`<neuwo-combobox searchable value="banana">${FRUIT}</neuwo-combobox>`);
    const input = triggerOf(el);
    input.value = "free text";
    input.dispatchEvent(new Event("blur"));
    expect(input.value).toBe("Banana");
  });

  it("navigation skips filtered-out options", () => {
    const el = make(`<neuwo-combobox searchable>${FRUIT}</neuwo-combobox>`);
    type(triggerOf(el), "ban");
    key(el, "ArrowDown");
    expect(activeOf(el).dataset.value).toBe("banana");
  });
});
