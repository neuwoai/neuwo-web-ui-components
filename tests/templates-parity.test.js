import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { jsx, jsxs } from "../src/react/jsx-runtime.js";
import { templates } from "../src/templates.js";
import "../src/index.js";
import { expand } from "../src/server/index.js";
import { expandWith } from "../src/server/expand.js";
import { renderElement } from "../src/core/adapters/html.js";
import { idScope } from "../src/core/ids.js";
import { cases, markup, normalise, renderChildren, renderHtml } from "./fixtures/template-cases.js";

// React reads an empty string as false for these; a fixture's empty attribute is a present one.
const BOOLEAN_PROPS = new Set(["disabled", "selected"]);
// React renders `selected` on an <option> but warns, preferring a value on the <select>; server markup carries it.
const SELECTED_WARNING = "instead of setting `selected` on <option>";

// React warns about a value or checked without onChange, and a fixture's are only the starting state.
const handlers = (attrs) => (Object.hasOwn(attrs, "value") || Object.hasOwn(attrs, "checked") ? { onChange() {} } : {});
// A JSX `checked` is a boolean, and the adapter reads an empty string as unchecked.
const checked = (attrs) => (Object.hasOwn(attrs, "checked") ? { checked: true, onChange() {} } : {});

function toReact(child) {
  if (typeof child === "string") return child;
  const attrs = child.attrs ?? {};
  const props = Object.fromEntries(Object.entries(attrs).map(([name, value]) => [name, value === "" && BOOLEAN_PROPS.has(name) ? true : value]));
  Object.assign(props, checked(attrs));
  if (child.children) return jsxs(child.tag, { ...props, children: child.children.map(toReact) });
  return jsx(child.tag, { ...props, children: child.text });
}

const viaReact = (tag, testCase) =>
  renderToStaticMarkup(jsxs(tag, { ...testCase.attrs, ...checked(testCase.attrs), ...handlers(testCase.attrs), children: testCase.children.map(toReact) }));

const mounted = [];
afterEach(() => {
  while (mounted.length) mounted.pop().remove();
  vi.restoreAllMocks();
});

function viaDom(tag, testCase) {
  const host = document.createElement(tag);
  for (const [name, value] of Object.entries(testCase.attrs)) host.setAttribute(name, value);
  const holder = document.createElement("div");
  holder.innerHTML = testCase.children.map(markup).join("");
  host.append(...holder.childNodes);
  document.body.append(host);
  mounted.push(host);
  return host.outerHTML;
}

describe("template parity across the HTML, React and DOM adapters", () => {
  it("covers every registered template", () => {
    for (const tag of Object.keys(templates)) expect(cases[tag]?.length ?? 0, tag).toBeGreaterThan(0);
  });

  for (const [tag, list] of Object.entries(cases)) {
    describe(tag, () => {
      for (const testCase of list) {
        it(testCase.name, () => {
          const errors = vi.spyOn(console, "error").mockImplementation(() => {});
          const html = normalise(renderHtml(tag, testCase), true);
          expect(html).toContain(`<${tag}`);
          expect(normalise(expand(markup({ tag, attrs: testCase.attrs, children: testCase.children })), true)).toBe(html);
          expect(normalise(viaReact(tag, testCase), true)).toBe(html);
          expect(normalise(viaDom(tag, testCase), false)).toBe(html);
          expect(errors.mock.calls.filter(([message]) => !String(message).includes(SELECTED_WARNING))).toEqual([]);
        });

        it(`${testCase.name}: describes the children as the server does`, () => {
          const seen = [];
          const capture = (attrs, ctx) => {
            seen.push(ctx.children);
            return templates[tag](attrs, ctx);
          };
          renderElement(tag, testCase.attrs, renderChildren(testCase.children), capture, idScope("neuwo-s"));
          const fixture = seen.pop();
          expandWith(markup({ tag, attrs: testCase.attrs, children: testCase.children }), { [tag]: capture }, "neuwo-s");
          expect(fixture).toEqual(seen.pop());
        });
      }
    });
  }
});
