import { describe, expect, it } from "vitest";
import { toHTML } from "../src/core/adapters/html.js";
import { buttonTemplate } from "../src/components/button/button.template.js";
import { templates } from "../src/templates.js";

const render = (attrs = {}) => buttonTemplate(attrs, { id: (suffix) => suffix, children: [] });
const classes = (attrs) => render(attrs).props.class;
const wrappers =
  '<span class="neuwo-btn__start"></span><span class="neuwo-btn__label"></span><span class="neuwo-btn__end"></span>';

describe("buttonTemplate()", () => {
  it("is registered for neuwo-button", () => {
    expect(templates["neuwo-button"]).toBe(buttonTemplate);
  });

  it("renders a solid button of type button by default", () => {
    expect(toHTML(render())).toBe(`<button class="neuwo-btn neuwo-btn--solid" type="button">${wrappers}</button>`);
  });

  it("maps variant to a modifier", () => {
    expect(classes({ variant: "outline" })).toBe("neuwo-btn neuwo-btn--outline");
    expect(classes({ variant: "glass" })).toBe("neuwo-btn neuwo-btn--glass");
    expect(classes({ variant: "" })).toBe("neuwo-btn neuwo-btn--solid");
  });

  it("maps size to a modifier only when set", () => {
    expect(classes({ size: "sm" })).toBe("neuwo-btn neuwo-btn--solid neuwo-btn--sm");
    expect(classes({ size: "lg" })).toBe("neuwo-btn neuwo-btn--solid neuwo-btn--lg");
    expect(classes({ size: "" })).toBe("neuwo-btn neuwo-btn--solid");
  });

  it("maps hover s and l to a modifier, and m or anything else to none", () => {
    expect(classes({ hover: "s" })).toBe("neuwo-btn neuwo-btn--solid neuwo-btn--hover-s");
    expect(classes({ hover: "l" })).toBe("neuwo-btn neuwo-btn--solid neuwo-btn--hover-l");
    expect(classes({ hover: "m" })).toBe("neuwo-btn neuwo-btn--solid");
    expect(classes({ hover: "x" })).toBe("neuwo-btn neuwo-btn--solid");
  });

  it("adds the wide, xwide, loading and block modifiers when present", () => {
    expect(classes({ wide: "", xwide: "", loading: "", block: "" })).toBe(
      "neuwo-btn neuwo-btn--solid neuwo-btn--wide neuwo-btn--xwide neuwo-btn--loading neuwo-btn--block",
    );
  });

  it("carries type and disabled onto the button", () => {
    expect(render({ type: "submit", disabled: "" }).props).toEqual({ class: "neuwo-btn neuwo-btn--solid", type: "submit", disabled: true });
  });

  it("carries form, name and value onto the native button when present", () => {
    expect(render({ type: "submit", form: "signup", name: "plan", value: "pro" }).props).toEqual({
      class: "neuwo-btn neuwo-btn--solid",
      type: "submit",
      form: "signup",
      name: "plan",
      value: "pro",
    });
    expect(render({ value: "" }).props.value).toBe("");
  });

  it("renders a link with its link attributes when href is set, and no form attributes", () => {
    const node = render({ href: "/docs", target: "_blank", rel: "noopener", download: "", type: "submit", form: "f", name: "n", value: "v" });
    expect(node.tag).toBe("a");
    expect(node.props).toEqual({ class: "neuwo-btn neuwo-btn--solid", href: "/docs", target: "_blank", rel: "noopener", download: "" });
  });

  it("stays a disabled button when disabled together with href", () => {
    const node = render({ href: "/docs", disabled: "" });
    expect(node.tag).toBe("button");
    expect(node.props.href).toBeUndefined();
    expect(node.props.disabled).toBe(true);
  });

  it("adds a spinner as the first child, aria-busy and disabled while loading", () => {
    const node = render({ loading: "" });
    expect(node.props).toMatchObject({ disabled: true, "aria-busy": "true" });
    expect(toHTML(node)).toBe(
      `<button class="neuwo-btn neuwo-btn--solid neuwo-btn--loading" type="button" disabled="" aria-busy="true"><span class="neuwo-btn__spinner" aria-hidden="true"></span>${wrappers}</button>`,
    );
  });

  it("keeps a loading link a link, busy but not disabled", () => {
    const node = render({ href: "/docs", loading: "" });
    expect(node.tag).toBe("a");
    expect(node.props["aria-busy"]).toBe("true");
    expect(node.props.disabled).toBeUndefined();
  });

  it("forwards title and aria-* onto the control, and leaves data-* and the rest on the host", () => {
    const props = render({ title: "Save now", "aria-label": "Save", "aria-describedby": "hint", "data-track": "cta", id: "x", slot: "end" }).props;
    expect(props).toEqual({
      class: "neuwo-btn neuwo-btn--solid",
      type: "button",
      title: "Save now",
      "aria-label": "Save",
      "aria-describedby": "hint",
    });
  });

  it("keeps aria-busy for loading over a forwarded aria-busy", () => {
    expect(render({ "aria-busy": "false", loading: "" }).props["aria-busy"]).toBe("true");
  });

  it("places start, default and end children in their wrappers", () => {
    const html = toHTML(render(), { start: "<i>s</i>", default: "Go", end: "<i>e</i>" });
    expect(html).toBe(
      '<button class="neuwo-btn neuwo-btn--solid" type="button"><span class="neuwo-btn__start"><i>s</i></span><span class="neuwo-btn__label">Go</span><span class="neuwo-btn__end"><i>e</i></span></button>',
    );
  });
});
