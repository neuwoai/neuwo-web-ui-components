import { describe, expect, it } from "vitest";
import { toHTML } from "../src/core/adapters/html.js";
import { control, h } from "../src/core/template.js";
import { controlAttrs, controlClass, fieldTemplate } from "../src/components/fields/field.template.js";
import { inputTemplate } from "../src/components/fields/input/input.template.js";
import { templates } from "../src/templates.js";

const ctx = (children = []) => ({ id: (suffix) => `f-${suffix}`, children });
const slotted = { tag: "span", attrs: { slot: "label" }, text: "Rich label", slot: "label" };
const plain = { tag: null, attrs: {}, text: "stray", slot: "default" };
const box = () => control(h("input", { class: "neuwo-input" }));
const shell = (attrs = {}, children = [], options) => fieldTemplate(attrs, ctx(children), box(), options);
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

const label = (node) => find(node, "neuwo-field__label");
const labelParts = (node) => label(node).children.filter(isNode).map((child) => classesOf(child)[0]);

describe("fieldTemplate()", () => {
  it("renders the label, the control and the reserved error line, in that order", () => {
    expect(toHTML(shell())).toBe(
      '<div class="neuwo-field">' +
        '<label class="neuwo-field__label neuwo-field__label--empty" for="f-control">' +
        '<span class="neuwo-field__label-content"></span>' +
        "</label>" +
        '<input class="neuwo-input">' +
        '<span class="neuwo-field__error" id="f-error"></span>' +
        "</div>",
    );
  });

  it("places the control it is given, marker included, between the label and the error line", () => {
    const given = box();
    const root = fieldTemplate({}, ctx(), given);
    expect(root.children.filter(isNode).map((child) => child.tag)).toEqual(["label", "input", "span"]);
    expect(root.children[1]).toBe(given);
    expect(root.children[1].control).toBe(true);
  });

  it.each([
    ["sm", ["neuwo-field", "neuwo-field--sm"]],
    ["lg", ["neuwo-field"]],
    ["", ["neuwo-field"]],
  ])("takes size=%j as a density step only when it is sm", (size, classes) => {
    expect(classesOf(shell({ size }))).toEqual(classes);
  });

  it("renders the label attribute as text after the slot wrapper", () => {
    const node = shell({ label: "Work email" });
    expect(classesOf(label(node))).toEqual(["neuwo-field__label"]);
    expect(labelParts(node)).toEqual(["neuwo-field__label-content", "neuwo-field__label-text"]);
    expect(find(node, "neuwo-field__label-text").children).toEqual(["Work email"]);
  });

  it("puts slotted label content in the wrapper and drops the attribute text", () => {
    for (const attrs of [{}, { label: "Ignored" }]) {
      const node = shell(attrs, [slotted, plain]);
      expect(classesOf(label(node))).toEqual(["neuwo-field__label"]);
      expect(labelParts(node)).toEqual(["neuwo-field__label-content"]);
      expect(toHTML(label(node), { label: '<span slot="label">Rich label</span>' })).toBe(
        '<label class="neuwo-field__label" for="f-control"><span class="neuwo-field__label-content"><span slot="label">Rich label</span></span></label>',
      );
    }
  });

  it("marks the label empty with neither text nor slotted content, but not with an empty label attribute", () => {
    expect(classesOf(label(shell({}, [plain])))).toEqual(["neuwo-field__label", "neuwo-field__label--empty"]);
    const blank = shell({ label: "" });
    expect(classesOf(label(blank))).toEqual(["neuwo-field__label"]);
    expect(find(blank, "neuwo-field__label-text").children).toEqual([]);
  });

  it("always renders the label wrapper, its region its only child", () => {
    for (const node of [shell(), shell({ label: "A" }), shell({}, [slotted])]) {
      expect(find(node, "neuwo-field__label-content").children).toEqual([{ region: "label" }]);
    }
  });

  it("gives the label an id only when asked", () => {
    expect(label(shell()).props.id).toBeUndefined();
    expect(label(shell({}, [], { labelId: "f-label" })).props).toMatchObject({ for: "f-control", id: "f-label" });
  });

  it("marks a required field after its label, hidden from assistive technology", () => {
    for (const [attrs, children, parts] of [
      [{ label: "Email", required: "" }, [], ["neuwo-field__label-content", "neuwo-field__label-text", "neuwo-field__required"]],
      [{ required: "" }, [slotted], ["neuwo-field__label-content", "neuwo-field__required"]],
    ]) {
      const node = shell(attrs, children);
      expect(labelParts(node)).toEqual(parts);
      expect(find(node, "neuwo-field__required").props).toEqual({ class: "neuwo-field__required", "aria-hidden": "true" });
      expect(find(node, "neuwo-field__required").children).toEqual(["*"]);
    }
  });

  it("leaves the marker off an unlabelled required field and a labelled optional one", () => {
    expect(find(shell({ required: "" }), "neuwo-field__required")).toBeNull();
    expect(find(shell({ label: "Email" }), "neuwo-field__required")).toBeNull();
  });

  it.each([
    ["no error", {}, []],
    ["a bare error", { error: "" }, []],
    ["a message", { error: "Required" }, ["Required"]],
    ["a muted message", { error: "Required", "error-muted": "" }, ["Required"]],
  ])("reserves the error line with %s", (_, attrs, text) => {
    const line = find(shell(attrs), "neuwo-field__error");
    expect(line.props).toEqual({ class: "neuwo-field__error", id: "f-error" });
    expect(line.children).toEqual(text);
  });

  it("drops the error line under no-error-line", () => {
    for (const attrs of [{ "no-error-line": "" }, { "no-error-line": "", error: "Ignored" }]) {
      expect(find(shell(attrs), "neuwo-field__error")).toBeNull();
    }
  });
});

describe("controlAttrs()", () => {
  const names = ["name", "required", "value"];

  it("gives the control its id and only the listed attributes that are present", () => {
    expect(controlAttrs({}, ctx(), names)).toEqual({ id: "f-control" });
    expect(controlAttrs({ name: "q", value: "", label: "L", size: "sm", placeholder: "p" }, ctx(), names)).toEqual({
      id: "f-control",
      name: "q",
      value: "",
    });
  });

  it("carries disabled and the id of the form it submits with", () => {
    expect(controlAttrs({ disabled: "", form: "signup" }, ctx(), names)).toEqual({ id: "f-control", disabled: true, form: "signup" });
  });

  it("forwards every host aria-* and title, but not data-*", () => {
    const attrs = controlAttrs({ "aria-label": "Search", "aria-describedby": "hint", title: "Tip", "data-x": "1", "data-testid": "q" }, ctx(), names);
    expect(attrs).toMatchObject({ "aria-label": "Search", "aria-describedby": "hint", title: "Tip" });
    expect(Object.keys(attrs).filter((name) => name.startsWith("data-"))).toEqual([]);
  });

  it.each([
    ["no error", {}, {}],
    ["a bare error", { error: "" }, { "aria-invalid": "true" }],
    ["a message", { error: "Required" }, { "aria-invalid": "true", "aria-describedby": "f-error" }],
    ["a muted message", { error: "Required", "error-muted": "" }, { "aria-invalid": "true", "aria-describedby": "f-error" }],
    ["no error line", { error: "Required", "no-error-line": "" }, {}],
  ])("states the error to assistive technology with %s", (_, attrs, expected) => {
    const result = controlAttrs(attrs, ctx(), names);
    const stated = Object.fromEntries(Object.entries(result).filter(([name]) => name === "aria-invalid" || name === "aria-describedby"));
    expect(stated).toEqual(expected);
  });
});

describe("controlClass()", () => {
  it.each([
    [{}, "neuwo-input"],
    [{ size: "sm" }, "neuwo-input neuwo-input--sm"],
    [{ size: "xl" }, "neuwo-input"],
    [{ error: "" }, "neuwo-input neuwo-input--error"],
    [{ error: "Required", size: "sm" }, "neuwo-input neuwo-input--sm neuwo-input--error"],
    [{ error: "Required", "error-muted": "" }, "neuwo-input"],
    [{ error: "Required", "no-error-line": "" }, "neuwo-input"],
  ])("composes %j into %j", (attrs, classes) => {
    expect(controlClass(attrs)).toBe(classes);
  });
});

describe("inputTemplate()", () => {
  const render = (attrs = {}, children = []) => inputTemplate(attrs, ctx(children));
  const input = (attrs) => find(render(attrs), "neuwo-input");

  it("is registered for neuwo-input", () => {
    expect(templates["neuwo-input"]).toBe(inputTemplate);
  });

  it("renders a text input in the field shell, marked as the control", () => {
    expect(toHTML(render())).toBe(
      '<div class="neuwo-field">' +
        '<label class="neuwo-field__label neuwo-field__label--empty" for="f-control">' +
        '<span class="neuwo-field__label-content"></span>' +
        "</label>" +
        '<input class="neuwo-input" type="text" id="f-control">' +
        '<span class="neuwo-field__error" id="f-error"></span>' +
        "</div>",
    );
    expect(input({}).control).toBe(true);
  });

  it.each(["text", "email", "url", "password", "number", "search", "tel"])("keeps type=%s", (type) => {
    expect(input({ type }).props.type).toBe(type);
  });

  it.each(["checkbox", "hidden", "", "toString", "EMAIL"])("falls back to text for type=%j", (type) => {
    expect(input({ type }).props.type).toBe("text");
  });

  it("forwards the value and the native constraint attributes, the boolean ones as present", () => {
    const attrs = {
      name: "q",
      placeholder: "Search",
      autocomplete: "off",
      min: "1",
      max: "9",
      step: "2",
      pattern: "\\d+",
      minlength: "1",
      maxlength: "3",
      inputmode: "numeric",
      value: "5",
    };
    expect(input({ ...attrs, required: "required", readonly: "" }).props).toMatchObject({ ...attrs, required: true, readonly: true });
  });

  it("keeps the field's own attributes off the control", () => {
    const props = input({ label: "L", size: "sm", error: "E", "error-muted": "", "no-error-line": "", "data-x": "1", slot: "field" }).props;
    for (const name of ["label", "size", "error", "error-muted", "no-error-line", "data-x", "slot"]) expect(props, name).not.toHaveProperty(name);
  });

  it("styles the control from the size and error attributes", () => {
    expect(input({ size: "sm", error: "Bad" }).props.class).toBe("neuwo-input neuwo-input--sm neuwo-input--error");
  });
});
