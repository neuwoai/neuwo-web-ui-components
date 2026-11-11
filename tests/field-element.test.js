import { afterEach, describe, expect, it, vi } from "vitest";
import { NeuwoElement } from "../src/core/element.js";
import { CONTROLLED } from "../src/core/marks.js";
import { control, h } from "../src/core/template.js";
import { NeuwoFieldElement } from "../src/components/fields/field-element.js";
import { controlAttrs, controlClass, fieldTemplate } from "../src/components/fields/field.template.js";

class TestField extends NeuwoFieldElement {
  static template = (attrs, ctx) =>
    fieldTemplate(attrs, ctx, control(h("input", { class: controlClass(attrs), ...controlAttrs(attrs, ctx, ["name", "placeholder", "required", "value"]) })));
}
customElements.define("test-field", TestField);

class ResetField extends TestField {
  resets = [];
  formReset() {
    this.resets.push(this.value);
  }
}
customElements.define("reset-field", ResetField);

class AimedField extends TestField {
  get focusTarget() {
    return this.querySelector('[slot="label"] button');
  }
}
customElements.define("aimed-field", AimedField);

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

const inputOf = (el) => el.querySelector(":scope > .neuwo-field > .neuwo-input");
const fieldOf = (el) => el.querySelector(":scope > .neuwo-field");
const labelOf = (el) => el.querySelector(":scope > .neuwo-field > .neuwo-field__label");
const errorOf = (el) => el.querySelector(":scope > .neuwo-field > .neuwo-field__error");

describe("NeuwoFieldElement", () => {
  it("is a light DOM element with no form association, internals or focus delegation", () => {
    // happy-dom has no attachInternals, so a stand-in records any call.
    const internals = vi.fn();
    HTMLElement.prototype.attachInternals = internals;
    cleanup.push(() => delete HTMLElement.prototype.attachInternals);
    const el = make(`<test-field></test-field>`);
    expect(Object.getPrototypeOf(NeuwoFieldElement)).toBe(NeuwoElement);
    expect(el.shadowRoot).toBeNull();
    expect(internals).not.toHaveBeenCalled();
    expect(NeuwoFieldElement.formAssociated).toBeUndefined();
    expect("delegatesFocus" in NeuwoFieldElement).toBe(false);
    expect(el.querySelector("[part]")).toBeNull();
  });

  it("renders the control inside a .neuwo-field wrapper", () => {
    const el = make(`<test-field></test-field>`);
    expect(Array.from(fieldOf(el).children, (node) => node.className)).toEqual([
      "neuwo-field__label neuwo-field__label--empty",
      "neuwo-input",
      "neuwo-field__error",
    ]);
  });

  it("finds its own control, not one nested in its label", () => {
    const el = make(`<test-field><span slot="label">Outer <test-field value="inner"></test-field></span></test-field>`);
    const inner = el.querySelector(".neuwo-field__label test-field");
    expect(el.control).toBe(inputOf(el));
    expect(inner.control).toBe(inputOf(inner));
    expect(el.control).not.toBe(inner.control);
    expect(inner.value).toBe("inner");
    expect(el.value).toBe("");
  });

  it("has no control before it renders", () => {
    expect(document.createElement("test-field").control).toBeNull();
  });

  it("associates the label with the control", () => {
    const el = make(`<test-field label="Work email"></test-field>`);
    expect(labelOf(el).getAttribute("for")).toBe(inputOf(el).id);
    expect(labelOf(el).textContent).toBe("Work email");
    expect(labelOf(el).classList.contains("neuwo-field__label--empty")).toBe(false);
  });

  it("moves slotted label content into the associated label, and drops the attribute text", () => {
    const el = make(`<test-field label="Ignored"><span slot="label">Work email <a href="#why">why?</a></span></test-field>`);
    const content = labelOf(el).querySelector(".neuwo-field__label-content");
    expect(content.firstElementChild.getAttribute("slot")).toBe("label");
    expect(labelOf(el).querySelector(".neuwo-field__label-text")).toBeNull();
    expect(labelOf(el).textContent).toBe("Work email why?");
  });

  it("switches between the attribute text and slotted content as either changes", () => {
    const el = make(`<test-field label="Plain"></test-field>`);
    const span = document.createElement("span");
    span.slot = "label";
    span.textContent = "Rich";
    el.append(span);
    el.refresh();
    expect(labelOf(el).textContent).toBe("Rich");
    span.remove();
    el.refresh();
    expect(labelOf(el).textContent).toBe("Plain");
    el.removeAttribute("label");
    expect(labelOf(el).classList.contains("neuwo-field__label--empty")).toBe(true);
  });

  it("marks a required field after its label content", () => {
    const el = make(`<test-field required><span slot="label">Work email</span></test-field>`);
    const star = labelOf(el).querySelector(".neuwo-field__required");
    expect(star.previousElementSibling.className).toBe("neuwo-field__label-content");
    expect(star.getAttribute("aria-hidden")).toBe("true");
    expect(star.textContent).toBe("*");
    expect(labelOf(make(`<test-field required></test-field>`)).querySelector(".neuwo-field__required")).toBeNull();
  });

  it("forwards name, placeholder and required to the control", () => {
    const control = inputOf(make(`<test-field name="email" placeholder="you@x.com" required></test-field>`));
    expect(control.getAttribute("name")).toBe("email");
    expect(control.getAttribute("placeholder")).toBe("you@x.com");
    expect(control.hasAttribute("required")).toBe(true);
  });

  it("starts the control from the value attribute and reads the live value", () => {
    const el = make(`<test-field value="hi"></test-field>`);
    expect(inputOf(el).value).toBe("hi");
    expect(el.value).toBe("hi");
    el.value = "bye";
    expect(inputOf(el).value).toBe("bye");
    expect(el.value).toBe("bye");
    expect(el.getAttribute("value")).toBe("hi");
  });

  it("keeps a value set before the first render and applies it as a property on connect", () => {
    const el = document.createElement("test-field");
    el.setAttribute("value", "default");
    el.value = "early";
    expect(el.value).toBe("early");
    attach(el);
    expect(inputOf(el).value).toBe("early");
    expect(inputOf(el).getAttribute("value")).toBe("default");
    expect(el.value).toBe("early");
  });

  it("writes nothing for a value set while React controls it", () => {
    const el = make(`<test-field value="a"></test-field>`);
    el[CONTROLLED] = true;
    el.value = "b";
    expect(inputOf(el).value).toBe("a");
    el[CONTROLLED] = false;
    el.value = "c";
    expect(inputOf(el).value).toBe("c");
  });

  it("reflects defaultValue to the value attribute", () => {
    const el = make(`<test-field value="a"></test-field>`);
    expect(el.defaultValue).toBe("a");
    el.defaultValue = "b";
    expect(el.getAttribute("value")).toBe("b");
    expect(inputOf(el).getAttribute("value")).toBe("b");
    expect(make(`<test-field></test-field>`).defaultValue).toBe("");
  });

  it("reflects name to the attribute and the control", () => {
    const el = make(`<test-field></test-field>`);
    expect(el.name).toBe("");
    el.name = "q";
    expect(el.getAttribute("name")).toBe("q");
    expect(inputOf(el).name).toBe("q");
    el.name = null;
    expect(el.hasAttribute("name")).toBe(false);
    expect(inputOf(el).hasAttribute("name")).toBe(false);
  });

  it("reflects disabled to the attribute and the control", () => {
    const el = make(`<test-field></test-field>`);
    expect(el.disabled).toBe(false);
    el.disabled = true;
    expect(el.hasAttribute("disabled")).toBe(true);
    expect(inputOf(el).disabled).toBe(true);
    el.disabled = false;
    expect(inputOf(el).disabled).toBe(false);
  });

  it("applies the error look and renders the message wired by aria-describedby", () => {
    const el = make(`<test-field error="Required"></test-field>`);
    expect(inputOf(el).classList.contains("neuwo-input--error")).toBe(true);
    expect(errorOf(el).textContent).toBe("Required");
    expect(inputOf(el).getAttribute("aria-describedby")).toBe(errorOf(el).id);
    expect(inputOf(el).getAttribute("aria-invalid")).toBe("true");
  });

  it("sets aria-invalid but no description for a bare error", () => {
    const control = inputOf(make(`<test-field error></test-field>`));
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(control.hasAttribute("aria-describedby")).toBe(false);
  });

  it("clears the error state when the attribute is removed, keeping the reserved line", () => {
    const el = make(`<test-field error="Required"></test-field>`);
    const line = errorOf(el);
    el.removeAttribute("error");
    expect(inputOf(el).classList.contains("neuwo-input--error")).toBe(false);
    expect(inputOf(el).hasAttribute("aria-invalid")).toBe(false);
    expect(inputOf(el).hasAttribute("aria-describedby")).toBe(false);
    expect(errorOf(el)).toBe(line);
    expect(line.textContent).toBe("");
  });

  it("softens a muted error to the message alone", () => {
    const el = make(`<test-field error="Required" error-muted></test-field>`);
    expect(inputOf(el).classList.contains("neuwo-input--error")).toBe(false);
    expect(inputOf(el).getAttribute("aria-invalid")).toBe("true");
    expect(errorOf(el).textContent).toBe("Required");
  });

  it("drops the reserved error line under no-error-line and reflects the property", () => {
    const el = make(`<test-field no-error-line></test-field>`);
    expect(errorOf(el)).toBeNull();
    expect(el.noErrorLine).toBe(true);
    el.noErrorLine = false;
    expect(el.hasAttribute("no-error-line")).toBe(false);
    expect(errorOf(el)).not.toBeNull();
  });

  it("takes a compact size on both the wrapper and the control", () => {
    const el = make(`<test-field size="sm"></test-field>`);
    expect(fieldOf(el).classList.contains("neuwo-field--sm")).toBe(true);
    expect(inputOf(el).classList.contains("neuwo-input--sm")).toBe(true);
    for (const markup of [`<test-field></test-field>`, `<test-field size="tiny"></test-field>`]) {
      const other = make(markup);
      expect(fieldOf(other).classList.contains("neuwo-field--sm")).toBe(false);
      expect(inputOf(other).classList.contains("neuwo-input--sm")).toBe(false);
    }
  });

  it("reflects the size property to the attribute and back", () => {
    const el = make(`<test-field></test-field>`);
    expect(el.size).toBe("");
    el.size = "sm";
    expect(el.getAttribute("size")).toBe("sm");
    expect(inputOf(el).classList.contains("neuwo-input--sm")).toBe(true);
    el.size = "";
    expect(el.hasAttribute("size")).toBe(false);
    expect(inputOf(el).classList.contains("neuwo-input--sm")).toBe(false);
  });

  it("runs formReset in the task after its form resets, once the starting value is back, and stops when it leaves", async () => {
    const form = make(`<form><reset-field name="a" value="seed"></reset-field></form>`);
    const el = form.querySelector("reset-field");
    inputOf(el).value = "typed";
    form.reset();
    expect(el.resets).toEqual([]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(el.resets).toEqual(["seed"]);
    el.remove();
    form.reset();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(el.resets).toEqual(["seed"]);
    const other = attach(document.createElement("form"));
    other.append(el);
    other.reset();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(el.resets).toEqual(["seed", "seed"]);
  });

  it("lets the control's native change reach a host listener exactly once", () => {
    const el = make(`<test-field></test-field>`);
    const heard = vi.fn();
    el.addEventListener("change", heard);
    inputOf(el).dispatchEvent(new Event("change", { bubbles: true }));
    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard.mock.calls[0][0].target).toBe(inputOf(el));
  });

  it("delegates the form, validity and its messages to the control", () => {
    const form = make(`<form><test-field required></test-field></form>`);
    const el = form.querySelector("test-field");
    expect(el.form).toBe(form);
    expect(el.validity).toBe(inputOf(el).validity);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.checkValidity()).toBe(false);
    expect(el.reportValidity()).toBe(false);
    el.value = "filled";
    expect(el.checkValidity()).toBe(true);
    el.setCustomValidity("Taken");
    expect(inputOf(el).validity.customError).toBe(true);
    expect(el.validationMessage).toBe("Taken");
    expect(el.checkValidity()).toBe(false);
  });

  it("reflects form to the attribute the control submits by", () => {
    const holder = make(`<div><form id="signup"></form><test-field name="q" value="a"></test-field></div>`);
    const el = holder.querySelector("test-field");
    expect(el.form).toBeNull();
    el.form = "signup";
    expect(el.getAttribute("form")).toBe("signup");
    expect(inputOf(el).getAttribute("form")).toBe("signup");
    expect(el.form).toBe(holder.querySelector("form"));
    expect([...new FormData(holder.querySelector("form"))]).toEqual([["q", "a"]]);
    el.form = null;
    expect(el.hasAttribute("form")).toBe(false);
    expect(el.form).toBeNull();
  });

  it("answers as valid with no form before it renders", () => {
    const el = document.createElement("test-field");
    expect(el.form).toBeNull();
    expect(el.checkValidity()).toBe(true);
    expect(el.reportValidity()).toBe(true);
    expect(el.validationMessage).toBe("");
  });

  it("focuses and blurs the control, passing the options on", () => {
    const el = make(`<test-field></test-field>`);
    const focus = vi.spyOn(inputOf(el), "focus");
    el.focus({ preventScroll: true });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(inputOf(el));
    el.blur();
    expect(document.activeElement).not.toBe(inputOf(el));
  });

  it("focuses the focusTarget a subclass names", () => {
    const el = make(`<aimed-field><span slot="label">Key <button type="button">?</button></span></aimed-field>`);
    el.focus();
    expect(document.activeElement).toBe(el.querySelector("button"));
  });
});
