import { DEFAULT_REGION, blocksOf, distribute, keyClassOf } from "../template.js";
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
 *   renamed: Map<string, string>,
 *   wrappers: Map<string, string>,
 *   root: Element | null,
 *   dropped: Node[],
 *   loading: boolean,
 *   reslotted: Set<Node>,
 *   formatting: Set<Node>,
 * }} HostState
 */
/** @typedef {{ attrs: Record<string, string>, raw: string | null }} Seen */
/** @typedef {Node | string | TemplateNode} Wanted */
/**
 * @typedef {{
 *   state: HostState,
 *   blocks: Set<string>,
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
const REFERENCES = ["id", "for", "aria-describedby", "aria-controls", "aria-labelledby", "aria-activedescendant"];
// The HTML and DOM adapters mint ids as neuwo-s1- and neuwo-c1-; React's useId ones are React's to keep unique.
const MINTED = /^neuwo-[cs]\d+-/;

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
    state = { id, issued, ids: new Map(), renamed: new Map(), wrappers: new Map(), root: null, dropped: [], loading: false, reslotted: new Set(), formatting: new Set() };
    states.set(host, state);
  }
  return state;
}

/** @param {Element} host */
const live = (host) => states.get(host)?.root?.parentNode === host;

/**
 * @param {Element} host
 * @param {HostState} state
 */
const besideRoot = (host, state) => new Set(Array.from(host.childNodes).filter((node) => node !== state.root && !isContent(node)));

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

/**
 * The attributes of the nearest element enclosing the host whose tag the template names as its `within`.
 * @param {Element} host
 * @param {Template} template
 * @returns {Record<string, string> | null}
 */
export function withinOf(host, template) {
  const outer = template.within ? host.parentElement?.closest(template.within) : null;
  return outer ? attrsOf(outer) : null;
}

/**
 * @param {Element} host
 * @param {Template} template
 * @param {(suffix: string) => string} id
 * @param {ChildInfo[]} children
 * @returns {TemplateNode}
 */
const applyTemplate = (host, template, id, children) => template(attrsOf(host), { id, children, within: withinOf(host, template) });

/** @param {Node} node */
const slotOf = (node) => (node.nodeType === ELEMENT && /** @type {Element} */ (node).getAttribute("slot")) || DEFAULT_REGION;

/** @param {Node} node */
const isContent = (node) => node.nodeType === ELEMENT || (node.nodeType === TEXT && /** @type {Text} */ (node).data.trim() !== "");

/** @param {TemplateNode} node */
const classesOf = (node) => (typeof node.props.class === "string" ? node.props.class.trim().split(/\s+/) : []);

/**
 * @param {TemplateNode} node
 * @param {Set<string>} blocks
 */
const keyOf = (node, blocks) => keyClassOf(node, blocks) ?? "";

/**
 * @param {Element} el
 * @param {TemplateNode} node
 * @param {Set<string>} blocks
 */
const matches = (el, node, blocks) => el.localName === node.tag && (!keyOf(node, blocks) || el.classList.contains(keyOf(node, blocks)));

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
  const blocks = blocksOf(node);
  /** @type {Map<string, string>} */
  const wrappers = new Map();
  /** @param {TemplateNode} part */
  const visit = (part) => {
    const name = only(part, "region");
    if (name !== null) wrappers.set(keyOf(part, blocks), name);
    for (const child of part.children) if (isElement(child)) visit(/** @type {TemplateNode} */ (child));
  };
  visit(node);
  return wrappers;
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
      const children = describe(Array.from(el.childNodes), slotOf);
      info.push({ tag: el.localName, attrs: attrsOf(el), text: el.textContent, slot: regionOf(el), children });
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
  const regionIn = (wrappers) => (/** @type {Node} */ node) => (state.reslotted.has(node) ? slotOf(node) : (wrappers.get(keys.get(node)) ?? slotOf(node)));
  return { nodes, loose, regionIn };
}

/**
 * @param {Set<string>} blocks
 * @param {Element} el
 * @param {TemplateNode} node
 * @returns {Array<Element | null>}
 */
function pairs(blocks, el, node) {
  const candidates = Array.from(el.children);
  let from = 0;
  return node.children.map((child) => {
    if (!isElement(child)) return null;
    const at = candidates.findIndex((candidate, index) => index >= from && matches(candidate, /** @type {TemplateNode} */ (child), blocks));
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
 * @param {Set<string>} blocks
 * @param {Element} el
 * @param {TemplateNode} node
 */
function mapIds(state, blocks, el, node) {
  const { id } = node.props;
  if (typeof id === "string" && state.issued.has(id) && el.hasAttribute("id")) state.ids.set(id, el.getAttribute("id"));
  if (only(node, "region") !== null || only(node, "raw") !== null) return;
  pairs(blocks, el, node).forEach((match, index) => match && mapIds(state, blocks, match, /** @type {TemplateNode} */ (node.children[index])));
}

/**
 * @param {HostState} state
 * @param {Element} el
 * @param {Map<string, string>} fresh
 */
function rename(state, el, fresh) {
  const record = /** @type {Seen} */ (seen.get(el));
  for (const name of REFERENCES) {
    const value = el.getAttribute(name);
    if (value === null) continue;
    const next = value.replace(/\S+/g, (token) => fresh.get(token) ?? token);
    if (next === value) continue;
    el.setAttribute(name, next);
    record.attrs[name] = next;
  }
  if (wrapperKey(state, el) === undefined) for (const child of Array.from(el.children)) rename(state, child, fresh);
}

/**
 * Gives each id of the host's markup that the library minted and another element in the host's root also has, as on
 * a copy made with `cloneNode`, a fresh id, and points every reference to it there too. It runs at every adoption
 * and restart in the document, since a copy adopted outside it cannot see the ids it shares.
 * @param {Element} host
 * @param {HostState} state
 */
function separateIds(host, state) {
  if (!host.isConnected || !state.root) return;
  const scope = /** @type {ParentNode} */ (host.getRootNode());
  /** @type {Map<string, string>} */
  const fresh = new Map();
  /** @type {((suffix: string) => string) | null} */
  let mint = null;
  for (const issued of state.issued) {
    const existing = state.ids.get(issued) ?? issued;
    // getElementById finds only the first, which is the host's own when a copy goes before its original.
    if (!MINTED.test(existing) || scope.querySelectorAll(`#${existing}`).length < 2) continue;
    mint ??= newIds();
    const next = mint(existing.replace(MINTED, ""));
    fresh.set(existing, next);
    state.ids.set(issued, next);
    state.renamed.set(issued, next);
  }
  if (fresh.size) rename(state, state.root, fresh);
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
  let current = Array.from(el.childNodes);
  if (name !== null) wanted.push(...(run.groups[name] ?? []));
  else {
    // Indentation and comments in served markup are not a change where the template has no text.
    if (!node.children.some((child) => typeof child === "string")) current = current.filter(isContent);
    const matched = pairs(run.blocks, el, node);
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
  const blocks = blocksOf(next);
  /** @type {Run} */
  const run = { state, blocks, groups: distribute(next, placeable, regionOf), writes: [], arranges: [], records: [], replace: !matches(state.root, next, blocks) };
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
  state.wrappers = wrappersOf(next);
  state.reslotted.clear();
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
  const probe = applyTemplate(host, template, (suffix) => suffix, []);
  const root = locate(host, probe);
  if (!root) return null;
  return { id: (suffix) => suffix, issued: new Set(), ids: new Map(), renamed: new Map(), wrappers: wrappersOf(probe), root, dropped: [], loading: false, reslotted: new Set(), formatting: new Set() };
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
  state.ids = new Map(state.renamed);
  const nodes = Array.from(host.childNodes);
  const next = applyTemplate(host, template, state.id, describe(nodes, slotOf));
  /** @type {Run} */
  const run = { state, blocks: blocksOf(next), groups: distribute(next, nodes, slotOf), writes: [], arranges: [], records: [], replace: true };
  state.root = build(next, run);
  host.replaceChildren(state.root);
  settle(state, next, nodes, run.groups);
  state.formatting = new Set();
}

/**
 * @param {Element} host
 * @param {Template} template
 * @returns {boolean}
 */
export function isRendered(host, template) {
  if (live(host)) return true;
  const state = stateFor(host);
  return locate(host, applyTemplate(host, template, state.id, [])) !== null;
}

/**
 * Whether the host holds content its rendered markup does not account for: a direct child other than the rendered
 * root, whitespace-only text and comments aside, or no rendered root at all.
 * @param {Element} host
 * @returns {boolean}
 */
export function hasLooseContent(host) {
  if (!live(host)) return true;
  const { root } = /** @type {HostState} */ (states.get(host));
  return Array.from(host.childNodes).some((node) => node !== root && isContent(node));
}

/**
 * @param {Element} host
 * @param {Template} template
 */
export function adopt(host, template) {
  const state = stateFor(host);
  if (live(host)) {
    separateIds(host, state);
    return reconcile(host, template);
  }
  const probe = applyTemplate(host, template, state.id, []);
  const root = locate(host, probe);
  if (!root) return;
  Object.assign(state, { root, dropped: [], ids: new Map(state.renamed), wrappers: wrappersOf(probe), loading: host.ownerDocument.readyState === "loading" });
  state.formatting = besideRoot(host, state);
  snapshot(state, root);
  const { nodes, regionIn } = authorNodes(host, state);
  const full = applyTemplate(host, template, state.id, describe(nodes, regionIn(state.wrappers)));
  mapIds(state, blocksOf(full), root, full);
  separateIds(host, state);
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
  const next = applyTemplate(host, template, state.id, describe(nodes, regionIn(state.wrappers)));
  if (state.loading) {
    // An adoption while the document loads maps only the ids parsed so far.
    mapIds(state, blocksOf(next), state.root, next);
    state.loading = host.ownerDocument.readyState === "loading";
  }
  const regionOf = regionIn(wrappersOf(next));
  const placed = nodes.filter((node) => !loose.has(node) || isContent(node));
  const run = prepare(state, next, placed, regionOf);
  if (run.replace || run.arranges.length) {
    // Whitespace and comments left beside the root by the adoption or the last reconcile are formatting, never placed.
    const arranged = nodes.filter((node) => !state.formatting.has(node));
    commit(state, next, arranged, prepare(state, next, arranged, regionOf));
  } else commit(state, next, placed, run);
  state.formatting = besideRoot(host, state);
}

/**
 * Gives the host's markup fresh ids for the ids the library minted that another element in its root also has, as
 * on a restart that puts back an element a copy of which took its place.
 * @param {Element} host
 */
export function separate(host) {
  if (live(host)) separateIds(host, /** @type {HostState} */ (states.get(host)));
}

/**
 * Has the next reconcile place an author node in one of the host's region wrappers by its `slot`, as after a script
 * changed it, instead of keeping it in the wrapper it sits in.
 * @param {Element} host
 * @param {Node} node
 */
export function reslot(host, node) {
  states.get(host)?.reslotted.add(node);
}

/**
 * The host's rendered root and the region wrappers in it, which hold the author nodes, or null with no rendered root.
 * @param {Element} host
 * @returns {{ root: Element, wrappers: Element[] } | null}
 */
export function regions(host) {
  if (!live(host)) return null;
  const state = /** @type {HostState} */ (states.get(host));
  const root = /** @type {Element} */ (state.root);
  /** @type {Element[]} */
  const wrappers = [];
  /** @param {Element} el */
  const visit = (el) => {
    if (wrapperKey(state, el) !== undefined) wrappers.push(el);
    else for (const child of Array.from(el.children)) visit(child);
  };
  visit(root);
  return { root, wrappers };
}
