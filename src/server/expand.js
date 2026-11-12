import { DomUtils, ElementType, parseDocument } from "htmlparser2";
import { renderElement } from "../core/adapters/html.js";
import { idScope } from "../core/ids.js";
import { DEFAULT_REGION } from "../core/template.js";

/** @import { ChildNode, Element, Text } from "domhandler" */
/** @import { ChildInfo, Template } from "../core/template.js" */
/** @import { RenderChild } from "../core/adapters/html.js" */
/** @typedef {{ html: string, registry: Record<string, Template>, newIds: () => (suffix: string) => string }} Page */
/** @typedef {{ ns: "svg" | "math", run: { out: boolean } }} Foreign */

const OPAQUE = new Set(["template", "script", "style", "textarea"]);

const SVG_HTML = new Set(["foreignObject", "desc", "title"]);
const MATH_TEXT = new Set(["mi", "mo", "mn", "ms", "mtext"]);
const GLYPHS = new Set(["mglyph", "malignmark"]);
const HTML_ENCODING = /^(text\/html|application\/xhtml\+xml)$/i;
const BREAKOUT = new Set([
  "b", "big", "blockquote", "body", "br", "center", "code", "dd", "div", "dl", "dt", "em", "embed", "h1", "h2", "h3",
  "h4", "h5", "h6", "head", "hr", "i", "img", "li", "listing", "menu", "meta", "nobr", "ol", "p", "pre", "ruby", "s",
  "small", "span", "strike", "strong", "sub", "sup", "table", "tt", "u", "ul", "var",
]);

const PHRASING = new Set([
  "a", "abbr", "area", "audio", "b", "bdi", "bdo", "br", "button", "canvas", "cite", "code", "data", "datalist",
  "del", "dfn", "em", "embed", "i", "iframe", "img", "input", "ins", "kbd", "label", "link", "map", "mark", "math",
  "meta", "meter", "noscript", "object", "output", "picture", "progress", "q", "ruby", "s", "samp", "script",
  "select", "slot", "small", "span", "strong", "sub", "sup", "svg", "template", "textarea", "time", "u", "var",
  "video", "wbr",
]);

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
 * @returns {Record<string, string> | null}
 */
function withinOf(el, template) {
  if (!template.within) return null;
  for (let node = el.parent; node; node = node.parent) if ("attribs" in node && node.name === template.within) return { ...node.attribs };
  return null;
}

/**
 * @param {Element} el
 * @param {Template} template
 */
const probe = (el, template) => template({ ...el.attribs }, { id: (suffix) => suffix, children: [], within: withinOf(el, template) });

/**
 * @param {Element} el
 * @param {Template} template
 * @returns {boolean}
 */
function isRendered(el, template) {
  const root = probe(el, template);
  const [block] = classesOf(root.props.class);
  return el.children.some(
    (child) => isElement(child) && (block ? classesOf(child.attribs.class).includes(block) : child.name === root.tag),
  );
}

/**
 * @param {Page} page
 * @param {ChildNode} node
 * @returns {boolean}
 */
function isBlockElement(page, node) {
  if (!isElement(node) || !Object.hasOwn(page.registry, node.name)) return false;
  const template = page.registry[node.name];
  return !isRendered(node, template) && !PHRASING.has(probe(node, template).tag);
}

/**
 * A browser closes a `<p>` at block markup and moves it out of its element, so a paragraph of only such elements goes.
 * @param {Page} page
 * @param {Element} p
 * @returns {boolean}
 */
function liftable(page, p) {
  const ignorable = (/** @type {ChildNode} */ node) => node.type === ElementType.Comment || (isText(node) && !/[^\t\n\f\r ]/.test(node.data));
  return p.children.some(isElement) && p.children.every((child) => ignorable(child) || isBlockElement(page, child));
}

/**
 * @param {ChildNode} node
 * @returns {ChildInfo}
 */
function describe(node) {
  if (!isElement(node)) return { tag: null, attrs: {}, text: isText(node) ? node.data : "", slot: DEFAULT_REGION };
  const attrs = { ...node.attribs };
  const inert = node.name === "template";
  return { tag: node.name, attrs, text: inert ? "" : DomUtils.textContent(node), slot: attrs.slot || DEFAULT_REGION, children: inert ? [] : node.children.map(describe) };
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
    return { ...describe(child), html: rewrite(page, [child], start, end) };
  });
  const template = page.registry[el.name];
  return renderElement(el.name, { ...el.attribs }, children, template, () => id, withinOf(el, template));
}

/**
 * @param {Element} node
 * @returns {boolean}
 */
const breaksOut = (node) => BREAKOUT.has(node.name) || (node.name === "font" && ["color", "face", "size"].some((name) => Object.hasOwn(node.attribs, name)));

/**
 * How a browser parses the children of an element of foreign content.
 * @param {Element} node
 * @param {Foreign} foreign
 * @returns {{ foreign: Foreign | null, text: boolean }}
 */
function inside(node, foreign) {
  if (foreign.ns === "svg") return SVG_HTML.has(node.name) ? { foreign: null, text: false } : { foreign, text: false };
  if (MATH_TEXT.has(node.name)) return { foreign: null, text: true };
  if (node.name === "annotation-xml" && HTML_ENCODING.test(node.attribs.encoding ?? "")) return { foreign: null, text: false };
  const svg = node.name === "svg" && node.parent !== null && "attribs" in node.parent && node.parent.name === "annotation-xml";
  return { foreign: svg ? { ns: "svg", run: foreign.run } : foreign, text: false };
}

/**
 * @param {Page} page
 * @param {ChildNode[]} nodes
 * @param {number} limit
 * @param {(start: number, end: number, markup: string) => void} emit
 * @param {Foreign | null} [foreign] - the foreign content the nodes are parsed as, until an HTML tag such as `<p>` ends it.
 * @param {boolean} [text] - the nodes sit in a MathML text integration point.
 */
function visit(page, nodes, limit, emit, foreign = null, text = false) {
  nodes.forEach((node, i) => {
    if (!isElement(node) || OPAQUE.has(node.name)) return;
    const next = i + 1 < nodes.length ? startOf(page.html, nodes[i + 1]) : limit;
    const { start, content, end } = span(page.html, node, next);
    if (foreign && !foreign.run.out && breaksOut(node)) foreign.run.out = true;
    if (foreign && !foreign.run.out) {
      const children = inside(node, foreign);
      visit(page, node.children, content, emit, children.foreign, children.text);
    } else if (node.name === "svg" || node.name === "math" || (text && GLYPHS.has(node.name))) {
      visit(page, node.children, content, emit, { ns: node.name === "svg" ? "svg" : "math", run: { out: false } });
    } else if (node.name === "p" && liftable(page, node)) emit(start, end, rewrite(page, node.children, startOf(page.html, node.children[0]), content));
    else if (!Object.hasOwn(page.registry, node.name)) visit(page, node.children, content, emit);
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
 * is anything a browser parses as SVG or MathML: inside `<svg>` or `<math>`, but for the points where the parser
 * returns to HTML. So is every byte outside the elements it expands, but one: a `<p>` that holds nothing but
 * elements whose markup is block content, whitespace and comments, as Markdown writes around such elements, is
 * replaced by what it holds.
 * @param {string} html
 * @param {Record<string, Template>} registry
 * @param {string} prefix
 * @returns {string}
 */
export function expandWith(html, registry, prefix) {
  const doc = parseDocument(html, { withStartIndices: true, withEndIndices: true, lowerCaseTags: true });
  return rewrite({ html, registry, newIds: idScope(prefix) }, doc.children, 0, html.length);
}
