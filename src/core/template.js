/** @typedef {{ tag: string, props: Record<string, string | true>, children: TemplateChild[], control?: true, live?: true }} TemplateNode */
/** @typedef {TemplateNode | string | { region: string } | { raw: string }} TemplateChild */
/**
 * An author child. An element's `children` describe its own child nodes the same way, whitespace-only text left out.
 * Through React, a wrapper that renders its children as they are, such as `Suspense`, is described by its children.
 * @typedef {{ tag: string | null, attrs: Record<string, string>, text: string, slot: string, children?: ChildInfo[] }} ChildInfo
 */
/** @typedef {{ id: (suffix: string) => string, children: ChildInfo[], within: Record<string, string> | null }} TemplateContext */
/**
 * A template's blocks are the classes in its output that contain neither `__` nor `--`; the root's first class
 * is the root block. Every element it renders carries a class owned by one of its blocks: the block itself,
 * `<block>__*` or `<block>--*`. At most one node is marked as the form control with `control()`, and every node the
 * element writes live state into with `live()`.
 * A region is the only child of its element, its wrapper. Every wrapper is rendered for every attribute
 * combination and carries a class unique within the template that is one of its blocks or a `<block>__<name>`
 * class, never a `--` modifier. Template text and elements appear only in elements that hold no region. The
 * adapters rely on this to tell template markup from author content: a wrapper's children are the author's,
 * every other node under the root is the template's. A template may name a tag as its `within`: every adapter then
 * hands it, as `ctx.within`, the attributes of the nearest enclosing element of that tag, never the host, or null.
 * Through React the enclosing host passes them down through elements, fragments, context providers, `Suspense`
 * and its fallback, `StrictMode`, `Profiler`, `Activity` and other Neuwo hosts, but not into a component of the app's
 * own, whose output it cannot see, nor through a portal, so a reader there gets null.
 * @typedef {((attrs: Record<string, string>, ctx: TemplateContext) => TemplateNode) & { within?: string }} Template
 */

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
  if (flat.length > 1 && flat.some((child) => typeof child === "object" && ("raw" in child || "region" in child))) {
    throw new Error(`region() and raw() must be the only child of <${tag}>`);
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
 * Marks the node as the template's form control. The adapters render the marker as nothing.
 * @param {TemplateNode} node
 * @returns {TemplateNode}
 */
export function control(node) {
  node.control = true;
  return node;
}

/**
 * Marks a node the element writes live state into; the React adapter keeps what it holds, the others render nothing.
 * @param {TemplateNode} node
 * @returns {TemplateNode}
 */
export function live(node) {
  node.live = true;
  return node;
}

/**
 * @param {TemplateNode} node
 * @returns {string[]}
 */
export const classesOf = (node) => (typeof node.props.class === "string" ? node.props.class.split(/\s+/).filter(Boolean) : []);

/**
 * The blocks of a template's output: every class in it that contains neither `__` nor `--`.
 * @param {TemplateNode} node
 * @param {Set<string>} [blocks]
 * @returns {Set<string>}
 */
export function blocksOf(node, blocks = new Set()) {
  for (const name of classesOf(node)) if (!name.includes("__") && !name.includes("--")) blocks.add(name);
  for (const child of node.children) if (typeof child === "object" && "tag" in child) blocksOf(child, blocks);
  return blocks;
}

/**
 * The node's first class that is one of the blocks or a `<block>__*` element class, never a block or element
 * modifier, which changes with the attributes.
 * @param {TemplateNode} node
 * @param {Set<string>} blocks
 * @returns {string | undefined}
 */
export function keyClassOf(node, blocks) {
  return classesOf(node).find((name) => !name.includes("--") && (blocks.has(name) || blocks.has(name.split("__")[0])));
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
