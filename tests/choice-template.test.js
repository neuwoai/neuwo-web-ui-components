import { describe, expect, it } from "vitest";
import { toHTML } from "../src/core/adapters/html.js";
import { h } from "../src/core/template.js";
import { controlAttrs } from "../src/components/fields/field.template.js";
import { checkAttrs, choiceTemplate } from "../src/components/selection/choice.template.js";
import { checkboxTemplate } from "../src/components/selection/checkbox/checkbox.template.js";
import { toggleTemplate } from "../src/components/selection/toggle/toggle.template.js";
import { templates } from "../src/templates.js";

const ctx = (children = []) => ({ id: (suffix) => `c-${suffix}`, children, within: null });
const isNode = (child) => typeof child === "object" && "tag" in child;
const classesOf = (node) => String(node.props.class ?? "").split(" ").filter(Boolean);

function find(node, name) {
  if (classesOf(node).includes(name)) return node;
  for (const child of node.children.filter(isNode)) {
    const hit = find(child, name);
    if (hit) return hit;
  }
  return null;
}

const ERRORS = [
  ["no error", {}, {}],
  ["a bare error", { error: "" }, { "aria-invalid": "true" }],
  ["a message", { error: "Required" }, { "aria-invalid": "true", "aria-describedby": "c-error" }],
  ["a muted message", { error: "Required", "error-muted": "" }, { "aria-invalid": "true", "aria-describedby": "c-error" }],
  ["no error line", { error: "Required", "no-error-line": "" }, {}],
];

const stated = (props) => Object.fromEntries(Object.entries(props).filter(([name]) => name === "aria-invalid" || name === "aria-describedby"));

describe("choiceTemplate()", () => {
  const block = () => h("label", { class: "x-row" });

  it("renders the root, the block it is given, then the reserved error line", () => {
    expect(toHTML(choiceTemplate({}, ctx(), block()))).toBe(
      '<div class="neuwo-choice"><label class="x-row"></label><span class="neuwo-choice__error" id="c-error"></span></div>',
    );
  });

  it("places the given block itself", () => {
    const given = block();
    expect(choiceTemplate({}, ctx(), given).children[0]).toBe(given);
  });

  it.each([
    ["no error", {}, []],
    ["a bare error", { error: "" }, []],
    ["a message", { error: "Required" }, ["Required"]],
    ["a muted message", { error: "Required", "error-muted": "" }, ["Required"]],
  ])("reserves the error line with %s", (_, attrs, text) => {
    const line = find(choiceTemplate(attrs, ctx(), block()), "neuwo-choice__error");
    expect(line.props).toEqual({ class: "neuwo-choice__error", id: "c-error" });
    expect(line.children).toEqual(text);
  });

  it("drops the error line under no-error-line", () => {
    for (const attrs of [{ "no-error-line": "" }, { "no-error-line": "", error: "Ignored" }]) {
      const root = choiceTemplate(attrs, ctx(), block());
      expect(find(root, "neuwo-choice__error")).toBeNull();
      expect(root.children).toHaveLength(1);
    }
  });
});

describe("checkAttrs()", () => {
  it("carries name, value, checked, required, disabled and form, only when present", () => {
    expect(checkAttrs({}, ctx())).toEqual({});
    expect(checkAttrs({ name: "terms", value: "yes", checked: "", required: "", disabled: "", form: "signup" }, ctx())).toEqual({
      name: "terms",
      value: "yes",
      checked: true,
      required: true,
      disabled: true,
      form: "signup",
    });
    expect(checkAttrs({ value: "" }, ctx())).toEqual({ value: "" });
  });

  it("gives the checkbox no id, since its label wraps it", () => {
    expect(checkAttrs({ name: "a", error: "E" }, ctx())).not.toHaveProperty("id");
  });

  it("keeps the element's own attributes off the control", () => {
    const props = checkAttrs({ error: "E", "error-muted": "", "no-error-line": "", pulse: "", slot: "x", class: "mine", id: "own" }, ctx());
    for (const name of ["error", "error-muted", "no-error-line", "pulse", "slot", "class", "id"]) expect(props, name).not.toHaveProperty(name);
  });

  it("forwards every host aria-* and title, but not data-*", () => {
    const props = checkAttrs({ "aria-label": "Agree", "aria-describedby": "hint", title: "Tip", "data-x": "1", "data-testid": "terms" }, ctx());
    expect(props).toEqual({ "aria-label": "Agree", "aria-describedby": "hint", title: "Tip" });
  });

  it.each(ERRORS)("states the error to assistive technology with %s, as the fields do", (_, attrs, expected) => {
    expect(stated(checkAttrs(attrs, ctx()))).toEqual(expected);
    expect(stated(checkAttrs(attrs, ctx()))).toEqual(stated(controlAttrs(attrs, ctx(), [])));
  });
});

describe("checkboxTemplate()", () => {
  const render = (attrs = {}, children = []) => checkboxTemplate(attrs, ctx(children));
  const input = (attrs) => find(render(attrs), "neuwo-form-check__input");

  it("is registered for neuwo-checkbox", () => {
    expect(templates["neuwo-checkbox"]).toBe(checkboxTemplate);
  });

  it("renders a native checkbox and the label region in a wrapping label, then the error line", () => {
    expect(toHTML(render({}), { default: "Subscribe" })).toBe(
      '<div class="neuwo-choice">' +
        '<label class="neuwo-form-check">' +
        '<input class="neuwo-form-check__input" type="checkbox">' +
        '<span class="neuwo-form-check__label">Subscribe</span>' +
        "</label>" +
        '<span class="neuwo-choice__error" id="c-error"></span>' +
        "</div>",
    );
  });

  it("marks the checkbox as the control and keeps the label region the only child of its wrapper", () => {
    const root = render({ checked: "", error: "E" });
    expect(input({}).control).toBe(true);
    expect(find(root, "neuwo-form-check__label").children).toEqual([{ region: "default" }]);
  });

  it("carries the host's form attributes, aria-* and title onto the checkbox", () => {
    expect(input({ name: "terms", value: "yes", checked: "", required: "", "aria-label": "Agree", title: "Tip", "data-x": "1" }).props).toEqual({
      class: "neuwo-form-check__input",
      type: "checkbox",
      name: "terms",
      value: "yes",
      checked: true,
      required: true,
      "aria-label": "Agree",
      title: "Tip",
    });
  });

  it.each([
    ["no error", {}, "neuwo-form-check"],
    ["a bare error", { error: "" }, "neuwo-form-check neuwo-form-check--error"],
    ["a message", { error: "Required" }, "neuwo-form-check neuwo-form-check--error"],
    ["a muted message", { error: "Required", "error-muted": "" }, "neuwo-form-check"],
    ["no error line", { error: "Required", "no-error-line": "" }, "neuwo-form-check"],
  ])("accents the row with %s only while the error shows unmuted", (_, attrs, classes) => {
    expect(find(render(attrs), "neuwo-form-check").props.class).toBe(classes);
  });

  it.each(ERRORS)("wires the checkbox to the error line with %s", (_, attrs, expected) => {
    expect(stated(input(attrs).props)).toEqual(expected);
  });
});

describe("toggleTemplate()", () => {
  const render = (attrs = {}, children = []) => toggleTemplate(attrs, ctx(children));
  const input = (attrs) => find(render(attrs), "neuwo-form-toggle__input");
  const row = (attrs) => find(render(attrs), "neuwo-form-toggle");

  it("is registered for neuwo-toggle", () => {
    expect(templates["neuwo-toggle"]).toBe(toggleTemplate);
  });

  it("renders a switch, its decorative track and the label region in a wrapping label, then the error line", () => {
    expect(toHTML(render({}), { default: "Notifications" })).toBe(
      '<div class="neuwo-choice">' +
        '<label class="neuwo-form-toggle">' +
        '<input class="neuwo-form-toggle__input" type="checkbox" role="switch">' +
        '<span class="neuwo-form-toggle__track" aria-hidden="true"></span>' +
        '<span class="neuwo-form-toggle__label">Notifications</span>' +
        "</label>" +
        '<span class="neuwo-choice__error" id="c-error"></span>' +
        "</div>",
    );
  });

  it("marks the switch as the control and keeps the label region the only child of its wrapper", () => {
    expect(input({}).control).toBe(true);
    expect(find(render({ pulse: "" }), "neuwo-form-toggle__label").children).toEqual([{ region: "default" }]);
  });

  it("carries the host's form attributes, aria-* and title onto the switch, keeping its role", () => {
    expect(input({ name: "notify", value: "1", checked: "", disabled: "", form: "prefs", "aria-label": "Alerts", title: "Tip", "data-x": "1", role: "button" }).props).toEqual({
      class: "neuwo-form-toggle__input",
      type: "checkbox",
      role: "switch",
      name: "notify",
      value: "1",
      checked: true,
      disabled: true,
      form: "prefs",
      "aria-label": "Alerts",
      title: "Tip",
    });
  });

  it.each([
    ["nothing", {}, "neuwo-form-toggle"],
    ["pulse", { pulse: "" }, "neuwo-form-toggle neuwo-form-toggle--pulse"],
    ["an error", { error: "Turn it on" }, "neuwo-form-toggle neuwo-form-toggle--error"],
    ["pulse and an error", { pulse: "", error: "" }, "neuwo-form-toggle neuwo-form-toggle--pulse neuwo-form-toggle--error"],
    ["a muted error", { error: "Turn it on", "error-muted": "" }, "neuwo-form-toggle"],
    ["an error and no error line", { error: "Turn it on", "no-error-line": "" }, "neuwo-form-toggle"],
  ])("styles the row from %s", (_, attrs, classes) => {
    expect(row(attrs).props.class).toBe(classes);
  });

  it("keeps the pulse class whether or not the switch starts checked", () => {
    expect(row({ pulse: "", checked: "" }).props.class).toBe("neuwo-form-toggle neuwo-form-toggle--pulse");
  });

  it.each(ERRORS)("wires the switch to the error line with %s", (_, attrs, expected) => {
    expect(stated(input(attrs).props)).toEqual(expected);
  });
});
