import { describe, expect, it } from "vitest";
import { h, has, raw, region } from "../src/core/template.js";
import { childInfo, isRendered, patch, render } from "../src/core/adapters/dom.js";

const SVG = "http://www.w3.org/2000/svg";
const testTemplate = (a) => h("span", { class: `neuwo-t neuwo-t--${a.tone ?? "a"}` }, region("start"), region());

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

function watch(host) {
  const observer = new MutationObserver(() => {});
  observer.observe(host, { subtree: true, attributes: true, childList: true, characterData: true });
  return observer;
}

describe("childInfo()", () => {
  it("describes element and text children, skipping comments", () => {
    const host = make(`<neuwo-t>a<i slot="start" title="t">b</i><!-- c --><b>d</b></neuwo-t>`);
    expect(childInfo(host)).toEqual([
      { tag: null, attrs: {}, text: "a", slot: "default" },
      { tag: "i", attrs: { slot: "start", title: "t" }, text: "b", slot: "start" },
      { tag: "b", attrs: {}, text: "d", slot: "default" },
    ]);
  });
});

describe("render()", () => {
  it("places a start child before the text", () => {
    const host = make(`<neuwo-t>x<i slot="start"></i></neuwo-t>`);
    const icon = host.querySelector("i");
    render(host, testTemplate);
    expect(host.innerHTML).toBe('<span class="neuwo-t neuwo-t--a"><i slot="start"></i>x</span>');
    expect(host.querySelector("i")).toBe(icon);
  });

  it("keeps an author svg in the SVG namespace", () => {
    const host = make(`<neuwo-t>x<svg slot="start"><path></path></svg></neuwo-t>`);
    render(host, testTemplate);
    const svg = host.firstElementChild.firstElementChild;
    expect(svg.localName).toBe("svg");
    expect(svg.namespaceURI).toBe(SVG);
    expect(svg.firstElementChild.namespaceURI).toBe(SVG);
  });

  it("creates template svg nodes and raw content in the SVG namespace", () => {
    const host = make(`<neuwo-t></neuwo-t>`);
    render(host, () => h("svg", { class: "neuwo-s" }, h("g", null, raw('<path d="M0 0"/>'))));
    const svg = host.firstElementChild;
    expect(svg.namespaceURI).toBe(SVG);
    expect(svg.firstElementChild.namespaceURI).toBe(SVG);
    expect(svg.querySelector("path").namespaceURI).toBe(SVG);
  });

  it("drops children whose region the template lacks", () => {
    const host = make(`<neuwo-t>x<i slot="start"></i></neuwo-t>`);
    render(host, () => h("span", { class: "neuwo-u" }, region("start")));
    expect(host.innerHTML).toBe('<span class="neuwo-u"><i slot="start"></i></span>');
  });

  it("gives each host its own ids", () => {
    const template = (a, ctx) => h("span", { class: "neuwo-t", "aria-describedby": ctx.id("hint") });
    const one = make(`<neuwo-t></neuwo-t>`);
    const two = make(`<neuwo-t></neuwo-t>`);
    render(one, template);
    render(two, template);
    const first = one.firstElementChild.getAttribute("aria-describedby");
    expect(first).toMatch(/^neuwo-c\d+-hint$/);
    expect(two.firstElementChild.getAttribute("aria-describedby")).not.toBe(first);
  });
});

describe("isRendered()", () => {
  it("is false for author children and true after render", () => {
    const host = make(`<neuwo-t><i slot="start"></i>x</neuwo-t>`);
    expect(isRendered(host, testTemplate)).toBe(false);
    render(host, testTemplate);
    expect(isRendered(host, testTemplate)).toBe(true);
  });

  it("is true for server-rendered markup", () => {
    const host = make(`<neuwo-t tone="b"><span class="neuwo-t neuwo-t--b">x</span></neuwo-t>`);
    expect(isRendered(host, testTemplate)).toBe(true);
  });
});

describe("patch()", () => {
  it("changes only the class when an attribute changes", () => {
    const host = make(`<neuwo-t><i slot="start"></i>x</neuwo-t>`);
    render(host, testTemplate);
    const span = host.firstElementChild;
    host.setAttribute("tone", "b");
    const observer = watch(host);
    patch(host, testTemplate);
    const records = observer.takeRecords();
    expect(records).toHaveLength(1);
    expect(records[0].type).toBe("attributes");
    expect(records[0].attributeName).toBe("class");
    expect(records[0].target).toBe(span);
    expect(host.firstElementChild).toBe(span);
    expect(span.className).toBe("neuwo-t neuwo-t--b");
  });

  it("writes nothing when nothing changed", () => {
    const host = make(`<neuwo-t tone="b"><i slot="start"></i>x</neuwo-t>`);
    render(host, testTemplate);
    const observer = watch(host);
    patch(host, testTemplate);
    expect(observer.takeRecords()).toHaveLength(0);
  });

  it("writes nothing to unchanged server-rendered markup", () => {
    const host = make(`<neuwo-t tone="b"><span class="neuwo-t neuwo-t--b"><i slot="start"></i>x<!-- c --></span></neuwo-t>`);
    const observer = watch(host);
    patch(host, testTemplate);
    expect(observer.takeRecords()).toHaveLength(0);
  });

  it("rebuilds when the root tag changes and keeps the author children", () => {
    const template = (a) => h(a.href ? "a" : "span", { class: "neuwo-t", href: a.href }, region("start"), region());
    const host = make(`<neuwo-t><i slot="start"></i>x</neuwo-t>`);
    render(host, template);
    const icon = host.querySelector("i");
    const label = icon.nextSibling;
    host.setAttribute("href", "/go");
    patch(host, template);
    expect(host.innerHTML).toBe('<a class="neuwo-t" href="/go"><i slot="start"></i>x</a>');
    expect(host.querySelector("i")).toBe(icon);
    expect(icon.nextSibling).toBe(label);
    host.removeAttribute("href");
    patch(host, template);
    expect(host.innerHTML).toBe('<span class="neuwo-t"><i slot="start"></i>x</span>');
    expect(host.querySelector("i")).toBe(icon);
  });

  it("adds and removes a template element beside the regions", () => {
    const template = (a) =>
      h("span", { class: "neuwo-t" }, has(a, "busy") && h("b", { class: "neuwo-t__spin" }), region("start"), region());
    const host = make(`<neuwo-t busy><i slot="start"></i>x</neuwo-t>`);
    render(host, template);
    expect(host.innerHTML).toBe('<span class="neuwo-t"><b class="neuwo-t__spin"></b><i slot="start"></i>x</span>');
    host.removeAttribute("busy");
    patch(host, template);
    expect(host.innerHTML).toBe('<span class="neuwo-t"><i slot="start"></i>x</span>');
    host.setAttribute("busy", "");
    patch(host, template);
    expect(host.innerHTML).toBe('<span class="neuwo-t"><b class="neuwo-t__spin"></b><i slot="start"></i>x</span>');
  });

  it("replaces only text that differs", () => {
    const template = (a) => h("span", { class: "neuwo-t" }, h("b", { class: "neuwo-t__label" }, a.label), region());
    const host = make(`<neuwo-t label="One">x</neuwo-t>`);
    render(host, template);
    host.setAttribute("label", "Two");
    const observer = watch(host);
    patch(host, template);
    const records = observer.takeRecords();
    expect(records).toHaveLength(1);
    expect(records[0].type).toBe("characterData");
    expect(host.innerHTML).toBe('<span class="neuwo-t"><b class="neuwo-t__label">Two</b>x</span>');
  });

  it("replaces raw content only when it differs", () => {
    const template = (a) => h("svg", { class: "neuwo-t" }, raw(a.shape === "c" ? '<circle r="1"/>' : '<path d="M0 0"/>'));
    const host = make(`<neuwo-t></neuwo-t>`);
    render(host, template);
    let observer = watch(host);
    patch(host, template);
    expect(observer.takeRecords()).toHaveLength(0);
    host.setAttribute("shape", "c");
    observer = watch(host);
    patch(host, template);
    expect(observer.takeRecords().length).toBeGreaterThan(0);
    expect(host.querySelector("circle").namespaceURI).toBe(SVG);
  });

  it("moves author children added later into their regions", () => {
    const host = make(`<neuwo-t>x</neuwo-t>`);
    render(host, testTemplate);
    const icon = document.createElement("i");
    icon.slot = "start";
    host.firstElementChild.append(icon);
    patch(host, testTemplate);
    expect(host.innerHTML).toBe('<span class="neuwo-t neuwo-t--a"><i slot="start"></i>x</span>');
  });

  it("keeps the ids render gave the host", () => {
    const template = (a, ctx) => h("span", { class: "neuwo-t", "aria-describedby": ctx.id("hint"), "data-tone": a.tone });
    const host = make(`<neuwo-t tone="a"></neuwo-t>`);
    render(host, template);
    const id = host.firstElementChild.getAttribute("aria-describedby");
    host.setAttribute("tone", "b");
    const observer = watch(host);
    patch(host, template);
    expect(observer.takeRecords().map((record) => record.attributeName)).toEqual(["data-tone"]);
    expect(host.firstElementChild.getAttribute("aria-describedby")).toBe(id);
  });

  it("gives the template the author children, not the rendered markup", () => {
    let seen;
    const template = (a, ctx) => {
      seen = ctx.children;
      return testTemplate(a);
    };
    const host = make(`<neuwo-t><i slot="start"></i>x</neuwo-t>`);
    render(host, template);
    host.setAttribute("tone", "b");
    patch(host, template);
    expect(seen).toEqual([
      { tag: "i", attrs: { slot: "start" }, text: "", slot: "start" },
      { tag: null, attrs: {}, text: "x", slot: "default" },
    ]);
  });

  it("renders a host that has not been rendered yet", () => {
    const host = make(`<neuwo-t>x<i slot="start"></i></neuwo-t>`);
    patch(host, testTemplate);
    expect(host.innerHTML).toBe('<span class="neuwo-t neuwo-t--a"><i slot="start"></i>x</span>');
  });
});
