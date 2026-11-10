import { describe, expect, it } from "vitest";
import { renderElement, toHTML } from "../src/core/adapters/html.js";
import { idScope } from "../src/core/ids.js";
import { ctaTemplate } from "../src/components/cta/cta.template.js";
import { templates } from "../src/templates.js";

const render = (attrs = {}, children = []) => ctaTemplate(attrs, { id: (suffix) => suffix, children });
const child = (slot, tag = "span") => ({ tag, attrs: slot === "default" ? {} : { slot }, text: "x", slot });
const text = (value) => ({ tag: null, attrs: {}, text: value, slot: "default" });
const classesOf = (node) => node.props.class.split(" ");

function find(node, name) {
  if (classesOf(node)[0] === name) return node;
  for (const item of node.children) {
    if (typeof item === "object" && "tag" in item) {
      const hit = find(item, name);
      if (hit) return hit;
    }
  }
  return null;
}

const STATUS = '<p class="neuwo-cta__status" role="status" aria-live="polite"></p>';
const COLUMN =
  '<h2 class="neuwo-cta__headline"></h2>' +
  '<div class="neuwo-cta__sub"></div>' +
  '<div class="neuwo-cta__field neuwo-cta__field--empty"></div>' +
  STATUS;

describe("ctaTemplate()", () => {
  it("is registered for neuwo-cta", () => {
    expect(templates["neuwo-cta"]).toBe(ctaTemplate);
  });

  it("renders the banner by default: the text column in a body, then the actions beside it", () => {
    expect(toHTML(render())).toBe(
      '<div class="neuwo-cta neuwo-cta--banner">' +
        `<div class="neuwo-cta__body">${COLUMN}</div>` +
        '<div class="neuwo-cta__actions"></div>' +
        "</div>",
    );
  });

  it("renders the spotlight as a hidden glow and an inner panel that holds the actions too", () => {
    expect(toHTML(render({ variant: "spotlight" }))).toBe(
      '<div class="neuwo-cta neuwo-cta--spotlight">' +
        '<div class="neuwo-cta__glow" aria-hidden="true"></div>' +
        `<div class="neuwo-cta__inner">${COLUMN}<div class="neuwo-cta__actions"></div></div>` +
        "</div>",
    );
  });

  it.each([
    ["missing", {}],
    ["empty", { variant: "" }],
    ["unknown", { variant: "hero" }],
    ["differently cased", { variant: "Spotlight" }],
    ["an inherited object key", { variant: "toString" }],
  ])("falls back to the banner when the variant is %s", (_, attrs) => {
    expect(classesOf(render(attrs))).toEqual(["neuwo-cta", "neuwo-cta--banner"]);
    expect(find(render(attrs), "neuwo-cta__glow")).toBeNull();
  });

  it.each(["1", "2", "3", "4", "5", "6"])("renders the headline as h%s from heading-level", (level) => {
    expect(find(render({ "heading-level": level }), "neuwo-cta__headline").tag).toBe(`h${level}`);
    expect(find(render({ variant: "spotlight", "heading-level": level }), "neuwo-cta__headline").tag).toBe(`h${level}`);
  });

  it.each([
    ["missing", {}],
    ["empty", { "heading-level": "" }],
    ["zero", { "heading-level": "0" }],
    ["above six", { "heading-level": "9" }],
    ["not a number", { "heading-level": "foo" }],
  ])("falls back to an h2 when heading-level is %s", (_, attrs) => {
    expect(find(render(attrs), "neuwo-cta__headline").tag).toBe("h2");
  });

  it("wraps the sub in a div, so a block-level sub stays inside it when a parser reads the markup", () => {
    expect(find(render(), "neuwo-cta__sub").tag).toBe("div");
  });

  it("writes the status text as the status line's only child, and nothing at all when it is empty", () => {
    expect(find(render({ status: "Thanks, we will be in touch shortly." }), "neuwo-cta__status").children).toEqual([
      "Thanks, we will be in touch shortly.",
    ]);
    for (const attrs of [{}, { status: "" }]) expect(find(render(attrs), "neuwo-cta__status").children).toEqual([]);
  });

  it("escapes the status text", () => {
    expect(toHTML(find(render({ status: "<b>&</b>" }), "neuwo-cta__status"))).toBe(
      '<p class="neuwo-cta__status" role="status" aria-live="polite">&lt;b>&amp;&lt;/b></p>',
    );
  });

  it("keeps the status line a polite live region in both variants, whatever the status", () => {
    for (const variant of ["banner", "spotlight"]) {
      for (const status of [undefined, "Sent"]) {
        const props = find(render({ variant, ...(status && { status }) }), "neuwo-cta__status").props;
        expect(props.role).toBe("status");
        expect(props["aria-live"]).toBe("polite");
      }
    }
  });

  it.each([
    ["success", "neuwo-cta__status neuwo-cta__status--success"],
    ["error", "neuwo-cta__status neuwo-cta__status--error"],
    ["muted", "neuwo-cta__status"],
    ["loud", "neuwo-cta__status"],
    ["", "neuwo-cta__status"],
  ])("colours the status line for status-state=%s", (state, classes) => {
    expect(find(render({ status: "x", "status-state": state }), "neuwo-cta__status").props.class).toBe(classes);
  });

  it("marks the field wrapper empty until a child with slot=field arrives", () => {
    const field = (children) => find(render({}, children), "neuwo-cta__field").props.class;
    expect(field([])).toBe("neuwo-cta__field neuwo-cta__field--empty");
    expect(field([text("Headline"), child("sub"), child("actions", "button")])).toBe("neuwo-cta__field neuwo-cta__field--empty");
    expect(field([child("start")])).toBe("neuwo-cta__field neuwo-cta__field--empty");
    expect(field([child("field", "input")])).toBe("neuwo-cta__field");
  });

  // The React adapter describes a component child it cannot see into with no tag and no text.
  it("counts a child with no tag and no text as a field, as the React adapter describes a component", () => {
    expect(find(render({}, [{ tag: null, attrs: {}, text: "", slot: "field" }]), "neuwo-cta__field").props.class).toBe("neuwo-cta__field");
  });

  it("counts indented markup's whitespace as no field through the server adapter, and leaves the status line empty", () => {
    const whitespace = (value) => ({ ...text(value), html: value });
    const headline = { ...text("Ready?"), html: "Ready?" };
    const button = { tag: "button", attrs: { slot: "actions" }, text: "Go", slot: "actions", html: '<button slot="actions">Go</button>' };
    const html = renderElement("neuwo-cta", {}, [whitespace("\n  "), headline, whitespace("\n  "), button, whitespace("\n")], ctaTemplate, idScope("neuwo-s"));
    expect(html).toBe(
      "<neuwo-cta>" +
        '<div class="neuwo-cta neuwo-cta--banner">' +
        '<div class="neuwo-cta__body">' +
        '<h2 class="neuwo-cta__headline">\n  Ready?\n  \n</h2>' +
        '<div class="neuwo-cta__sub"></div>' +
        '<div class="neuwo-cta__field neuwo-cta__field--empty"></div>' +
        STATUS +
        "</div>" +
        '<div class="neuwo-cta__actions"><button slot="actions">Go</button></div>' +
        "</div>" +
        "</neuwo-cta>",
    );
  });

  it("keeps every region the only child of its wrapper, in both variants", () => {
    for (const variant of ["banner", "spotlight"]) {
      const node = render({ variant, status: "Sent" }, [text("x"), child("sub"), child("field"), child("actions")]);
      expect(find(node, "neuwo-cta__headline").children).toEqual([{ region: "default" }]);
      expect(find(node, "neuwo-cta__sub").children).toEqual([{ region: "sub" }]);
      expect(find(node, "neuwo-cta__field").children).toEqual([{ region: "field" }]);
      expect(find(node, "neuwo-cta__actions").children).toEqual([{ region: "actions" }]);
    }
  });

  it("keeps the wrappers' first class fixed, so every case renders the same wrappers", () => {
    for (const attrs of [{}, { variant: "spotlight", "heading-level": "4", status: "Sent", "status-state": "error" }]) {
      for (const children of [[], [child("field")]]) {
        const node = render(attrs, children);
        for (const name of ["headline", "sub", "field", "actions"]) expect(find(node, `neuwo-cta__${name}`), name).not.toBeNull();
      }
    }
  });
});
