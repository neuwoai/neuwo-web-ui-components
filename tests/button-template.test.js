import { describe, expect, it } from "vitest";
import { toHTML } from "../src/core/adapters/html.js";
import { buttonTemplate } from "../src/components/button/button.template.js";
import { spinner } from "../src/components/spinner/spinner.template.js";
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
      `<button class="neuwo-btn neuwo-btn--solid neuwo-btn--loading" type="button" disabled="" aria-busy="true"><span class="neuwo-spinner neuwo-btn__spinner" aria-hidden="true"></span>${wrappers}</button>`,
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

  it("points a menu button at the menu panel", () => {
    for (const attrs of [{ menu: "export" }, { menu: "export", href: "/docs", target: "_blank", type: "submit" }]) {
      const node = render(attrs);
      expect(node.tag).toBe("button");
      expect(node.live).toBe(true);
      expect(node.props).toMatchObject({
        type: "button",
        popovertarget: "export-panel",
        "aria-controls": "export-panel",
        "aria-haspopup": "menu",
        "aria-expanded": "false",
      });
      expect(node.props.href).toBeUndefined();
      expect(node.props.target).toBeUndefined();
    }
    expect(render({ menu: "" }).props.popovertarget).toBeUndefined();
    expect(render({}).live).toBeUndefined();
  });

  it("shows a chevron after the end wrapper, but not on an icon-only button", () => {
    expect(toHTML(render({ menu: "export" }))).toBe(
      `<button class="neuwo-btn neuwo-btn--solid" type="button" popovertarget="export-panel" aria-haspopup="menu" aria-controls="export-panel" aria-expanded="false">${wrappers}<span class="neuwo-btn__chevron" aria-hidden="true"></span></button>`,
    );
    expect(toHTML(render({ menu: "export", "icon-only": "" }))).not.toContain("neuwo-btn__chevron");
    expect(toHTML(render())).not.toContain("neuwo-btn__chevron");
  });

  it("shows three dots on an empty icon-only menu button, and the author's icon otherwise", () => {
    const icon = { tag: "svg", attrs: {}, text: "", slot: "default", children: [] };
    const start = { ...icon, attrs: { slot: "start" }, slot: "start" };
    const dots = '<span class="neuwo-btn__dots" aria-hidden="true"></span>';
    const iconOnly = (attrs, children = []) => buttonTemplate({ "icon-only": "", ...attrs }, { id: (suffix) => suffix, children, within: null });
    expect(iconOnly({}).props.class).toBe("neuwo-btn neuwo-btn--solid neuwo-btn--icon-only");
    expect(toHTML(iconOnly({ menu: "rows" }))).toContain(`<span class="neuwo-btn__label"></span>${dots}<span class="neuwo-btn__end">`);
    expect(toHTML(iconOnly({ menu: "rows" }, [start]))).toContain(dots);
    expect(toHTML(iconOnly({ menu: "rows" }, [icon]))).not.toContain(dots);
    expect(toHTML(iconOnly({}))).not.toContain(dots);
  });

  it("puts the spinner in place of the dots or the icon on a loading icon-only button", () => {
    const icon = { tag: "svg", attrs: {}, text: "", slot: "default", children: [] };
    const loading = (children = []) => buttonTemplate({ "icon-only": "", menu: "rows", loading: "" }, { id: (suffix) => suffix, children, within: null });
    expect(toHTML(loading())).not.toContain("neuwo-btn__dots");
    expect(loading().children[0]).toEqual(spinner({ label: "" }, "neuwo-btn__spinner"));
    expect(loading([icon]).children[0].props.class).toBe("neuwo-spinner neuwo-btn__spinner");
  });

  describe("split", () => {
    const split = (attrs = {}) => render({ split: "", menu: "save", ...attrs });
    const halves = (attrs) => split(attrs).children;
    const chevron = '<span class="neuwo-btn__chevron" aria-hidden="true"></span>';

    it("renders two halves sharing the variant", () => {
      const toggle = `<button class="neuwo-btn-split__toggle neuwo-btn neuwo-btn--solid" type="button" popovertarget="save-panel" aria-haspopup="menu" aria-controls="save-panel" aria-expanded="false" aria-label="More Options">${chevron}</button>`;
      expect(toHTML(split())).toBe(
        `<span class="neuwo-btn-split"><button class="neuwo-btn-split__main neuwo-btn neuwo-btn--solid" type="button">${wrappers}</button>${toggle}</span>`,
      );
      const [main, button] = halves({ variant: "outline", size: "sm", hover: "l", wide: "", block: "" });
      expect(main.props.class).toBe("neuwo-btn-split__main neuwo-btn neuwo-btn--outline neuwo-btn--sm neuwo-btn--hover-l neuwo-btn--wide neuwo-btn--block");
      expect(button.props.class).toBe("neuwo-btn-split__toggle neuwo-btn neuwo-btn--outline neuwo-btn--sm neuwo-btn--hover-l");
      expect([split().live, main.live, button.live]).toEqual([undefined, undefined, true]);
    });

    it("keeps every existing rule on the main half", () => {
      const [link] = halves({ href: "/docs", target: "_blank", rel: "noopener", download: "", type: "submit" });
      expect(link.tag).toBe("a");
      expect(link.props).toEqual({ class: "neuwo-btn-split__main neuwo-btn neuwo-btn--solid", href: "/docs", target: "_blank", rel: "noopener", download: "" });

      const [submit, toggle] = halves({ type: "submit", form: "draft", name: "action", value: "save", title: "Save now", "aria-describedby": "hint" });
      expect(submit.props).toEqual({
        class: "neuwo-btn-split__main neuwo-btn neuwo-btn--solid",
        type: "submit",
        form: "draft",
        name: "action",
        value: "save",
        title: "Save now",
        "aria-describedby": "hint",
      });
      expect(toggle.props).toEqual({
        class: "neuwo-btn-split__toggle neuwo-btn neuwo-btn--solid",
        type: "button",
        popovertarget: "save-panel",
        "aria-haspopup": "menu",
        "aria-controls": "save-panel",
        "aria-expanded": "false",
        "aria-label": "More Options",
      });

      const [busy] = halves({ loading: "" });
      expect(toHTML(busy)).toBe(
        `<button class="neuwo-btn-split__main neuwo-btn neuwo-btn--solid neuwo-btn--loading" type="button" disabled="" aria-busy="true"><span class="neuwo-spinner neuwo-btn__spinner" aria-hidden="true"></span>${wrappers}</button>`,
      );
      expect(toHTML(split(), { start: "<i>s</i>", default: "Save", end: "<i>e</i>" })).toContain(
        '<span class="neuwo-btn__start"><i>s</i></span><span class="neuwo-btn__label">Save</span><span class="neuwo-btn__end"><i>e</i></span></button><button',
      );
    });

    it("names the toggle half from menu-label, More Options by default", () => {
      expect(halves()[1].props["aria-label"]).toBe("More Options");
      expect(halves({ "menu-label": "" })[1].props["aria-label"]).toBe("More Options");
      expect(halves({ "menu-label": "More Save Options", "aria-label": "Save Draft" }).map((half) => half.props["aria-label"])).toEqual(["Save Draft", "More Save Options"]);
    });

    it("disables both halves when disabled or loading", () => {
      for (const attrs of [{ disabled: "" }, { loading: "" }, { disabled: "", href: "/docs" }]) {
        const [main, toggle] = halves(attrs);
        expect([main.tag, main.props.disabled, toggle.props.disabled], JSON.stringify(attrs)).toEqual(["button", true, true]);
      }
      const [link, toggle] = halves({ loading: "", href: "/docs" });
      expect([link.tag, link.props["aria-busy"], toggle.props.disabled]).toEqual(["a", "true", true]);
      expect(halves().map((half) => half.props.disabled)).toEqual([undefined, undefined]);
    });

    it("ignores icon-only, rendering the split as it is without it", () => {
      for (const attrs of [{}, { loading: "" }, { variant: "outline", size: "sm", disabled: "" }]) {
        const same = toHTML(split(attrs), { default: "Save" });
        expect(toHTML(split({ "icon-only": "", ...attrs }), { default: "Save" }), JSON.stringify(attrs)).toBe(same);
      }
      const children = [{ tag: "svg", attrs: {}, slot: "default" }];
      const withIcon = (attrs) => toHTML(buttonTemplate({ split: "", menu: "save", ...attrs }, { id: (suffix) => suffix, children, within: null }), { default: "<svg></svg>" });
      expect(withIcon({ "icon-only": "" })).toBe(withIcon({}));
      expect(withIcon({ "icon-only": "" })).not.toContain("icon-only");
    });

    it("ignores split without menu", () => {
      for (const attrs of [{ variant: "outline" }, { href: "/docs", "menu-label": "More" }, { menu: "", loading: "" }]) {
        expect(toHTML(render({ split: "", ...attrs }))).toBe(toHTML(render(attrs)));
      }
    });
  });

  it("places start, default and end children in their wrappers", () => {
    const html = toHTML(render(), { start: "<i>s</i>", default: "Go", end: "<i>e</i>" });
    expect(html).toBe(
      '<button class="neuwo-btn neuwo-btn--solid" type="button"><span class="neuwo-btn__start"><i>s</i></span><span class="neuwo-btn__label">Go</span><span class="neuwo-btn__end"><i>e</i></span></button>',
    );
  });
});
