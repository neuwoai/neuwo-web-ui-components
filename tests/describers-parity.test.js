import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { h, region } from "../src/core/template.js";
import { render } from "../src/core/adapters/dom.js";
import { expandWith } from "../src/server/expand.js";
import { createRuntime } from "./fixtures/runtime.js";

const seenBy = [];
const template = (attrs, ctx) => {
  seenBy.push(ctx.children);
  return h("span", { class: "neuwo-t" }, region());
};
const { jsx, jsxs } = createRuntime({ "neuwo-t": template });

const text = (value) => ({ tag: null, attrs: {}, text: value, slot: "default" });
const el = (tag, attrs, children, slot = "default") => ({ tag, attrs, text: children.map((child) => child.text).join(""), slot, children });

const CASES = {
  "text and an element": {
    html: "a<b>x</b>",
    react: ["a", jsx("b", { children: "x" })],
    expected: [text("a"), el("b", {}, [text("x")])],
  },
  "nested slots": {
    html: '<div slot="start"><i slot="end">x</i><u>y</u></div><p>z</p>',
    react: [
      jsxs("div", { slot: "start", children: [jsx("i", { slot: "end", children: "x" }), jsx("u", { children: "y" })] }),
      jsx("p", { children: "z" }),
    ],
    expected: [el("div", { slot: "start" }, [el("i", { slot: "end" }, [text("x")], "end"), el("u", {}, [text("y")])], "start"), el("p", {}, [text("z")])],
  },
  "comments and whitespace": {
    html: "<!-- c --> <b>x</b>\n <!-- d -->",
    react: [" ", jsx("b", { children: "x" }), "\n "],
    expected: [el("b", {}, [text("x")])],
  },
  "a template element": {
    html: "<template><i>x</i></template>",
    react: [jsx("template", { children: jsx("i", { children: "x" }) })],
    expected: [el("template", {}, [])],
  },
  "a style": {
    html: '<b style="color: red; background-color: blue; --tint: 1">x</b>',
    react: [jsx("b", { style: { color: "red", backgroundColor: "blue", "--tint": "1" }, children: "x" })],
    expected: [el("b", { style: "color: red; background-color: blue; --tint: 1" }, [text("x")])],
  },
  "React's prop names": {
    html: '<label for="a" class="c" tabindex="1" readonly>x</label><input checked value="v">',
    react: [
      jsx("label", { htmlFor: "a", className: "c", tabIndex: 1, readOnly: true, children: "x" }),
      jsx("input", { defaultChecked: true, defaultValue: "v" }),
    ],
    expected: [el("label", { for: "a", class: "c", tabindex: "1", readonly: "" }, [text("x")]), { tag: "input", attrs: { checked: "", value: "v" }, text: "", slot: "default", children: [] }],
  },
};

const hosts = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
  seenBy.length = 0;
});

function viaDom(html) {
  const holder = document.createElement("div");
  holder.innerHTML = `<neuwo-t>${html}</neuwo-t>`;
  document.body.append(holder);
  hosts.push(holder);
  render(holder.firstElementChild, template);
  return seenBy.at(-1);
}

function viaExpand(html) {
  expandWith(`<neuwo-t>${html}</neuwo-t>`, { "neuwo-t": template }, "neuwo-s");
  return seenBy.at(-1);
}

function viaReact(children) {
  renderToStaticMarkup(jsx("neuwo-t", { children }));
  return seenBy.at(-1);
}

describe("describers", () => {
  for (const [name, { html, react, expected }] of Object.entries(CASES)) {
    it(`describe the same children across the DOM, React and the server: ${name}`, () => {
      expect(viaDom(html)).toEqual(expected);
      expect(viaExpand(html)).toEqual(expected);
      expect(viaReact(react)).toEqual(expected);
    });
  }
});
