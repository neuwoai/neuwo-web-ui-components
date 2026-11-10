import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { jsx, jsxs } from "../src/react/jsx-runtime.js";
import { templates } from "../src/templates.js";
import "../src/index.js";
import { expand } from "../src/server/index.js";
import { cases, markup, normalise, renderHtml } from "./fixtures/template-cases.js";

function toReact(child) {
  if (typeof child === "string") return child;
  const props = { ...child.attrs };
  if (child.children) return jsxs(child.tag, { ...props, children: child.children.map(toReact) });
  return jsx(child.tag, { ...props, children: child.text });
}

const viaReact = (tag, testCase) => renderToStaticMarkup(jsxs(tag, { ...testCase.attrs, children: testCase.children.map(toReact) }));

const mounted = [];
afterEach(() => {
  while (mounted.length) mounted.pop().remove();
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
          const html = normalise(renderHtml(tag, testCase));
          expect(html).toContain(`<${tag}`);
          expect(normalise(expand(markup({ tag, attrs: testCase.attrs, children: testCase.children })))).toBe(html);
          expect(normalise(viaReact(tag, testCase))).toBe(html);
          expect(normalise(viaDom(tag, testCase))).toBe(html);
        });
      }
    });
  }
});
