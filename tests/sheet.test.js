import { describe, expect, it } from "vitest";
import { sheet } from "../src/core/sheet.js";

describe("sheet()", () => {
  it("builds a CSSStyleSheet from a CSS string", () => {
    const s = sheet(":host{color:red}");
    expect(s).toBeInstanceOf(CSSStyleSheet);
  });
});
