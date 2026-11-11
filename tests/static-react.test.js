import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import "../src/index.js";
import { jsx, jsxs } from "../src/react/jsx-runtime.js";

const cleanup = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop()();
});

/** @param {Node} target */
function watch(target) {
  const observer = new MutationObserver(() => {});
  observer.observe(target, { subtree: true, childList: true, attributes: true, characterData: true });
  return () => {
    const records = observer.takeRecords();
    observer.disconnect();
    return records;
  };
}

// Parsed detached, then attached: innerHTML on a connected container upgrades before the children exist.
/** @param {string} html */
function serve(html) {
  const parsed = document.createElement("div");
  parsed.innerHTML = html;
  const form = document.createElement("form");
  document.body.append(form);
  cleanup.push(() => form.remove());
  const records = watch(form);
  form.append(...parsed.childNodes);
  return { form, host: /** @type {HTMLElement} */ (form.firstElementChild), writes: () => records().filter((record) => record.target !== form) };
}

const options = (...values) => values.map((value) => jsx("option", { value, children: value.toUpperCase() }));
const radios = (...values) => values.map((value) => jsx("neuwo-radio", { value, children: value }));

const checkedOf = (host) => Array.from(host.querySelectorAll("input[type=radio], input[type=checkbox]"), (input) => input.checked);

const VALUE_CASES = [
  ["neuwo-input", () => jsx("neuwo-input", { name: "a", label: "A", defaultValue: "typed" }), "typed", "other"],
  ["neuwo-textarea", () => jsx("neuwo-textarea", { name: "a", label: "A", defaultValue: "some text" }), "some text", "other"],
  ["neuwo-range", () => jsx("neuwo-range", { name: "a", label: "A", min: "0", max: "10", defaultValue: "3" }), "3", "7"],
  ["neuwo-combobox", () => jsxs("neuwo-combobox", { name: "a", label: "A", defaultValue: "pro", children: options("free", "pro") }), "pro", "free"],
  ["neuwo-segmented", () => jsxs("neuwo-segmented", { name: "a", label: "A", defaultValue: "pro", children: options("free", "pro") }), "pro", "free"],
];

describe("never-hydrated React markup", () => {
  describe.each(VALUE_CASES)("<%s> with defaultValue", (tag, tree, value, other) => {
    it("adopts with no write and no value attribute on the element", () => {
      const html = renderToStaticMarkup(tree());
      expect(html).not.toMatch(new RegExp(`<${tag}[^>]* value=`));
      const { host, writes } = serve(html);
      expect(writes()).toEqual([]);
      expect(host.value).toBe(value);
    });

    it("keeps its starting value when an attribute changes later", () => {
      const { form, host } = serve(renderToStaticMarkup(tree()));
      host.setAttribute("error", "Wrong");
      expect(host.control.value).toBe(value);
      expect(host.value).toBe(value);
      expect(host.defaultValue).toBe(value);
      form.reset();
      expect(host.value).toBe(value);
    });

    it("keeps it from renderToString markup too", () => {
      const { host } = serve(renderToString(tree()));
      host.setAttribute("error", "Wrong");
      expect(host.value).toBe(value);
    });

    it("lets the value attribute rule once it is set, and after it is removed", () => {
      const { host } = serve(renderToStaticMarkup(tree()));
      host.setAttribute("value", other);
      expect(host.defaultValue).toBe(other);
      host.removeAttribute("value");
      host.setAttribute("error", "Wrong");
      expect(host.defaultValue).not.toBe(value);
    });
  });

  it("drops the starting value when the value attribute is set and removed while the element is out of the page", () => {
    const { form, host } = serve(renderToStaticMarkup(jsx("neuwo-input", { name: "a", defaultValue: "typed" })));
    host.remove();
    host.setAttribute("value", "other");
    host.removeAttribute("value");
    form.append(host);
    expect(host.defaultValue).toBe("");
  });

  it("keeps a radio group's starting value when an attribute of the group changes later", () => {
    const { form, host } = serve(renderToStaticMarkup(jsxs("neuwo-radio-group", { name: "plan", defaultValue: "pro", children: radios("free", "pro") })));
    expect(checkedOf(host)).toEqual([false, true]);
    host.setAttribute("error", "Pick one");
    expect(checkedOf(host)).toEqual([false, true]);
    expect(host.value).toBe("pro");
    form.reset();
    expect(host.value).toBe("pro");
  });

  it("lets a radio group's value attribute rule once it is set", () => {
    const { host } = serve(renderToStaticMarkup(jsxs("neuwo-radio-group", { name: "plan", defaultValue: "pro", children: radios("free", "pro") })));
    host.setAttribute("value", "free");
    expect(checkedOf(host)).toEqual([true, false]);
  });

  it("keeps a checkbox's starting state when an attribute changes later", () => {
    const { host } = serve(renderToStaticMarkup(jsx("neuwo-checkbox", { name: "terms", defaultChecked: true, children: "Accept" })));
    host.setAttribute("error", "Required");
    expect(checkedOf(host)).toEqual([true]);
    expect(host.defaultChecked).toBe(true);
    host.setAttribute("checked", "");
    host.removeAttribute("checked");
    expect(checkedOf(host)).toEqual([false]);
  });

  it("recomputes a range's midpoint from new bounds when it was served without a starting value", () => {
    const { host } = serve(renderToStaticMarkup(jsx("neuwo-range", { name: "a", min: "0", max: "10" })));
    expect(host.value).toBe("5");
    host.setAttribute("max", "100");
    expect(host.value).toBe("50");
  });

  it("follows a newly selected option when a combobox was served without a starting value", () => {
    const { host } = serve(renderToStaticMarkup(jsxs("neuwo-combobox", { name: "a", children: [jsx("option", { value: "free", selected: true, children: "Free" }), jsx("option", { value: "pro", children: "Pro" })] })));
    expect(host.value).toBe("free");
    host.querySelector("option[value=free]").removeAttribute("selected");
    host.querySelector("option[value=pro]").setAttribute("selected", "");
    host.refresh();
    expect(host.defaultValue).toBe("pro");
  });
});
