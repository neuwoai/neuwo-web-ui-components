import { describe, expect, it } from "vitest";
import { toHTML } from "../src/core/adapters/html.js";
import { dealIdTemplate } from "../src/components/deal-id/deal-id.template.js";
import { templates } from "../src/templates.js";

const render = (attrs = {}) => dealIdTemplate(attrs, { id: (suffix) => suffix, children: [] });
const classes = (attrs) => render(attrs).props.class;

describe("dealIdTemplate()", () => {
  it("is registered for neuwo-deal-id", () => {
    expect(templates["neuwo-deal-id"]).toBe(dealIdTemplate);
  });

  it("renders a span holding the value region by default", () => {
    expect(toHTML(render(), { default: "NW-1" })).toBe('<span class="neuwo-deal-id">NW-1</span>');
    expect(toHTML(render())).toBe('<span class="neuwo-deal-id"></span>');
  });

  it("maps size s and l to a modifier, and m or anything else to none", () => {
    expect(classes({ size: "s" })).toBe("neuwo-deal-id neuwo-deal-id--s");
    expect(classes({ size: "l" })).toBe("neuwo-deal-id neuwo-deal-id--l");
    expect(classes({ size: "m" })).toBe("neuwo-deal-id");
    expect(classes({ size: "xl" })).toBe("neuwo-deal-id");
  });
});
