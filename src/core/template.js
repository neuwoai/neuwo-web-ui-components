/** @typedef {{ tag: string, props: Record<string, string | true>, children: TemplateChild[] }} TemplateNode */
/** @typedef {TemplateNode | string | { region: string } | { raw: string }} TemplateChild */
/** @typedef {{ tag: string | null, attrs: Record<string, string>, text: string, slot: string }} ChildInfo */
/** @typedef {{ id: (suffix: string) => string, children: ChildInfo[] }} TemplateContext */
/** @typedef {(attrs: Record<string, string>, ctx: TemplateContext) => TemplateNode} Template */

export const DEFAULT_REGION = "default";

const NOT_ATTRIBUTES = new Set(["children", "key", "ref", "className", "style"]);

/**
 * @param {unknown[]} children
 * @param {TemplateChild[]} out
 * @returns {TemplateChild[]}
 */
function flatten(children, out) {
  for (const child of children) {
    if (Array.isArray(child)) flatten(child, out);
    else if (child == null || typeof child === "boolean" || child === "") continue;
    else if (typeof child === "string" || typeof child === "number") {
      const last = out.length - 1;
      if (typeof out[last] === "string") out[last] += String(child);
      else out.push(String(child));
    } else out.push(/** @type {TemplateChild} */ (child));
  }
  return out;
}

/**
 * @param {string} tag
 * @param {Record<string, unknown> | null} [props]
 * @param {...unknown} children
 * @returns {TemplateNode}
 */
export function h(tag, props, ...children) {
  /** @type {Record<string, string | true>} */
  const kept = {};
  for (const [name, value] of Object.entries(props ?? {})) {
    if (value === true) kept[name] = true;
    else if (value !== false && value != null) kept[name] = String(value);
  }
  const flat = flatten(children, []);
  if (flat.length > 1 && flat.some((child) => typeof child === "object" && "raw" in child)) {
    throw new Error(`raw() must be the only child of <${tag}>`);
  }
  return { tag, props: kept, children: flat };
}

/**
 * @param {string} [name]
 * @returns {{ region: string }}
 */
export function region(name = DEFAULT_REGION) {
  return { region: name };
}

/**
 * @param {string} html
 * @returns {{ raw: string }}
 */
export function raw(html) {
  return { raw: html };
}

/**
 * @param {Record<string, string>} attrs
 * @param {string} name
 * @returns {boolean}
 */
export function has(attrs, name) {
  return Object.hasOwn(attrs, name);
}

/**
 * @param {Record<string, unknown>} props
 * @returns {Record<string, string>}
 */
export function normalizeProps(props) {
  /** @type {Record<string, string>} */
  const attrs = {};
  for (const [name, value] of Object.entries(props ?? {})) {
    if (NOT_ATTRIBUTES.has(name) || typeof value === "function" || value === false || value == null) continue;
    attrs[name] = value === true ? "" : String(value);
  }
  return attrs;
}

/**
 * @param {TemplateNode} node
 * @param {Set<string>} names
 * @returns {Set<string>}
 */
function regionNames(node, names) {
  for (const child of node.children) {
    if (typeof child !== "object") continue;
    if ("region" in child) names.add(child.region);
    else if ("tag" in child) regionNames(child, names);
  }
  return names;
}

/**
 * @template T
 * @param {TemplateNode} node
 * @param {T[]} items
 * @param {(item: T) => string} slotOf
 * @returns {Record<string, T[]>}
 */
export function distribute(node, items, slotOf) {
  const names = regionNames(node, new Set());
  /** @type {Record<string, T[]>} */
  const regions = {};
  for (const name of names) regions[name] = [];
  for (const item of items) {
    const name = slotOf(item) || DEFAULT_REGION;
    if (names.has(name)) regions[name].push(item);
  }
  return regions;
}
