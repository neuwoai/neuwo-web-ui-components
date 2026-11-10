import { afterEach, describe, expect, it } from "vitest";
import { h, has, raw, region } from "../src/core/template.js";
import { adopt, childInfo, isRendered, patch, reconcile, render } from "../src/core/adapters/dom.js";
import { renderElement } from "../src/core/adapters/html.js";
import { idScope } from "../src/core/ids.js";

const SVG = "http://www.w3.org/2000/svg";

const testTemplate = (a) =>
  h(
    "span",
    { class: `neuwo-t neuwo-t--${a.tone ?? "a"}` },
    h("span", { class: "neuwo-t__start" }, region("start")),
    h("span", { class: "neuwo-t__label" }, region()),
  );
const shell = (tone, start, label) =>
  `<span class="neuwo-t neuwo-t--${tone}"><span class="neuwo-t__start">${start}</span><span class="neuwo-t__label">${label}</span></span>`;
const badge = (a) => h("span", { class: `neuwo-t neuwo-t--${a.tone ?? "a"}` }, region());

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

const text = (value) => ({ tag: null, attrs: {}, text: value, slot: "default", html: value });

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

  it("reads through markup it neither rendered nor adopted when given the template, writing nothing", () => {
    const host = make(`<neuwo-t>${shell("a", '<i slot="start"></i>', "x")}<b slot="start"></b></neuwo-t>`);
    const observer = watch(host);
    expect(childInfo(host, testTemplate)).toEqual([
      { tag: "i", attrs: { slot: "start" }, text: "", slot: "start" },
      { tag: null, attrs: {}, text: "x", slot: "default" },
      { tag: "b", attrs: { slot: "start" }, text: "", slot: "start" },
    ]);
    expect(childInfo(host)).toEqual([
      { tag: "span", attrs: { class: "neuwo-t neuwo-t--a" }, text: "x", slot: "default" },
      { tag: "b", attrs: { slot: "start" }, text: "", slot: "start" },
    ]);
    expect(observer.takeRecords()).toHaveLength(0);
  });
});

describe("render()", () => {
  it("places a start child before the text", () => {
    const host = make(`<neuwo-t>x<i slot="start"></i></neuwo-t>`);
    const icon = host.querySelector("i");
    render(host, testTemplate);
    expect(host.innerHTML).toBe(shell("a", '<i slot="start"></i>', "x"));
    expect(host.querySelector("i")).toBe(icon);
  });

  it("keeps an author svg in the SVG namespace", () => {
    const host = make(`<neuwo-t>x<svg slot="start"><path></path></svg></neuwo-t>`);
    render(host, testTemplate);
    const svg = host.querySelector("svg");
    expect(svg.parentElement.className).toBe("neuwo-t__start");
    expect(svg.namespaceURI).toBe(SVG);
    expect(svg.firstElementChild.namespaceURI).toBe(SVG);
  });

  it("creates template svg nodes and raw content in the SVG namespace", () => {
    const host = make(`<neuwo-t></neuwo-t>`);
    render(host, () => h("svg", { class: "neuwo-s" }, h("g", { class: "neuwo-s__g" }, raw('<path d="M0 0"/>'))));
    const svg = host.firstElementChild;
    expect(svg.namespaceURI).toBe(SVG);
    expect(svg.firstElementChild.namespaceURI).toBe(SVG);
    expect(svg.querySelector("path").namespaceURI).toBe(SVG);
  });

  it("does not render a child whose slot names a missing region", () => {
    const host = make(`<neuwo-t>x<i slot="start"></i><b slot="nope">n</b></neuwo-t>`);
    render(host, testTemplate);
    expect(host.innerHTML).toBe(shell("a", '<i slot="start"></i>', "x"));
  });

  it("drops default children when the template has no default region", () => {
    const host = make(`<neuwo-t>x<i slot="start"></i></neuwo-t>`);
    render(host, () => h("span", { class: "neuwo-u" }, h("span", { class: "neuwo-u__start" }, region("start"))));
    expect(host.innerHTML).toBe('<span class="neuwo-u"><span class="neuwo-u__start"><i slot="start"></i></span></span>');
  });

  it("places whitespace-only text without describing it", () => {
    const { calls, wrapped } = spy(testTemplate);
    const host = make(`<neuwo-t> <i slot="start"></i></neuwo-t>`);
    render(host, wrapped);
    expect(host.innerHTML).toBe(shell("a", '<i slot="start"></i>', " "));
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
    expect(isRendered(host, badge)).toBe(true);
  });

  it("finds the root behind an author element", () => {
    const host = make(`<neuwo-t><i slot="start"></i><span class="neuwo-t neuwo-t--a">x</span></neuwo-t>`);
    expect(isRendered(host, badge)).toBe(true);
  });

  it("never gives the template the rendered markup as children", () => {
    const { calls, wrapped } = spy(testTemplate);
    const host = make(`<neuwo-t>${shell("a", '<i slot="start"></i>', "x")}</neuwo-t>`);
    isRendered(host, wrapped);
    const author = [
      { tag: "i", attrs: { slot: "start" }, text: "", slot: "start" },
      { tag: null, attrs: {}, text: "x", slot: "default" },
    ];
    adopt(host, wrapped);
    expect(calls.at(-1)).toEqual(author);
    host.setAttribute("tone", "b");
    patch(host, wrapped);
    expect(calls.at(-1)).toEqual(author);
    expect(calls.flat().some((child) => child.attrs.class?.startsWith("neuwo-t"))).toBe(false);
  });

  it("keeps an empty-state placeholder that the template renders without children", () => {
    const template = (a, ctx) =>
      h(
        "div",
        { class: "neuwo-l", title: a.title },
        ctx.children.length ? null : h("p", { class: "neuwo-l__empty" }, "Nothing here"),
        h("ul", { class: "neuwo-l__list" }, region()),
      );
    const host = make(`<neuwo-l><div class="neuwo-l"><p class="neuwo-l__empty">Nothing here</p><ul class="neuwo-l__list"></ul></div></neuwo-l>`);
    expect(isRendered(host, template)).toBe(true);
    adopt(host, template);
    host.setAttribute("title", "x");
    patch(host, template);
    expect(host.innerHTML).toBe('<div class="neuwo-l" title="x"><p class="neuwo-l__empty">Nothing here</p><ul class="neuwo-l__list"></ul></div>');
  });
});

describe("adopt()", () => {
  it("writes nothing to server-rendered markup", () => {
    const host = make(`<neuwo-t tone="b">${shell("b", '<i slot="start"></i>', "x<!-- c -->")}</neuwo-t>`);
    const observer = watch(host);
    adopt(host, testTemplate);
    expect(observer.takeRecords()).toHaveLength(0);
  });

  it("keeps the server's ids through later patches", () => {
    const template = (a, ctx) =>
      h("span", { class: "neuwo-t", "aria-describedby": ctx.id("hint"), "data-tone": a.tone }, h("i", { class: "neuwo-t__hint", id: ctx.id("hint") }));
    const host = make(
      `<neuwo-t tone="a"><span class="neuwo-t" aria-describedby="neuwo-s1-hint" data-tone="a"><i class="neuwo-t__hint" id="neuwo-s1-hint"></i></span></neuwo-t>`,
    );
    adopt(host, template);
    host.setAttribute("tone", "b");
    const observer = watch(host);
    patch(host, template);
    expect(observer.takeRecords().map((record) => record.attributeName)).toEqual(["data-tone"]);
    expect(host.firstElementChild.getAttribute("aria-describedby")).toBe("neuwo-s1-hint");
    expect(host.querySelector("i").id).toBe("neuwo-s1-hint");
  });

  it("points a reference that changed before adoption at the right element, without duplicate ids", () => {
    const field = (a, ctx) =>
      h(
        "div",
        { class: "neuwo-f" },
        h("input", { class: "neuwo-f__input", "aria-describedby": has(a, "invalid") ? ctx.id("error") : ctx.id("hint") }),
        h("p", { class: "neuwo-f__hint", id: ctx.id("hint") }, "Hint"),
        h("p", { class: "neuwo-f__error", id: ctx.id("error") }, "Error"),
      );
    const host = make(renderElement("neuwo-f", {}, [], field, idScope("neuwo-s")));
    host.setAttribute("invalid", "");
    patch(host, field);
    const ids = Array.from(host.querySelectorAll("[id]"), (el) => el.id);
    expect(ids).toEqual(["neuwo-s1-hint", "neuwo-s1-error"]);
    const reference = host.querySelector("input").getAttribute("aria-describedby");
    expect(host.querySelector(`[id="${reference}"]`).className).toBe("neuwo-f__error");
  });

  it("maps ids afresh when someone else replaced the markup", () => {
    const template = (a, ctx) =>
      h("span", { class: "neuwo-t", "aria-describedby": has(a, "hint") && ctx.id("hint") }, h("i", { class: "neuwo-t__hint", id: ctx.id("hint") }));
    const host = make(
      `<neuwo-t hint><span class="neuwo-t" aria-describedby="neuwo-s1-hint"><i class="neuwo-t__hint" id="neuwo-s1-hint"></i></span></neuwo-t>`,
    );
    adopt(host, template);
    host.innerHTML = `<span class="neuwo-t" aria-describedby="r1-hint"><i class="neuwo-t__hint" id="r1-hint"></i></span>`;
    const observer = watch(host);
    patch(host, template);
    expect(observer.takeRecords()).toHaveLength(0);
    host.removeAttribute("hint");
    patch(host, template);
    host.setAttribute("hint", "");
    patch(host, template);
    expect(host.firstElementChild.getAttribute("aria-describedby")).toBe("r1-hint");
    expect(host.querySelector("i").id).toBe("r1-hint");
  });

  it("tells a template element from an author element of the same tag", () => {
    const template = (a) =>
      h("span", { class: "neuwo-t", title: a.title }, h("span", { class: "neuwo-t__label" }, region()), h("b", { class: "neuwo-t__mark" }));
    const host = make(`<neuwo-t><span class="neuwo-t"><span class="neuwo-t__label"><b>bold</b></span><b class="neuwo-t__mark"></b></span></neuwo-t>`);
    adopt(host, template);
    host.setAttribute("title", "x");
    patch(host, template);
    expect(host.innerHTML).toBe('<span class="neuwo-t" title="x"><span class="neuwo-t__label"><b>bold</b></span><b class="neuwo-t__mark"></b></span>');
  });

  it("places a loose child of a host it already rendered, as a move reconnects it", () => {
    const host = make(`<neuwo-t>x</neuwo-t>`);
    render(host, testTemplate);
    const span = host.firstElementChild;
    const icon = document.createElement("i");
    icon.slot = "start";
    host.append(icon);
    adopt(host, testTemplate);
    expect(host.innerHTML).toBe(shell("a", '<i slot="start"></i>', "x"));
    expect(host.firstElementChild).toBe(span);
  });

  it("corrects stale server values on the first patch", () => {
    const host = make(`<neuwo-t tone="a"><span class="neuwo-t neuwo-t--a">x</span></neuwo-t>`);
    host.setAttribute("tone", "b");
    patch(host, badge);
    expect(host.innerHTML).toBe('<span class="neuwo-t neuwo-t--b">x</span>');
    const again = make(`<neuwo-t tone="a"><span class="neuwo-t neuwo-t--a">x</span></neuwo-t>`);
    again.setAttribute("tone", "b");
    adopt(again, badge);
    expect(again.innerHTML).toBe('<span class="neuwo-t neuwo-t--a">x</span>');
    patch(again, badge);
    expect(again.innerHTML).toBe('<span class="neuwo-t neuwo-t--b">x</span>');
  });

  describe("removes stale conditional markup whole, leaking nothing into regions", () => {
    const button = (extra) => (a) =>
      h(
        "button",
        { class: "neuwo-btn", "aria-busy": has(a, "loading") && "true" },
        has(a, "loading") && extra,
        h("span", { class: "neuwo-btn__label" }, region()),
      );
    const server = (template) => make(renderElement("neuwo-button", { loading: "" }, [text("Save")], template, idScope("neuwo-s")));

    it("with template text", () => {
      const template = button(h("span", { class: "neuwo-btn__status" }, "Loading"));
      const host = server(template);
      host.removeAttribute("loading");
      patch(host, template);
      expect(host.innerHTML).toBe('<button class="neuwo-btn"><span class="neuwo-btn__label">Save</span></button>');
      expect(childInfo(host)).toEqual([{ tag: null, attrs: {}, text: "Save", slot: "default" }]);
      host.setAttribute("loading", "");
      patch(host, template);
      expect(host.innerHTML).toBe(
        '<button class="neuwo-btn" aria-busy="true"><span class="neuwo-btn__status">Loading</span><span class="neuwo-btn__label">Save</span></button>',
      );
    });

    it("with raw markup", () => {
      const template = button(h("span", { class: "neuwo-btn__spinner" }, raw('<svg viewBox="0 0 1 1"><circle r="1"></circle></svg>')));
      const host = server(template);
      host.removeAttribute("loading");
      patch(host, template);
      expect(host.innerHTML).toBe('<button class="neuwo-btn"><span class="neuwo-btn__label">Save</span></button>');
      expect(childInfo(host)).toEqual([{ tag: null, attrs: {}, text: "Save", slot: "default" }]);
    });

    it("with an attribute-driven message", () => {
      const field = (a) =>
        h("div", { class: "neuwo-f" }, h("label", { class: "neuwo-f__label" }, region()), has(a, "error") && h("p", { class: "neuwo-f__error" }, a.error));
      const host = make(renderElement("neuwo-f", { error: "Required" }, [text("Name")], field, idScope("neuwo-s")));
      host.removeAttribute("error");
      patch(host, field);
      expect(host.innerHTML).toBe('<div class="neuwo-f"><label class="neuwo-f__label">Name</label></div>');
    });
  });

  it("does not duplicate template elements in markup with stale text", () => {
    const template = (a) =>
      h(
        "span",
        { class: "neuwo-t", title: a.title },
        h("span", { class: "neuwo-t__body" }, region()),
        h("b", { class: "neuwo-t__mark" }),
        h("i", { class: "neuwo-t__label" }, a.label ?? ""),
      );
    const host = make(
      `<neuwo-t label="New"><span class="neuwo-t"><span class="neuwo-t__body"><b>bold</b></span><b class="neuwo-t__mark"></b><i class="neuwo-t__label">Old</i></span></neuwo-t>`,
    );
    adopt(host, template);
    host.setAttribute("title", "x");
    patch(host, template);
    expect(host.innerHTML).toBe(
      '<span class="neuwo-t" title="x"><span class="neuwo-t__body"><b>bold</b></span><b class="neuwo-t__mark"></b><i class="neuwo-t__label">New</i></span>',
    );
  });

  it("syncs a moved host whose attributes changed while it was detached", () => {
    const host = make(`<neuwo-t>x</neuwo-t>`);
    render(host, badge);
    const span = host.firstElementChild;
    host.remove();
    host.setAttribute("tone", "b");
    document.body.append(host);
    adopt(host, badge);
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
    const host = make(`<neuwo-t tone="b"><span class="neuwo-t neuwo-t--b"><i></i>x</span></neuwo-t>`);
    const observer = watch(host);
    patch(host, badge);
    expect(observer.takeRecords()).toHaveLength(0);
    host.setAttribute("tone", "a");
    observer.takeRecords();
    patch(host, badge);
    expect(observer.takeRecords()).toHaveLength(1);
    expect(host.innerHTML).toBe('<span class="neuwo-t neuwo-t--a"><i></i>x</span>');
  });

  it("renders a host that has not been rendered yet", () => {
    const host = make(`<neuwo-t>x<i slot="start"></i></neuwo-t>`);
    patch(host, testTemplate);
    expect(host.innerHTML).toBe(shell("a", '<i slot="start"></i>', "x"));
  });

  it("leaves attributes the template does not produce", () => {
    const host = make(`<neuwo-t>x</neuwo-t>`);
    render(host, badge);
    const span = host.firstElementChild;
    span.setAttribute("data-open", "");
    host.setAttribute("tone", "b");
    patch(host, badge);
    expect(span.hasAttribute("data-open")).toBe(true);
    expect(span.className).toBe("neuwo-t neuwo-t--b");
  });

  it("skips a value the DOM already holds", () => {
    const host = make(`<neuwo-t>x</neuwo-t>`);
    render(host, badge);
    host.firstElementChild.className = "neuwo-t neuwo-t--b";
    host.setAttribute("tone", "b");
    const observer = watch(host);
    patch(host, badge);
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
    const template = (a) =>
      h(
        a.href ? "a" : "span",
        { class: "neuwo-t", href: a.href },
        h("span", { class: "neuwo-t__start" }, region("start")),
        h("span", { class: "neuwo-t__label" }, region()),
      );
    const host = make(`<neuwo-t><i slot="start"></i>x</neuwo-t>`);
    render(host, template);
    const icon = host.querySelector("i");
    host.setAttribute("href", "/go");
    patch(host, template);
    expect(host.innerHTML).toBe('<a class="neuwo-t" href="/go"><span class="neuwo-t__start"><i slot="start"></i></span><span class="neuwo-t__label">x</span></a>');
    expect(host.querySelector("i")).toBe(icon);
    host.removeAttribute("href");
    patch(host, template);
    expect(host.innerHTML).toBe('<span class="neuwo-t"><span class="neuwo-t__start"><i slot="start"></i></span><span class="neuwo-t__label">x</span></span>');
    expect(host.querySelector("i")).toBe(icon);
  });

  it("keeps author children when a wrapper's tag changes", () => {
    const template = (a) =>
      h("div", { class: "neuwo-t" }, h(a.level ?? "h2", { class: "neuwo-t__head" }, region()), h("p", { class: "neuwo-t__sub" }, region("sub")));
    const host = make(`<neuwo-t>Head<span slot="sub">Sub</span></neuwo-t>`);
    render(host, template);
    const sub = host.querySelector(".neuwo-t__sub");
    host.setAttribute("level", "h3");
    patch(host, template);
    expect(host.innerHTML).toBe('<div class="neuwo-t"><h3 class="neuwo-t__head">Head</h3><p class="neuwo-t__sub"><span slot="sub">Sub</span></p></div>');
    expect(host.querySelector(".neuwo-t__sub")).toBe(sub);
  });

  it("keeps author children when their wrappers move to another parent", () => {
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
    host.removeAttribute("variant");
    patch(host, template);
    expect(host.innerHTML).toBe(
      '<div class="neuwo-c"><div class="neuwo-c__body"><h2 class="neuwo-c__headline">Head</h2><p class="neuwo-c__sub"><span slot="sub">Sub</span></p></div>' +
        '<div class="neuwo-c__actions"><button slot="actions">Go</button></div></div>',
    );
  });

  it("keeps an author element that shares the tag of a template element", () => {
    const template = (a) =>
      h("span", { class: "neuwo-t", title: a.title }, h("span", { class: "neuwo-t__label" }, region()), h("b", { class: "neuwo-t__mark" }));
    const host = make(`<neuwo-t><b>bold</b></neuwo-t>`);
    render(host, template);
    host.setAttribute("title", "x");
    patch(host, template);
    expect(host.innerHTML).toBe('<span class="neuwo-t" title="x"><span class="neuwo-t__label"><b>bold</b></span><b class="neuwo-t__mark"></b></span>');
  });

  it("adds and removes a template element beside the wrappers", () => {
    const template = (a) =>
      h(
        "button",
        { class: "neuwo-t" },
        has(a, "busy") && h("span", { class: "neuwo-t__spin" }),
        h("span", { class: "neuwo-t__start" }, region("start")),
        h("span", { class: "neuwo-t__label" }, region()),
      );
    const wrappers = '<span class="neuwo-t__start"><i slot="start"></i></span><span class="neuwo-t__label">x</span>';
    const host = make(`<neuwo-t busy><i slot="start"></i>x</neuwo-t>`);
    render(host, template);
    expect(host.innerHTML).toBe(`<button class="neuwo-t"><span class="neuwo-t__spin"></span>${wrappers}</button>`);
    host.removeAttribute("busy");
    patch(host, template);
    expect(host.innerHTML).toBe(`<button class="neuwo-t">${wrappers}</button>`);
    host.setAttribute("busy", "");
    patch(host, template);
    expect(host.innerHTML).toBe(`<button class="neuwo-t"><span class="neuwo-t__spin"></span>${wrappers}</button>`);
  });

  it("keeps template text in its own element without duplicating it", () => {
    const template = (a) =>
      h(
        "label",
        { class: "neuwo-t", title: a.title },
        h("span", { class: "neuwo-t__text" }, "Name"),
        h("b", { class: "neuwo-t__req" }, "*"),
        h("span", { class: "neuwo-t__control" }, region()),
      );
    const host = make(`<neuwo-t><input></neuwo-t>`);
    render(host, template);
    const input = host.querySelector("input");
    for (const title of ["x", "y", "z"]) {
      host.setAttribute("title", title);
      patch(host, template);
    }
    expect(host.innerHTML).toBe(
      '<label class="neuwo-t" title="z"><span class="neuwo-t__text">Name</span><b class="neuwo-t__req">*</b><span class="neuwo-t__control"><input></span></label>',
    );
    expect(host.querySelector("input")).toBe(input);
  });

  it("keeps a matched element, its focus and its runtime attributes across a change inside it", () => {
    const template = (a) =>
      h("button", { class: "neuwo-t" }, has(a, "busy") && h("span", { class: "neuwo-t__spin" }), h("span", { class: "neuwo-t__label" }, region()));
    const host = make(`<neuwo-t>Save</neuwo-t>`);
    render(host, template);
    const button = host.firstElementChild;
    button.setAttribute("aria-expanded", "true");
    button.focus();
    expect(document.activeElement).toBe(button);
    host.setAttribute("busy", "");
    patch(host, template);
    expect(host.firstElementChild).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(host.innerHTML).toBe(
      '<button class="neuwo-t" aria-expanded="true"><span class="neuwo-t__spin"></span><span class="neuwo-t__label">Save</span></button>',
    );
  });

  it("keeps a wrapper and an author input's focus when a sibling is rebuilt", () => {
    const template = (a) =>
      h("div", { class: "neuwo-t" }, h(a.level ?? "h2", { class: "neuwo-t__head" }), h("div", { class: "neuwo-t__body" }, region()));
    const host = make(`<neuwo-t><input></neuwo-t>`);
    render(host, template);
    const body = host.querySelector(".neuwo-t__body");
    const input = host.querySelector("input");
    input.focus();
    host.setAttribute("level", "h3");
    patch(host, template);
    expect(host.querySelector(".neuwo-t__body")).toBe(body);
    expect(host.querySelector("h3")).not.toBeNull();
    expect(document.activeElement).toBe(input);
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
    expect(host.innerHTML).toBe(`<i slot="start"></i>${shell("b", "", "x")}`);
    expect(host.querySelectorAll(".neuwo-t")).toHaveLength(1);
    expect(span.className).toBe("neuwo-t neuwo-t--b");
  });

  it("places host-level author nodes into their regions on a rebuild", () => {
    const template = (a) =>
      h(
        a.href ? "a" : "span",
        { class: "neuwo-t", href: a.href },
        h("span", { class: "neuwo-t__start" }, region("start")),
        h("span", { class: "neuwo-t__label" }, region()),
      );
    const host = make(`<neuwo-t>x</neuwo-t>`);
    render(host, template);
    const icon = document.createElement("i");
    icon.slot = "start";
    host.prepend(icon);
    host.setAttribute("href", "/go");
    patch(host, template);
    expect(host.innerHTML).toBe('<a class="neuwo-t" href="/go"><span class="neuwo-t__start"><i slot="start"></i></span><span class="neuwo-t__label">x</span></a>');
  });

  it("keeps an author node in its wrapper when its slot attribute changes or goes", () => {
    const host = make(`<neuwo-t><i slot="start"></i><b slot="start"></b>x</neuwo-t>`);
    render(host, testTemplate);
    const i = host.querySelector("i");
    const b = host.querySelector("b");
    i.removeAttribute("slot");
    b.setAttribute("slot", "nope");
    host.setAttribute("tone", "b");
    const observer = watch(host);
    patch(host, testTemplate);
    expect(observer.takeRecords().map((record) => record.attributeName)).toEqual(["class"]);
    expect(host.innerHTML).toBe(shell("b", '<i></i><b slot="nope"></b>', "x"));
    expect(childInfo(host).map((child) => child.slot)).toEqual(["start", "start", "default"]);
  });

  it("keeps wrapped author nodes in their region through a rebuild, and distributes loose ones by slot", () => {
    const template = (a) =>
      h(
        a.href ? "a" : "span",
        { class: "neuwo-t", href: a.href },
        h("span", { class: "neuwo-t__start" }, region("start")),
        h("span", { class: "neuwo-t__label" }, region()),
      );
    const host = make(`<neuwo-t><i slot="start"></i>x</neuwo-t>`);
    render(host, template);
    const i = host.querySelector("i");
    i.removeAttribute("slot");
    const u = document.createElement("u");
    u.slot = "start";
    host.prepend(u);
    host.setAttribute("href", "/go");
    patch(host, template);
    expect(host.innerHTML).toBe('<a class="neuwo-t" href="/go"><span class="neuwo-t__start"><u slot="start"></u><i></i></span><span class="neuwo-t__label">x</span></a>');
    expect(host.querySelector("i")).toBe(i);
  });

  it("keeps describing a child whose region is missing", () => {
    const { calls, wrapped } = spy(testTemplate);
    const host = make(`<neuwo-t>x<b slot="nope">n</b></neuwo-t>`);
    render(host, wrapped);
    host.setAttribute("tone", "b");
    patch(host, wrapped);
    expect(host.innerHTML).toBe(shell("b", "", "x"));
    expect(calls.at(-1).map((child) => child.tag ?? child.text)).toEqual(["x", "b"]);
  });

  it("replaces only text that differs", () => {
    const template = (a) =>
      h("span", { class: "neuwo-t" }, h("b", { class: "neuwo-t__label" }, a.label), h("span", { class: "neuwo-t__body" }, region()));
    const host = make(`<neuwo-t label="One">x</neuwo-t>`);
    render(host, template);
    host.setAttribute("label", "Two");
    const observer = watch(host);
    patch(host, template);
    const records = observer.takeRecords();
    expect(records).toHaveLength(1);
    expect(records[0].type).toBe("characterData");
    expect(host.innerHTML).toBe('<span class="neuwo-t"><b class="neuwo-t__label">Two</b><span class="neuwo-t__body">x</span></span>');
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

  it("renders again when someone else replaced the markup", () => {
    const host = make(`<neuwo-t>x</neuwo-t>`);
    render(host, badge);
    host.textContent = "y";
    host.setAttribute("tone", "b");
    patch(host, badge);
    expect(host.innerHTML).toBe('<span class="neuwo-t neuwo-t--b">y</span>');
  });
});

describe("reconcile()", () => {
  it("renders again when the host's children were replaced", () => {
    const host = make(`<neuwo-t><i slot="start"></i>x</neuwo-t>`);
    render(host, testTemplate);
    host.textContent = "y";
    reconcile(host, testTemplate);
    expect(host.innerHTML).toBe(shell("a", "", "y"));
  });

  it("places a loose start child into the start wrapper, keeping the root", () => {
    const host = make(`<neuwo-t>x</neuwo-t>`);
    render(host, testTemplate);
    const span = host.firstElementChild;
    const icon = document.createElement("i");
    icon.slot = "start";
    host.append(icon);
    reconcile(host, testTemplate);
    expect(host.innerHTML).toBe(shell("a", '<i slot="start"></i>', "x"));
    expect(host.firstElementChild).toBe(span);
    expect(host.querySelector("i")).toBe(icon);
  });

  it("leaves wrapped author nodes untouched while it places a loose one", () => {
    const host = make(`<neuwo-t><i slot="start"></i>x</neuwo-t>`);
    render(host, testTemplate);
    const i = host.querySelector("i");
    const x = host.querySelector(".neuwo-t__label").firstChild;
    i.removeAttribute("slot");
    const b = document.createElement("b");
    host.append(b);
    const observer = watch(host);
    reconcile(host, testTemplate);
    const label = host.querySelector(".neuwo-t__label");
    expect(host.innerHTML).toBe(shell("a", "<i></i>", "x<b></b>"));
    expect(host.querySelector("i")).toBe(i);
    expect(label.firstChild).toBe(x);
    expect(observer.takeRecords().every((record) => record.type === "childList" && (record.target === host || record.target === label))).toBe(true);
  });

  it("writes nothing when nothing changed", () => {
    const host = make(`<neuwo-t tone="b"><i slot="start"></i>x</neuwo-t>`);
    render(host, testTemplate);
    const observer = watch(host);
    reconcile(host, testTemplate);
    expect(observer.takeRecords()).toHaveLength(0);
  });

  it("writes nothing for loose whitespace or comments around the root", () => {
    const host = make(`<neuwo-t>\n  ${shell("a", "", "x")}\n<!-- c --></neuwo-t>`);
    adopt(host, testTemplate);
    const observer = watch(host);
    reconcile(host, testTemplate);
    expect(observer.takeRecords()).toHaveLength(0);
  });
});
