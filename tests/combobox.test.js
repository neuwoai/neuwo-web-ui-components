import { describe, expect, it } from "vitest";
import "../src/components/fields/combobox/neuwo-combobox.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

const OPTS = `<option value="a">Apple</option><option value="b">Banana</option><option value="c" disabled>Cherry</option>`;

describe("<neuwo-combobox> core", () => {
  it("renders a combobox trigger and a listbox of options", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    const trigger = el.shadowRoot.querySelector(".combobox__trigger");
    expect(trigger.getAttribute("role")).toBe("combobox");
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
    const listbox = el.shadowRoot.querySelector('[role="listbox"]');
    expect(trigger.getAttribute("aria-controls")).toBe(listbox.id);
    expect(listbox.querySelectorAll('[role="option"]').length).toBe(3);
  });

  it("shows the placeholder when nothing is selected", () => {
    const el = make(`<neuwo-combobox placeholder="Pick one">${OPTS}</neuwo-combobox>`);
    const trigger = el.shadowRoot.querySelector(".combobox__trigger");
    expect(trigger.textContent).toContain("Pick one");
    expect(trigger.hasAttribute("data-placeholder")).toBe(true);
  });

  it("selects the option named by the value attribute and exposes it", () => {
    const el = make(`<neuwo-combobox value="b">${OPTS}</neuwo-combobox>`);
    expect(el.value).toBe("b");
    const trigger = el.shadowRoot.querySelector(".combobox__trigger");
    expect(trigger.textContent).toContain("Banana");
    const selected = el.shadowRoot.querySelector('[role="option"][aria-selected="true"]');
    expect(selected.dataset.value).toBe("b");
  });

  it("marks disabled options aria-disabled", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    const cherry = [...el.shadowRoot.querySelectorAll('[role="option"]')].find(
      (o) => o.dataset.value === "c"
    );
    expect(cherry.getAttribute("aria-disabled")).toBe("true");
  });

  it("makes required validity fail until a value is set", () => {
    const el = make(`<neuwo-combobox required>${OPTS}</neuwo-combobox>`);
    expect(el.checkValidity()).toBe(false);
    el.value = "a";
    expect(el.checkValidity()).toBe(true);
  });

  it("is a form-associated element", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    expect(el.constructor.formAssociated).toBe(true);
  });

  it("selects the option marked selected when no value attribute is set", () => {
    const el = make(`<neuwo-combobox><option value="a">Apple</option><option value="b" selected>Banana</option></neuwo-combobox>`);
    expect(el.value).toBe("b");
    expect(el.shadowRoot.querySelector(".combobox__trigger").textContent).toContain("Banana");
  });

  it("exposes an optgroup as a labelled role=group containing its options", () => {
    const el = make(`<neuwo-combobox><option value="a">Apple</option><optgroup label="Citrus"><option value="o">Orange</option></optgroup></neuwo-combobox>`);
    const group = el.shadowRoot.querySelector('[role="group"]');
    expect(group).toBeTruthy();
    const labelId = group.getAttribute("aria-labelledby");
    expect(el.shadowRoot.getElementById(labelId).textContent).toBe("Citrus");
    expect(group.querySelector('[role="option"]').dataset.value).toBe("o");
  });

  it("names the listbox by the field label", () => {
    const el = make(`<neuwo-combobox label="Fruit">${OPTS}</neuwo-combobox>`);
    const listbox = el.shadowRoot.querySelector('[role="listbox"]');
    const labelId = listbox.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(el.shadowRoot.getElementById(labelId).textContent).toBe("Fruit");
  });
});

describe("<neuwo-combobox> open/close", () => {
  it("removes aria-activedescendant when closed", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    const trigger = el.shadowRoot.querySelector(".combobox__trigger");
    el.open();
    expect(trigger.hasAttribute("aria-activedescendant")).toBe(true);
    el.close();
    expect(trigger.hasAttribute("aria-activedescendant")).toBe(false);
  });

  it("toggles aria-expanded and open state when the trigger is clicked", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    const trigger = el.shadowRoot.querySelector(".combobox__trigger");
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
    el.shadowRoot.querySelector(".combobox__trigger").click();
    expect(el.isOpen).toBe(false);
  });

  it("does not open when there are no options", () => {
    const el = make(`<neuwo-combobox></neuwo-combobox>`);
    el.shadowRoot.querySelector(".combobox__trigger").click();
    expect(el.isOpen).toBe(false);
  });

  it("mirrors a browser-driven popover dismissal back into its state", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    el.open();
    expect(el.isOpen).toBe(true);
    const popup = el.shadowRoot.querySelector(".combobox__popup");
    const ev = new Event("toggle");
    ev.newState = "closed";
    popup.dispatchEvent(ev);
    expect(el.isOpen).toBe(false);
    expect(el.shadowRoot.querySelector(".combobox__trigger").getAttribute("aria-expanded")).toBe("false");
  });
});

describe("<neuwo-combobox> keyboard + selection", () => {
  function key(el, k) {
    el.shadowRoot
      .querySelector(".combobox__trigger")
      .dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  }

  it("opens and highlights the first option on ArrowDown", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    key(el, "ArrowDown");
    expect(el.isOpen).toBe(true);
    const active = el.shadowRoot.querySelector(".combobox__option.is-active");
    expect(active.dataset.value).toBe("a");
    expect(el.shadowRoot.querySelector(".combobox__trigger").getAttribute("aria-activedescendant")).toBe(active.id);
  });

  it("skips disabled options when navigating", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    key(el, "ArrowDown"); // a
    key(el, "ArrowDown"); // b
    key(el, "ArrowDown"); // c is disabled -> stays on b
    expect(el.shadowRoot.querySelector(".combobox__option.is-active").dataset.value).toBe("b");
  });

  it("commits the highlighted option on Enter and emits change", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    let changed = false;
    el.addEventListener("change", () => (changed = true));
    key(el, "ArrowDown"); // open, highlight a
    key(el, "Enter");
    expect(el.value).toBe("a");
    expect(el.isOpen).toBe(false);
    expect(changed).toBe(true);
  });

  it("reverts on Escape", () => {
    const el = make(`<neuwo-combobox value="b">${OPTS}</neuwo-combobox>`);
    key(el, "ArrowDown"); // open
    key(el, "ArrowUp"); // move highlight
    key(el, "Escape");
    expect(el.isOpen).toBe(false);
    expect(el.value).toBe("b");
  });

  it("selects an option on click", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    el.open();
    const banana = [...el.shadowRoot.querySelectorAll(".combobox__option")].find((o) => o.dataset.value === "b");
    banana.click();
    expect(el.value).toBe("b");
    expect(el.isOpen).toBe(false);
  });

  it("does not change the value while navigating (commit model)", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    key(el, "ArrowDown"); // highlight a
    key(el, "ArrowDown"); // highlight b
    expect(el.value).toBe(""); // highlight moved, nothing committed
  });

  it("opens at the last selectable option when ArrowUp is pressed while closed", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    key(el, "ArrowUp");
    expect(el.isOpen).toBe(true);
    expect(el.shadowRoot.querySelector(".combobox__option.is-active").dataset.value).toBe("b");
  });

  it("jumps to first and last selectable options with Home and End", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    el.open();
    key(el, "End");
    expect(el.shadowRoot.querySelector(".combobox__option.is-active").dataset.value).toBe("b");
    key(el, "Home");
    expect(el.shadowRoot.querySelector(".combobox__option.is-active").dataset.value).toBe("a");
  });

  it("opens and typeahead-jumps to a matching option", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    key(el, "b");
    expect(el.isOpen).toBe(true);
    expect(el.shadowRoot.querySelector(".combobox__option.is-active").dataset.value).toBe("b");
  });

  it("commits the highlighted option on Tab", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    key(el, "ArrowDown"); // open, highlight a
    key(el, "Tab");
    expect(el.value).toBe("a");
    expect(el.isOpen).toBe(false);
  });

  it("navigates into grouped options with the keyboard", () => {
    const el = make(`<neuwo-combobox><option value="a">Apple</option><optgroup label="Citrus"><option value="o">Orange</option></optgroup></neuwo-combobox>`);
    key(el, "ArrowDown"); // open, highlight Apple
    key(el, "ArrowDown"); // move into the grouped Orange option
    expect(el.shadowRoot.querySelector(".combobox__option.is-active").dataset.value).toBe("o");
  });

  it("ignores clicks on disabled options", () => {
    const el = make(`<neuwo-combobox>${OPTS}</neuwo-combobox>`);
    el.open();
    const cherry = [...el.shadowRoot.querySelectorAll(".combobox__option")].find((o) => o.dataset.value === "c");
    cherry.click();
    expect(el.value).toBe("");
    expect(el.isOpen).toBe(true);
  });
});

describe("<neuwo-combobox searchable>", () => {
  const FRUIT = `<option value="apple">Apple</option><option value="apricot">Apricot</option><option value="banana">Banana</option>`;

  it("renders a text input trigger with aria-autocomplete", () => {
    const el = make(`<neuwo-combobox searchable>${FRUIT}</neuwo-combobox>`);
    const trigger = el.shadowRoot.querySelector(".combobox__trigger");
    expect(trigger.tagName).toBe("INPUT");
    expect(trigger.getAttribute("aria-autocomplete")).toBe("list");
  });

  it("opens on focus", () => {
    const el = make(`<neuwo-combobox searchable>${FRUIT}</neuwo-combobox>`);
    el.shadowRoot.querySelector(".combobox__trigger").dispatchEvent(new Event("focus"));
    expect(el.isOpen).toBe(true);
  });

  it("filters options as you type", () => {
    const el = make(`<neuwo-combobox searchable>${FRUIT}</neuwo-combobox>`);
    const input = el.shadowRoot.querySelector(".combobox__trigger");
    input.value = "ap";
    input.dispatchEvent(new Event("input"));
    const visible = [...el.shadowRoot.querySelectorAll(".combobox__option")].filter(
      (o) => o.hidden === false
    );
    expect(visible.map((o) => o.dataset.value)).toEqual(["apple", "apricot"]);
  });

  it("shows the empty state when nothing matches", () => {
    const el = make(`<neuwo-combobox searchable>${FRUIT}</neuwo-combobox>`);
    const input = el.shadowRoot.querySelector(".combobox__trigger");
    input.value = "zzz";
    input.dispatchEvent(new Event("input"));
    expect(el.shadowRoot.querySelector(".combobox__empty")).toBeTruthy();
  });

  it("shows the selected label in the input after commit", () => {
    const el = make(`<neuwo-combobox searchable>${FRUIT}</neuwo-combobox>`);
    el.value = "banana";
    const input = el.shadowRoot.querySelector(".combobox__trigger");
    expect(input.value).toBe("Banana");
  });

  it("does not commit on Space in searchable mode (space is a filter character)", () => {
    const el = make(`<neuwo-combobox searchable>${FRUIT}</neuwo-combobox>`);
    el.open();
    const trigger = el.shadowRoot.querySelector(".combobox__trigger");
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
    expect(el.isOpen).toBe(true); // Space did not commit/close
    expect(el.value).toBe("");
  });

  it("highlights the current selection when opened by focus", () => {
    const el = make(`<neuwo-combobox searchable value="banana">${FRUIT}</neuwo-combobox>`);
    el.shadowRoot.querySelector(".combobox__trigger").dispatchEvent(new Event("focus"));
    expect(el.shadowRoot.querySelector(".combobox__option.is-active").dataset.value).toBe("banana");
  });

  it("clears the filter, empty state and reverts the label on close", () => {
    const el = make(`<neuwo-combobox searchable value="banana">${FRUIT}</neuwo-combobox>`);
    const input = el.shadowRoot.querySelector(".combobox__trigger");
    input.value = "zzz";
    input.dispatchEvent(new Event("input")); // opens and filters to nothing
    expect(el.shadowRoot.querySelector(".combobox__empty")).toBeTruthy();
    el.close();
    expect(el.shadowRoot.querySelector(".combobox__empty")).toBeNull();
    expect([...el.shadowRoot.querySelectorAll(".combobox__option")].every((o) => o.hidden === false)).toBe(true);
    expect(input.value).toBe("Banana"); // reverted to the selected label
  });

  it("reverts free text in the input on blur", () => {
    const el = make(`<neuwo-combobox searchable value="banana">${FRUIT}</neuwo-combobox>`);
    const input = el.shadowRoot.querySelector(".combobox__trigger");
    input.value = "free text";
    input.dispatchEvent(new Event("blur"));
    expect(input.value).toBe("Banana"); // free text discarded, selected label restored
  });

  it("navigation skips filtered-out options", () => {
    const el = make(`<neuwo-combobox searchable>${FRUIT}</neuwo-combobox>`);
    const input = el.shadowRoot.querySelector(".combobox__trigger");
    input.value = "ban";
    input.dispatchEvent(new Event("input")); // only Banana visible
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    expect(el.shadowRoot.querySelector(".combobox__option.is-active").dataset.value).toBe("banana");
  });
});
