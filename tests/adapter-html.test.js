import { describe, expect, it } from "vitest";
import { h, raw, region } from "../src/core/template.js";
import { idScope } from "../src/core/ids.js";
import { renderElement, toHTML } from "../src/core/adapters/html.js";

const testTemplate = (a) => h("span", { class: `neuwo-t neuwo-t--${a.tone ?? "a"}` }, region("start"), region());

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
    const node = h("span", null, region("start"), h("b", null, region()), region("end"));
    expect(toHTML(node, { start: "<i>s</i>", default: "x &amp; y" })).toBe("<span><i>s</i><b>x &amp; y</b></span>");
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
    expect(html).toBe('<neuwo-t tone="b"><span class="neuwo-t neuwo-t--b"><i slot="start"></i>x</span></neuwo-t>');
  });

  it("escapes host attributes and writes empty ones as empty values", () => {
    const html = renderElement("neuwo-t", { title: 'a"b', hidden: "" }, [], testTemplate, idScope("neuwo-s"));
    expect(html).toBe('<neuwo-t title="a&quot;b" hidden=""><span class="neuwo-t neuwo-t--a"></span></neuwo-t>');
  });

  it("falls back to the default region for an unknown slot", () => {
    const html = renderElement("neuwo-t", {}, [el("b", "nope", '<b slot="nope">n</b>'), text("x")], testTemplate, idScope("neuwo-s"));
    expect(html).toBe('<neuwo-t><span class="neuwo-t neuwo-t--a"><b slot="nope">n</b>x</span></neuwo-t>');
  });

  it("drops children whose region the template lacks", () => {
    const startOnly = () => h("span", { class: "neuwo-u" }, region("start"));
    const children = [text("x"), el("i", "start", '<i slot="start"></i>'), el("b", "nope", '<b slot="nope"></b>')];
    expect(renderElement("neuwo-u", {}, children, startOnly, idScope("neuwo-s"))).toBe(
      '<neuwo-u><span class="neuwo-u"><i slot="start"></i></span></neuwo-u>',
    );
  });

  it("keeps comments in the default region without describing them", () => {
    let seen;
    const template = (a, ctx) => {
      seen = ctx.children;
      return testTemplate(a);
    };
    const comment = { tag: null, attrs: {}, text: "", slot: "default", html: "<!-- note -->" };
    const html = renderElement("neuwo-t", {}, [comment, text("x")], template, idScope("neuwo-s"));
    expect(html).toBe('<neuwo-t><span class="neuwo-t neuwo-t--a"><!-- note -->x</span></neuwo-t>');
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
