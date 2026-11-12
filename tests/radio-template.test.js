import { describe, expect, it } from "vitest";
import { toHTML } from "../src/core/adapters/html.js";
import { radioTemplate } from "../src/components/selection/radio/radio.template.js";
import { radioGroupTemplate } from "../src/components/selection/radio/radio-group.template.js";
import { templates } from "../src/templates.js";

const ctx = (within = null) => ({ id: (suffix) => `c-${suffix}`, children: [], within });
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

const inputOf = (attrs, within = null) => find(radioTemplate(attrs, ctx(within)), "neuwo-form-check__input").props;

describe("radioTemplate()", () => {
  it("marks its label with the error modifier while its own group shows the error accent", () => {
    const label = (within) => radioTemplate({ value: "a" }, ctx(within)).props.class;
    expect(label({ name: "g", error: "Pick one" })).toBe("neuwo-form-check neuwo-form-check--error");
    expect(label({ name: "g", error: "" })).toBe("neuwo-form-check neuwo-form-check--error");
    for (const within of [null, { name: "g" }, { error: "x", "error-muted": "" }, { error: "x", "no-error-line": "" }]) {
      expect(label(within), JSON.stringify(within)).toBe("neuwo-form-check");
    }
    expect(radioTemplate({ value: "a", error: "x" }, ctx()).props.class).toBe("neuwo-form-check");
  });

  it("reads its enclosing <neuwo-radio-group> and is registered under its tag", () => {
    expect(radioTemplate.within).toBe("neuwo-radio-group");
    expect(templates["neuwo-radio"]).toBe(radioTemplate);
  });

  it("renders a label around the native radio, marked as the control, and the label region", () => {
    expect(toHTML(radioTemplate({}, ctx()))).toBe(
      '<label class="neuwo-form-check"><input class="neuwo-form-check__input" type="radio"><span class="neuwo-form-check__label"></span></label>',
    );
    const root = radioTemplate({}, ctx());
    expect(root.children[0].control).toBe(true);
    expect(root.children[1].children).toEqual([{ region: "default" }]);
  });

  it("is a radio of its own outside a group, with its own name, value, checked, required, disabled and form", () => {
    expect(inputOf({ name: "agree", value: "yes", checked: "", required: "", disabled: "", form: "signup" })).toEqual({
      class: "neuwo-form-check__input",
      type: "radio",
      name: "agree",
      value: "yes",
      checked: true,
      required: true,
      disabled: true,
      form: "signup",
    });
  });

  it("handles a context with no within at all as one outside a group", () => {
    expect(inputOf({ name: "agree", checked: "" }, undefined)).toMatchObject({ name: "agree", checked: true });
  });

  it("takes the group's name, required and form in a group, never its own required and form", () => {
    const props = inputOf({ value: "a", name: "own", required: "", form: "own-form" }, { name: "plan", required: "", form: "signup" });
    expect(props).toMatchObject({ name: "plan", value: "a", required: true, form: "signup" });
    const bare = inputOf({ value: "a", required: "", form: "own-form" }, {});
    expect(bare).not.toHaveProperty("name");
    expect(bare).not.toHaveProperty("required");
    expect(bare).not.toHaveProperty("form");
  });

  it("falls back to its own name in a group that has none, so a radio that carries one still groups", () => {
    expect(inputOf({ value: "a", name: "own" }, { value: "a" })).toMatchObject({ name: "own", checked: true });
    expect(inputOf({ value: "a", name: "own" }, { name: "" })).toHaveProperty("name", "own");
  });

  it("starts checked when the group's value is its own, whatever its own checked says", () => {
    expect(inputOf({ value: "pro" }, { value: "pro" })).toHaveProperty("checked", true);
    expect(inputOf({ value: "free", checked: "" }, { value: "pro" })).not.toHaveProperty("checked");
    expect(inputOf({ value: "free", checked: "" }, { value: "" })).not.toHaveProperty("checked");
  });

  it("compares a radio with no value as the native radio's on", () => {
    expect(inputOf({}, { value: "on" })).toHaveProperty("checked", true);
    expect(inputOf({}, { value: "" })).not.toHaveProperty("checked");
  });

  it("starts from its own checked in a group with no value", () => {
    expect(inputOf({ value: "m", checked: "" }, { name: "size" })).toHaveProperty("checked", true);
    expect(inputOf({ value: "s" }, { name: "size" })).not.toHaveProperty("checked");
  });

  it("is disabled when it or its group is", () => {
    expect(inputOf({ value: "a" }, { disabled: "" })).toHaveProperty("disabled", true);
    expect(inputOf({ value: "a", disabled: "" }, {})).toHaveProperty("disabled", true);
    expect(inputOf({ value: "a" }, {})).not.toHaveProperty("disabled");
  });

  it("forwards its own aria-* and title, not data-*, error wiring or the group's", () => {
    const props = inputOf({ value: "a", "aria-label": "Plan A", title: "Tip", "data-x": "1", error: "Bad" }, { "aria-label": "Plan", title: "Group" });
    expect(props).toMatchObject({ "aria-label": "Plan A", title: "Tip" });
    expect(props).not.toHaveProperty("data-x");
    expect(props).not.toHaveProperty("aria-invalid");
    expect(props).not.toHaveProperty("aria-describedby");
  });
});

describe("radioGroupTemplate()", () => {
  const groupOf = (attrs) => find(radioGroupTemplate(attrs, ctx()), "neuwo-radio-group");

  it("is registered under its tag, reads no enclosing element and marks no control", () => {
    expect(templates["neuwo-radio-group"]).toBe(radioGroupTemplate);
    expect(radioGroupTemplate.within).toBeUndefined();
    const all = (node) => [node, ...node.children.filter(isNode).flatMap(all)];
    expect(all(radioGroupTemplate({ label: "Plan" }, ctx())).some((node) => node.control)).toBe(false);
  });

  it("renders the choice shell around the radiogroup, its legend and the options region", () => {
    expect(toHTML(radioGroupTemplate({ label: "Plan" }, ctx()))).toBe(
      '<div class="neuwo-choice neuwo-choice--flush"><div class="neuwo-radio-group" role="radiogroup" aria-orientation="vertical" aria-labelledby="c-legend">' +
        '<span class="neuwo-radio-group__legend" id="c-legend">Plan</span><div class="neuwo-radio-group__options"></div></div>' +
        '<span class="neuwo-choice__error" id="c-error"></span></div>',
    );
    expect(find(radioGroupTemplate({}, ctx()), "neuwo-radio-group__options").children).toEqual([{ region: "default" }]);
  });

  it("keeps the legend, hidden and unreferenced, without a label", () => {
    for (const attrs of [{}, { label: "" }]) {
      expect(find(radioGroupTemplate(attrs, ctx()), "neuwo-radio-group__legend").props).toEqual({ class: "neuwo-radio-group__legend", id: "c-legend", hidden: true });
      expect(groupOf(attrs).props).not.toHaveProperty("aria-labelledby");
    }
  });

  it("lays the radios out in a row only for orientation horizontal, and states the orientation", () => {
    expect(classesOf(groupOf({ orientation: "horizontal" }))).toEqual(["neuwo-radio-group", "neuwo-radio-group--horizontal"]);
    expect(groupOf({ orientation: "horizontal" }).props["aria-orientation"]).toBe("horizontal");
    for (const orientation of ["vertical", "row", "", undefined]) {
      const group = groupOf(orientation === undefined ? {} : { orientation });
      expect(classesOf(group)).toEqual(["neuwo-radio-group"]);
      expect(group.props["aria-orientation"]).toBe("vertical");
    }
  });

  it("keeps the error line flush under the radiogroup with the shell's flush modifier", () => {
    expect(classesOf(radioGroupTemplate({}, ctx()))).toEqual(["neuwo-choice", "neuwo-choice--flush"]);
  });

  it("states required to assistive technology", () => {
    expect(groupOf({ required: "" }).props["aria-required"]).toBe("true");
    expect(groupOf({}).props).not.toHaveProperty("aria-required");
  });

  it.each([
    ["no error", {}, [], {}],
    ["a message", { error: "Pick one" }, ["neuwo-radio-group--error"], { "aria-invalid": "true", "aria-describedby": "c-error" }],
    ["a bare error", { error: "" }, ["neuwo-radio-group--error"], { "aria-invalid": "true" }],
    ["a muted message", { error: "Pick one", "error-muted": "" }, [], { "aria-invalid": "true", "aria-describedby": "c-error" }],
    ["no error line", { error: "Pick one", "no-error-line": "" }, [], {}],
  ])("shows %s on the radiogroup", (_, attrs, modifiers, aria) => {
    const group = groupOf(attrs);
    expect(classesOf(group)).toEqual(["neuwo-radio-group", ...modifiers]);
    const stated = Object.fromEntries(Object.entries(group.props).filter(([name]) => name === "aria-invalid" || name === "aria-describedby"));
    expect(stated).toEqual(aria);
  });

  it("puts the message on the reserved line and drops the line under no-error-line", () => {
    expect(find(radioGroupTemplate({ error: "Pick one" }, ctx()), "neuwo-choice__error").children).toEqual(["Pick one"]);
    expect(find(radioGroupTemplate({ "no-error-line": "" }, ctx()), "neuwo-choice__error")).toBeNull();
  });

  it("forwards aria-* and title to the radiogroup, an aria-labelledby of the host's own over the legend's, and keeps data-* off", () => {
    const props = groupOf({ "aria-label": "Plan", title: "Pick a plan", "data-x": "1" }).props;
    expect(props).toMatchObject({ "aria-label": "Plan", title: "Pick a plan" });
    expect(props).not.toHaveProperty("data-x");
    expect(groupOf({ label: "Plan", "aria-labelledby": "elsewhere" }).props["aria-labelledby"]).toBe("elsewhere");
  });

  it("leaves name, value, disabled and form to the radios, which read them from the group", () => {
    const html = toHTML(radioGroupTemplate({ name: "plan", value: "pro", disabled: "", form: "signup" }, ctx()));
    for (const name of ["name=", "value=", "disabled", "form="]) expect(html).not.toContain(name);
  });
});
