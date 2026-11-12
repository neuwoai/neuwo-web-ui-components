import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { control, h } from "../src/core/template.js";
import { createRuntime } from "./fixtures/runtime.js";
import { CONTROLLED } from "../src/core/marks.js";
import { formTemplates } from "./fixtures/form-fields.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const MISSING_ON_CHANGE = "without an `onChange` handler";

const { jsx } = createRuntime(formTemplates);
const server = createRuntime(formTemplates, { markHost: false, server: true });

let cleanups = [];
afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
  vi.restoreAllMocks();
});

/** @param {unknown} element */
async function render(element) {
  const container = document.body.appendChild(document.createElement("div"));
  cleanups.push(() => container.remove());
  const root = createRoot(container);
  cleanups.unshift(() => act(() => root.unmount()));
  await act(async () => root.render(element));
  return { container, rerender: (/** @type {unknown} */ next) => act(async () => root.render(next)) };
}

/** @param {string} html */
function parse(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return holder;
}

/**
 * @param {HTMLInputElement | HTMLTextAreaElement} control
 * @param {string} value
 */
function type(control, value) {
  const prototype = control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value").set.call(control, value);
  control.dispatchEvent(new Event("input", { bubbles: true }));
}

const messages = (spy) => spy.mock.calls.map((args) => args.map(String).join(" "));

describe("React adapter: server render of a form control", () => {
  it("puts a controlled or a default value on the control and leaves no default prop on the host", () => {
    const errors = vi.spyOn(console, "error");
    for (const props of [{ value: "a", onChange() {} }, { defaultValue: "a" }]) {
      const holder = parse(renderToString(jsx("x-field", props)));
      const host = holder.querySelector("x-field");
      expect(host.querySelector(".x-field__input").getAttribute("value")).toBe("a");
      expect(host.querySelector(".x-field__filter").getAttribute("value")).toBe("f");
      expect(host.hasAttribute("defaultvalue")).toBe(false);
    }
    expect(errors).not.toHaveBeenCalled();
  });

  it("renders a textarea control's value as its text", () => {
    const errors = vi.spyOn(console, "error");
    for (const props of [{ value: "hi", onChange() {} }, { defaultValue: "hi" }]) {
      const holder = parse(renderToString(jsx("x-notes", props)));
      expect(holder.querySelector(".x-notes__input").outerHTML).toBe('<textarea class="x-notes__input">hi</textarea>');
      expect(holder.querySelector("x-notes").hasAttribute("defaultvalue")).toBe(false);
    }
    expect(errors).not.toHaveBeenCalled();
  });

  it("renders a checkbox control's checked state with its value as a plain attribute", () => {
    const errors = vi.spyOn(console, "error");
    for (const props of [{ value: "yes", checked: true, onChange() {} }, { value: "yes", defaultChecked: true }]) {
      const holder = parse(renderToString(jsx("x-check", props)));
      const input = holder.querySelector(".x-check__input");
      expect(input.hasAttribute("checked")).toBe(true);
      expect(input.getAttribute("value")).toBe("yes");
      expect(holder.querySelector("x-check").hasAttribute("defaultchecked")).toBe(false);
    }
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("React adapter: a controlled form control", () => {
  it("calls the host's onChange once per keystroke with the inner control as target and keeps the consumer's value", async () => {
    const errors = vi.spyOn(console, "error");
    const targets = [];
    const onChange = vi.fn((event) => void targets.push(event.target));
    const { container } = await render(jsx("x-field", { value: "a", onChange }));
    const input = container.querySelector(".x-field__input");
    expect(input.value).toBe("a");
    await act(async () => type(input, "ab"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(targets).toEqual([input]);
    expect(input.value).toBe("a");
    expect(errors).not.toHaveBeenCalled();
  });

  it("shows whatever the consumer's state says", async () => {
    const errors = vi.spyOn(console, "error");
    function Form() {
      const [value, setValue] = useState("a");
      return jsx("x-field", { value, onChange: (event) => setValue(event.target.value.toUpperCase()) });
    }
    const { container } = await render(jsx(Form, {}));
    const input = container.querySelector(".x-field__input");
    await act(async () => type(input, "ab"));
    expect(input.value).toBe("AB");
    await act(async () => type(input, "ABc"));
    expect(input.value).toBe("ABC");
    expect(errors).not.toHaveBeenCalled();
  });

  it("drives a textarea control from the consumer's value", async () => {
    const errors = vi.spyOn(console, "error");
    const onChange = vi.fn();
    const { container, rerender } = await render(jsx("x-notes", { value: "hi", onChange }));
    const textarea = container.querySelector(".x-notes__input");
    expect(textarea.value).toBe("hi");
    await act(async () => type(textarea, "hit"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(textarea.value).toBe("hi");
    await rerender(jsx("x-notes", { value: "there", onChange }));
    expect(textarea.value).toBe("there");
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps a controlled checkbox at the consumer's checked state", async () => {
    const errors = vi.spyOn(console, "error");
    const targets = [];
    const onChange = vi.fn((event) => void targets.push(event.target));
    const { container } = await render(jsx("x-check", { value: "yes", checked: true, onChange }));
    const input = container.querySelector(".x-check__input");
    expect(input.checked).toBe(true);
    await act(async () => input.click());
    expect(targets).toEqual([input]);
    expect(input.checked).toBe(true);
    expect(errors).not.toHaveBeenCalled();
  });

  it("gives the control the value the template resolved, not the consumer's raw one", async () => {
    const errors = vi.spyOn(console, "error");
    const pickOne = (a) => h("div", { class: "x-pick" }, control(h("input", { class: "x-pick__input", value: ["a", "b"].includes(a.value) ? a.value : "" })));
    const { jsx: create } = createRuntime({ "x-pick": pickOne });
    const parsed = parse(renderToString(create("x-pick", { value: "z", onChange() {} })));
    expect(parsed.querySelector(".x-pick__input").getAttribute("value")).toBe("");
    const onChange = vi.fn();
    const { container, rerender } = await render(create("x-pick", { value: "z", onChange }));
    const input = container.querySelector(".x-pick__input");
    expect(input.value).toBe("");
    await act(async () => type(input, "q"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(input.value).toBe("");
    await rerender(create("x-pick", { value: "b", onChange }));
    expect(input.value).toBe("b");
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps an empty controlled textarea controlled", async () => {
    const errors = vi.spyOn(console, "error");
    const onChange = vi.fn();
    const { container } = await render(jsx("x-notes", { value: "", onChange }));
    const textarea = container.querySelector(".x-notes__input");
    await act(async () => type(textarea, "hi"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(textarea.value).toBe("");
    expect(errors).not.toHaveBeenCalled();
  });

  it("leaves React's own warning when the consumer passes no onChange", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    await render(jsx("x-field", { value: "a" }));
    expect(messages(errors).some((message) => message.includes(MISSING_ON_CHANGE))).toBe(true);
  });

  it("accepts onInput alone on a controlled field, as React's input does", async () => {
    const errors = vi.spyOn(console, "error");
    const onInput = vi.fn();
    const { container } = await render([jsx("x-field", { value: "a", onInput }, "field"), jsx("x-notes", { value: "hi", onInput }, "notes")]);
    const input = container.querySelector(".x-field__input");
    await act(async () => type(input, "ab"));
    expect(onInput).toHaveBeenCalledTimes(1);
    expect(input.value).toBe("a");
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps React's warning for a checked checkbox with onInput alone, as React's checkbox does", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    await render(jsx("x-check", { value: "yes", checked: true, onInput() {} }));
    expect(messages(errors).some((message) => message.includes(MISSING_ON_CHANGE))).toBe(true);
  });
});

describe("React adapter: an uncontrolled form control", () => {
  it("starts from defaultValue and keeps what the user typed across a parent re-render", async () => {
    const errors = vi.spyOn(console, "error");
    const { container, rerender } = await render(jsx("x-field", { defaultValue: "a", name: "q" }));
    const input = container.querySelector(".x-field__input");
    const filter = container.querySelector(".x-field__filter");
    expect(input.value).toBe("a");
    await act(async () => {
      type(input, "ab");
      type(filter, "fg");
    });
    await rerender(jsx("x-field", { defaultValue: "a", name: "r" }));
    expect(input.name).toBe("r");
    expect(input.value).toBe("ab");
    expect(filter.value).toBe("fg");
    expect(errors).not.toHaveBeenCalled();
  });

  it("keeps a textarea's typed text across a parent re-render", async () => {
    const errors = vi.spyOn(console, "error");
    const { container, rerender } = await render(jsx("x-notes", { defaultValue: "hi", name: "a" }));
    const textarea = container.querySelector(".x-notes__input");
    expect(textarea.value).toBe("hi");
    await act(async () => type(textarea, "hit"));
    await rerender(jsx("x-notes", { defaultValue: "hi", name: "b" }));
    expect(textarea.value).toBe("hit");
    expect(errors).not.toHaveBeenCalled();
  });

  it("treats a checkbox with only a value as uncontrolled, starting from defaultChecked", async () => {
    const errors = vi.spyOn(console, "error");
    const { container, rerender } = await render(jsx("x-check", { value: "yes", defaultChecked: true, name: "a" }));
    const host = container.querySelector("x-check");
    const input = container.querySelector(".x-check__input");
    expect(input.checked).toBe(true);
    expect(host[CONTROLLED]).toBe(false);
    await act(async () => input.click());
    await rerender(jsx("x-check", { value: "yes", defaultChecked: true, name: "b" }));
    expect(input.name).toBe("b");
    expect(input.checked).toBe(false);
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("React adapter: a value the control took before React hydrated it", () => {
  /**
   * Server markup hydrated after its control's value changed with no event, as a value does that the user enters
   * while React holds back the events of a tree it has not hydrated.
   * @param {unknown} tree
   * @param {(holder: HTMLElement) => void} change
   */
  async function hydrateAfter(tree, change) {
    const container = document.body.appendChild(document.createElement("div"));
    cleanups.push(() => container.remove());
    container.innerHTML = renderToString(tree);
    change(container);
    const recoverable = [];
    let root;
    await act(async () => {
      root = hydrateRoot(container, tree, { onRecoverableError: (thrown) => void recoverable.push(String(thrown)) });
    });
    cleanups.unshift(() => act(() => root.unmount()));
    return { container, recoverable };
  }

  const setValue = (control, value) => Object.getOwnPropertyDescriptor(Object.getPrototypeOf(control), "value").set.call(control, value);

  it("draws the live value of an uncontrolled control once hydrated, keeping its starting value as the default", async () => {
    const errors = vi.spyOn(console, "error");
    const { container, recoverable } = await hydrateAfter(jsx("x-dial", { defaultValue: "a", name: "q" }), (holder) => setValue(holder.querySelector(".x-dial__input"), "b"));
    const input = container.querySelector(".x-dial__input");
    expect(recoverable).toEqual([]);
    expect(container.querySelector(".x-dial__shown").textContent).toBe("shows b");
    expect(input.value).toBe("b");
    expect(input.defaultValue).toBe("a");
    expect(errors).not.toHaveBeenCalled();
  });

  it("leaves a controlled control to the consumer's state", async () => {
    const errors = vi.spyOn(console, "error");
    const { container } = await hydrateAfter(jsx("x-dial", { value: "a", onChange() {}, name: "q" }), (holder) => setValue(holder.querySelector(".x-dial__input"), "b"));
    expect(container.querySelector(".x-dial__shown").textContent).toBe("shows a");
    expect(errors).not.toHaveBeenCalled();
  });

  it("draws nothing new for a control whose value did not change", async () => {
    const errors = vi.spyOn(console, "error");
    const { container } = await hydrateAfter(jsx("x-dial", { defaultValue: "a", name: "q" }), () => {});
    expect(container.querySelector(".x-dial__shown").textContent).toBe("shows a");
    expect(container.querySelector(".x-dial__input").defaultValue).toBe("a");
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("React adapter: the controlled flag", () => {
  it("is true with value, false with defaultValue, and follows a switch on re-render", async () => {
    const { container, rerender } = await render(jsx("x-field", { value: "a", onChange() {} }));
    const host = container.querySelector("x-field");
    expect(host[CONTROLLED]).toBe(true);
    // React warns about the switch itself, which is the consumer's doing.
    vi.spyOn(console, "error").mockImplementation(() => {});
    await rerender(jsx("x-field", { defaultValue: "a" }));
    expect(container.querySelector("x-field")).toBe(host);
    expect(host[CONTROLLED]).toBe(false);
    await rerender(jsx("x-field", { value: "b", onChange() {} }));
    expect(host[CONTROLLED]).toBe(true);
  });

  it("is false for a null value or checked, as React's own fields are, and the host gets neither", async () => {
    const errors = vi.spyOn(console, "error");
    const field = await render(jsx("x-field", { value: null, defaultValue: "a" }));
    const check = await render(jsx("x-check", { value: "yes", checked: null, defaultChecked: true }));
    const fieldHost = field.container.querySelector("x-field");
    const checkHost = check.container.querySelector("x-check");
    expect(fieldHost[CONTROLLED]).toBe(false);
    expect(checkHost[CONTROLLED]).toBe(false);
    expect(fieldHost.hasAttribute("value")).toBe(false);
    expect(checkHost.hasAttribute("checked")).toBe(false);
    const input = field.container.querySelector(".x-field__input");
    expect(input.value).toBe("a");
    await act(async () => type(input, "ab"));
    expect(input.value).toBe("ab");
    const box = check.container.querySelector(".x-check__input");
    expect(box.checked).toBe(true);
    await act(async () => box.click());
    expect(box.checked).toBe(false);
    expect(errors).not.toHaveBeenCalled();
  });

  it("is false when the host starts uncontrolled", async () => {
    const { container } = await render(jsx("x-field", { defaultValue: "a" }));
    expect(container.querySelector("x-field")[CONTROLLED]).toBe(false);
  });

  it("still reaches a ref the consumer passed", async () => {
    const seen = [];
    const { container } = await render(jsx("x-field", { value: "a", onChange() {}, ref: (el) => void seen.push(el) }));
    expect(seen).toEqual([container.querySelector("x-field")]);
  });
});

describe("React adapter: the Server Components runtime", () => {
  it("never controls a form control and adds no function", async () => {
    const errors = vi.spyOn(console, "error");
    const { container, rerender } = await render(server.jsx("x-field", { value: "a", name: "q" }));
    const host = container.querySelector("x-field");
    const input = container.querySelector(".x-field__input");
    expect(host[CONTROLLED]).toBeUndefined();
    expect(input.value).toBe("a");
    await act(async () => type(input, "ab"));
    await rerender(server.jsx("x-field", { value: "a", name: "r" }));
    expect(input.value).toBe("ab");
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("React adapter: template props React names differently", () => {
  it("turns a style string into a style object, keeping custom property names", async () => {
    const errors = vi.spyOn(console, "error");
    expect(renderToString(jsx("x-field", { fill: "40%" }))).toContain('<div class="x-field" style="--neuwo-range-fill:40%">');
    const { container } = await render(jsx("x-field", { fill: "40%" }));
    expect(container.querySelector(".x-field").style.getPropertyValue("--neuwo-range-fill")).toBe("40%");

    const { jsx: create } = createRuntime({ "x-tint": () => h("span", { class: "x-tint", style: "--neuwo-tint: 1; background-color: red;" }) });
    expect(renderToString(create("x-tint", {}))).toContain('style="--neuwo-tint:1;background-color:red"');
    const tinted = await render(create("x-tint", {}));
    expect(tinted.container.querySelector(".x-tint").style.backgroundColor).toBe("red");
    expect(errors).not.toHaveBeenCalled();
  });

  it("gives lower-case attribute names React's spelling, so the DOM gets the attribute and React warns nothing", async () => {
    const errors = vi.spyOn(console, "error");
    const attributes = { maxlength: "5", minlength: "1", tabindex: "0", autocomplete: "off", inputmode: "numeric" };
    const { container } = await render(jsx("x-field", { defaultValue: "a", ...attributes }));
    const input = container.querySelector(".x-field__input");
    for (const [name, value] of Object.entries(attributes)) expect(input.getAttribute(name), name).toBe(value);
    expect(errors).not.toHaveBeenCalled();
  });
});
