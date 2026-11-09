// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { h, region } from "../src/core/template.js";
import { renderElement as htmlRenderElement } from "../src/core/adapters/html.js";
import { templates } from "../src/templates.js";
import { eleventyPlugin, expand, renderElement } from "../src/server/index.js";

const testTemplate = (a, ctx) =>
  h(
    "span",
    { class: `neuwo-t neuwo-t--${a.tone ?? "a"}` },
    h("span", { class: "neuwo-t__start" }, region("start")),
    h("span", { class: "neuwo-t__body" }, region()),
  );
const shell = (tone, start, body) =>
  `<span class="neuwo-t neuwo-t--${tone}"><span class="neuwo-t__start">${start}</span><span class="neuwo-t__body">${body}</span></span>`;

const registry = { "neuwo-t": testTemplate };
const run = (html) => expand(html, registry);

describe("expand()", () => {
  it("expands a registered element and places its original child markup by slot", () => {
    expect(run(`<p>a</p><neuwo-t tone="b"><i slot=start class='s'>s</i>x &amp; y</neuwo-t>`)).toBe(
      `<p>a</p><neuwo-t tone="b">${shell("b", "<i slot=start class='s'>s</i>", "x &amp; y")}</neuwo-t>`,
    );
  });

  it("expands elements nested directly or inside other markup", () => {
    const html = '<neuwo-t><neuwo-t slot="start" tone="b">s</neuwo-t>a<div><neuwo-t>c</neuwo-t></div></neuwo-t>';
    const start = `<neuwo-t slot="start" tone="b">${shell("b", "", "s")}</neuwo-t>`;
    const body = `a<div><neuwo-t>${shell("a", "", "c")}</neuwo-t></div>`;
    expect(run(html)).toBe(`<neuwo-t>${shell("a", start, body)}</neuwo-t>`);
  });

  it("describes each child from the parsed markup", () => {
    let seen;
    const capture = (a, ctx) => {
      seen = ctx.children;
      return testTemplate(a, ctx);
    };
    expand('<neuwo-t><b slot="start" title="a &amp; b">x <i>y</i></b> t &lt; u <!-- c --></neuwo-t>', { "neuwo-t": capture });
    expect(seen).toEqual([
      { tag: "b", attrs: { slot: "start", title: "a & b" }, text: "x y", slot: "start" },
      { tag: null, attrs: {}, text: " t < u ", slot: "default" },
    ]);
  });

  it("is idempotent", () => {
    const once = run('<neuwo-t tone="b"><i slot="start"></i>a<neuwo-t>b</neuwo-t></neuwo-t>');
    expect(once).toContain('class="neuwo-t ');
    expect(run(once)).toBe(once);
  });

  it("leaves every byte outside the expanded elements unchanged", () => {
    const page = (body) =>
      `<!DOCTYPE html>\r\n<html lang=en>\r\n<head><title>A &amp; B</title></head>\r\n<!-- note -->\r\n` +
      `<body class='page'  data-x=1>\r\n<p title="q" >a<br/>b</p>\r\n${body}\r\n</body>\r\n</html>\r\n`;
    expect(run(page("<neuwo-t tone='b' >x</neuwo-t>"))).toBe(page(`<neuwo-t tone="b">${shell("b", "", "x")}</neuwo-t>`));
  });

  it("issues ids from one fresh scope per call", () => {
    const withId = { "neuwo-i": (a, ctx) => h("span", { class: "neuwo-i", id: ctx.id("x") }) };
    const html = "<neuwo-i></neuwo-i><neuwo-i></neuwo-i>";
    const expected =
      '<neuwo-i><span class="neuwo-i" id="neuwo-s1-x"></span></neuwo-i><neuwo-i><span class="neuwo-i" id="neuwo-s2-x"></span></neuwo-i>';
    expect(expand(html, withId)).toBe(expected);
    expect(expand(html, withId)).toBe(expected);
  });

  it("expands only what the library registry owns by default", () => {
    const html = "<constructor>x</constructor><neuwo-t>y</neuwo-t>";
    expect(expand(html)).toBe(html);
  });

  it("re-exports the HTML adapter's renderElement", () => {
    expect(renderElement).toBe(htmlRenderElement);
  });
});

describe("expand() on real-world markup", () => {
  it("expands an element whose attribute values contain > and quotes", () => {
    expect(run(`<neuwo-t title='a>"b'><i slot="start" data-x="1>0">s</i>x</neuwo-t>`)).toBe(
      `<neuwo-t title="a>&quot;b">${shell("a", '<i slot="start" data-x="1>0">s</i>', "x")}</neuwo-t>`,
    );
  });

  it.each([
    "<!-- <neuwo-t> -->",
    '<script>"<neuwo-t>"</script>',
    '<style>neuwo-t::before { content: "<neuwo-t>"; }</style>',
    "<template><neuwo-t></neuwo-t></template>",
    "<textarea><neuwo-t></neuwo-t></textarea>",
  ])("leaves %s byte-identical", (html) => {
    expect(run(html)).toBe(html);
  });

  it("expands upper-case tag names", () => {
    expect(run('<NEUWO-T TONE="b">x</NEUWO-T>')).toBe(`<neuwo-t tone="b">${shell("b", "", "x")}</neuwo-t>`);
  });

  const plain = (body) => `<neuwo-t>${shell("a", "", body)}</neuwo-t>`;

  it.each([
    ["closed by its parent's end tag", "<div><neuwo-t>x</div>y", `<div>${plain("x")}</div>y`],
    ["with children closed implicitly", "<neuwo-t><p>a<p>b</neuwo-t>", plain("<p>a<p>b")],
    ["with spaces inside end tags", "<neuwo-t><b>x</b >y</neuwo-t >z", `${plain("<b>x</b >y")}z`],
    ["after an end tag holding a newline", "<i>a</i\n><neuwo-t>x</neuwo-t>", `<i>a</i\n>${plain("x")}`],
    ["with an unfinished end tag at the end", "<neuwo-t>x</neuwo-t ", plain("x")],
    ["left open at the end", "<neuwo-t>x", plain("x")],
  ])("expands an element %s", (_, html, expected) => {
    expect(run(html)).toBe(expected);
  });
});

describe("eleventyPlugin()", () => {
  afterEach(() => {
    delete templates["neuwo-t"];
  });

  it("expands .html output and leaves other output alone", () => {
    templates["neuwo-t"] = testTemplate;
    const added = {};
    eleventyPlugin({ addTransform: (name, transform) => (added[name] = transform) });
    const transform = added["neuwo-expand"];
    const content = "<neuwo-t>x</neuwo-t>";
    expect(transform.call({ page: { outputPath: "_site/index.html" } }, content)).toBe(`<neuwo-t>${shell("a", "", "x")}</neuwo-t>`);
    expect(transform.call({ page: { outputPath: "_site/feed.xml" } }, content)).toBe(content);
    expect(transform.call({ page: { outputPath: false } }, content)).toBe(content);
  });
});
