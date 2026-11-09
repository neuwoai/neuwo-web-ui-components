import { DEFAULT_REGION, distribute } from "../template.js";
import { idScope } from "../ids.js";

/** @typedef {import("../template.js").TemplateNode} TemplateNode */
/** @typedef {import("../template.js").TemplateChild} TemplateChild */
/** @typedef {import("../template.js").ChildInfo} ChildInfo */
/** @typedef {import("../template.js").Template} Template */
/** @typedef {{ el: Element, raw: boolean, kids: Array<Mirror | Text | null> }} Mirror */
/** @typedef {{ id: (suffix: string) => string, last: TemplateNode | null, root: Element | null, mirror: Mirror | null, dropped: Node[] }} HostState */
/** @typedef {Map<Node, boolean>} Owned */

const SVG = "http://www.w3.org/2000/svg";
const ELEMENT = 1;
const TEXT = 3;

const newIds = idScope("neuwo-c");
/** @type {WeakMap<Element, HostState>} */
const states = new WeakMap();

/**
 * @param {Element} host
 * @returns {HostState}
 */
function stateFor(host) {
  let state = states.get(host);
  if (!state) states.set(host, (state = { id: newIds(), last: null, root: null, mirror: null, dropped: [] }));
  return state;
}

/** @param {Element} host */
const live = (host) => states.get(host)?.root?.parentNode === host;

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

/** @param {string | true} value */
const attrValue = (value) => (value === true ? "" : value);

/** @param {TemplateNode} node */
const holdsRaw = (node) => node.children.some((child) => typeof child === "object" && "raw" in child);

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
    } else if (node.nodeType === TEXT && /** @type {Text} */ (node).data.trim() !== "") {
      info.push({ tag: null, attrs: {}, text: /** @type {Text} */ (node).data, slot: DEFAULT_REGION });
    }
  }
  return info;
}

/**
 * @param {Element} host
 * @param {TemplateNode} node
 * @returns {Element | null}
 */
function locate(host, node) {
  const block = firstClass(node);
  for (const el of Array.from(host.children)) {
    if (block ? el.classList.contains(block) : el.localName === node.tag) return el;
  }
  return null;
}

/**
 * @param {Mirror} mirror
 * @param {Owned} owned
 * @returns {Owned}
 */
function ownedBy(mirror, owned = new Map()) {
  owned.set(mirror.el, mirror.raw);
  for (const kid of mirror.kids) {
    if (!kid) continue;
    if ("el" in kid) ownedBy(kid, owned);
    else owned.set(kid, true);
  }
  return owned;
}

/** @param {TemplateNode} node */
const hasRegion = (node) => node.children.some((child) => typeof child === "object" && ("region" in child || ("tag" in child && hasRegion(child))));

/**
 * @param {TemplateNode} node
 * @param {Map<string, TemplateNode>} byClass
 * @returns {Map<string, TemplateNode>}
 */
function classes(node, byClass = new Map()) {
  if (firstClass(node)) byClass.set(firstClass(node), node);
  for (const child of node.children) if (typeof child === "object" && "tag" in child) classes(child, byClass);
  return byClass;
}

/**
 * @param {Element} root
 * @param {TemplateNode} node
 * @returns {Owned}
 */
function ownedLoosely(root, node) {
  const byClass = classes(node);
  const block = firstClass(node);
  /** @type {Owned} */
  const owned = new Map();
  /** @type {(el: Element, known: TemplateNode | null) => void} */
  const claim = (el, known) => {
    owned.set(el, known !== null && !hasRegion(known));
    if (owned.get(el)) return;
    for (const child of Array.from(el.children)) {
      const names = Array.from(child.classList);
      const name = names.find((candidate) => byClass.has(candidate));
      if (name || (block && names.some((candidate) => candidate === block || candidate.startsWith(`${block}__`)))) {
        claim(child, name ? byClass.get(name) : null);
      }
    }
  };
  claim(root, node);
  return owned;
}

/**
 * @param {Node} parent
 * @param {Owned} owned
 * @param {Node[]} out
 * @returns {Node[]}
 */
function collect(parent, owned, out = []) {
  for (const node of Array.from(parent.childNodes)) {
    if (!owned.has(node)) out.push(node);
    else if (!owned.get(node)) collect(node, owned, out);
  }
  return out;
}

/**
 * @param {Element} host
 * @param {HostState} state
 * @returns {Node[]}
 */
function authorNodes(host, state) {
  // Adopted markup that did not match the template (an older build, say) is claimed by its classes instead.
  const owned = state.mirror ? ownedBy(state.mirror) : ownedLoosely(state.root, state.last);
  const nodes = collect(host, owned);
  for (const node of state.dropped) if (!node.parentNode) nodes.push(node);
  return nodes;
}

/**
 * @param {TemplateChild} child
 * @param {Node | undefined} node
 * @returns {Mirror | Text | null}
 */
function matchChild(child, node) {
  if (typeof child === "string") return node?.nodeType === TEXT && /** @type {Text} */ (node).data === child ? /** @type {Text} */ (node) : null;
  return "tag" in child && node?.nodeType === ELEMENT ? align(child, /** @type {Element} */ (node)) : null;
}

/**
 * @param {TemplateNode} node
 * @param {Element} el
 * @returns {Mirror | null}
 */
function align(node, el) {
  const block = firstClass(node);
  if (el.localName !== node.tag || (block && !el.classList.contains(block))) return null;
  /** @type {Mirror} */
  const mirror = { el, raw: holdsRaw(node), kids: node.children.map(() => null) };
  if (mirror.raw) return mirror;
  const nodes = Array.from(el.childNodes);
  const count = node.children.length;
  /** @type {(from: number, to: number, at: number) => boolean} */
  const fits = (from, to, at) => {
    if (at < 0 || at + to - from > nodes.length) return false;
    const hits = [];
    for (let index = from; index < to; index++) {
      const hit = matchChild(node.children[index], nodes[at + index - from]);
      if (!hit) return false;
      hits.push(hit);
    }
    hits.forEach((hit, offset) => (mirror.kids[from + offset] = hit));
    return true;
  };
  const marks = [];
  node.children.forEach((child, index) => typeof child === "object" && "region" in child && marks.push(index));
  if (!marks.length) return nodes.length === count && fits(0, count, 0) ? mirror : null;
  const first = marks[0];
  const last = marks[marks.length - 1];
  let at = first;
  const end = nodes.length - (count - last - 1);
  if (end < at || !fits(0, first, 0) || !fits(last + 1, count, end)) return null;
  for (let mark = 0; mark + 1 < marks.length; mark++) {
    const from = marks[mark] + 1;
    const to = marks[mark + 1];
    if (from === to) continue;
    while (at + to - from <= end && !fits(from, to, at)) at++;
    if (at + to - from > end) return null;
    at += to - from;
  }
  return mirror;
}

/**
 * @param {Element} host
 * @param {Template} template
 * @returns {{ node: TemplateNode, root: Element, mirror: Mirror | null } | null}
 */
function inspect(host, template) {
  const attrs = attrsOf(host);
  const { id } = stateFor(host);
  const probe = template(attrs, { id, children: describe(Array.from(host.childNodes)) });
  const root = locate(host, probe);
  if (!root) return null;
  const guess = align(probe, root);
  const authored = collect(host, guess ? ownedBy(guess) : ownedLoosely(root, probe));
  const node = template(attrs, { id, children: describe(authored) });
  return { node, root, mirror: align(node, root) };
}

/**
 * @param {TemplateNode} node
 * @param {Record<string, Node[]>} regions
 * @param {boolean} [svg]
 * @returns {Mirror}
 */
function build(node, regions, svg = node.tag === "svg") {
  const el = svg ? document.createElementNS(SVG, node.tag) : document.createElement(node.tag);
  /** @type {Mirror} */
  const mirror = { el, raw: false, kids: [] };
  for (const [name, value] of Object.entries(node.props)) el.setAttribute(name, attrValue(value));
  for (const child of node.children) {
    if (typeof child === "string") {
      const text = document.createTextNode(child);
      el.append(text);
      mirror.kids.push(text);
    } else if ("region" in child) {
      el.append(...(regions[child.region] ?? []));
      mirror.kids.push(null);
    } else if ("raw" in child) {
      el.innerHTML = child.raw;
      mirror.raw = true;
      mirror.kids.push(null);
    } else {
      const kid = build(child, regions, svg || child.tag === "svg");
      el.append(kid.el);
      mirror.kids.push(kid);
    }
  }
  return mirror;
}

/**
 * @param {Element} host
 * @param {HostState} state
 * @param {TemplateNode} node
 * @param {Node[]} authored
 */
function place(host, state, node, authored) {
  const regions = distribute(node, authored, slotOf);
  const placed = new Set(Object.values(regions).flat());
  const mirror = build(node, regions);
  host.replaceChildren(mirror.el);
  const dropped = authored.filter((child) => !placed.has(child));
  for (const child of dropped) /** @type {ChildNode} */ (child).remove();
  Object.assign(state, { last: node, root: mirror.el, mirror, dropped });
}

/**
 * @param {Element} host
 * @returns {ChildInfo[]}
 */
export function childInfo(host) {
  return describe(live(host) ? authorNodes(host, states.get(host)) : Array.from(host.childNodes));
}

/**
 * @param {Element} host
 * @param {Template} template
 */
export function render(host, template) {
  const state = stateFor(host);
  const nodes = Array.from(host.childNodes);
  place(host, state, template(attrsOf(host), { id: state.id, children: describe(nodes) }), nodes);
}

/**
 * @param {Element} host
 * @param {Template} template
 * @returns {boolean}
 */
export function isRendered(host, template) {
  return live(host) || inspect(host, template) !== null;
}

/**
 * @param {Element} host
 * @param {Template} template
 */
export function adopt(host, template) {
  if (live(host)) return patch(host, template);
  const found = inspect(host, template);
  if (found) Object.assign(stateFor(host), { last: found.node, root: found.root, mirror: found.mirror, dropped: [] });
}

/**
 * @param {TemplateNode} prev
 * @param {TemplateNode} next
 * @param {Mirror} mirror
 * @param {Array<() => void>} writes
 * @returns {boolean}
 */
function update(prev, next, mirror, writes) {
  if (prev.tag !== next.tag || prev.children.length !== next.children.length) return false;
  const el = mirror.el;
  for (const name of new Set([...Object.keys(prev.props), ...Object.keys(next.props)])) {
    const was = Object.hasOwn(prev.props, name) ? attrValue(prev.props[name]) : null;
    const wanted = Object.hasOwn(next.props, name) ? attrValue(next.props[name]) : null;
    if (was === wanted || el.getAttribute(name) === wanted) continue;
    writes.push(() => (wanted === null ? el.removeAttribute(name) : el.setAttribute(name, wanted)));
  }
  for (let index = 0; index < next.children.length; index++) {
    const before = prev.children[index];
    const after = next.children[index];
    const kid = mirror.kids[index];
    if (typeof before === "string" || typeof after === "string") {
      const text = /** @type {Text} */ (kid);
      if (typeof before !== "string" || typeof after !== "string" || text.parentNode !== el) return false;
      if (before !== after && text.data !== after) writes.push(() => (text.data = after));
    } else if ("region" in before || "region" in after) {
      if (!("region" in before && "region" in after && before.region === after.region)) return false;
    } else if ("raw" in before || "raw" in after) {
      if (!("raw" in before && "raw" in after)) return false;
      if (before.raw !== after.raw) writes.push(() => (el.innerHTML = after.raw));
    } else {
      const child = /** @type {Mirror} */ (kid);
      if (child.el.parentNode !== el || !update(before, after, child, writes)) return false;
    }
  }
  return true;
}

/**
 * @param {Element} host
 * @param {Template} template
 */
export function patch(host, template) {
  if (!live(host)) {
    if (isRendered(host, template)) adopt(host, template);
    else render(host, template);
    return;
  }
  const state = states.get(host);
  const authored = authorNodes(host, state);
  const next = template(attrsOf(host), { id: state.id, children: describe(authored) });
  /** @type {Array<() => void>} */
  const writes = [];
  if (state.mirror && update(state.last, next, state.mirror, writes)) {
    for (const write of writes) write();
    state.last = next;
  } else place(host, state, next, authored);
}
