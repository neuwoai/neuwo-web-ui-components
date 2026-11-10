import { DEFAULT_REGION, distribute } from "../template.js";
import { idScope } from "../ids.js";

/** @typedef {import("../template.js").TemplateNode} TemplateNode */
/** @typedef {import("../template.js").TemplateChild} TemplateChild */
/** @typedef {import("../template.js").ChildInfo} ChildInfo */
/** @typedef {import("../template.js").Template} Template */
/**
 * @typedef {{
 *   id: (suffix: string) => string,
 *   issued: Set<string>,
 *   ids: Map<string, string>,
 *   block: string,
 *   wrappers: Map<string, string>,
 *   root: Element | null,
 *   dropped: Node[],
 * }} HostState
 */
/** @typedef {{ attrs: Record<string, string>, raw: string | null }} Seen */
/** @typedef {Node | string | TemplateNode} Wanted */
/**
 * @typedef {{
 *   state: HostState,
 *   groups: Record<string, Node[]>,
 *   writes: Array<() => void>,
 *   arranges: Array<[Element, Wanted[]]>,
 *   records: Array<() => void>,
 *   replace: boolean,
 * }} Run
 */

const SVG = "http://www.w3.org/2000/svg";
const ELEMENT = 1;
const TEXT = 3;

const newIds = idScope("neuwo-c");
/** @type {WeakMap<Element, HostState>} */
const states = new WeakMap();
/** @type {WeakMap<Element, Seen>} */
const seen = new WeakMap();

/**
 * @param {Element} host
 * @returns {HostState}
 */
function stateFor(host) {
  let state = states.get(host);
  if (!state) {
    const scope = newIds();
    /** @type {Set<string>} */
    const issued = new Set();
    /** @param {string} suffix */
    const id = (suffix) => {
      const value = scope(suffix);
      issued.add(value);
      return value;
    };
    state = { id, issued, ids: new Map(), block: "", wrappers: new Map(), root: null, dropped: [] };
    states.set(host, state);
  }
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

/** @param {Node} node */
const isContent = (node) => node.nodeType === ELEMENT || (node.nodeType === TEXT && /** @type {Text} */ (node).data.trim() !== "");

/** @param {TemplateNode} node */
const classesOf = (node) => (typeof node.props.class === "string" ? node.props.class.trim().split(/\s+/) : []);

/**
 * @param {TemplateNode} node
 * @param {string} block
 */
const keyOf = (node, block) => classesOf(node).find((name) => name === block || name.startsWith(`${block}__`)) ?? "";

/**
 * @param {Element} el
 * @param {TemplateNode} node
 * @param {string} block
 */
const matches = (el, node, block) => el.localName === node.tag && (!keyOf(node, block) || el.classList.contains(keyOf(node, block)));

/**
 * @param {TemplateNode} node
 * @param {"region" | "raw"} kind
 * @returns {string | null}
 */
function only(node, kind) {
  const [child] = node.children;
  return node.children.length === 1 && typeof child === "object" && kind in child ? child[kind] : null;
}

/** @param {TemplateChild} child */
const isElement = (child) => typeof child === "object" && "tag" in child;

/**
 * @param {TemplateNode} node
 * @returns {Map<string, string>}
 */
function wrappersOf(node) {
  const block = classesOf(node)[0] ?? "";
  /** @type {Map<string, string>} */
  const wrappers = new Map();
  /** @param {TemplateNode} part */
  const visit = (part) => {
    const name = only(part, "region");
    if (name !== null) wrappers.set(keyOf(part, block), name);
    for (const child of part.children) if (isElement(child)) visit(/** @type {TemplateNode} */ (child));
  };
  visit(node);
  return wrappers;
}

/**
 * @param {HostState} state
 * @param {TemplateNode} node
 */
function learn(state, node) {
  state.block = classesOf(node)[0] ?? "";
  state.wrappers = wrappersOf(node);
}

/**
 * @param {HostState} state
 * @param {Element} el
 * @returns {string | undefined}
 */
const wrapperKey = (state, el) => Array.from(el.classList).find((name) => state.wrappers.has(name));

/**
 * @param {HostState} state
 * @param {TemplateNode} node
 * @returns {Record<string, string>}
 */
function propsOf(state, node) {
  /** @type {Record<string, string>} */
  const props = {};
  for (const [name, value] of Object.entries(node.props)) {
    props[name] = value === true ? "" : value.replace(/\S+/g, (token) => state.ids.get(token) ?? token);
  }
  return props;
}

/**
 * @param {Node[]} nodes
 * @param {(node: Node) => string} regionOf
 * @returns {ChildInfo[]}
 */
function describe(nodes, regionOf) {
  /** @type {ChildInfo[]} */
  const info = [];
  for (const node of nodes) {
    if (!isContent(node)) continue;
    if (node.nodeType === ELEMENT) {
      const el = /** @type {Element} */ (node);
      info.push({ tag: el.localName, attrs: attrsOf(el), text: el.textContent, slot: regionOf(el) });
    } else info.push({ tag: null, attrs: {}, text: /** @type {Text} */ (node).data, slot: regionOf(node) });
  }
  return info;
}

/**
 * @param {Element} host
 * @param {TemplateNode} node
 * @returns {Element | null}
 */
function locate(host, node) {
  const [block] = classesOf(node);
  for (const el of Array.from(host.children)) {
    if (block ? el.classList.contains(block) : el.localName === node.tag) return el;
  }
  return null;
}

/**
 * @param {HostState} state
 * @param {Element} el
 * @param {Node[]} out
 * @param {Map<Node, string>} keys
 */
function collect(state, el, out, keys) {
  const key = wrapperKey(state, el);
  if (key === undefined) {
    for (const child of Array.from(el.children)) collect(state, child, out, keys);
    return;
  }
  for (const node of Array.from(el.childNodes)) {
    out.push(node);
    keys.set(node, key);
  }
}

/**
 * @param {Element} host
 * @param {HostState} state
 * @returns {{ nodes: Node[], loose: Set<Node>, regionIn: (wrappers: Map<string, string>) => (node: Node) => string }}
 */
function authorNodes(host, state) {
  /** @type {Node[]} */
  const nodes = [];
  /** @type {Set<Node>} */
  const loose = new Set();
  /** @type {Map<Node, string>} */
  const keys = new Map();
  for (const node of Array.from(host.childNodes)) {
    if (node === state.root) collect(state, state.root, nodes, keys);
    else {
      nodes.push(node);
      loose.add(node);
    }
  }
  for (const node of state.dropped) if (!node.parentNode) nodes.push(node);
  /** @param {Map<string, string>} wrappers */
  const regionIn = (wrappers) => (/** @type {Node} */ node) => wrappers.get(keys.get(node)) ?? slotOf(node);
  return { nodes, loose, regionIn };
}

/**
 * @param {HostState} state
 * @param {Element} el
 * @param {TemplateNode} node
 * @returns {Array<Element | null>}
 */
function pairs(state, el, node) {
  const candidates = Array.from(el.children);
  let from = 0;
  return node.children.map((child) => {
    if (!isElement(child)) return null;
    const at = candidates.findIndex((candidate, index) => index >= from && matches(candidate, /** @type {TemplateNode} */ (child), state.block));
    if (at < 0) return null;
    from = at + 1;
    return candidates[at];
  });
}

/**
 * @param {HostState} state
 * @param {Element} el
 */
function snapshot(state, el) {
  seen.set(el, { attrs: attrsOf(el), raw: null });
  if (wrapperKey(state, el) === undefined) for (const child of Array.from(el.children)) snapshot(state, child);
}

/**
 * @param {HostState} state
 * @param {Element} el
 * @param {TemplateNode} node
 */
function mapIds(state, el, node) {
  const { id } = node.props;
  if (typeof id === "string" && state.issued.has(id) && el.hasAttribute("id")) state.ids.set(id, el.getAttribute("id"));
  if (only(node, "region") !== null || only(node, "raw") !== null) return;
  pairs(state, el, node).forEach((match, index) => match && mapIds(state, match, /** @type {TemplateNode} */ (node.children[index])));
}

/**
 * @param {TemplateNode} node
 * @param {Run} run
 * @param {boolean} [svg]
 * @returns {Element}
 */
function build(node, run, svg = node.tag === "svg") {
  const el = svg ? document.createElementNS(SVG, node.tag) : document.createElement(node.tag);
  const props = propsOf(run.state, node);
  for (const [name, value] of Object.entries(props)) el.setAttribute(name, value);
  /** @type {Seen} */
  const record = { attrs: props, raw: null };
  seen.set(el, record);
  for (const child of node.children) {
    if (typeof child === "string") el.append(child);
    else if ("region" in child) el.append(...(run.groups[child.region] ?? []));
    else if ("raw" in child) el.innerHTML = record.raw = child.raw;
    else el.append(build(child, run, svg || child.tag === "svg"));
  }
  return el;
}

/**
 * @param {Element} el
 * @param {Node[]} wanted
 */
function arrange(el, wanted) {
  const keep = new Set(wanted);
  for (const node of Array.from(el.childNodes)) if (!keep.has(node)) el.removeChild(node);
  let cursor = el.firstChild;
  for (const node of wanted) {
    if (node === cursor) cursor = cursor.nextSibling;
    else el.insertBefore(node, cursor);
  }
}

/**
 * @param {Element} el
 * @param {TemplateNode} node
 * @param {Run} run
 */
function plan(el, node, run) {
  const record = seen.get(el) ?? { attrs: attrsOf(el), raw: null };
  const props = propsOf(run.state, node);
  for (const name of new Set([...Object.keys(record.attrs), ...Object.keys(props)])) {
    const was = Object.hasOwn(record.attrs, name) ? record.attrs[name] : null;
    const wanted = Object.hasOwn(props, name) ? props[name] : null;
    if (was === wanted || el.getAttribute(name) === wanted) continue;
    run.writes.push(() => (wanted === null ? el.removeAttribute(name) : el.setAttribute(name, wanted)));
  }
  run.records.push(() => seen.set(el, Object.assign(record, { attrs: props })));
  const raw = only(node, "raw");
  if (raw !== null) {
    if (record.raw !== raw) {
      const parsed = /** @type {Element} */ (el.cloneNode(false));
      parsed.innerHTML = raw;
      if (parsed.innerHTML !== el.innerHTML) run.writes.push(() => (el.innerHTML = raw));
      run.records.push(() => (record.raw = raw));
    }
    return;
  }
  const name = only(node, "region");
  /** @type {Wanted[]} */
  const wanted = [];
  if (name !== null) wanted.push(...(run.groups[name] ?? []));
  else {
    const matched = pairs(run.state, el, node);
    const texts = /** @type {Text[]} */ (Array.from(el.childNodes).filter((child) => child.nodeType === TEXT));
    node.children.forEach((child, index) => {
      if (typeof child === "string") {
        const text = texts.shift();
        if (text && text.data !== child) run.writes.push(() => (text.data = child));
        wanted.push(text ?? child);
      } else if (matched[index]) {
        plan(matched[index], /** @type {TemplateNode} */ (child), run);
        wanted.push(matched[index]);
      } else wanted.push(/** @type {TemplateNode} */ (child));
    });
  }
  const current = Array.from(el.childNodes);
  if (wanted.length !== current.length || wanted.some((item, index) => item !== current[index])) run.arranges.push([el, wanted]);
}

/**
 * @param {HostState} state
 * @param {TemplateNode} next
 * @param {Node[]} placeable
 * @param {(node: Node) => string} regionOf
 * @returns {Run}
 */
function prepare(state, next, placeable, regionOf) {
  /** @type {Run} */
  const run = { state, groups: distribute(next, placeable, regionOf), writes: [], arranges: [], records: [], replace: !matches(state.root, next, state.block) };
  if (!run.replace) plan(state.root, next, run);
  return run;
}

/**
 * @param {HostState} state
 * @param {TemplateNode} next
 * @param {Node[]} placeable
 * @param {Record<string, Node[]>} groups
 */
function settle(state, next, placeable, groups) {
  const placed = new Set(Object.values(groups).flat());
  state.dropped = placeable.filter((node) => !placed.has(node));
  for (const node of state.dropped) /** @type {ChildNode} */ (node).remove();
  learn(state, next);
}

/**
 * @param {HostState} state
 * @param {TemplateNode} next
 * @param {Node[]} placeable
 * @param {Run} run
 */
function commit(state, next, placeable, run) {
  if (run.replace) {
    const root = build(next, run);
    state.root.replaceWith(root);
    state.root = root;
  } else {
    for (const write of run.writes) write();
    for (const [el, wanted] of run.arranges) {
      const svg = el.namespaceURI === SVG;
      arrange(el, wanted.map((item) => (typeof item === "string" ? document.createTextNode(item) : "tag" in item ? build(item, run, svg || item.tag === "svg") : item)));
    }
    for (const record of run.records) record();
  }
  settle(state, next, placeable, run.groups);
}

/**
 * @param {Element} host
 * @param {Template} template
 * @returns {HostState | null}
 */
function view(host, template) {
  const probe = template(attrsOf(host), { id: (suffix) => suffix, children: [] });
  const root = locate(host, probe);
  if (!root) return null;
  return { id: (suffix) => suffix, issued: new Set(), ids: new Map(), block: classesOf(probe)[0] ?? "", wrappers: wrappersOf(probe), root, dropped: [] };
}

/**
 * @param {Element} host
 * @param {Template} [template] - lets it read through markup this adapter neither rendered nor adopted, such as React's.
 * @returns {ChildInfo[]}
 */
export function childInfo(host, template) {
  const state = live(host) ? states.get(host) : template ? view(host, template) : null;
  if (!state) return describe(Array.from(host.childNodes), slotOf);
  const { nodes, regionIn } = authorNodes(host, state);
  return describe(nodes, regionIn(state.wrappers));
}

/**
 * @param {Element} host
 * @param {Template} template
 */
export function render(host, template) {
  const state = stateFor(host);
  state.ids = new Map();
  const nodes = Array.from(host.childNodes);
  const next = template(attrsOf(host), { id: state.id, children: describe(nodes, slotOf) });
  /** @type {Run} */
  const run = { state, groups: distribute(next, nodes, slotOf), writes: [], arranges: [], records: [], replace: true };
  state.root = build(next, run);
  host.replaceChildren(state.root);
  settle(state, next, nodes, run.groups);
}

/**
 * @param {Element} host
 * @param {Template} template
 * @returns {boolean}
 */
export function isRendered(host, template) {
  if (live(host)) return true;
  const state = stateFor(host);
  return locate(host, template(attrsOf(host), { id: state.id, children: [] })) !== null;
}

/**
 * @param {Element} host
 * @param {Template} template
 */
export function adopt(host, template) {
  if (live(host)) return reconcile(host, template);
  const state = stateFor(host);
  const attrs = attrsOf(host);
  const probe = template(attrs, { id: state.id, children: [] });
  const root = locate(host, probe);
  if (!root) return;
  learn(state, probe);
  Object.assign(state, { root, dropped: [], ids: new Map() });
  snapshot(state, root);
  const { nodes, regionIn } = authorNodes(host, state);
  mapIds(state, root, template(attrs, { id: state.id, children: describe(nodes, regionIn(state.wrappers)) }));
}

/**
 * @param {Element} host
 * @param {Template} template
 */
export function reconcile(host, template) {
  if (!live(host)) {
    if (!isRendered(host, template)) return render(host, template);
    adopt(host, template);
  }
  const state = states.get(host);
  const { nodes, loose, regionIn } = authorNodes(host, state);
  const next = template(attrsOf(host), { id: state.id, children: describe(nodes, regionIn(state.wrappers)) });
  const regionOf = regionIn(wrappersOf(next));
  const placed = nodes.filter((node) => !loose.has(node) || isContent(node));
  const run = prepare(state, next, placed, regionOf);
  if (run.replace || run.arranges.length) commit(state, next, nodes, prepare(state, next, nodes, regionOf));
  else commit(state, next, placed, run);
}
