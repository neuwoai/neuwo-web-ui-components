import { afterEach, describe, expect, it } from "vitest";
import { h, has, raw, region } from "../src/core/template.js";
import { adopt, childInfo, isRendered, patch, render } from "../src/core/adapters/dom.js";

const SVG = "http://www.w3.org/2000/svg";
const testTemplate = (a) => h("span", { class: `neuwo-t neuwo-t--${a.tone ?? "a"}` }, region("start"), region());

const containers = [];

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  containers.push(host);
  return host.firstElementChild;
}

afterEach(() => {
  for (const container of containers.splice(0)) container.remove();
});

function watch(host) {
  const observer = new MutationObserver(() => {});
  observer.observe(host, { subtree: true, attributes: true, childList: true, characterData: true });
  return observer;
}

function spy(template) {
  const calls = [];
  const wrapped = (a, ctx) => {
    calls.push(ctx.children);
    return template(a, ctx);
  };
  return { calls, wrapped };
}

describe("childInfo()", () => {
  it("describes element and text children, skipping comments and whitespace-only text", () => {
    const host = make(`<neuwo-t>a<i slot="start" title="t">b</i><!-- c -->\n  <b>d</b></neuwo-t>`);
    expect(childInfo(host)).toEqual([
      { tag: null, attrs: {}, text: "a", slot: "default" },
      { tag: "i", attrs: { slot: "start", title: "t" }, text: "b", slot: "start" },
      { tag: "b", attrs: {}, text: "d", slot: "default" },
    ]);
  });

  it("describes the author children of a rendered host, not its markup", () => {
    const host = make(`<neuwo-t><i slot="start"></i>x</neuwo-t>`);
    render(host, testTemplate);
    expect(childInfo(host)).toEqual([
      { tag: "i", attrs: { slot: "start" }, text: "", slot: "start" },
      { tag: null, attrs: {}, text: "x", slot: "default" },
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

  it("does not render a child whose slot names a missing region", () => {
    const host = make(`<neuwo-t>x<i slot="start"></i><b slot="nope">n</b></neuwo-t>`);
    render(host, testTemplate);
    expect(host.innerHTML).toBe('<span class="neuwo-t neuwo-t--a"><i slot="start"></i>x</span>');
  });

  it("drops default children when the template has no default region", () => {
    const host = make(`<neuwo-t>x<i slot="start"></i></neuwo-t>`);
    render(host, () => h("span", { class: "neuwo-u" }, region("start")));
    expect(host.innerHTML).toBe('<span class="neuwo-u"><i slot="start"></i></span>');
  });

  it("places whitespace-only text without describing it", () => {
    const { calls, wrapped } = spy(testTemplate);
    const host = make(`<neuwo-t> <i slot="start"></i></neuwo-t>`);
    render(host, wrapped);
    expect(host.innerHTML).toBe('<span class="neuwo-t neuwo-t--a"><i slot="start"></i> </span>');
    expect(calls.at(-1)).toEqual([{ tag: "i", attrs: { slot: "start" }, text: "", slot: "start" }]);
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

  it("finds the root behind an author element", () => {
    const host = make(`<neuwo-t><i slot="start"></i><span class="neuwo-t neuwo-t--a">x</span></neuwo-t>`);
    expect(isRendered(host, testTemplate)).toBe(true);
  });

  it("gives the template the author children, as patch does", () => {
    const { calls, wrapped } = spy(testTemplate);
    const host = make(`<neuwo-t><span class="neuwo-t neuwo-t--a"><i slot="start"></i>x</span></neuwo-t>`);
    isRendered(host, wrapped);
    const author = [
      { tag: "i", attrs: { slot: "start" }, text: "", slot: "start" },
      { tag: null, attrs: {}, text: "x", slot: "default" },
    ];
    expect(calls.at(-1)).toEqual(author);
    adopt(host, wrapped);
    host.setAttribute("tone", "b");
    patch(host, wrapped);
    expect(calls.at(-1)).toEqual(author);
  });
});

describe("adopt()", () => {
  it("writes nothing to server-rendered markup", () => {
    const host = make(`<neuwo-t tone="b"><span class="neuwo-t neuwo-t--b"><i slot="start"></i>x<!-- c --></span></neuwo-t>`);
    const observer = watch(host);
    adopt(host, testTemplate);
    expect(observer.takeRecords()).toHaveLength(0);
  });

  it("keeps the server's ids through later patches", () => {
    const template = (a, ctx) => h("span", { class: "neuwo-t", "aria-describedby": ctx.id("hint"), "data-tone": a.tone });
    const host = make(`<neuwo-t tone="a"><span class="neuwo-t" aria-describedby="neuwo-s1-hint" data-tone="a"></span></neuwo-t>`);
    adopt(host, template);
    host.setAttribute("tone", "b");
    const observer = watch(host);
    patch(host, template);
    expect(observer.takeRecords().map((record) => record.attributeName)).toEqual(["data-tone"]);
    expect(host.firstElementChild.getAttribute("aria-describedby")).toBe("neuwo-s1-hint");
  });

  it("tells an unclassed template element from an author element of the same tag", () => {
    const template = (a) => h("span", { class: "neuwo-t", title: a.title }, region(), h("b", null));
    const host = make(`<neuwo-t><span class="neuwo-t"><b>bold</b><b></b></span></neuwo-t>`);
    adopt(host, template);
    host.setAttribute("title", "x");
    patch(host, template);
    expect(host.innerHTML).toBe('<span class="neuwo-t" title="x"><b>bold</b><b></b></span>');
  });

  it("rebuilds markup that does not match the template, keeping only the author's children", () => {
    const template = (a) => h("span", { class: "neuwo-t" }, h("b", { class: "neuwo-t__label" }, a.label), region());
    const host = make(`<neuwo-t label="New"><span class="neuwo-t"><b class="neuwo-t__label">Old</b><i class="neuwo-t__gone"></i>x</span></neuwo-t>`);
    const observer = watch(host);
    adopt(host, template);
    expect(observer.takeRecords()).toHaveLength(0);
    host.setAttribute("label", "Newer");
    patch(host, template);
    expect(host.innerHTML).toBe('<span class="neuwo-t"><b class="neuwo-t__label">Newer</b>x</span>');
  });

  it("syncs a moved host whose attributes changed while it was detached", () => {
    const host = make(`<neuwo-t><i slot="start"></i>x</neuwo-t>`);
    render(host, testTemplate);
    const span = host.firstElementChild;
    host.remove();
    host.setAttribute("tone", "b");
    document.body.append(host);
    adopt(host, testTemplate);
    expect(host.firstElementChild).toBe(span);
    expect(span.className).toBe("neuwo-t neuwo-t--b");
    host.remove();
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

  it("adopts server-rendered markup when it has no snapshot, writing nothing", () => {
    const host = make(`<neuwo-t tone="b"><span class="neuwo-t neuwo-t--b"><i slot="start"></i>x</span></neuwo-t>`);
    const observer = watch(host);
    patch(host, testTemplate);
    expect(observer.takeRecords()).toHaveLength(0);
    host.setAttribute("tone", "a");
    observer.takeRecords();
    patch(host, testTemplate);
    expect(observer.takeRecords()).toHaveLength(1);
    expect(host.innerHTML).toBe('<span class="neuwo-t neuwo-t--a"><i slot="start"></i>x</span>');
  });

  it("renders a host that has not been rendered yet", () => {
    const host = make(`<neuwo-t>x<i slot="start"></i></neuwo-t>`);
    patch(host, testTemplate);
    expect(host.innerHTML).toBe('<span class="neuwo-t neuwo-t--a"><i slot="start"></i>x</span>');
  });

  it("leaves attributes the template does not produce", () => {
    const host = make(`<neuwo-t>x</neuwo-t>`);
    render(host, testTemplate);
    const span = host.firstElementChild;
    span.setAttribute("data-open", "");
    host.setAttribute("tone", "b");
    patch(host, testTemplate);
    expect(span.hasAttribute("data-open")).toBe(true);
    expect(span.className).toBe("neuwo-t neuwo-t--b");
  });

  it("skips a value the DOM already holds", () => {
    const host = make(`<neuwo-t>x</neuwo-t>`);
    render(host, testTemplate);
    host.firstElementChild.className = "neuwo-t neuwo-t--b";
    host.setAttribute("tone", "b");
    const observer = watch(host);
    patch(host, testTemplate);
    expect(observer.takeRecords()).toHaveLength(0);
  });

  it("removes an attribute the template stops producing", () => {
    const template = (a) => h("span", { class: "neuwo-t", title: a.title });
    const host = make(`<neuwo-t title="x"></neuwo-t>`);
    render(host, template);
    host.removeAttribute("title");
    patch(host, template);
    expect(host.innerHTML).toBe('<span class="neuwo-t"></span>');
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

  it("keeps author children when a nested tag changes", () => {
    const template = (a) =>
      h("div", { class: "neuwo-t" }, h(a.level ?? "h2", { class: "neuwo-t__head" }, region()), h("p", { class: "neuwo-t__sub" }, region("sub")));
    const host = make(`<neuwo-t>Head<span slot="sub">Sub</span></neuwo-t>`);
    render(host, template);
    host.setAttribute("level", "h3");
    patch(host, template);
    expect(host.innerHTML).toBe('<div class="neuwo-t"><h3 class="neuwo-t__head">Head</h3><p class="neuwo-t__sub"><span slot="sub">Sub</span></p></div>');
  });

  it("keeps author children when their regions move to other wrappers", () => {
    const template = (a) => {
      const parts = [h("h2", { class: "neuwo-c__headline" }, region()), h("p", { class: "neuwo-c__sub" }, region("sub"))];
      const actions = h("div", { class: "neuwo-c__actions" }, region("actions"));
      return a.variant === "spotlight"
        ? h("div", { class: "neuwo-c" }, h("div", { class: "neuwo-c__glow" }), h("div", { class: "neuwo-c__inner" }, parts, actions))
        : h("div", { class: "neuwo-c" }, h("div", { class: "neuwo-c__body" }, parts), actions);
    };
    const host = make(`<neuwo-cta>Head<span slot="sub">Sub</span><button slot="actions">Go</button></neuwo-cta>`);
    render(host, template);
    const button = host.querySelector("button");
    host.setAttribute("variant", "spotlight");
    patch(host, template);
    expect(host.innerHTML).toBe(
      '<div class="neuwo-c"><div class="neuwo-c__glow"></div><div class="neuwo-c__inner">' +
        '<h2 class="neuwo-c__headline">Head</h2><p class="neuwo-c__sub"><span slot="sub">Sub</span></p>' +
        '<div class="neuwo-c__actions"><button slot="actions">Go</button></div></div></div>',
    );
    expect(host.querySelector("button")).toBe(button);
  });

  it("keeps an author element that shares the tag of an unclassed template element", () => {
    const template = (a) => h("span", { class: "neuwo-t", title: a.title }, region(), h("b", null));
    const host = make(`<neuwo-t><b>bold</b></neuwo-t>`);
    render(host, template);
    host.setAttribute("title", "x");
    patch(host, template);
    expect(host.innerHTML).toBe('<span class="neuwo-t" title="x"><b>bold</b><b></b></span>');
  });

  it("adds and removes a template element beside the regions", () => {
    const template = (a) =>
      h("button", { class: "neuwo-t" }, has(a, "busy") && h("span", { class: "neuwo-spinner" }), region("start"), region());
    const host = make(`<neuwo-t busy><i slot="start"></i>x</neuwo-t>`);
    render(host, template);
    expect(host.innerHTML).toBe('<button class="neuwo-t"><span class="neuwo-spinner"></span><i slot="start"></i>x</button>');
    host.removeAttribute("busy");
    patch(host, template);
    expect(host.innerHTML).toBe('<button class="neuwo-t"><i slot="start"></i>x</button>');
    host.setAttribute("busy", "");
    patch(host, template);
    expect(host.innerHTML).toBe('<button class="neuwo-t"><span class="neuwo-spinner"></span><i slot="start"></i>x</button>');
  });

  it("does not render twice when an author element precedes the root", () => {
    const host = make(`<neuwo-t>x</neuwo-t>`);
    render(host, testTemplate);
    const span = host.firstElementChild;
    const icon = document.createElement("i");
    icon.slot = "start";
    host.prepend(icon);
    host.setAttribute("tone", "b");
    const observer = watch(host);
    patch(host, testTemplate);
    expect(observer.takeRecords().map((record) => record.attributeName)).toEqual(["class"]);
    expect(host.innerHTML).toBe('<i slot="start"></i><span class="neuwo-t neuwo-t--b">x</span>');
    expect(host.querySelectorAll(".neuwo-t")).toHaveLength(1);
    expect(span.className).toBe("neuwo-t neuwo-t--b");
  });

  it("places host-level author nodes into their regions on a rebuild", () => {
    const template = (a) => h(a.href ? "a" : "span", { class: "neuwo-t", href: a.href }, region("start"), region());
    const host = make(`<neuwo-t>x</neuwo-t>`);
    render(host, template);
    const icon = document.createElement("i");
    icon.slot = "start";
    host.prepend(icon);
    host.setAttribute("href", "/go");
    patch(host, template);
    expect(host.innerHTML).toBe('<a class="neuwo-t" href="/go"><i slot="start"></i>x</a>');
  });

  it("brings back a child once the template gains its region", () => {
    const template = (a) => h("span", { class: "neuwo-t" }, has(a, "extra") && h("b", { class: "neuwo-t__extra" }, region("extra")), region());
    const host = make(`<neuwo-t>x<i slot="extra">e</i></neuwo-t>`);
    render(host, template);
    expect(host.innerHTML).toBe('<span class="neuwo-t">x</span>');
    host.setAttribute("extra", "");
    patch(host, template);
    expect(host.innerHTML).toBe('<span class="neuwo-t"><b class="neuwo-t__extra"><i slot="extra">e</i></b>x</span>');
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
    const svg = host.firstElementChild;
    let observer = watch(host);
    patch(host, template);
    expect(observer.takeRecords()).toHaveLength(0);
    host.setAttribute("shape", "c");
    observer = watch(host);
    patch(host, template);
    const records = observer.takeRecords();
    expect(records.length).toBeGreaterThan(0);
    expect(records.every((record) => record.type === "childList" && record.target === svg)).toBe(true);
    expect(host.firstElementChild).toBe(svg);
    expect(svg.innerHTML).toBe('<circle r="1"></circle>');
    expect(svg.firstElementChild.namespaceURI).toBe(SVG);
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
    const { calls, wrapped } = spy(testTemplate);
    const host = make(`<neuwo-t><i slot="start"></i>x</neuwo-t>`);
    render(host, wrapped);
    host.setAttribute("tone", "b");
    patch(host, wrapped);
    expect(calls.at(-1)).toEqual([
      { tag: "i", attrs: { slot: "start" }, text: "", slot: "start" },
      { tag: null, attrs: {}, text: "x", slot: "default" },
    ]);
  });

  it("rebuilds when someone else replaced the markup", () => {
    const host = make(`<neuwo-t>x</neuwo-t>`);
    render(host, testTemplate);
    host.textContent = "y";
    host.setAttribute("tone", "b");
    patch(host, testTemplate);
    expect(host.innerHTML).toBe('<span class="neuwo-t neuwo-t--b">y</span>');
  });
});
