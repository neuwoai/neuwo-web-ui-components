import { distribute } from "../template.js";

/** @typedef {import("../template.js").TemplateNode} TemplateNode */
/** @typedef {import("../template.js").ChildInfo} ChildInfo */
/** @typedef {import("../template.js").Template} Template */
/**
 * An author child of the element being rendered, with its original markup as `html`. Pass a comment as
 * `{ tag: null, attrs: {}, text: "", slot: "default", html: "<!-- ... -->" }`: comments and whitespace-only
 * text go to the default region but are not described to the template in `ctx.children`. An element's nested
 * `children` need no `html`; pass a nested comment as empty text.
 * @typedef {ChildInfo & { html: string }} RenderChild
 */

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
  const [first] = node.children;
  if (node.tag === "textarea" && typeof first === "string" && first.startsWith("\n")) inner = "\n";
  for (const child of node.children) {
    if (typeof child === "string") inner += escape(child);
    else if ("region" in child) inner += Object.hasOwn(regions, child.region) ? regions[child.region] : "";
    else if ("raw" in child) inner += child.raw;
    else inner += toHTML(child, regions);
  }
  return `${open}${inner}</${node.tag}>`;
}

/**
 * @param {Array<ChildInfo & { html?: string }>} children
 * @returns {ChildInfo[]}
 */
function describe(children) {
  return children
    .filter((child) => !child.html?.startsWith("<!--") && (child.tag !== null || child.text.trim() !== ""))
    .map(({ tag, attrs, text, slot, children: nested }) =>
      tag === null ? { tag, attrs, text, slot } : { tag, attrs, text, slot, children: describe(nested ?? []) },
    );
}

/**
 * @param {string} tag
 * @param {Record<string, string>} attrs
 * @param {RenderChild[]} children
 * @param {Template} template
 * @param {() => (suffix: string) => string} newIds
 * @returns {string}
 */
export function renderElement(tag, attrs, children, template, newIds) {
  const node = template(attrs, { id: newIds(), children: describe(children) });
  /** @type {Record<string, string>} */
  const regions = {};
  for (const [name, list] of Object.entries(distribute(node, children, (child) => child.slot))) {
    regions[name] = list.map((child) => child.html).join("");
  }
  return `<${tag}${attributes(attrs)}>${toHTML(node, regions)}</${tag}>`;
}
