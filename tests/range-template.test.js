import { describe, expect, it } from "vitest";
import { fillPercent, rangeTemplate, rangeValue } from "../src/components/fields/range/range.template.js";
import { expand } from "../src/server/index.js";

describe("fillPercent", () => {
  it("is the share of the track left of the thumb", () => {
    expect(fillPercent(50, 0, 100)).toBe(50);
    expect(fillPercent(150, 0, 200)).toBe(75);
    expect(fillPercent("25", "0", "200")).toBe(12.5);
  });

  it("is 0 when the bounds are inverted or the value is not a number", () => {
    expect(fillPercent(5, 10, 0)).toBe(0);
    expect(fillPercent(5, 10, 10)).toBe(0);
    expect(fillPercent("x", 0, 100)).toBe(0);
  });

  it("clamps to the track", () => {
    expect(fillPercent(500, 0, 100)).toBe(100);
    expect(fillPercent(-5, 0, 100)).toBe(0);
  });

  it("rounds to two decimals", () => {
    expect(fillPercent(1, 0, 3)).toBe(33.33);
  });

  it("uses the native default value when there is none: the midpoint, or the minimum for inverted bounds", () => {
    expect(fillPercent(undefined, 0, 10)).toBe(50);
    expect(fillPercent(undefined, undefined, undefined)).toBe(50);
    expect(fillPercent(undefined, 10, 0)).toBe(0);
  });

  it("falls back to the native bounds for a bound that is not a number", () => {
    expect(fillPercent(50, "abc", "def")).toBe(50);
  });
});

describe("rangeValue", () => {
  it("snaps an off-step value to the nearest step from the minimum, a tie going up", () => {
    expect(rangeValue({ min: "0", value: "5", step: "3" })).toBe(6);
    expect(rangeValue({ min: "0", value: "10", step: "3" })).toBe(9);
    expect(rangeValue({ min: "0", value: "4.5", step: "3" })).toBe(6);
    expect(rangeValue({ min: "1", value: "2.5", step: "1" })).toBe(3);
  });

  it("takes the authored value as the step base when there is no minimum, as browsers do", () => {
    expect(rangeValue({ value: "5", step: "3" })).toBe(5);
    expect(rangeValue({ value: "10", step: "3" })).toBe(10);
    expect(rangeValue({ value: "150", max: "100", step: "3" })).toBe(99);
  });

  it("uses the midpoint, snapped, when there is no value or it is invalid", () => {
    expect(rangeValue({ min: "0", max: "10", step: "3" })).toBe(6);
    expect(rangeValue({ min: "0", max: "10" })).toBe(5);
    expect(rangeValue({ value: "x", min: "0", max: "10" })).toBe(5);
  });

  it("does not snap for step any or a step that is not positive", () => {
    expect(rangeValue({ value: "7.5", step: "any" })).toBe(7.5);
    expect(rangeValue({ value: "7.5", step: "0" })).toBe(7.5);
    expect(rangeValue({ value: "7.5", step: "-2" })).toBe(7.5);
  });

  it("keeps the result inside the bounds and on a step that fits", () => {
    expect(rangeValue({ value: "150", max: "200", step: "50" })).toBe(150);
    expect(rangeValue({ value: "500", min: "0", max: "10", step: "3" })).toBe(9);
    expect(rangeValue({ value: "-5", min: "0", max: "10", step: "3" })).toBe(0);
    expect(rangeValue({ min: "0", value: "0.3", step: "0.1" })).toBe(0.3);
  });

  it("keeps an on-step maximum with a fractional step", () => {
    expect(rangeValue({ min: "0", max: "0.3", step: "0.1", value: "0.3" })).toBe(0.3);
    expect(rangeValue({ min: "0.1", max: "0.7", step: "0.2", value: "0.7" })).toBe(0.7);
    expect(fillPercent(rangeValue({ min: "0", max: "0.3", step: "0.1", value: "0.3" }), "0", "0.3")).toBe(100);
  });

  it("rounds decimal ties up despite binary floats", () => {
    expect(rangeValue({ min: "0", value: "0.35", step: "0.1" })).toBe(0.4);
    expect(rangeValue({ min: "0", value: "0.15", step: "0.1" })).toBe(0.2);
  });

  it("treats an empty or non-numeric min or max as absent", () => {
    expect(rangeValue({ min: "", value: "7", step: "3" })).toBe(7);
    expect(rangeValue({ min: "abc", value: "7", step: "3" })).toBe(7);
    expect(rangeValue({ max: "", value: "500" })).toBe(100);
    expect(rangeValue({ min: "", max: "" })).toBe(50);
  });

  it("treats a maximum below the minimum as the minimum", () => {
    expect(rangeValue({ min: "10", max: "0" })).toBe(10);
    expect(rangeValue({ value: "500", min: "10", max: "0" })).toBe(10);
  });
});

describe("rangeTemplate", () => {
  const ctx = { id: (name) => `x-${name}`, children: [] };

  /** @param {Record<string, string>} attrs */
  const controlOf = (attrs) => rangeTemplate(attrs, ctx).children.find((child) => child.tag === "input");

  it("writes the fill as a style string without spaces or a trailing semicolon", () => {
    expect(controlOf({ min: "0", max: "10" }).props.style).toBe("--neuwo-range-fill:50%");
    expect(controlOf({ min: "0", max: "200", value: "50" }).props.style).toBe("--neuwo-range-fill:25%");
  });

  it("forwards the bounds, name and value, and not the text-field attributes", () => {
    const props = controlOf({ min: "1", max: "9", step: "2", name: "n", value: "3", placeholder: "p", readonly: "", autocomplete: "off", required: "" }).props;
    expect(props).toMatchObject({ type: "range", min: "1", max: "9", step: "2", name: "n", value: "3" });
    for (const name of ["placeholder", "readonly", "autocomplete", "required"]) expect(props).not.toHaveProperty(name);
    expect(props.class).toBe("neuwo-input neuwo-range");
  });

  it("gives the control the native default value when the host has none, and the host's value otherwise", () => {
    expect(controlOf({ min: "0", max: "10" }).props.value).toBe("5");
    expect(controlOf({ min: "20", max: "40" }).props.value).toBe("30");
    expect(controlOf({ min: "10", max: "0" }).props.value).toBe("10");
    expect(controlOf({}).props.value).toBe("50");
    expect(controlOf({ value: "7" }).props.value).toBe("7");
  });

  it("paints the fill of the snapped value, and leaves an authored value as authored", () => {
    const props = controlOf({ min: "0", max: "10", step: "3", value: "5" }).props;
    expect(props.value).toBe("5");
    expect(props.style).toBe("--neuwo-range-fill:60%");
    expect(controlOf({ max: "10", step: "3", value: "5" }).props.style).toBe("--neuwo-range-fill:50%");
    expect(controlOf({ min: "0", max: "10", step: "3" }).props).toMatchObject({ value: "6", style: "--neuwo-range-fill:60%" });
  });

  it("is in the server markup, so the first paint is filled", () => {
    expect(expand(`<neuwo-range min="0" max="200" value="50"></neuwo-range>`)).toContain('style="--neuwo-range-fill:25%"');
  });

  it("serves a full fill for an on-step maximum with a fractional step", () => {
    expect(expand(`<neuwo-range min="0" max="0.3" step="0.1" value="0.3"></neuwo-range>`)).toContain('style="--neuwo-range-fill:100%"');
    expect(expand(`<neuwo-range min="0.1" max="0.7" step="0.2" value="0.7"></neuwo-range>`)).toContain('style="--neuwo-range-fill:100%"');
  });
});
