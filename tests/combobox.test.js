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
