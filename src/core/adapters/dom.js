import { DEFAULT_REGION, distribute } from "../template.js";
import { idScope } from "../ids.js";

/** @typedef {import("../template.js").TemplateNode} TemplateNode */
/** @typedef {import("../template.js").ChildInfo} ChildInfo */
/** @typedef {import("../template.js").Template} Template */
/** @typedef {{ regions: string[], nodes: Node[] }} Gap */
/** @typedef {{ block: string, matched: boolean, authored: Node[], writes: Array<() => void>, gaps: Gap[] }} Walk */

const SVG = "http://www.w3.org/2000/svg";
const ELEMENT = 1;
const TEXT = 3;
const COMMENT = 8;

const newIds = idScope("neuwo-c");
/** @type {WeakMap<Element, (suffix: string) => string>} */
const scopes = new WeakMap();

/** @param {Element} host */
function idFor(host) {
  let id = scopes.get(host);
  if (!id) scopes.set(host, (id = newIds()));
  return id;
}

/**
 * @param {Element} el
 * @returns {Record<string, string>}
 */
function attrsOf(el) {
  /** @type {Record<string, string>} */
  const attrs = {};
  for (const { name, value } of Array.from(el.attributes)) attrs[name] = value;
  return attrs;
}

/** @param {Node} node */
const slotOf = (node) => (node.nodeType === ELEMENT && /** @type {Element} */ (node).getAttribute("slot")) || DEFAULT_REGION;

/** @param {TemplateNode} node */
const firstClass = (node) => (typeof node.props.class === "string" ? node.props.class.trim().split(/\s+/)[0] : "");

/**
 * @param {Node[]} nodes
 * @returns {ChildInfo[]}
 */
function describe(nodes) {
  /** @type {ChildInfo[]} */
  const info = [];
  for (const node of nodes) {
    if (node.nodeType === ELEMENT) {
      const el = /** @type {Element} */ (node);
      info.push({ tag: el.localName, attrs: attrsOf(el), text: el.textContent, slot: slotOf(el) });
    } else if (node.nodeType === TEXT) {
      info.push({ tag: null, attrs: {}, text: /** @type {Text} */ (node).data, slot: DEFAULT_REGION });
    }
  }
  return info;
}

/**
 * @param {Element} host
 * @returns {ChildInfo[]}
 */
export function childInfo(host) {
  return describe(Array.from(host.childNodes));
}

/**
 * @param {TemplateNode} node
 * @param {Record<string, Node[]>} regions
 * @param {boolean} [svg]
 * @returns {Element}
 */
function build(node, regions, svg = node.tag === "svg") {
  const el = svg ? document.createElementNS(SVG, node.tag) : document.createElement(node.tag);
  for (const [name, value] of Object.entries(node.props)) el.setAttribute(name, value === true ? "" : value);
  for (const child of node.children) {
    if (typeof child === "string") el.append(child);
    else if ("region" in child) el.append(...(regions[child.region] ?? []));
    else if ("raw" in child) el.innerHTML = child.raw;
    else el.append(build(child, regions, svg || child.tag === "svg"));
  }
  return el;
}

/**
 * @param {Element} host
 * @param {Template} template
 */
export function render(host, template) {
  const nodes = Array.from(host.childNodes);
  const node = template(attrsOf(host), { id: idFor(host), children: describe(nodes) });
  host.replaceChildren(build(node, distribute(node, nodes, slotOf)));
}

/**
 * @param {Element} host
 * @param {Template} template
 * @returns {boolean}
 */
export function isRendered(host, template) {
  const root = host.firstElementChild;
  if (!root) return false;
  const node = template(attrsOf(host), { id: idFor(host), children: childInfo(host) });
  const block = firstClass(node);
  return root.localName === node.tag && (!block || root.classList.contains(block));
}

/**
 * @param {Element} el
 * @param {Record<string, string | true>} props
 * @param {Array<() => void>} writes
 */
function diff(el, props, writes) {
  for (const [name, value] of Object.entries(props)) {
    const wanted = value === true ? "" : value;
    if (el.getAttribute(name) !== wanted) writes.push(() => el.setAttribute(name, wanted));
  }
  for (const name of el.getAttributeNames()) {
    if (!Object.hasOwn(props, name)) writes.push(() => el.removeAttribute(name));
  }
}

/**
 * @param {Node[]} nodes
 * @param {number} from
 * @param {TemplateNode} node
 */
function find(nodes, from, node) {
  const block = firstClass(node);
  for (let at = from; at < nodes.length; at++) {
    const el = /** @type {Element} */ (nodes[at]);
    if (el.nodeType === ELEMENT && el.localName === node.tag && (!block || el.classList.contains(block))) return at;
  }
  return -1;
}

/**
 * @param {Node} node
 * @param {string} block
 */
function leftover(node, block) {
  return block !== "" && node.nodeType === ELEMENT && Array.from(/** @type {Element} */ (node).classList).some((name) => name.startsWith(`${block}__`));
}

/**
 * @param {Node} node
 * @param {Gap} gap
 * @param {Walk} walk
 */
function take(node, gap, walk) {
  // A BEM element of this block between regions is template markup from an earlier render, not author content.
  if (gap.regions.length && !leftover(node, walk.block)) {
    gap.nodes.push(node);
    walk.authored.push(node);
  } else if (node.nodeType !== COMMENT) walk.matched = false;
}

/**
 * @param {TemplateNode} node
 * @param {Element} el
 * @param {Walk} walk
 */
function visit(node, el, walk) {
  const [only] = node.children;
  if (typeof only === "object" && "raw" in only) {
    const parsed = /** @type {Element} */ (el.cloneNode(false));
    parsed.innerHTML = only.raw;
    if (parsed.innerHTML !== el.innerHTML) walk.writes.push(() => (el.innerHTML = only.raw));
    return;
  }
  const nodes = Array.from(el.childNodes);
  let at = 0;
  /** @type {Gap} */
  let gap = { regions: [], nodes: [] };
  const close = () => {
    if (gap.regions.length) walk.gaps.push(gap);
    gap = { regions: [], nodes: [] };
  };
  for (const child of node.children) {
    if (typeof child === "string") {
      while (!gap.regions.length && nodes[at]?.nodeType === COMMENT) at++;
      const text = /** @type {Text} */ (nodes[at]);
      if (gap.regions.length || text?.nodeType !== TEXT) {
        walk.matched = false;
        continue;
      }
      if (text.data !== child) walk.writes.push(() => (text.data = child));
      at++;
    } else if ("region" in child) gap.regions.push(child.region);
    else if ("raw" in child) walk.matched = false;
    else {
      const match = find(nodes, at, child);
      if (match < 0) {
        walk.matched = false;
        continue;
      }
      for (; at < match; at++) take(nodes[at], gap, walk);
      close();
      const matched = /** @type {Element} */ (nodes[match]);
      diff(matched, child.props, walk.writes);
      visit(child, matched, walk);
      at = match + 1;
    }
  }
  for (; at < nodes.length; at++) take(nodes[at], gap, walk);
  close();
}

/**
 * @param {TemplateNode} node
 * @param {Gap} gap
 */
function inOrder(node, gap) {
  const byRegion = distribute(node, gap.nodes, slotOf);
  const order = gap.regions.flatMap((name) => byRegion[name] ?? []);
  return order.length === gap.nodes.length && order.every((item, index) => item === gap.nodes[index]);
}

/**
 * @param {Element} host
 * @param {TemplateNode} next
 * @returns {Walk}
 */
function walk(host, next) {
  const block = firstClass(next);
  const root = host.firstElementChild;
  const rendered = root !== null && (block ? root.classList.contains(block) : root.localName === next.tag);
  /** @type {Walk} */
  const result = { block, matched: rendered, authored: [], writes: [], gaps: [] };
  for (const node of Array.from(host.childNodes)) {
    if (node !== root || !rendered) {
      result.authored.push(node);
      continue;
    }
    if (root.localName === next.tag) diff(root, next.props, result.writes);
    else result.matched = false;
    visit(next, root, result);
  }
  if (result.matched) result.matched = result.gaps.every((gap) => inOrder(next, gap));
  return result;
}

/**
 * @param {Element} host
 * @param {Template} template
 */
export function patch(host, template) {
  const attrs = attrsOf(host);
  const id = idFor(host);
  const probe = walk(host, template(attrs, { id, children: [] }));
  const next = template(attrs, { id, children: describe(probe.authored) });
  const found = walk(host, next);
  if (found.matched) for (const write of found.writes) write();
  else host.replaceChildren(build(next, distribute(next, found.authored, slotOf)));
}
