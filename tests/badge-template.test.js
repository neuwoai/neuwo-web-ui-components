import { describe, expect, it } from "vitest";
import { toHTML } from "../src/core/adapters/html.js";
import { badgeTemplate } from "../src/components/badge/badge.template.js";
import { templates } from "../src/templates.js";

const render = (attrs = {}) => badgeTemplate(attrs, { id: (suffix) => suffix, children: [] });
const classes = (attrs) => render(attrs).props.class;

describe("badgeTemplate()", () => {
  it("is registered for neuwo-badge", () => {
    expect(templates["neuwo-badge"]).toBe(badgeTemplate);
  });

  it("renders a span holding the label region by default", () => {
    expect(toHTML(render(), { default: "New" })).toBe('<span class="neuwo-badge">New</span>');
    expect(toHTML(render())).toBe('<span class="neuwo-badge"></span>');
  });

  it("maps green to a modifier and anything else to the blue base", () => {
    expect(classes({ variant: "green" })).toBe("neuwo-badge neuwo-badge--green");
    expect(classes({ variant: "blue" })).toBe("neuwo-badge");
    expect(classes({ variant: "xyz" })).toBe("neuwo-badge");
  });

  it("maps size s and l to a modifier, and m or anything else to none", () => {
    expect(classes({ size: "s" })).toBe("neuwo-badge neuwo-badge--s");
    expect(classes({ size: "l" })).toBe("neuwo-badge neuwo-badge--l");
    expect(classes({ size: "m" })).toBe("neuwo-badge");
    expect(classes({ size: "xl" })).toBe("neuwo-badge");
  });

  it("adds the uppercase modifier when present", () => {
    expect(classes({ uppercase: "" })).toBe("neuwo-badge neuwo-badge--uppercase");
    expect(classes({})).toBe("neuwo-badge");
  });

  it("adds the borderless and glow modifiers when present", () => {
    expect(classes({ borderless: "", glow: "" })).toBe("neuwo-badge neuwo-badge--borderless neuwo-badge--glow");
  });

  it("maps motion to pulse or shimmer, and anything else to none", () => {
    expect(classes({ motion: "pulse" })).toBe("neuwo-badge neuwo-badge--pulse");
    expect(classes({ motion: "shimmer" })).toBe("neuwo-badge neuwo-badge--shimmer");
    expect(classes({ motion: "xyz" })).toBe("neuwo-badge");
  });

  it("adds intensity s and l only alongside a motion", () => {
    expect(classes({ motion: "pulse", intensity: "s" })).toBe("neuwo-badge neuwo-badge--pulse neuwo-badge--intensity-s");
    expect(classes({ motion: "shimmer", intensity: "l" })).toBe("neuwo-badge neuwo-badge--shimmer neuwo-badge--intensity-l");
    expect(classes({ motion: "pulse", intensity: "m" })).toBe("neuwo-badge neuwo-badge--pulse");
    expect(classes({ motion: "pulse", intensity: "xl" })).toBe("neuwo-badge neuwo-badge--pulse");
    expect(classes({ intensity: "l" })).toBe("neuwo-badge");
  });

  it("composes every axis", () => {
    expect(classes({ variant: "green", size: "l", borderless: "", glow: "", motion: "pulse", intensity: "l" })).toBe(
      "neuwo-badge neuwo-badge--green neuwo-badge--l neuwo-badge--borderless neuwo-badge--glow neuwo-badge--pulse neuwo-badge--intensity-l",
    );
  });

  it("leaves other attributes on the host", () => {
    expect(render({ title: "t", "aria-label": "a", "data-x": "y" }).props).toEqual({ class: "neuwo-badge" });
  });
});
