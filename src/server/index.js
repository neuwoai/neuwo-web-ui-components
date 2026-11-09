import { DomUtils, ElementType, parseDocument } from "htmlparser2";
import { renderElement } from "../core/adapters/html.js";
import { idScope } from "../core/ids.js";
import { DEFAULT_REGION } from "../core/template.js";
import { templates } from "../templates.js";

export { renderElement };

/** @import { ChildNode, Element, Text } from "domhandler" */
/** @import { Template } from "../core/template.js" */
/** @import { RenderChild } from "../core/adapters/html.js" */
/** @typedef {{ html: string, registry: Record<string, Template>, newIds: () => (suffix: string) => string }} Page */

const OPAQUE = new Set(["template", "script", "style", "textarea"]);

/**
 * @param {ChildNode} node
 * @returns {node is Element}
 */
const isElement = (node) => "attribs" in node;

/**
 * @param {ChildNode} node
 * @returns {node is Text}
 */
const isText = (node) => node.type === ElementType.Text;

/** @param {unknown} value */
const classesOf = (value) => (typeof value === "string" ? value.split(/[\t\n\f\r ]+/).filter(Boolean) : []);

/**
 * @param {string} html
 * @param {ChildNode} node
 * @returns {number}
 */
function startOf(html, node) {
  const start = node.startIndex;
  // htmlparser2 starts the node after an end tag like `</b >` at the end of the tag name, not after its `>`.
  const stale = isText(node) ? start > 0 && html[start - 1] !== ">" : html[start] !== "<";
  if (!stale) return start;
  const gt = html.indexOf(">", start);
  return gt === -1 ? html.length : gt + 1;
}

/**
 * @param {string} html
 * @param {ChildNode} node
 * @param {number} limit
 * @returns {{ start: number, content: number, end: number }}
 */
function span(html, node, limit) {
  const start = startOf(html, node);
  if (!isElement(node)) return { start, content: start, end: node.endIndex + 1 };
  // htmlparser2 ends an element at the end of the tag name that closed it, which may belong to another element.
  const close = node.endIndex - node.name.length - 2;
  if (close < start || html.slice(close, node.endIndex).toLowerCase() !== `</${node.name}`) {
    return { start, content: limit, end: limit };
  }
  const gt = html.indexOf(">", node.endIndex);
  return { start, content: close, end: gt === -1 ? limit : gt + 1 };
}

/**
 * @param {Element} el
 * @param {Template} template
 * @returns {boolean}
 */
function isRendered(el, template) {
  const root = template({ ...el.attribs }, { id: (suffix) => suffix, children: [] });
  const [block] = classesOf(root.props.class);
  return el.children.some(
    (child) => isElement(child) && (block ? classesOf(child.attribs.class).includes(block) : child.name === root.tag),
  );
}

/**
 * @param {Page} page
 * @param {Element} el
 * @param {number} contentEnd
 * @returns {string}
 */
function expandElement(page, el, contentEnd) {
  const id = page.newIds();
  /** @type {RenderChild[]} */
  const children = el.children.map((child, i) => {
    const next = i + 1 < el.children.length ? startOf(page.html, el.children[i + 1]) : contentEnd;
    const { start, end } = span(page.html, child, next);
    const html = rewrite(page, [child], start, end);
    if (!isElement(child)) {
      return { tag: null, attrs: {}, text: isText(child) ? child.data : "", slot: DEFAULT_REGION, html };
    }
    const attrs = { ...child.attribs };
    return { tag: child.name, attrs, text: DomUtils.textContent(child), slot: attrs.slot || DEFAULT_REGION, html };
  });
  return renderElement(el.name, { ...el.attribs }, children, page.registry[el.name], () => id);
}

/**
 * @param {Page} page
 * @param {ChildNode[]} nodes
 * @param {number} limit
 * @param {(start: number, end: number, markup: string) => void} emit
 */
function visit(page, nodes, limit, emit) {
  nodes.forEach((node, i) => {
    if (!isElement(node) || OPAQUE.has(node.name)) return;
    const next = i + 1 < nodes.length ? startOf(page.html, nodes[i + 1]) : limit;
    const { start, content, end } = span(page.html, node, next);
    if (!Object.hasOwn(page.registry, node.name)) visit(page, node.children, content, emit);
    else if (!isRendered(node, page.registry[node.name])) emit(start, end, expandElement(page, node, content));
  });
}

/**
 * @param {Page} page
 * @param {ChildNode[]} nodes
 * @param {number} from
 * @param {number} to
 * @returns {string}
 */
function rewrite(page, nodes, from, to) {
  let out = "";
  let cursor = from;
  visit(page, nodes, to, (start, end, markup) => {
    out += page.html.slice(cursor, start) + markup;
    cursor = end;
  });
  return out + page.html.slice(cursor, to);
}

/**
 * Expands every registered `<neuwo-*>` element in an HTML document in place. Elements that already hold their
 * rendered markup, and anything inside `<template>`, `<script>`, `<style>` or `<textarea>`, are left alone, as
 * is every byte outside the elements it expands.
 * @param {string} html
 * @param {Record<string, Template>} [registry]
 * @returns {string}
 */
export function expand(html, registry = templates) {
  const doc = parseDocument(html, { withStartIndices: true, withEndIndices: true, lowerCaseTags: true });
  return rewrite({ html, registry, newIds: idScope("neuwo-s") }, doc.children, 0, html.length);
}

/**
 * Adds the `neuwo-expand` transform, which runs `expand` on every `.html` output.
 * @param {{ addTransform: (name: string, transform: (this: { page: { outputPath: string | false } }, content: string) => string) => void }} eleventyConfig
 */
export function eleventyPlugin(eleventyConfig) {
  eleventyConfig.addTransform("neuwo-expand", function (content) {
    const path = this.page.outputPath;
    return path && path.endsWith(".html") ? expand(content) : content;
  });
}
