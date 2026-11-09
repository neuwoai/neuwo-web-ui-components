import { distribute } from "../template.js";

/** @typedef {import("../template.js").TemplateNode} TemplateNode */
/** @typedef {import("../template.js").ChildInfo} ChildInfo */
/** @typedef {import("../template.js").Template} Template */

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

/** @param {string} value */
const escape = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** @param {Record<string, string | true>} props */
function attributes(props) {
  let out = "";
  for (const [name, value] of Object.entries(props)) out += ` ${name}="${value === true ? "" : escape(value)}"`;
  return out;
}

/**
 * @param {TemplateNode} node
 * @param {Record<string, string>} [regions]
 * @returns {string}
 */
export function toHTML(node, regions = {}) {
  const open = `<${node.tag}${attributes(node.props)}>`;
  if (VOID.has(node.tag)) return open;
  let inner = "";
  for (const child of node.children) {
    if (typeof child === "string") inner += escape(child);
    else if ("region" in child) inner += Object.hasOwn(regions, child.region) ? regions[child.region] : "";
    else if ("raw" in child) inner += child.raw;
    else inner += toHTML(child, regions);
  }
  return `${open}${inner}</${node.tag}>`;
}

/**
 * @param {string} tag
 * @param {Record<string, string>} attrs
 * @param {Array<ChildInfo & { html: string }>} children
 * @param {Template} template
 * @param {() => (suffix: string) => string} newIds
 * @returns {string}
 */
export function renderElement(tag, attrs, children, template, newIds) {
  // A comment keeps its place in the output but is not a child a template can read.
  const described = children.filter((child) => !child.html.startsWith("<!--")).map(({ html, ...info }) => info);
  const node = template(attrs, { id: newIds(), children: described });
  /** @type {Record<string, string>} */
  const regions = {};
  for (const [name, list] of Object.entries(distribute(node, children, (child) => child.slot))) {
    regions[name] = list.map((child) => child.html).join("");
  }
  return `<${tag}${attributes(attrs)}>${toHTML(node, regions)}</${tag}>`;
}
