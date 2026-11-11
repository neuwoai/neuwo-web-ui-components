import { afterEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import "../src/index.js";
import { NeuwoSegmented } from "../src/components/selection/segmented/neuwo-segmented.js";
import { NeuwoControlElement } from "../src/components/control-element.js";
import { expand } from "../src/server/index.js";

const cleanup = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop()();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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

const OPTS = `<option value="visual">Visual</option><option value="json">JSON</option><option value="raw" disabled>Raw</option><option value="table">Table</option>`;

const groupOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-segmented");
const errorOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-choice__error");
const indicatorOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-segmented > .neuwo-segmented__indicator");
const formValueOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-segmented > .neuwo-segmented__form-value");
const selectOf = (el) => el.querySelector(":scope > .neuwo-choice > .neuwo-segmented > .neuwo-segmented__options");
const buttonsOf = (el) => Array.from(el.querySelectorAll(":scope > .neuwo-choice > .neuwo-segmented > .neuwo-segmented__option"));
const buttonOf = (el, value) => buttonsOf(el).find((button) => button.dataset.value === value);
const checkedOf = (el) => buttonsOf(el).filter((button) => button.getAttribute("aria-checked") === "true").map((button) => button.dataset.value);
const stopOf = (el) => buttonsOf(el).filter((button) => button.getAttribute("tabindex") === "0").map((button) => button.dataset.value);
const placed = (el) => indicatorOf(el).hasAttribute("data-neuwo-placed");

function key(target, name) {
  const event = new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

function listen(el) {
  const heard = [];
  for (const type of ["input", "change"]) el.addEventListener(type, (event) => heard.push([type, event.target, el.value]));
  return heard;
}

describe("<neuwo-segmented>", () => {
  it("registers a light DOM element on the control base, with no form association", () => {
    expect(customElements.get("neuwo-segmented")).toBe(NeuwoSegmented);
    expect(Object.getPrototypeOf(NeuwoSegmented)).toBe(NeuwoControlElement);
    expect(NeuwoSegmented.formAssociated).toBeUndefined();
    const el = make(`<neuwo-segmented label="View">${OPTS}</neuwo-segmented>`);
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector("[part]")).toBeNull();
    expect(Array.from(el.querySelector(":scope > .neuwo-choice").children, (node) => node.className)).toEqual(["neuwo-segmented", "neuwo-choice__error"]);
  });

  it("renders a horizontal radiogroup of buttons from its options, keeping the author's options in the hidden select", () => {
    const el = make(`<neuwo-segmented label="View" orientation="vertical">${OPTS}</neuwo-segmented>`);
    const options = Array.from(el.querySelectorAll("option"));
    expect(groupOf(el).getAttribute("role")).toBe("radiogroup");
    expect(groupOf(el).getAttribute("aria-label")).toBe("View");
    expect(groupOf(el).getAttribute("aria-orientation")).toBe("horizontal");
    expect(buttonsOf(el).map((button) => [button.type, button.getAttribute("role"), button.textContent, button.disabled])).toEqual([
      ["button", "radio", "Visual", false],
      ["button", "radio", "JSON", false],
      ["button", "radio", "Raw", true],
      ["button", "radio", "Table", false],
    ]);
    expect(Array.from(selectOf(el).children)).toEqual(options);
    expect(selectOf(el).hidden).toBe(true);
  });

  it("starts with the option the value names checked, else the one marked selected, as its first paint", () => {
    expect(checkedOf(make(`<neuwo-segmented value="json">${OPTS}</neuwo-segmented>`))).toEqual(["json"]);
    const selected = make(`<neuwo-segmented><option value="a">A</option><option value="b" selected>B</option></neuwo-segmented>`);
    expect(checkedOf(selected)).toEqual(["b"]);
    expect(selected.value).toBe("b");
    const none = make(`<neuwo-segmented value="raw">${OPTS}</neuwo-segmented>`);
    expect(checkedOf(none)).toEqual([]);
    expect(none.value).toBe("");
    expect(stopOf(none)).toEqual(["visual"]);
  });

  it("selects on click, dispatching input then change on the element once each, with the new value", () => {
    const el = make(`<neuwo-segmented value="visual">${OPTS}</neuwo-segmented>`);
    const heard = listen(el);
    buttonOf(el, "json").click();
    expect(heard).toEqual([
      ["input", el, "json"],
      ["change", el, "json"],
    ]);
    expect(el.value).toBe("json");
    expect(checkedOf(el)).toEqual(["json"]);
    expect(stopOf(el)).toEqual(["json"]);
    expect(document.activeElement).toBe(buttonOf(el, "json"));
  });

  it("fires nothing for a click on the selected option or a disabled one", () => {
    const el = make(`<neuwo-segmented value="visual">${OPTS}</neuwo-segmented>`);
    const heard = listen(el);
    buttonOf(el, "visual").click();
    buttonOf(el, "raw").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(heard).toEqual([]);
    expect(el.value).toBe("visual");
    expect(checkedOf(el)).toEqual(["visual"]);
  });

  it("moves and selects with the arrow keys both ways, wrapping and skipping disabled options", () => {
    const el = make(`<neuwo-segmented value="json">${OPTS}</neuwo-segmented>`);
    const heard = listen(el);
    const event = key(buttonOf(el, "json"), "ArrowRight");
    expect(event.defaultPrevented).toBe(true);
    expect(el.value).toBe("table");
    expect(document.activeElement).toBe(buttonOf(el, "table"));
    key(buttonOf(el, "table"), "ArrowDown");
    expect(el.value).toBe("visual");
    key(buttonOf(el, "visual"), "ArrowLeft");
    expect(el.value).toBe("table");
    key(buttonOf(el, "table"), "ArrowUp");
    expect(el.value).toBe("json");
    expect(checkedOf(el)).toEqual(["json"]);
    expect(stopOf(el)).toEqual(["json"]);
    expect(heard.filter(([type]) => type === "change")).toHaveLength(4);
  });

  it("moves to the first and last enabled options with Home and End, and selects the focused one with Space", () => {
    const el = make(`<neuwo-segmented value="json"><option value="a" disabled>A</option>${OPTS}<option value="z" disabled>Z</option></neuwo-segmented>`);
    key(buttonOf(el, "json"), "End");
    expect(el.value).toBe("table");
    key(buttonOf(el, "table"), "Home");
    expect(el.value).toBe("visual");
    const none = make(`<neuwo-segmented>${OPTS}</neuwo-segmented>`);
    const heard = listen(none);
    const event = key(buttonOf(none, "visual"), " ");
    expect(event.defaultPrevented).toBe(true);
    expect(none.value).toBe("visual");
    expect(heard.map(([type]) => type)).toEqual(["input", "change"]);
    expect(key(buttonOf(none, "visual"), "Enter").defaultPrevented).toBe(false);
    expect(key(buttonOf(none, "visual"), "a").defaultPrevented).toBe(false);
  });

  it("reads the live value and sets it without an event or an attribute, accepting only an enabled option's value", () => {
    const el = make(`<neuwo-segmented value="visual">${OPTS}</neuwo-segmented>`);
    const heard = listen(el);
    el.value = "table";
    expect(el.value).toBe("table");
    expect(checkedOf(el)).toEqual(["table"]);
    expect(stopOf(el)).toEqual(["table"]);
    expect(el.getAttribute("value")).toBe("visual");
    el.value = "raw";
    expect(el.value).toBe("");
    expect(checkedOf(el)).toEqual([]);
    expect(stopOf(el)).toEqual(["visual"]);
    expect(heard).toEqual([]);
  });

  it("picks a value as the user does through commit(), a value no enabled option has picking nothing", () => {
    const el = make(`<neuwo-segmented value="visual">${OPTS}</neuwo-segmented>`);
    const heard = listen(el);
    el.commit("json");
    el.commit("json");
    el.commit("raw");
    el.commit("zzz");
    expect(heard).toEqual([
      ["input", el, "json"],
      ["change", el, "json"],
      ["input", el, ""],
      ["change", el, ""],
    ]);
    expect(checkedOf(el)).toEqual([]);
  });

  it("shows a value set before it was connected, and reads the starting value as defaultValue", () => {
    const early = document.createElement("neuwo-segmented");
    early.innerHTML = OPTS;
    early.value = "json";
    expect(early.value).toBe("json");
    attach(early);
    expect(early.value).toBe("json");
    expect(checkedOf(early)).toEqual(["json"]);
    const el = make(`<neuwo-segmented><option value="a">A</option><option value="b" selected>B</option></neuwo-segmented>`);
    el.value = "a";
    expect(el.defaultValue).toBe("b");
    el.defaultValue = "a";
    expect(el.getAttribute("value")).toBe("a");
  });

  it("keeps a pick across a change to the value attribute, which is the starting value", () => {
    const el = make(`<neuwo-segmented value="visual">${OPTS}</neuwo-segmented>`);
    buttonOf(el, "json").click();
    el.setAttribute("value", "table");
    expect(el.value).toBe("json");
    expect(checkedOf(el)).toEqual(["json"]);
    expect(stopOf(el)).toEqual(["json"]);
    expect(el.defaultValue).toBe("table");
    const fresh = make(`<neuwo-segmented value="visual">${OPTS}</neuwo-segmented>`);
    fresh.setAttribute("value", "table");
    expect(fresh.value).toBe("table");
    expect(checkedOf(fresh)).toEqual(["table"]);
  });

  it("focuses the selected option, else the first enabled one, and moves focus that lands on the form value there", () => {
    const el = make(`<neuwo-segmented value="json">${OPTS}</neuwo-segmented>`);
    el.focus();
    expect(document.activeElement).toBe(buttonOf(el, "json"));
    formValueOf(el).focus();
    expect(document.activeElement).toBe(buttonOf(el, "json"));
    const none = make(`<neuwo-segmented><option value="a" disabled>A</option><option value="b">B</option></neuwo-segmented>`);
    none.focus();
    expect(document.activeElement).toBe(buttonOf(none, "b"));
  });

  it("disables every option and the form value in a disabled group, and ignores clicks and keys there", () => {
    const el = make(`<neuwo-segmented value="visual" disabled>${OPTS}</neuwo-segmented>`);
    expect(buttonsOf(el).every((button) => button.disabled)).toBe(true);
    expect(formValueOf(el).disabled).toBe(true);
    const heard = listen(el);
    buttonOf(el, "json").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    key(buttonOf(el, "visual"), "ArrowRight");
    expect(heard).toEqual([]);
    expect(el.value).toBe("visual");
    el.disabled = false;
    expect(buttonsOf(el).map((button) => button.disabled)).toEqual([false, false, true, false]);
    expect(stopOf(el)).toEqual(["visual"]);
  });

  it("shows an error on the pill and keeps data-* on the element", () => {
    const el = make(`<neuwo-segmented label="View" error="Choose a view" data-testid="view" title="View">${OPTS}</neuwo-segmented>`);
    expect(groupOf(el).classList.contains("neuwo-segmented--error")).toBe(true);
    expect(groupOf(el).getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(groupOf(el).getAttribute("aria-describedby"))).toBe(errorOf(el));
    expect(errorOf(el).textContent).toBe("Choose a view");
    expect(groupOf(el).getAttribute("title")).toBe("View");
    expect(el.querySelectorAll('[data-testid="view"]')).toHaveLength(0);
    el.setAttribute("error-muted", "");
    expect(groupOf(el).classList.contains("neuwo-segmented--error")).toBe(false);
  });

  it("reserves the error line by default, drops it under no-error-line, and reflects the property", () => {
    const bare = make(`<neuwo-segmented no-error-line value="visual">${OPTS}</neuwo-segmented>`);
    expect(errorOf(bare)).toBeNull();
    expect(bare.noErrorLine).toBe(true);
    bare.noErrorLine = false;
    expect(bare.hasAttribute("no-error-line")).toBe(false);
    expect(errorOf(bare)).not.toBeNull();
  });

  it("keeps a pick through an error change, which writes nothing to the buttons", () => {
    const el = make(`<neuwo-segmented value="visual">${OPTS}</neuwo-segmented>`);
    buttonOf(el, "json").click();
    const stops = buttonsOf(el).map(watch);
    el.setAttribute("error", "Pick again");
    expect(stops.flatMap((stop) => stop())).toEqual([]);
    expect(el.value).toBe("json");
    expect(checkedOf(el)).toEqual(["json"]);
  });

  it("renders a button for an option appended to the element, in one reconcile, and keeps the pick", async () => {
    const el = make(`<neuwo-segmented value="visual">${OPTS}</neuwo-segmented>`);
    buttonOf(el, "json").click();
    const updated = vi.spyOn(el, "updated");
    const option = document.createElement("option");
    option.value = "chart";
    option.textContent = "Chart";
    el.append(option);
    await settled();
    expect(buttonOf(el, "chart").textContent).toBe("Chart");
    expect(selectOf(el).lastElementChild).toBe(option);
    expect(checkedOf(el)).toEqual(["json"]);
    expect(updated).toHaveBeenCalledTimes(1);
  });

  it("clears the value when the selected option goes, and follows an edit of an option's text", async () => {
    const el = make(`<neuwo-segmented value="visual">${OPTS}</neuwo-segmented>`);
    el.value = "json";
    el.querySelector('option[value="table"]').textContent = "Grid";
    el.querySelector('option[value="json"]').remove();
    await settled();
    expect(buttonOf(el, "json")).toBeUndefined();
    expect(buttonOf(el, "table").textContent).toBe("Grid");
    expect(el.value).toBe("");
    expect(checkedOf(el)).toEqual([]);
  });
});

describe("<neuwo-segmented> form", () => {
  it("submits through the native form value with JavaScript off, from value and from a selected option", () => {
    const page = new Window();
    cleanup.push(() => page.happyDOM.close());
    page.document.body.innerHTML = expand(
      `<form id="f">` +
        `<neuwo-segmented name="view" value="json" label="View">${OPTS}</neuwo-segmented>` +
        `<neuwo-segmented name="density"><option value="compact">Compact</option><option value="comfortable" selected>Comfortable</option></neuwo-segmented>` +
        `<neuwo-segmented name="none">${OPTS}</neuwo-segmented>` +
        `<neuwo-segmented name="off" value="json" disabled>${OPTS}</neuwo-segmented>` +
        `<neuwo-segmented value="json">${OPTS}</neuwo-segmented>` +
        `</form>` +
        `<neuwo-segmented name="outside" form="f" value="table">${OPTS}</neuwo-segmented>`,
    );
    expect(page.customElements.get("neuwo-segmented")).toBeUndefined();
    const form = page.document.querySelector("form");
    expect([...new page.FormData(form)]).toEqual([
      ["view", "json"],
      ["density", "comfortable"],
      ["none", ""],
      ["outside", "table"],
    ]);
    const checked = Array.from(page.document.querySelectorAll('[aria-checked="true"]'), (button) => button.textContent);
    expect(checked).toEqual(["JSON", "Comfortable", "JSON", "JSON", "Table"]);
  });

  it("submits the live value after a pick", () => {
    const form = make(`<form><neuwo-segmented name="view" value="visual">${OPTS}</neuwo-segmented></form>`);
    buttonOf(form.querySelector("neuwo-segmented"), "table").click();
    expect([...new FormData(form)]).toEqual([["view", "table"]]);
  });

  it("is invalid while required and empty, natively, and valid once a value is picked", () => {
    const form = make(`<form><neuwo-segmented name="view" required>${OPTS}</neuwo-segmented></form>`);
    const el = form.querySelector("neuwo-segmented");
    expect(groupOf(el).getAttribute("aria-required")).toBe("true");
    expect(form.checkValidity()).toBe(false);
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    buttonOf(el, "json").click();
    expect(el.checkValidity()).toBe(true);
    expect(form.checkValidity()).toBe(true);
  });

  it("returns to the starting option on a form reset and keeps error", async () => {
    const form = make(`<form><neuwo-segmented name="view" error="Pick one"><option value="a">A</option><option value="b" selected>B</option></neuwo-segmented></form>`);
    const el = form.querySelector("neuwo-segmented");
    expect(el.form).toBe(form);
    buttonOf(el, "a").click();
    expect(el.value).toBe("a");
    form.reset();
    await nextTask();
    expect(el.value).toBe("b");
    expect(checkedOf(el)).toEqual(["b"]);
    expect(stopOf(el)).toEqual(["b"]);
    expect(el.getAttribute("error")).toBe("Pick one");
  });

  it("keeps the form value's own input and change inside the element, and shows what was written to it", () => {
    const form = make(`<form><neuwo-segmented name="view" value="visual">${OPTS}</neuwo-segmented></form>`);
    const el = form.querySelector("neuwo-segmented");
    const heard = vi.fn();
    for (const name of ["input", "change"]) {
      el.addEventListener(name, heard);
      document.addEventListener(name, heard);
      cleanup.push(() => document.removeEventListener(name, heard));
    }
    const formValue = formValueOf(el);
    formValue.value = "table";
    formValue.dispatchEvent(new Event("input", { bubbles: true }));
    expect(checkedOf(el)).toEqual(["table"]);
    formValue.value = "raw";
    formValue.dispatchEvent(new Event("change", { bubbles: true }));
    expect(el.value).toBe("");
    expect(checkedOf(el)).toEqual([]);
    expect(heard).not.toHaveBeenCalled();
  });
});

describe("<neuwo-segmented> adoption", () => {
  it("adopts server markup without a mutation, its first paint already showing the selection", () => {
    const holder = document.createElement("div");
    holder.innerHTML = expand(`<neuwo-segmented name="view" value="json" label="View" error="Pick">${OPTS}</neuwo-segmented>`);
    const el = holder.firstElementChild;
    const buttons = buttonsOf(el);
    expect(checkedOf(el)).toEqual(["json"]);
    const stop = watch(holder);
    attach(holder);
    expect(stop()).toEqual([]);
    expect(el.value).toBe("json");
    expect(buttonsOf(el)).toEqual(buttons);
    expect(errorOf(el).id).toBe("neuwo-s1-error");
    expect(groupOf(el).getAttribute("aria-describedby")).toBe("neuwo-s1-error");
  });

  it("reconnects without a write to its markup", () => {
    const el = make(`<neuwo-segmented value="json">${OPTS}</neuwo-segmented>`);
    const parent = el.parentNode;
    el.remove();
    const stop = watch(el);
    parent.append(el);
    expect(stop()).toEqual([]);
  });
});

describe("<neuwo-segmented> indicator", () => {
  class FakeResizeObserver {
    static made = [];
    constructor(callback) {
      this.callback = callback;
      this.targets = [];
      FakeResizeObserver.made.push(this);
    }
    observe(target) {
      this.targets.push(target);
    }
    unobserve() {}
    disconnect() {
      this.targets = [];
    }
  }

  const stubResize = () => {
    FakeResizeObserver.made = [];
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  };

  it("is not placed on connect, adoption, a value set from a script or a reset, so the selected option shows its own background", async () => {
    stubResize();
    const form = make(`<form><neuwo-segmented value="json">${OPTS}</neuwo-segmented></form>`);
    const el = form.querySelector("neuwo-segmented");
    const holder = document.createElement("div");
    holder.innerHTML = expand(`<neuwo-segmented value="json">${OPTS}</neuwo-segmented>`);
    attach(holder);
    el.value = "table";
    form.reset();
    await nextTask();
    for (const each of [el, holder.firstElementChild]) {
      expect(placed(each)).toBe(false);
      expect(indicatorOf(each).getAttribute("style")).toBeNull();
    }
    expect(FakeResizeObserver.made).toEqual([]);
  });

  it("is placed by the first pick, then follows the selection, and watches for resizes only from then on", () => {
    stubResize();
    const el = make(`<neuwo-segmented value="visual">${OPTS}</neuwo-segmented>`);
    const indicator = indicatorOf(el);
    buttonOf(el, "json").click();
    expect(placed(el)).toBe(true);
    expect(indicator.style.width).toMatch(/px$/);
    expect(indicator.style.height).toMatch(/px$/);
    expect(indicator.style.transform).toMatch(/^translate\(/);
    expect(FakeResizeObserver.made).toHaveLength(1);
    expect(FakeResizeObserver.made[0].targets).toEqual([groupOf(el)]);
    el.value = "table";
    expect(placed(el)).toBe(true);
    el.value = "raw";
    expect(placed(el)).toBe(false);
    el.value = "visual";
    expect(placed(el)).toBe(true);
  });

  it("is placed by a keyboard pick, and by a pick with nothing selected before", () => {
    const el = make(`<neuwo-segmented>${OPTS}</neuwo-segmented>`);
    key(buttonOf(el, "visual"), " ");
    expect(placed(el)).toBe(true);
    const other = make(`<neuwo-segmented value="json">${OPTS}</neuwo-segmented>`);
    key(buttonOf(other, "json"), "ArrowLeft");
    expect(placed(other)).toBe(true);
  });

  it("re-places the pill on a resize while it is shown, writing only what differs, and stops watching once disconnected", () => {
    stubResize();
    const el = make(`<neuwo-segmented value="visual">${OPTS}</neuwo-segmented>`);
    buttonOf(el, "json").click();
    const [observer] = FakeResizeObserver.made;
    const stop = watch(indicatorOf(el));
    observer.callback([]);
    expect(stop()).toEqual([]);
    indicatorOf(el).style.width = "1234px";
    observer.callback([]);
    expect(indicatorOf(el).style.width).not.toBe("1234px");
    el.remove();
    expect(observer.targets).toEqual([]);
  });

  it("hides the pill while the control is disabled, so the selection shows its own dimmed background, and brings it back", () => {
    const el = make(`<neuwo-segmented value="visual">${OPTS}</neuwo-segmented>`);
    buttonOf(el, "json").click();
    el.disabled = true;
    expect(placed(el)).toBe(false);
    expect(checkedOf(el)).toEqual(["json"]);
    el.disabled = false;
    expect(placed(el)).toBe(true);
  });

  it("leaves the pill alone on an attribute change that touches no template value of its own", () => {
    const el = make(`<neuwo-segmented value="visual">${OPTS}</neuwo-segmented>`);
    buttonOf(el, "json").click();
    el.setAttribute("error", "Pick again");
    el.setAttribute("label", "View");
    expect(placed(el)).toBe(true);
    expect(indicatorOf(el).style.transform).toMatch(/^translate\(/);
  });
});
