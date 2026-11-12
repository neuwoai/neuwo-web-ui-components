import { describe, expect, it } from "vitest";
import { isBooleanAttribute } from "../src/core/adapters/react.js";
import { blocksOf, classesOf, keyClassOf } from "../src/core/template.js";
import { templates } from "../src/templates.js";
import { cases, renderChildren } from "./fixtures/template-cases.js";

const isNode = (child) => typeof child === "object" && "tag" in child;
const isRegion = (child) => typeof child === "object" && "region" in child;

function elements(node, out = []) {
  out.push(node);
  for (const child of node.children) if (isNode(child)) elements(child, out);
  return out;
}

function output(tag, testCase) {
  const children = renderChildren(testCase.children).map(({ html, ...info }) => info);
  const root = templates[tag](testCase.attrs, { id: (suffix) => `neuwo-s1-${suffix}`, children });
  const [block] = classesOf(root);
  const all = elements(root);
  const blocks = [...new Set(all.flatMap(classesOf).filter((name) => !name.includes("__") && !name.includes("--")))];
  const keyed = (name) => !name.includes("--") && blocks.some((each) => name === each || name.startsWith(`${each}__`));
  const ownedByABlock = (name) => blocks.some((each) => name === each || name.startsWith(`${each}__`) || name.startsWith(`${each}--`));
  const wrappers = all.filter((node) => node.children.some(isRegion)).map((node) => classesOf(node).find(keyed));
  return { root, block, blocks, ownedByABlock, all, wrappers };
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
          it("gives the root a prefixed block class first", () => {
            const { block } = output(tag, testCase);
            expect(block).toMatch(/^neuwo-(?!neuwo-)/);
            expect(block).not.toMatch(/__|--/);
          });

          it("prefixes every block it renders", () => {
            for (const name of output(tag, testCase).blocks) expect(name).toMatch(/^neuwo-(?!neuwo-)/);
          });

          it("marks every element with a class owned by one of the output's blocks", () => {
            const { all, ownedByABlock } = output(tag, testCase);
            for (const node of all) expect(classesOf(node).some(ownedByABlock), `<${node.tag} class="${node.props.class ?? ""}">`).toBe(true);
          });

          it("gives every rendered element a key class", () => {
            const { root } = output(tag, testCase);
            const blocks = blocksOf(root);
            for (const node of elements(root)) expect(keyClassOf(node, blocks), `<${node.tag} class="${node.props.class ?? ""}">`).toEqual(expect.any(String));
          });

          it("gives a boolean attribute only the value true, which the React adapter renders as present", () => {
            for (const node of output(tag, testCase).all) {
              for (const [name, value] of Object.entries(node.props)) {
                if (isBooleanAttribute(name)) expect(value, `<${node.tag} ${name}>`).toBe(true);
              }
            }
          });

          it("marks at most one control", () => {
            expect(output(tag, testCase).all.filter((node) => node.control === true).length).toBeLessThanOrEqual(1);
          });

          it("emits no <neuwo-*> tag", () => {
            for (const node of output(tag, testCase).all) expect(node.tag, `<${node.tag}>`).not.toMatch(/^neuwo-/);
          });

          it("keeps every region the only child of its wrapper", () => {
            for (const node of output(tag, testCase).all) {
              if (node.children.some(isRegion)) expect(node.children, `<${node.tag}>`).toHaveLength(1);
            }
          });

          it("gives each wrapper a block or block element class unique within the output", () => {
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
