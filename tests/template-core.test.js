import { describe, expect, it } from "vitest";
import { DEFAULT_REGION, distribute, h, has, normalizeProps, raw, region } from "../src/core/template.js";
import { idScope } from "../src/core/ids.js";

describe("h()", () => {
  it("builds a node with its tag, props and children", () => {
    expect(h("p", { class: "x" }, "a")).toEqual({ tag: "p", props: { class: "x" }, children: ["a"] });
    expect(h("br")).toEqual({ tag: "br", props: {}, children: [] });
  });

  it("flattens nested arrays and drops null, undefined and false", () => {
    const i = h("i", null);
    const node = h("p", null, [null, [i, [undefined, false]]], false, [[h("b", null)]]);
    expect(node.children).toEqual([i, h("b", null)]);
  });

  it("turns numbers into strings and merges adjacent text", () => {
    expect(h("p", null, 2).children).toEqual(["2"]);
    expect(h("p", null, "a", ["b", 0], null, "c").children).toEqual(["ab0c"]);
    expect(h("p", null, "a", h("i", null), "b").children).toEqual(["a", h("i", null), "b"]);
  });

  it("keeps true props as boolean attributes and drops false, null and undefined", () => {
    const node = h("button", { disabled: true, hidden: false, title: null, lang: undefined, tabindex: 0 });
    expect(node.props).toEqual({ disabled: true, tabindex: "0" });
  });

  it("marks regions, defaulting to the default region", () => {
    expect(region()).toEqual({ region: DEFAULT_REGION });
    expect(region("start")).toEqual({ region: "start" });
    expect(DEFAULT_REGION).toBe("default");
  });

  it("wraps trusted markup and allows it only as the sole child", () => {
    expect(h("svg", null, raw("<path/>")).children).toEqual([{ raw: "<path/>" }]);
    expect(() => h("svg", null, raw("<path/>"), "x")).toThrow();
  });
});

describe("has()", () => {
  it("is true only for own attributes, including empty ones", () => {
    expect(has({ disabled: "" }, "disabled")).toBe(true);
    expect(has({}, "disabled")).toBe(false);
    expect(has({}, "toString")).toBe(false);
  });
});

describe("normalizeProps()", () => {
  it("keeps attribute props as strings", () => {
    const props = normalizeProps({
      children: "x",
      key: "k",
      ref: {},
      className: "c",
      style: { color: "red" },
      onClick: () => {},
      hidden: true,
      title: false,
      lang: null,
      dir: undefined,
      tabIndex: 0,
      "data-x": "y",
      slot: "start",
    });
    expect(props).toEqual({ hidden: "", tabIndex: "0", "data-x": "y", slot: "start" });
  });
});

describe("distribute()", () => {
  const items = [
    { id: 1, slot: "start" },
    { id: 2, slot: DEFAULT_REGION },
    { id: 3, slot: "nope" },
  ];

  it("sends each item to its slot's region, and unknown slots to the default region", () => {
    const groups = distribute(h("span", null, region("start"), region()), items, (item) => item.slot);
    expect(groups.start.map((item) => item.id)).toEqual([1]);
    expect(groups[DEFAULT_REGION].map((item) => item.id)).toEqual([2, 3]);
  });

  it("drops items whose region the template lacks", () => {
    const groups = distribute(h("span", null, h("b", null, region("start"))), items, (item) => item.slot);
    expect(groups).toEqual({ start: [items[0]] });
  });
});

describe("idScope()", () => {
  it("gives stable ids within a scope and distinct ids across scopes", () => {
    const next = idScope("p");
    const a = next();
    const b = next();
    expect(a("label")).toBe("p1-label");
    expect(a("label")).toBe(a("label"));
    expect(a("hint")).toBe("p1-hint");
    expect(b("label")).toBe("p2-label");
  });

  it("numbers each factory on its own", () => {
    expect(idScope("neuwo-s")()("x")).toBe("neuwo-s1-x");
    expect(idScope("neuwo-c")()("x")).toBe("neuwo-c1-x");
  });
});
