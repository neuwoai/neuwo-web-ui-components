import { describe, expect, it } from "vitest";
import { h, raw, region } from "../src/core/template.js";
import { idScope } from "../src/core/ids.js";
import { renderElement, toHTML } from "../src/core/adapters/html.js";

const testTemplate = (a) =>
  h(
    "span",
    { class: `neuwo-t neuwo-t--${a.tone ?? "a"}` },
    h("span", { class: "neuwo-t__start" }, region("start")),
    h("span", { class: "neuwo-t__label" }, region()),
  );
const shell = (tone, start, label) =>
  `<span class="neuwo-t neuwo-t--${tone}"><span class="neuwo-t__start">${start}</span><span class="neuwo-t__label">${label}</span></span>`;

const text = (value) => ({ tag: null, attrs: {}, text: value, slot: "default", html: value });
const el = (tag, slot, html) => ({ tag, attrs: slot ? { slot } : {}, text: "", slot: slot ?? "default", html });

describe("toHTML()", () => {
  it("escapes text and attribute values", () => {
    expect(toHTML(h("p", { title: 'a"b<c&d' }, 'x < y & "z"'))).toBe(
      '<p title="a&quot;b&lt;c&amp;d">x &lt; y &amp; &quot;z&quot;</p>',
    );
  });

  it("writes boolean attributes as empty values", () => {
    expect(toHTML(h("button", { type: "button", disabled: true }))).toBe('<button type="button" disabled=""></button>');
  });

  it("writes void elements without a closing tag", () => {
    expect(toHTML(h("p", null, h("input", { type: "checkbox" }), h("br")))).toBe('<p><input type="checkbox"><br></p>');
  });

  it("inserts region markup verbatim and leaves missing regions empty", () => {
    const node = h("span", null, h("i", null, region("start")), h("b", null, region()), h("u", null, region("end")));
    expect(toHTML(node, { start: "<i>s</i>", default: "x &amp; y" })).toBe("<span><i><i>s</i></i><b>x &amp; y</b><u></u></span>");
  });

  it("inserts raw markup verbatim", () => {
    expect(toHTML(h("svg", { viewBox: "0 0 1 1" }, raw('<path d="M0 0"/>')))).toBe(
      '<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>',
    );
  });
});

describe("renderElement()", () => {
  it("wraps the template in the host and places children by their slot", () => {
    const html = renderElement("neuwo-t", { tone: "b" }, [text("x"), el("i", "start", '<i slot="start"></i>')], testTemplate, idScope("neuwo-s"));
    expect(html).toBe(`<neuwo-t tone="b">${shell("b", '<i slot="start"></i>', "x")}</neuwo-t>`);
  });

  it("escapes host attributes and writes empty ones as empty values", () => {
    const html = renderElement("neuwo-t", { title: 'a"b', hidden: "" }, [], testTemplate, idScope("neuwo-s"));
    expect(html).toBe(`<neuwo-t title="a&quot;b" hidden="">${shell("a", "", "")}</neuwo-t>`);
  });

  it("does not render a child whose slot names a missing region", () => {
    const html = renderElement("neuwo-t", {}, [el("b", "nope", '<b slot="nope">n</b>'), text("x")], testTemplate, idScope("neuwo-s"));
    expect(html).toBe(`<neuwo-t>${shell("a", "", "x")}</neuwo-t>`);
  });

  it("sends a child with an empty slot to the default region", () => {
    const blank = { tag: "b", attrs: { slot: "" }, text: "", slot: "", html: '<b slot=""></b>' };
    const html = renderElement("neuwo-t", {}, [blank], testTemplate, idScope("neuwo-s"));
    expect(html).toBe(`<neuwo-t>${shell("a", "", '<b slot=""></b>')}</neuwo-t>`);
  });

  it("drops children whose region the template lacks", () => {
    const startOnly = () => h("span", { class: "neuwo-u" }, h("span", { class: "neuwo-u__start" }, region("start")));
    const children = [text("x"), el("i", "start", '<i slot="start"></i>'), el("b", "nope", '<b slot="nope"></b>')];
    expect(renderElement("neuwo-u", {}, children, startOnly, idScope("neuwo-s"))).toBe(
      '<neuwo-u><span class="neuwo-u"><span class="neuwo-u__start"><i slot="start"></i></span></span></neuwo-u>',
    );
  });

  it("keeps comments and whitespace-only text in the default region without describing them", () => {
    let seen;
    const template = (a, ctx) => {
      seen = ctx.children;
      return testTemplate(a);
    };
    const comment = { tag: null, attrs: {}, text: " note ", slot: "default", html: "<!-- note -->" };
    const html = renderElement("neuwo-t", {}, [comment, text("\n  "), text("x")], template, idScope("neuwo-s"));
    expect(html).toBe(`<neuwo-t>${shell("a", "", "<!-- note -->\n  x")}</neuwo-t>`);
    expect(seen).toEqual([{ tag: null, attrs: {}, text: "x", slot: "default" }]);
  });

  it("gives the template its children and a fresh id scope per element", () => {
    let seen;
    const template = (a, ctx) => {
      seen = ctx.children;
      return h("span", { class: "neuwo-t", "aria-describedby": ctx.id("hint") }, region("start"));
    };
    const newIds = idScope("neuwo-s");
    const first = renderElement("neuwo-t", {}, [el("i", "start", '<i slot="start"></i>')], template, newIds);
    const second = renderElement("neuwo-t", {}, [], template, newIds);
    expect(first).toContain('aria-describedby="neuwo-s1-hint"');
    expect(second).toContain('aria-describedby="neuwo-s2-hint"');
    expect(seen).toEqual([]);
    renderElement("neuwo-t", {}, [el("i", "start", '<i slot="start"></i>')], template, newIds);
    expect(seen).toEqual([{ tag: "i", attrs: { slot: "start" }, text: "", slot: "start" }]);
  });
});
