import { describe, expect, it } from "vitest";
import { NeuwoShadowElement } from "../src/core/shadow-element.js";

describe("shadow focus delegation", () => {
  it("leaves focus delegation off on the base by default", () => {
    expect(NeuwoShadowElement.delegatesFocus ?? false).toBe(false);
  });
});
