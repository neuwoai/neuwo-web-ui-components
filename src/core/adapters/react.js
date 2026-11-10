import { Children, Fragment, cloneElement, isValidElement, useCallback, useId } from "react";
import { jsx as reactJsx, jsxs as reactJsxs } from "react/jsx-runtime";
import { jsxDEV as reactJsxDEV } from "react/jsx-dev-runtime";
import { DEFAULT_REGION, distribute, normalizeProps } from "../template.js";

/** @typedef {import("react").ReactNode} ReactNode */
/** @typedef {import("react").ElementType} ElementType */
/** @typedef {import("react").ReactElement} ReactElement */
/** @typedef {import("react").ReactElement<Record<string, unknown>>} AnyElement */
/** @typedef {import("../template.js").TemplateNode} TemplateNode */
/** @typedef {import("../template.js").ChildInfo} ChildInfo */
/** @typedef {import("../template.js").Template} Template */

// React DOM's boolean props, copied from its setProp: it reads "" as false for these.
const BOOLEAN = [
  "allowFullScreen", "async", "autoPlay", "controls", "credentialless", "default", "defer", "disabled",
  "disablePictureInPicture", "disableRemotePlayback", "formNoValidate", "hidden", "inert", "itemScope", "loop",
  "noModule", "noValidate", "open", "playsInline", "readOnly", "required", "reversed", "scoped", "seamless",
];
const BOOLEANS = new Set(BOOLEAN);
const NAMES = new Map([["class", "className"], ["for", "htmlFor"], ...BOOLEAN.map((name) => /** @type {[string, string]} */ ([name.toLowerCase(), name]))]);

const REACT = Symbol.for("neuwo.react");

/** @type {WeakMap<Function, string>} */
const hostTags = new WeakMap();

/**
 * @param {ReactNode} item
 * @returns {AnyElement | null}
 */
const asElement = (item) => (isValidElement(item) ? /** @type {AnyElement} */ (item) : null);

/**
 * @param {AnyElement} el
 * @returns {string | null}
 */
const tagOf = (el) => (typeof el.type === "string" ? el.type : (hostTags.get(/** @type {Function} */ (el.type)) ?? null));

/**
 * @param {ReactNode} item
 * @returns {string}
 */
function slotOf(item) {
  const el = asElement(item);
  return (el && normalizeProps({ slot: el.props.slot }).slot) || DEFAULT_REGION;
}

/**
 * @param {ReactNode} children
 * @param {string} [prefix]
 * @param {ReactNode[]} [out]
 * @returns {ReactNode[]}
 */
function flatten(children, prefix = "", out = []) {
  for (const item of Children.toArray(children)) {
    const el = asElement(item);
    if (el?.type === Fragment) flatten(/** @type {ReactNode} */ (el.props.children), `${prefix}${el.key}:`, out);
    else out.push(el && prefix ? cloneElement(el, { key: prefix + el.key }) : item);
  }
  return out;
}

/**
 * @param {ReactNode} node
 * @returns {string}
 */
function textOf(node) {
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") return String(node);
  const el = asElement(node);
  return el && (el.type === Fragment || tagOf(el) !== null) ? textOf(/** @type {ReactNode} */ (el.props.children)) : "";
}

/**
 * @param {ReactNode[]} items
 * @returns {ChildInfo[]}
 */
function describe(items) {
  /** @type {ChildInfo[]} */
  const info = [];
  for (const item of items) {
    const el = asElement(item);
    const tag = el && tagOf(el);
    if (tag) {
      const children = /** @type {ReactNode} */ (el.props.children);
      info.push({ tag, attrs: normalizeProps(el.props), text: textOf(children), slot: slotOf(el), children: describe(flatten(children)) });
    } else if (typeof item === "object") info.push({ tag: null, attrs: {}, text: "", slot: slotOf(item) });
    else if (String(item).trim() !== "") info.push({ tag: null, attrs: {}, text: String(item), slot: DEFAULT_REGION });
  }
  return info;
}

/**
 * @param {TemplateNode} node
 * @returns {string[]}
 */
const classesOf = (node) => (typeof node.props.class === "string" ? node.props.class.split(/\s+/).filter(Boolean) : []);

/**
 * @param {TemplateNode} node
 * @param {string} block
 * @param {number} index
 * @returns {string}
 */
function keyOf(node, block, index) {
  const classes = classesOf(node);
  return classes.find((name) => name.startsWith(`${block}__`)) ?? classes[0] ?? String(index);
}

/**
 * @param {TemplateNode} node
 * @param {Record<string, ReactNode[]>} regions
 * @param {string} block
 * @param {string} key
 * @returns {ReactElement}
 */
function toReact(node, regions, block, key) {
  /** @type {Record<string, unknown>} */
  const props = {};
  for (const [name, value] of Object.entries(node.props)) {
    const prop = NAMES.get(name) ?? name;
    props[prop] = BOOLEANS.has(prop) ? true : value === true ? "" : value;
  }
  const type = /** @type {ElementType} */ (node.tag);
  /** @type {ReactNode[]} */
  const children = [];
  /** @type {Map<string, number>} */
  const seen = new Map();
  for (const [index, child] of node.children.entries()) {
    if (typeof child === "string") children.push(child);
    else if ("region" in child) children.push(...(regions[child.region] ?? []));
    else if ("raw" in child) props.dangerouslySetInnerHTML = { __html: child.raw };
    else {
      const base = keyOf(child, block, index);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      children.push(toReact(child, regions, block, count ? `${base}:${count}` : base));
    }
  }
  if (children.length > 1) return reactJsxs(type, { ...props, children }, key);
  if (children.length === 1) props.children = children[0];
  return reactJsx(type, props, key);
}

/**
 * @param {unknown} ref
 * @param {Element | null} el
 * @returns {unknown}
 */
function pass(ref, el) {
  if (typeof ref === "function") return ref(el);
  if (ref && typeof ref === "object") /** @type {{ current: unknown }} */ (ref).current = el;
}

/**
 * @param {unknown} authorRef
 */
function useMark(authorRef) {
  return useCallback(
    /** @param {Element | null} el */
    (el) => {
      if (el) Reflect.set(el, REACT, true);
      return pass(authorRef, el);
    },
    [authorRef],
  );
}

/**
 * @param {string} tag
 * @param {Template} template
 * @param {boolean} markHost
 */
function hostFor(tag, template, markHost) {
  /** @param {Record<string, unknown>} props */
  function NeuwoHost(props) {
    const scope = `neuwo${useId().replace(/[^\w-]/g, "")}-`;
    const mark = markHost && { ref: useMark(props.ref) };
    const items = flatten(/** @type {ReactNode} */ (props.children));
    const node = template(normalizeProps(props), { id: (suffix) => scope + suffix, children: describe(items) });
    const [block = ""] = classesOf(node);
    const root = toReact(node, distribute(node, items, slotOf), block, keyOf(node, block, 0));
    return reactJsx(/** @type {ElementType} */ (tag), { ...props, ...mark, children: root });
  }
  hostTags.set(NeuwoHost, tag);
  return NeuwoHost;
}

/**
 * @param {Record<string, Template>} registry
 * @param {{ markHost?: boolean }} [options]
 * @returns {{ jsx: typeof reactJsx, jsxs: typeof reactJsxs, jsxDEV: typeof reactJsxDEV }}
 */
export function createRuntime(registry, { markHost = true } = {}) {
  /** @type {Map<string, ReturnType<typeof hostFor>>} */
  const hosts = new Map();
  /** @param {ElementType} type */
  const resolve = (type) => {
    if (typeof type !== "string" || !Object.hasOwn(registry, type)) return type;
    let host = hosts.get(type);
    if (!host) hosts.set(type, (host = hostFor(type, registry[type], markHost)));
    return host;
  };
  return {
    jsx: (type, props, key) => reactJsx(resolve(type), props, key),
    jsxs: (type, props, key) => reactJsxs(resolve(type), props, key),
    jsxDEV: (type, props, key, isStatic, source, self) => reactJsxDEV(resolve(type), props, key, isStatic, source, self),
  };
}
