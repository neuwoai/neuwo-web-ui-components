import { describe, expect, it } from "vitest";
import { toHTML } from "../src/core/adapters/html.js";
import { segmentedTemplate } from "../src/components/selection/segmented/segmented.template.js";
import { templates } from "../src/templates.js";

const text = (value) => ({ tag: null, attrs: {}, text: value, slot: "default" });
const option = (label, attrs = {}) => ({ tag: "option", attrs, text: label, slot: "default", children: [text(label)] });

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

const VIEWS = [option("Visual", { value: "visual" }), text("\n  "), option("JSON", { value: "json" }), option("Raw", { value: "raw", disabled: "" })];

const render = (attrs, children = VIEWS) => segmentedTemplate(attrs, ctx(children));
const groupOf = (attrs, children) => find(render(attrs, children), "neuwo-segmented");
const buttonsOf = (attrs, children) => groupOf(attrs, children).children.filter((child) => isNode(child) && classesOf(child).includes("neuwo-segmented__option"));
const stateOf = (attrs, children) => buttonsOf(attrs, children).map((button) => [button.props["data-value"], button.props["aria-checked"], button.props.tabindex]);

describe("segmentedTemplate()", () => {
  it("is registered under its tag", () => {
    expect(templates["neuwo-segmented"]).toBe(segmentedTemplate);
  });

  it("wraps the radiogroup and the error line in the choice shell", () => {
    const root = render({});
    expect(classesOf(root)).toEqual(["neuwo-choice"]);
    expect(root.children.filter(isNode).map((child) => classesOf(child)[0])).toEqual(["neuwo-segmented", "neuwo-choice__error"]);
    expect(find(root, "neuwo-choice__error").props.id).toBe("c-error");
  });

  it("renders the indicator, one button per option, the hidden select around the region and the form value, in order", () => {
    const group = groupOf({});
    expect(group.tag).toBe("div");
    expect(group.children.map((child) => `${child.tag}.${classesOf(child)[0]}`)).toEqual([
      "span.neuwo-segmented__indicator",
      "button.neuwo-segmented__option",
      "button.neuwo-segmented__option",
      "button.neuwo-segmented__option",
      "select.neuwo-segmented__options",
      "input.neuwo-segmented__form-value",
    ]);
    const select = find(group, "neuwo-segmented__options");
    expect(select.props).toEqual({ class: "neuwo-segmented__options", multiple: true, hidden: true, tabindex: "-1", "aria-hidden": "true" });
    expect(select.children).toEqual([{ region: "default" }]);
  });

  it("renders the indicator hidden from assistive technology and with no style of its own", () => {
    expect(find(render({ value: "json" }), "neuwo-segmented__indicator")).toEqual({
      tag: "span",
      props: { class: "neuwo-segmented__indicator", "aria-hidden": "true" },
      children: [],
    });
  });

  it("makes the group a horizontal radiogroup named by label, always horizontal", () => {
    expect(groupOf({ label: "View" }).props).toEqual({ class: "neuwo-segmented", role: "radiogroup", "aria-orientation": "horizontal", "aria-label": "View" });
    expect(groupOf({ orientation: "vertical" }).props).toEqual({ class: "neuwo-segmented", role: "radiogroup", "aria-orientation": "horizontal" });
    expect(groupOf({ label: "" }).props).not.toHaveProperty("aria-label");
  });

  it("renders each option as a radio button carrying its value and label", () => {
    const [visual, json, raw] = buttonsOf({});
    expect(visual.props).toEqual({ class: "neuwo-segmented__option", type: "button", role: "radio", "data-value": "visual", "aria-checked": "false", tabindex: "0" });
    expect(visual.children).toEqual([{ tag: "span", props: { class: "neuwo-segmented__option-label" }, children: ["Visual"] }]);
    expect(json.children).toEqual([{ tag: "span", props: { class: "neuwo-segmented__option-label" }, children: ["JSON"] }]);
    expect(raw.props).toMatchObject({ "data-value": "raw", "aria-checked": "false", tabindex: "-1", disabled: true });
  });

  it("checks the option the value names and makes it the tab stop", () => {
    expect(stateOf({ value: "json" })).toEqual([
      ["visual", "false", "-1"],
      ["json", "true", "0"],
      ["raw", "false", "-1"],
    ]);
  });

  it("checks the first enabled option marked selected when no value names an enabled option", () => {
    const options = [option("A", { value: "a" }), option("B", { value: "b", selected: "" }), option("C", { value: "c", selected: "" })];
    expect(stateOf({}, options).map(([, checked]) => checked)).toEqual(["false", "true", "false"]);
    expect(stateOf({ value: "zzz" }, options).map(([, checked]) => checked)).toEqual(["false", "true", "false"]);
  });

  it("checks nothing for a value naming a disabled option, leaving the first enabled option the tab stop", () => {
    const options = [option("A", { value: "a", disabled: "" }), option("B", { value: "b" }), option("C", { value: "c", disabled: "", selected: "" })];
    expect(stateOf({ value: "c" }, options)).toEqual([
      ["a", "false", "-1"],
      ["b", "false", "0"],
      ["c", "false", "-1"],
    ]);
  });

  it("takes an option's trimmed text as its value when it has no value attribute", () => {
    expect(stateOf({ value: "Weekly" }, [option("  Daily "), option("\n Weekly \n")])).toEqual([
      ["Daily", "false", "-1"],
      ["Weekly", "true", "0"],
    ]);
  });

  it("disables every button and the form value in a disabled group, keeping the value checked", () => {
    const buttons = buttonsOf({ value: "json", disabled: "" });
    expect(buttons.map((button) => [button.props.disabled, button.props["aria-checked"], button.props.tabindex])).toEqual([
      [true, "false", "-1"],
      [true, "true", "-1"],
      [true, "false", "-1"],
    ]);
    expect(find(render({ value: "json", disabled: "" }), "neuwo-segmented__form-value").props.disabled).toBe(true);
  });

  it("marks the hidden form value as the control, carrying the resolved value and the form attributes", () => {
    const input = find(render({ name: "view", value: "raw", required: "", form: "search" }, [...VIEWS, option("Table", { value: "table", selected: "" })]), "neuwo-segmented__form-value");
    expect(input.control).toBe(true);
    expect(input.props).toEqual({
      class: "neuwo-segmented__form-value",
      type: "text",
      tabindex: "-1",
      "aria-hidden": "true",
      autocomplete: "off",
      name: "view",
      value: "table",
      required: true,
      form: "search",
    });
    expect(find(render({}, []), "neuwo-segmented__form-value").props).toMatchObject({ value: "" });
  });

  it("marks a required group and shows an error on the pill, the message and the group's aria", () => {
    expect(groupOf({ required: "" }).props["aria-required"]).toBe("true");
    const root = render({ required: "", error: "Choose a view" });
    expect(classesOf(find(root, "neuwo-segmented"))).toEqual(["neuwo-segmented", "neuwo-segmented--error"]);
    expect(find(root, "neuwo-segmented").props).toMatchObject({ "aria-invalid": "true", "aria-describedby": "c-error" });
    expect(find(root, "neuwo-choice__error").children).toEqual(["Choose a view"]);
  });

  it("drops the accent for a muted error and the line and its aria under no-error-line", () => {
    const muted = groupOf({ error: "Choose", "error-muted": "" });
    expect(classesOf(muted)).toEqual(["neuwo-segmented"]);
    expect(muted.props["aria-invalid"]).toBe("true");
    const bare = render({ error: "Choose", "no-error-line": "" });
    expect(find(bare, "neuwo-choice__error")).toBeNull();
    expect(classesOf(find(bare, "neuwo-segmented"))).toEqual(["neuwo-segmented"]);
    expect(find(bare, "neuwo-segmented").props).not.toHaveProperty("aria-invalid");
  });

  it("forwards aria-* and title to the radiogroup and keeps data-* on the element", () => {
    const props = groupOf({ "aria-labelledby": "heading", title: "View", "data-testid": "view" }).props;
    expect(props).toMatchObject({ "aria-labelledby": "heading", title: "View" });
    expect(Object.keys(props).filter((name) => name.startsWith("data-"))).toEqual([]);
  });

  it("serialises the first paint with the selected option marked", () => {
    expect(toHTML(render({ name: "view", value: "json", label: "View" }, [option("Visual", { value: "visual" }), option("JSON", { value: "json" })]))).toBe(
      '<div class="neuwo-choice"><div class="neuwo-segmented" role="radiogroup" aria-orientation="horizontal" aria-label="View">' +
        '<span class="neuwo-segmented__indicator" aria-hidden="true"></span>' +
        '<button class="neuwo-segmented__option" type="button" role="radio" data-value="visual" aria-checked="false" tabindex="-1"><span class="neuwo-segmented__option-label">Visual</span></button>' +
        '<button class="neuwo-segmented__option" type="button" role="radio" data-value="json" aria-checked="true" tabindex="0"><span class="neuwo-segmented__option-label">JSON</span></button>' +
        '<select class="neuwo-segmented__options" multiple="" hidden="" tabindex="-1" aria-hidden="true"></select>' +
        '<input class="neuwo-segmented__form-value" type="text" tabindex="-1" aria-hidden="true" autocomplete="off" name="view" value="json">' +
        '</div><span class="neuwo-choice__error" id="c-error"></span></div>',
    );
  });
});
