import { describe, expect, it } from "vitest";
import { fillPercent, rangeTemplate } from "../src/components/fields/range/range.template.js";
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

  it("is in the server markup, so the first paint is filled", () => {
    expect(expand(`<neuwo-range min="0" max="200" value="50"></neuwo-range>`)).toContain('style="--neuwo-range-fill:25%"');
  });
});
