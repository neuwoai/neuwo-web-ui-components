import { describe, expect, it } from "vitest";
import { templates } from "../src/templates.js";
import { cases, renderChildren } from "./fixtures/template-cases.js";

const isNode = (child) => typeof child === "object" && "tag" in child;
const isRegion = (child) => typeof child === "object" && "region" in child;
const classesOf = (node) => (typeof node.props.class === "string" ? node.props.class.trim().split(/\s+/) : []);

function elements(node, out = []) {
  out.push(node);
  for (const child of node.children) if (isNode(child)) elements(child, out);
  return out;
}

function output(tag, testCase) {
  const children = renderChildren(testCase.children).map(({ html, ...info }) => info);
  const root = templates[tag](testCase.attrs, { id: (suffix) => `neuwo-s1-${suffix}`, children });
  const [block] = classesOf(root);
  const owned = (name) => name === block || name.startsWith(`${block}__`);
  const all = elements(root);
  const wrappers = all.filter((node) => node.children.some(isRegion)).map((node) => classesOf(node).find(owned));
  return { block, owned, all, wrappers };
}

describe("template contract", () => {
  it("has a registered template for every tag with cases", () => {
    expect(Object.keys(templates).sort()).toEqual(Object.keys(cases).sort());
  });

  for (const tag of Object.keys(templates)) {
    describe(tag, () => {
      const list = cases[tag] ?? [];

      it("has template cases", () => {
        expect(list.length).toBeGreaterThan(0);
      });

      for (const testCase of list) {
        describe(testCase.name, () => {
          it("gives the root a prefixed block class", () => {
            expect(output(tag, testCase).block).toMatch(/^neuwo-(?!neuwo-)/);
          });

          it("marks every element with the block class or a block element class", () => {
            const { all, owned } = output(tag, testCase);
            for (const node of all) expect(classesOf(node).some(owned), `<${node.tag} class="${node.props.class ?? ""}">`).toBe(true);
          });

          it("keeps every region the only child of its wrapper", () => {
            for (const node of output(tag, testCase).all) {
              if (node.children.some(isRegion)) expect(node.children, `<${node.tag}>`).toHaveLength(1);
            }
          });

          it("gives each wrapper a class unique within the output", () => {
            const { wrappers } = output(tag, testCase);
            expect(wrappers.every(Boolean)).toBe(true);
            expect(new Set(wrappers).size).toBe(wrappers.length);
          });
        });
      }

      it("renders the same wrappers for every case", () => {
        const [first, ...rest] = list.map((testCase) => [...output(tag, testCase).wrappers].sort());
        for (const wrappers of rest) expect(wrappers).toEqual(first);
      });
    });
  }
});
