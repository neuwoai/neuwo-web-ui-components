// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { h, region } from "../src/core/template.js";
import { renderElement as htmlRenderElement } from "../src/core/adapters/html.js";
import { templates } from "../src/templates.js";
import { eleventyPlugin, expand, renderElement } from "../src/server/index.js";
import { cases, markup } from "./fixtures/template-cases.js";

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
      {
        tag: "b",
        attrs: { slot: "start", title: "a & b" },
        text: "x y",
        slot: "start",
        children: [
          { tag: null, attrs: {}, text: "x ", slot: "default" },
          { tag: "i", attrs: {}, text: "y", slot: "default", children: [{ tag: null, attrs: {}, text: "y", slot: "default" }] },
        ],
      },
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

  it("numbers an element's ids before those of the elements inside it, in document order", () => {
    const withId = { "neuwo-i": (a, ctx) => h("span", { class: "neuwo-i", id: ctx.id(a.n) }, h("span", { class: "neuwo-i__body" }, region())) };
    const html = '<neuwo-i n="outer"><neuwo-i n="inner"></neuwo-i></neuwo-i><neuwo-i n="next"></neuwo-i>';
    expect([...expand(html, withId).matchAll(/ id="([^"]+)"/g)].map((match) => match[1])).toEqual(["neuwo-s1-outer", "neuwo-s2-inner", "neuwo-s3-next"]);
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

  const T = "<neuwo-t>x</neuwo-t>";

  it.each([
    "<svg><neuwo-t>x</neuwo-t></svg>",
    '<svg viewBox="0 0 1 1"><g><neuwo-t tone="b"><neuwo-t>y</neuwo-t></neuwo-t></g><neuwo-t/></svg>',
    `<math>${T}</math>`,
    `<SVG>${T}</SVG>`,
    `<math><foreignObject>${T}</foreignObject></math>`,
    `<math><svg><foreignObject>${T}</foreignObject></svg></math>`,
    `<math><annotation-xml encoding="application/mathml+xml">${T}</annotation-xml></math>`,
    `<math><annotation-xml>${T}</annotation-xml></math>`,
    `<math><mi><mglyph>${T}</mglyph></mi></math>`,
    `<svg><math><mi>${T}</mi></math></svg>`,
    `<svg><mtext>${T}</mtext></svg>`,
    `<svg><font>a</font>${T}</svg>`,
    `<svg><foreignObject><p>a</p></foreignObject>${T}</svg>`,
  ])("leaves registered tags inside svg and math alone: %s", (html) => {
    expect(run(html)).toBe(html);
  });

  it.each([
    `<svg><desc>${T}</desc></svg>`,
    `<svg><title>${T}</title></svg>`,
    `<math><mi>${T}</mi></math>`,
    `<math><mo>${T}</mo></math>`,
    `<math><mn>${T}</mn></math>`,
    `<math><ms>${T}</ms></math>`,
    `<math><mtext>${T}</mtext></math>`,
    `<math><mi><b>${T}</b></mi></math>`,
    `<math><annotation-xml encoding="text/html">${T}</annotation-xml></math>`,
    `<math><annotation-xml encoding="Application/XHTML+XML">${T}</annotation-xml></math>`,
    `<math><annotation-xml><svg><foreignObject>${T}</foreignObject></svg></annotation-xml></math>`,
  ])("expands registered tags at the parser's HTML integration points: %s", (html) => {
    expect(run(html)).toBe(html.replace(T, plain("x")));
  });

  it.each([
    `<svg><p>a</p>${T}</svg>`,
    `<svg><g><b>a</b>${T}</g>${T}</svg>`,
    `<math><mrow><div>a</div></mrow>${T}</math>`,
    `<svg><font color="red">a</font>${T}</svg>`,
  ])("expands registered tags after an HTML tag that ends the foreign content: %s", (html) => {
    expect(run(html)).toBe(html.replaceAll(T, plain("x")));
  });

  it("expands registered tags inside an svg foreignObject, and only there", () => {
    const html = "<svg><foreignObject><div><neuwo-t>x</neuwo-t><svg><neuwo-t>y</neuwo-t></svg></div></foreignObject><neuwo-t>z</neuwo-t></svg><neuwo-t>w</neuwo-t>";
    expect(run(html)).toBe(
      `<svg><foreignObject><div>${plain("x")}<svg><neuwo-t>y</neuwo-t></svg></div></foreignObject><neuwo-t>z</neuwo-t></svg>${plain("w")}`,
    );
    expect(run("<svg><FOREIGNOBJECT><neuwo-t>x</neuwo-t></FOREIGNOBJECT></svg>")).toBe(`<svg><FOREIGNOBJECT>${plain("x")}</FOREIGNOBJECT></svg>`);
  });

  it("leaves svg inside a registered element's content alone", () => {
    expect(run("<neuwo-t><svg><neuwo-t>y</neuwo-t></svg></neuwo-t>")).toBe(plain("<svg><neuwo-t>y</neuwo-t></svg>"));
  });
});

describe("expand() on a paragraph Markdown wrapped around an element", () => {
  const field = '<neuwo-input name="a"></neuwo-input>';

  it("lifts an element whose markup is block content out of a paragraph that holds only it", () => {
    const html = expand(`<p>${field}</p>`);
    expect(html).not.toContain("<p>");
    expect(html).toMatch(/^<neuwo-input name="a"><div class="neuwo-field">[\s\S]*<\/div><\/neuwo-input>$/);
    expect(html).toBe(expand(field));
  });

  it("lifts it when only whitespace sits beside it, keeping that whitespace and what is around the paragraph", () => {
    const options = "<option>A</option><option>B</option>";
    const html = `<form>\n<p>\n  <neuwo-combobox name="plan">${options}</neuwo-combobox>\n</p>\n<p>x</p></form>`;
    expect(expand(html)).toBe(`<form>\n\n  ${expand(`<neuwo-combobox name="plan">${options}</neuwo-combobox>`)}\n\n<p>x</p></form>`);
  });

  it("lifts every block element in its own paragraph, as blank lines between fields give", () => {
    const html = expand(`<form><p>${field}</p>\n<p><neuwo-textarea name="b"></neuwo-textarea></p>\n<p><neuwo-range name="c"></neuwo-range></p></form>`);
    expect(html).not.toContain("<p>");
    expect(html.match(/class="neuwo-field"/g)).toHaveLength(3);
  });

  it("lifts a run of block elements Markdown put in one paragraph, from fields on consecutive lines", () => {
    const run = `${field}\n<neuwo-textarea name="b"></neuwo-textarea>`;
    const html = expand(`<form>\n<p>${run}</p>\n</form>`);
    expect(html).not.toContain("<p>");
    expect(html).toBe(expand(`<form>\n${run}\n</form>`));
    expect(html.match(/class="neuwo-field"/g)).toHaveLength(2);
    expect(expand(html)).toBe(html);
  });

  it("lifts block elements with a comment beside them, keeping the comment", () => {
    expect(expand(`<p><!-- a -->${field}</p>`)).toBe(expand(`<!-- a -->${field}`));
  });

  it("drops the paragraph's own attributes with it", () => {
    expect(expand(`<p class="x">${field}</p>`)).toBe(expand(field));
  });

  it.each([
    ["other text", `<p>Text ${field}</p>`],
    ["a non-breaking space", `<p>&nbsp;${field}</p>`],
    ["an inline element", `<p><b>x</b>${field}</p>`],
    ["a component whose markup is phrasing content", `<p>${field}<neuwo-badge>x</neuwo-badge></p>`],
  ])("leaves a paragraph that holds %s beside the block elements", (_, html) => {
    expect(expand(html)).toMatch(/^<p>/);
  });

  it.each([
    ["a badge", "<p>Text <neuwo-badge>x</neuwo-badge></p>"],
    ["a button", "<p><neuwo-button>Go</neuwo-button></p>"],
    ["a link button", '<p><neuwo-button href="/x">Go</neuwo-button></p>'],
  ])("keeps the paragraph around %s, whose markup is phrasing content", (_, html) => {
    const out = expand(html);
    expect(out).toMatch(/^<p>/);
    expect(out).toMatch(/<\/p>$/);
  });

  it("keeps a paragraph only around an element a browser parses inside it, for every template case", () => {
    const { document } = new JSDOM("").window;
    const parse = (tag, html) => Object.assign(document.createElement(tag), { innerHTML: html });
    let kept = 0;
    for (const [tag, list] of Object.entries(cases)) {
      for (const testCase of list) {
        const source = markup({ tag, attrs: testCase.attrs, children: testCase.children });
        const element = expand(source);
        const out = expand(`<p>${source}</p>`);
        if (out === element) continue;
        kept += 1;
        const label = `${tag}: ${testCase.name}`;
        expect(out, label).toBe(`<p>${element}</p>`);
        const body = parse("body", out);
        expect(body.children.length, label).toBe(1);
        expect(body.firstElementChild.innerHTML, label).toBe(parse("div", element).innerHTML);
      }
    }
    expect(kept).toBeGreaterThan(0);
  });

  it("leaves an element that already holds its markup where it is, and stays idempotent", () => {
    const once = expand(`<p>${field}</p>`);
    expect(expand(once)).toBe(once);
    const served = `<p>${once}</p>`;
    expect(expand(served)).toBe(served);
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
