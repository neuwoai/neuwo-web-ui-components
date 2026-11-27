import { describe, expect, it } from "vitest";
import { toHTML } from "../src/core/adapters/html.js";
import { spinner, spinnerTemplate } from "../src/components/spinner/spinner.template.js";
import { templates } from "../src/templates.js";

const render = (attrs = {}) => spinnerTemplate(attrs);
const classes = (attrs) => render(attrs).props.class;

describe("spinnerTemplate()", () => {
  it("is registered for neuwo-spinner", () => {
    expect(templates["neuwo-spinner"]).toBe(spinnerTemplate);
  });

  it("renders a ring named Loading by default", () => {
    expect(toHTML(render())).toBe('<span class="neuwo-spinner" role="progressbar" aria-label="Loading"></span>');
  });

  it("maps size m and l to a modifier, and anything else to none", () => {
    expect(classes({ size: "m" })).toBe("neuwo-spinner neuwo-spinner--m");
    expect(classes({ size: "l" })).toBe("neuwo-spinner neuwo-spinner--l");
    expect(classes({ size: "s" })).toBe("neuwo-spinner");
    expect(classes({ size: "xl" })).toBe("neuwo-spinner");
  });

  it("maps variant blue and green to a modifier, and anything else to none", () => {
    expect(classes({ variant: "blue" })).toBe("neuwo-spinner neuwo-spinner--blue");
    expect(classes({ variant: "green" })).toBe("neuwo-spinner neuwo-spinner--green");
    expect(classes({ variant: "red" })).toBe("neuwo-spinner");
  });

  it("puts the size before the colour", () => {
    expect(classes({ size: "l", variant: "blue" })).toBe("neuwo-spinner neuwo-spinner--l neuwo-spinner--blue");
  });

  it("takes a custom name", () => {
    expect(render({ label: "Loading results" }).props["aria-label"]).toBe("Loading results");
  });

  it("takes the element's aria-label when label is unset, and label wins over it", () => {
    expect(render({ "aria-label": "Loading segments" }).props["aria-label"]).toBe("Loading segments");
    expect(render({ label: "Loading results", "aria-label": "Loading segments" }).props["aria-label"]).toBe("Loading results");
    expect(render({ "aria-label": "" }).props["aria-label"]).toBe("Loading");
    expect(toHTML(render({ label: "", "aria-label": "Loading segments" }))).toBe('<span class="neuwo-spinner" aria-hidden="true"></span>');
  });

  it("goes decorative on an empty label", () => {
    expect(toHTML(render({ label: "" }))).toBe('<span class="neuwo-spinner" aria-hidden="true"></span>');
  });

  it("adds a caller's class after its own", () => {
    expect(toHTML(spinner({ label: "" }, "neuwo-btn__spinner"))).toBe(
      '<span class="neuwo-spinner neuwo-btn__spinner" aria-hidden="true"></span>',
    );
  });
});
