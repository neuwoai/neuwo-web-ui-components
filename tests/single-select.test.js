import { describe, expect, it } from "vitest";
import { NeuwoSingleSelect } from "../src/components/selection/single-select.js";

// A minimal concrete single-select that renders its options as <button> handles
// from light-DOM <option> children, exercising the base in isolation.
class TestSelect extends NeuwoSingleSelect {
  static formAssociated = true;
  static observedAttributes = NeuwoSingleSelect.observedAttributes;
  #buttons = [];
  get groupClass() { return "ts"; }
  get accentClass() { return "ts--error"; }
  syncLabel(group) {
    const label = this.getAttribute("label");
    if (label) group.setAttribute("aria-label", label);
    else group.removeAttribute("aria-label");
  }
  renderOptions() {
    const data = [...this.querySelectorAll(":scope > option")].map((o) => ({
      value: o.getAttribute("value"),
      label: o.textContent,
      disabled: o.hasAttribute("disabled"),
    }));
    this.group.replaceChildren(
      ...data.map((d) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ts__option";
        b.setAttribute("role", "radio");
        b.dataset.value = d.value;
        b.textContent = d.label;
        if (d.disabled) b.setAttribute("data-own-disabled", "");
        b.disabled = d.disabled;
        b.tabIndex = -1;
        return b;
      })
    );
    this.#buttons = [...this.group.querySelectorAll(".ts__option")];
  }
  readOptions() {
    return this.#buttons.map((b) => ({
      element: b,
      value: b.dataset.value,
      disabled: b.hasAttribute("data-own-disabled"),
      set checked(on) { b.setAttribute("aria-checked", on ? "true" : "false"); },
      set tabbable(on) { b.tabIndex = on ? 0 : -1; },
      set disabledByGroup(on) { b.disabled = on || b.hasAttribute("data-own-disabled"); },
      focus() { b.focus(); },
    }));
  }
  initialValue() {
    const sel = this.querySelector(":scope > option[selected]");
    return sel ? sel.getAttribute("value") : "";
  }
}
customElements.define("test-select", TestSelect);

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}
const OPTS = `<option value="a">A</option><option value="b">B</option><option value="c" disabled>C</option>`;
function buttons(el) { return [...el.shadowRoot.querySelectorAll(".ts__option")]; }
function keydown(el, key) {
  const b = el.shadowRoot.querySelector('[tabindex="0"]') || buttons(el)[0];
  b.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

describe("NeuwoSingleSelect", () => {
  it("renders a radiogroup of options", () => {
    const el = make(`<test-select>${OPTS}</test-select>`);
    expect(el.group.getAttribute("role")).toBe("radiogroup");
    expect(buttons(el).length).toBe(3);
  });

  it("selects the option named by the value attribute", () => {
    const el = make(`<test-select value="b">${OPTS}</test-select>`);
    expect(el.value).toBe("b");
    const selected = buttons(el).find((b) => b.getAttribute("aria-checked") === "true");
    expect(selected.dataset.value).toBe("b");
  });

  it("selects the option marked selected when no value attribute is set", () => {
    const el = make(`<test-select><option value="a">A</option><option value="b" selected>B</option></test-select>`);
    expect(el.value).toBe("b");
  });

  it("makes the selected option the only tabbable one", () => {
    const el = make(`<test-select value="b">${OPTS}</test-select>`);
    expect(buttons(el).map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
  });

  it("makes the first enabled option tabbable when nothing is selected", () => {
    const el = make(`<test-select>${OPTS}</test-select>`);
    expect(buttons(el)[0].tabIndex).toBe(0);
  });

  it("fails required validity until a value is set", () => {
    const el = make(`<test-select required>${OPTS}</test-select>`);
    expect(el.checkValidity()).toBe(false);
    el.value = "a";
    expect(el.checkValidity()).toBe(true);
  });

  it("moves and selects with ArrowDown, wrapping and skipping disabled", () => {
    const el = make(`<test-select value="a">${OPTS}</test-select>`);
    keydown(el, "ArrowDown"); // a -> b
    expect(el.value).toBe("b");
    keydown(el, "ArrowDown"); // b -> wraps past disabled c to a
    expect(el.value).toBe("a");
  });

  it("moves backwards with ArrowUp", () => {
    const el = make(`<test-select value="a">${OPTS}</test-select>`);
    keydown(el, "ArrowUp"); // a -> wraps to last enabled (b)
    expect(el.value).toBe("b");
  });

  it("selects on click and emits change", () => {
    const el = make(`<test-select>${OPTS}</test-select>`);
    let changed = false;
    el.addEventListener("change", () => (changed = true));
    buttons(el).find((b) => b.dataset.value === "b").click();
    expect(el.value).toBe("b");
    expect(changed).toBe(true);
  });

  it("ignores clicks on disabled options", () => {
    const el = make(`<test-select>${OPTS}</test-select>`);
    buttons(el).find((b) => b.dataset.value === "c").click();
    expect(el.value).toBe("");
  });

  it("restores the default selection on form reset", () => {
    const el = make(`<test-select value="a">${OPTS}</test-select>`);
    el.value = "b";
    el.formResetCallback();
    expect(el.value).toBe("a");
  });

  it("reflects added options via the observer", () => {
    const el = make(`<test-select>${OPTS}</test-select>`);
    const opt = document.createElement("option");
    opt.value = "d";
    opt.textContent = "D";
    el.appendChild(opt);
    return Promise.resolve().then(() => {
      expect(buttons(el).map((b) => b.dataset.value)).toContain("d");
    });
  });

  it("does not fire change when value is set programmatically", () => {
    const el = make(`<test-select>${OPTS}</test-select>`);
    let changed = false;
    el.addEventListener("change", () => (changed = true));
    el.value = "b";
    expect(el.value).toBe("b");
    expect(changed).toBe(false);
  });

  it("selects the focused option on Space", () => {
    const el = make(`<test-select>${OPTS}</test-select>`);
    keydown(el, " ");
    expect(el.value).toBe("a");
  });

  it("drops the accent when error-muted is added (message and invalid state stay), re-arms when removed", () => {
    const el = make(`<test-select error="Pick one">${OPTS}</test-select>`);
    const line = el.shadowRoot.querySelector(".control-error");
    expect(el.group.classList.contains("ts--error")).toBe(true);
    expect(el.group.getAttribute("aria-invalid")).toBe("true");

    el.setAttribute("error-muted", "");
    expect(line.textContent).toBe("Pick one"); // red message stays
    expect(el.group.classList.contains("ts--error")).toBe(false); // accent dropped
    expect(el.group.getAttribute("aria-invalid")).toBe("true"); // still invalid

    el.removeAttribute("error-muted");
    expect(el.group.classList.contains("ts--error")).toBe(true); // re-armed
    expect(el.group.getAttribute("aria-invalid")).toBe("true");
  });
});
