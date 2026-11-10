import { describe, expect, it } from "vitest";
import { toHTML } from "../src/core/adapters/html.js";
import { logoTemplate } from "../src/components/logo/logo.template.js";
import { templates } from "../src/templates.js";

const render = (attrs = {}) => logoTemplate(attrs, { id: (suffix) => suffix, children: [] });

describe("logoTemplate()", () => {
  it("is registered for neuwo-logo", () => {
    expect(templates["neuwo-logo"]).toBe(logoTemplate);
  });

  it("renders the inlined wordmark as the svg root with the block class", () => {
    const node = render();
    expect(node.tag).toBe("svg");
    expect(node.props.class).toBe("neuwo-logo neuwo-logo--bg-dark");
    expect(node.props.viewBox).toBe("0 0 320 50");
    expect(node.props.xmlns).toBe("http://www.w3.org/2000/svg");
    expect(toHTML(node)).toContain("<path ");
  });

  it("names each variant on the class", () => {
    for (const variant of ["bg-light", "bg-dark", "bg-dark-alt", "bg-colour"]) {
      expect(render({ variant }).props.class).toBe(`neuwo-logo neuwo-logo--${variant}`);
    }
  });

  it("falls back to bg-dark on an unknown or inherited variant", () => {
    expect(render({ variant: "teal" }).props.class).toBe("neuwo-logo neuwo-logo--bg-dark");
    expect(render({ variant: "toString" }).props.class).toBe("neuwo-logo neuwo-logo--bg-dark");
  });

  it("names itself Neuwo by default and takes a custom name", () => {
    expect(render().props).toMatchObject({ role: "img", "aria-label": "Neuwo" });
    expect(render({ label: "Neuwo home" }).props).toMatchObject({ role: "img", "aria-label": "Neuwo home" });
  });

  it("goes decorative on an empty label", () => {
    const { props } = render({ label: "" });
    expect(props["aria-hidden"]).toBe("true");
    expect(props).not.toHaveProperty("role");
    expect(props).not.toHaveProperty("aria-label");
  });
});
