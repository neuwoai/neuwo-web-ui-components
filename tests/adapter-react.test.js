import { afterEach, describe, expect, it, vi } from "vitest";
import { Fragment, act, createRef } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { h, has, raw, region } from "../src/core/template.js";
import { idScope } from "../src/core/ids.js";
import { renderElement } from "../src/core/adapters/html.js";
import { createRuntime } from "../src/core/adapters/react.js";
import * as runtime from "../src/react/jsx-runtime.js";
import * as devRuntime from "../src/react/jsx-dev-runtime.js";
import * as serverRuntime from "../src/react/jsx-runtime.react-server.js";
import * as serverDevRuntime from "../src/react/jsx-dev-runtime.react-server.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const testTemplate = (a, ctx) =>
  h(
    "span",
    { class: `neuwo-t neuwo-t--${a.tone ?? "a"}` },
    h("span", { class: "neuwo-t__start" }, region("start")),
    h("span", { class: "neuwo-t__body" }, region()),
  );
const shell = (tone, start, body) =>
  `<span class="neuwo-t neuwo-t--${tone}"><span class="neuwo-t__start">${start}</span><span class="neuwo-t__body">${body}</span></span>`;

const { jsx, jsxs, jsxDEV } = createRuntime({ "neuwo-t": testTemplate });

let cleanups = [];

function mount() {
  const container = document.createElement("div");
  document.body.append(container);
  cleanups.push(() => container.remove());
  return container;
}

function parse(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return holder.innerHTML;
}

afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
  vi.restoreAllMocks();
});

describe("createRuntime()", () => {
  it("expands a registered tag around its children, placed by slot", () => {
    expect(renderToStaticMarkup(jsx("neuwo-t", { tone: "b", children: [jsx("i", { slot: "start" }), "x"] }))).toBe(
      '<neuwo-t tone="b"><span class="neuwo-t neuwo-t--b"><span class="neuwo-t__start"><i slot="start"></i></span><span class="neuwo-t__body">x</span></span></neuwo-t>',
    );
  });

  it("keeps function props on the host and raises no React errors", async () => {
    const errors = vi.spyOn(console, "error");
    const onClick = vi.fn();
    const container = mount();
    const root = createRoot(container);
    cleanups.unshift(() => act(() => root.unmount()));
    await act(async () => root.render(jsxs("neuwo-t", { tone: "b", onClick, children: [jsx("i", { slot: "start" }), "x", jsx("b", {})] })));
    container.querySelector(".neuwo-t").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(container.innerHTML).toBe(`<neuwo-t tone="b">${shell("b", '<i slot="start"></i>', "x<b></b>")}</neuwo-t>`);
    expect(errors).not.toHaveBeenCalled();
  });

  it("renders a raw child verbatim", () => {
    const icon = () => h("span", { class: "neuwo-r" }, raw('<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>'));
    const { jsx: create } = createRuntime({ "neuwo-r": icon });
    expect(renderToStaticMarkup(create("neuwo-r", {}))).toBe(
      '<neuwo-r><span class="neuwo-r"><svg viewBox="0 0 1 1"><path d="M0 0"/></svg></span></neuwo-r>',
    );
  });

  it("passes unregistered types straight to React", () => {
    const Component = () => null;
    expect(jsx("div", { id: "a" }, "k")).toMatchObject({ type: "div", key: "k", props: { id: "a" } });
    expect(jsxs("neuwo-x", { children: ["a", "b"] }).type).toBe("neuwo-x");
    expect(jsxDEV(Component, {}, undefined, false).type).toBe(Component);
    expect(renderToStaticMarkup(jsx("neuwo-x", { tone: "b", children: "y" }))).toBe('<neuwo-x tone="b">y</neuwo-x>');
  });

  it("expands through every runtime function with one component type and keeps the key", () => {
    const elements = [jsx("neuwo-t", { children: "x" }, "k"), jsxs("neuwo-t", { children: ["x"] }, "k"), jsxDEV("neuwo-t", { children: "x" }, "k", false)];
    expect(new Set(elements.map((element) => element.type)).size).toBe(1);
    expect(typeof elements[0].type).toBe("function");
    for (const element of elements) {
      expect(element.key).toBe("k");
      expect(renderToStaticMarkup(element)).toBe(`<neuwo-t>${shell("a", "", "x")}</neuwo-t>`);
    }
  });

  it("describes React children to the template and places whitespace without describing it", () => {
    const seen = [];
    const Icon = () => null;
    const { jsx: create, jsxs: createStatic } = createRuntime({
      "neuwo-t": (a, ctx) => {
        seen.push(ctx.children);
        return testTemplate(a, ctx);
      },
    });
    const bold = createStatic("b", { slot: "start", title: "t", hidden: true, className: "c", onClick() {}, children: ["a", create("i", { children: "b" })] });
    const nested = create("neuwo-t", { slot: "end", tone: "b", children: "n" });
    const html = renderToStaticMarkup(createStatic("neuwo-t", { children: [" ", "x", 2, bold, create(Icon, { slot: "start" }), nested] }));
    expect(seen[0]).toEqual([
      { tag: null, attrs: {}, text: "x", slot: "default" },
      { tag: null, attrs: {}, text: "2", slot: "default" },
      { tag: "b", attrs: { slot: "start", title: "t", hidden: "" }, text: "ab", slot: "start" },
      { tag: null, attrs: {}, text: "", slot: "start" },
      { tag: "neuwo-t", attrs: { slot: "end", tone: "b" }, text: "n", slot: "end" },
    ]);
    expect(html).toContain('<span class="neuwo-t__body"> x2</span>');
    expect(html).toContain('<span class="neuwo-t__start"><b slot="start" title="t" hidden="" class="c">a<i>b</i></b></span>');
  });

  it("places nested elements and fragment children by slot and drops unknown slots", () => {
    const html = renderToStaticMarkup(
      jsxs("neuwo-t", {
        children: [
          jsx("neuwo-t", { slot: "start", tone: "b", children: "y" }),
          jsxs(Fragment, { children: [jsx("i", { slot: "start" }), "x"] }),
          jsx("u", { slot: "nope" }),
        ],
      }),
    );
    expect(html).toBe(`<neuwo-t>${shell("a", `<neuwo-t slot="start" tone="b">${shell("b", "", "y")}</neuwo-t><i slot="start"></i>`, "x")}</neuwo-t>`);
  });

  it("keeps an author element when an earlier sibling comes and goes", async () => {
    const errors = vi.spyOn(console, "error");
    const container = mount();
    const root = createRoot(container);
    cleanups.unshift(() => act(() => root.unmount()));
    const view = (on) => jsxs("neuwo-t", { children: [on && jsx("u", {}), jsx("b", {})] });
    await act(async () => root.render(view(true)));
    const bold = container.querySelector("b");
    await act(async () => root.render(view(false)));
    expect(container.querySelector("u")).toBeNull();
    expect(container.querySelector("b")).toBe(bold);
    expect(errors).not.toHaveBeenCalled();
  });

  it("keys template elements by block element class, else first class, so a template element appearing moves nothing", async () => {
    const flagged = (a) =>
      h(
        "span",
        { class: "neuwo-k" },
        has(a, "flag") && h("i", { class: "neuwo-k__flag" }),
        h("b", { class: "neuwo-k" }),
        h("span", { class: "neuwo-k__body" }, region()),
      );
    const { jsx: create } = createRuntime({ "neuwo-k": flagged });
    const errors = vi.spyOn(console, "error");
    const container = mount();
    const root = createRoot(container);
    cleanups.unshift(() => act(() => root.unmount()));
    const view = (flag) => create("neuwo-k", { flag, children: create("u", {}) });
    await act(async () => root.render(view(false)));
    const [mark, author] = [container.querySelector("b"), container.querySelector("u")];
    await act(async () => root.render(view(true)));
    expect(container.querySelector(".neuwo-k").firstElementChild.className).toBe("neuwo-k__flag");
    expect(container.querySelector("b")).toBe(mark);
    expect(container.querySelector("u")).toBe(author);
    await act(async () => root.render(view(false)));
    expect(container.querySelector("i")).toBeNull();
    expect(container.querySelector("b")).toBe(mark);
    expect(container.querySelector("u")).toBe(author);
    expect(errors).not.toHaveBeenCalled();
  });

  it("numbers a repeated key among siblings, so repeated template elements survive a sibling appearing without React warnings", async () => {
    const dotted = (a) =>
      h(
        "span",
        { class: "neuwo-d" },
        has(a, "flag") && h("i", { class: "neuwo-d__flag" }),
        h("b", { class: "neuwo-d__dot" }),
        h("b", { class: "neuwo-d__dot" }),
        h("span", { class: "neuwo-d__body" }, region()),
      );
    const { jsx: create } = createRuntime({ "neuwo-d": dotted });
    const errors = vi.spyOn(console, "error");
    const warnings = vi.spyOn(console, "warn");
    const container = mount();
    const root = createRoot(container);
    cleanups.unshift(() => act(() => root.unmount()));
    const view = (flag) => create("neuwo-d", { flag, children: "x" });
    const dots = () => Array.from(container.querySelectorAll(".neuwo-d__dot"));
    await act(async () => root.render(view(false)));
    const before = dots();
    expect(before).toHaveLength(2);
    await act(async () => root.render(view(true)));
    expect(container.querySelector(".neuwo-d").firstElementChild.className).toBe("neuwo-d__flag");
    expect(dots()[0]).toBe(before[0]);
    expect(dots()[1]).toBe(before[1]);
    await act(async () => root.render(view(false)));
    expect(container.querySelector(".neuwo-d__flag")).toBeNull();
    expect(dots()[0]).toBe(before[0]);
    expect(dots()[1]).toBe(before[1]);
    expect(errors).not.toHaveBeenCalled();
    expect(warnings).not.toHaveBeenCalled();
  });

  it("builds ids from useId that differ per element and survive hydration", async () => {
    const labelled = (a, ctx) => h("span", { class: "neuwo-l", "aria-describedby": ctx.id("hint") }, region());
    const { jsx: create, jsxs: createStatic } = createRuntime({ "neuwo-l": labelled });
    const app = createStatic("div", { children: [create("neuwo-l", { children: "a" }), create("neuwo-l", { children: "b" })] });
    const container = mount();
    container.innerHTML = renderToString(app);
    const ids = () => Array.from(container.querySelectorAll(".neuwo-l"), (el) => el.getAttribute("aria-describedby"));
    const before = ids();
    expect(before[0]).toMatch(/^neuwo[\w-]+-hint$/);
    expect(before[1]).not.toBe(before[0]);
    const errors = vi.spyOn(console, "error");
    let root;
    await act(async () => {
      root = hydrateRoot(container, app);
    });
    cleanups.unshift(() => act(() => root.unmount()));
    expect(ids()).toEqual(before);
    expect(errors).not.toHaveBeenCalled();
  });

  it("adds no ref of its own with markHost false, passes the author's ref through unchanged and renders the same markup", () => {
    const unmarked = createRuntime({ "neuwo-t": testTemplate }, { markHost: false });
    const hostProps = (create, props) => {
      const Host = create("neuwo-t", {}).type;
      let host;
      const Probe = (probe) => (host = Host(probe));
      renderToStaticMarkup(jsx(Probe, props));
      return host.props;
    };
    const objectRef = createRef();
    const callbackRef = () => {};
    expect("ref" in hostProps(unmarked.jsx, { children: "x" })).toBe(false);
    expect(hostProps(unmarked.jsx, { ref: objectRef, children: "x" }).ref).toBe(objectRef);
    expect(hostProps(unmarked.jsx, { ref: callbackRef, children: "x" }).ref).toBe(callbackRef);
    expect(hostProps(jsx, { children: "x" }).ref).toEqual(expect.any(Function));
    expect(hostProps(jsx, { ref: callbackRef, children: "x" }).ref).not.toBe(callbackRef);

    const view = (rt) => rt.jsxs("neuwo-t", { tone: "b", children: [rt.jsx("i", { slot: "start" }, "i"), "x", rt.jsx("neuwo-t", { children: "n" }, "n")] }, "k");
    expect(renderToStaticMarkup(view(unmarked))).toBe(renderToStaticMarkup(view({ jsx, jsxs })));
  });

  it("writes template attributes as the HTML adapter does", () => {
    const field = () =>
      h(
        "label",
        { class: "neuwo-f", for: "f-1", hidden: "", "data-on": true },
        h("input", { class: "neuwo-f__input", type: "text", readonly: true, disabled: "" }),
      );
    const { jsx: create } = createRuntime({ "neuwo-f": field });
    const errors = vi.spyOn(console, "error");
    expect(parse(renderToStaticMarkup(create("neuwo-f", { name: "n" })))).toBe(
      parse(renderElement("neuwo-f", { name: "n" }, [], field, idScope("neuwo-s"))),
    );
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("JSX runtime entries", () => {
  it("export React's Fragment and wrap React's element functions", () => {
    expect(runtime.Fragment).toBe(Fragment);
    expect(devRuntime.Fragment).toBe(Fragment);
    expect(runtime.jsx("div", { id: "a" }).type).toBe("div");
    expect(runtime.jsxs("div", { children: ["a", "b"] }).type).toBe("div");
    expect(devRuntime.jsxDEV("div", {}, undefined, false).type).toBe("div");
  });

  it("export the same names from the react-server builds", () => {
    expect(Object.keys(serverRuntime).sort()).toEqual(Object.keys(runtime).sort());
    expect(Object.keys(serverDevRuntime).sort()).toEqual(Object.keys(devRuntime).sort());
    expect(serverRuntime.Fragment).toBe(Fragment);
    expect(serverDevRuntime.Fragment).toBe(Fragment);
  });
});
