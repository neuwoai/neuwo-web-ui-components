import { describe, expect, it } from "vitest";
import { toHTML } from "../src/core/adapters/html.js";
import { statusDotTemplate } from "../src/components/status-dot/status-dot.template.js";
import { templates } from "../src/templates.js";

const render = (attrs = {}) => statusDotTemplate(attrs, { id: (suffix) => suffix, children: [] });
const classes = (attrs) => render(attrs).props.class;

describe("statusDotTemplate()", () => {
  it("is registered for neuwo-status-dot", () => {
    expect(templates["neuwo-status-dot"]).toBe(statusDotTemplate);
  });

  it("renders an empty span by default", () => {
    expect(toHTML(render())).toBe('<span class="neuwo-status-dot"></span>');
  });

  it("maps blue to a modifier and anything else to the green base", () => {
    expect(classes({ variant: "blue" })).toBe("neuwo-status-dot neuwo-status-dot--blue");
    expect(classes({ variant: "green" })).toBe("neuwo-status-dot");
    expect(classes({ variant: "xyz" })).toBe("neuwo-status-dot");
  });

  it("maps motion to pulse or blink, and anything else to none", () => {
    expect(classes({ motion: "pulse" })).toBe("neuwo-status-dot neuwo-status-dot--pulse");
    expect(classes({ motion: "blink" })).toBe("neuwo-status-dot neuwo-status-dot--blink");
    expect(classes({ motion: "xyz" })).toBe("neuwo-status-dot");
  });

  it("maps halo s and l to a modifier, and m or anything else to none", () => {
    expect(classes({ halo: "s" })).toBe("neuwo-status-dot neuwo-status-dot--halo-s");
    expect(classes({ halo: "l" })).toBe("neuwo-status-dot neuwo-status-dot--halo-l");
    expect(classes({ halo: "m" })).toBe("neuwo-status-dot");
    expect(classes({ halo: "xl" })).toBe("neuwo-status-dot");
  });

  it("maps glow s, m and l to a modifier, and none or anything else to none", () => {
    for (const level of ["s", "m", "l"]) expect(classes({ glow: level })).toBe(`neuwo-status-dot neuwo-status-dot--glow-${level}`);
    expect(classes({ glow: "none" })).toBe("neuwo-status-dot");
    expect(classes({ glow: "xl" })).toBe("neuwo-status-dot");
  });

  it("composes every axis", () => {
    expect(classes({ variant: "blue", motion: "blink", halo: "l", glow: "m" })).toBe(
      "neuwo-status-dot neuwo-status-dot--blue neuwo-status-dot--blink neuwo-status-dot--halo-l neuwo-status-dot--glow-m",
    );
  });
});
