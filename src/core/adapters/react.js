import { Children, Fragment, cloneElement, isValidElement, useId } from "react";
import { jsx as reactJsx, jsxs as reactJsxs } from "react/jsx-runtime";
import { jsxDEV as reactJsxDEV } from "react/jsx-dev-runtime";
import { DEFAULT_REGION, distribute, normalizeProps } from "../template.js";

/** @typedef {import("react").ReactNode} ReactNode */
/** @typedef {import("react").ElementType} ElementType */
/** @typedef {import("react").ReactElement<Record<string, any>>} AnyElement */
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
    if (el?.type === Fragment) flatten(el.props.children, `${prefix}${el.key}:`, out);
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
  return el && (el.type === Fragment || tagOf(el) !== null) ? textOf(el.props.children) : "";
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
    if (tag) info.push({ tag, attrs: normalizeProps(el.props), text: textOf(el.props.children), slot: slotOf(el) });
    else if (typeof item === "object") info.push({ tag: null, attrs: {}, text: "", slot: slotOf(item) });
    else if (String(item).trim() !== "") info.push({ tag: null, attrs: {}, text: String(item), slot: DEFAULT_REGION });
  }
  return info;
}

/**
 * @param {TemplateNode} node
 * @param {Record<string, ReactNode[]>} regions
 * @returns {AnyElement}
 */
function toReact(node, regions) {
  /** @type {Record<string, unknown>} */
  const props = {};
  for (const [name, value] of Object.entries(node.props)) {
    const key = NAMES.get(name) ?? name;
    props[key] = BOOLEANS.has(key) ? true : value === true ? "" : value;
  }
  const type = /** @type {ElementType} */ (node.tag);
  /** @type {ReactNode[]} */
  const children = [];
  for (const child of node.children) {
    if (typeof child === "string") children.push(child);
    else if ("region" in child) children.push(...(regions[child.region] ?? []));
    else if ("raw" in child) props.dangerouslySetInnerHTML = { __html: child.raw };
    else children.push(toReact(child, regions));
  }
  if (children.length > 1) return reactJsxs(type, { ...props, children });
  if (children.length === 1) props.children = children[0];
  return reactJsx(type, props);
}

/**
 * @param {string} tag
 * @param {Template} template
 */
function hostFor(tag, template) {
  /** @param {Record<string, any>} props */
  function NeuwoHost(props) {
    const scope = `neuwo${useId().replace(/[^\w-]/g, "")}-`;
    const items = flatten(props.children);
    const node = template(normalizeProps(props), { id: (suffix) => scope + suffix, children: describe(items) });
    return reactJsx(/** @type {ElementType} */ (tag), { ...props, children: toReact(node, distribute(node, items, slotOf)) });
  }
  hostTags.set(NeuwoHost, tag);
  return NeuwoHost;
}

/**
 * @param {Record<string, Template>} registry
 * @returns {{ jsx: typeof reactJsx, jsxs: typeof reactJsxs, jsxDEV: typeof reactJsxDEV }}
 */
export function createRuntime(registry) {
  /** @type {Map<string, ReturnType<typeof hostFor>>} */
  const hosts = new Map();
  /** @param {ElementType} type */
  const resolve = (type) => {
    if (typeof type !== "string" || !Object.hasOwn(registry, type)) return type;
    let host = hosts.get(type);
    if (!host) hosts.set(type, (host = hostFor(type, registry[type])));
    return host;
  };
  return {
    jsx: (type, props, key) => reactJsx(resolve(type), props, key),
    jsxs: (type, props, key) => reactJsxs(resolve(type), props, key),
    jsxDEV: (type, props, key, isStatic, source, self) => reactJsxDEV(resolve(type), props, key, isStatic, source, self),
  };
}
