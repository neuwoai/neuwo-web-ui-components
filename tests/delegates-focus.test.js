import { describe, expect, it } from "vitest";
import { NeuwoElement } from "../src/core/base-element.js";
import { NeuwoFieldElement } from "../src/components/fields/field-element.js";

describe("shadow focus delegation", () => {
  it("opts field elements into focus delegation via the static flag", () => {
    expect(NeuwoFieldElement.delegatesFocus).toBe(true);
  });

  it("leaves focus delegation off on the base by default", () => {
    expect(NeuwoElement.delegatesFocus ?? false).toBe(false);
  });
});
