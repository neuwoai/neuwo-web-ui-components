import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { jsx, jsxs } from "../src/react/jsx-runtime.js";
import { templates } from "../src/templates.js";
import "../src/index.js";
import { expand } from "../src/server/index.js";
import { renderElement } from "../src/core/adapters/html.js";
import { idScope } from "../src/core/ids.js";
import { cases, markup, normalise, renderChildren, renderHtml } from "./fixtures/template-cases.js";

function toReact(child) {
  if (typeof child === "string") return child;
  const props = { ...child.attrs };
  if (child.children) return jsxs(child.tag, { ...props, children: child.children.map(toReact) });
  return jsx(child.tag, { ...props, children: child.text });
}

// React warns about a value without onChange, and a fixture's value is only the starting value.
const handlers = (attrs) => (Object.hasOwn(attrs, "value") ? { onChange() {} } : {});

const viaReact = (tag, testCase) =>
  renderToStaticMarkup(jsxs(tag, { ...testCase.attrs, ...handlers(testCase.attrs), children: testCase.children.map(toReact) }));

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
          const errors = vi.spyOn(console, "error");
          const html = normalise(renderHtml(tag, testCase));
          expect(html).toContain(`<${tag}`);
          expect(normalise(expand(markup({ tag, attrs: testCase.attrs, children: testCase.children })))).toBe(html);
          expect(normalise(viaReact(tag, testCase))).toBe(html);
          expect(normalise(viaDom(tag, testCase))).toBe(html);
          expect(errors).not.toHaveBeenCalled();
        });

        it(`${testCase.name}: describes the children as the server does`, () => {
          const seen = [];
          const capture = (attrs, ctx) => {
            seen.push(ctx.children);
            return templates[tag](attrs, ctx);
          };
          renderElement(tag, testCase.attrs, renderChildren(testCase.children), capture, idScope("neuwo-s"));
          const fixture = seen.pop();
          expand(markup({ tag, attrs: testCase.attrs, children: testCase.children }), { [tag]: capture });
          expect(fixture).toEqual(seen.pop());
        });
      }
    });
  }
});
