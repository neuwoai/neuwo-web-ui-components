import { Children, Fragment, cloneElement, isValidElement, useCallback, useId } from "react";
// Server Components' React has no useRef or useLayoutEffect, so naming them in an import would fail to link there.
import * as React from "react";
import { jsx as reactJsx, jsxs as reactJsxs } from "react/jsx-runtime";
import { jsxDEV as reactJsxDEV } from "react/jsx-dev-runtime";
import { DEFAULT_REGION, blocksOf, distribute, keyClassOf, normalizeProps } from "../template.js";
import { CONTROLLED, REACT } from "../marks.js";

/** @typedef {import("react").ReactNode} ReactNode */
/** @typedef {import("react").ElementType} ElementType */
/** @typedef {import("react").ReactElement} ReactElement */
/** @typedef {import("react").ReactElement<Record<string, unknown>>} AnyElement */
/** @typedef {import("../template.js").TemplateNode} TemplateNode */
/** @typedef {import("../template.js").ChildInfo} ChildInfo */
/** @typedef {import("../template.js").Template} Template */
/** @typedef {{ host: Record<string, unknown>, controlled: boolean }} Form */
/** @typedef {{ attrs: Record<string, string>, controlled: boolean, hasOnChange: boolean }} Within */

// React DOM's boolean props, copied from its setProp: it reads "" as false for these.
const BOOLEAN = [
  "allowFullScreen", "async", "autoPlay", "controls", "credentialless", "default", "defer", "disabled",
  "disablePictureInPicture", "disableRemotePlayback", "formNoValidate", "hidden", "inert", "itemScope", "loop",
  "noModule", "noValidate", "open", "playsInline", "readOnly", "required", "reversed", "scoped", "seamless",
];
const BOOLEANS = new Set(BOOLEAN);
const NAMES = new Map([
  ["class", "className"],
  ["for", "htmlFor"],
  ["maxlength", "maxLength"],
  ["minlength", "minLength"],
  ["tabindex", "tabIndex"],
  ["autocomplete", "autoComplete"],
  ["inputmode", "inputMode"],
  ...BOOLEAN.map((name) => /** @type {[string, string]} */ ([name.toLowerCase(), name])),
]);
const FIELDS = new Set(["input", "select", "textarea"]);
// React DOM's hasReadOnlyValue: an <input> of these types takes `value` as an attribute, never as state.
const FIXED_VALUE = new Set(["button", "checkbox", "hidden", "image", "radio", "reset", "submit"]);

// React's own event props are camel case, so an `on` prop in lower case names one of the element's events.
const OWN_EVENT = /^on[a-z]/;
const CAPTURE = "Capture";

const noop = () => {};

/** @type {WeakMap<Function, string>} */
const hostTags = new WeakMap();
/** @type {WeakMap<Function, string>} */
const hostWithin = new WeakMap();

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
 * @param {ReactNode} item
 * @param {string} tag
 * @param {Within} within
 * @returns {ReactNode}
 */
function lend(item, tag, within) {
  const el = asElement(item);
  return el && typeof el.type === "function" && hostWithin.get(el.type) === tag ? cloneElement(el, { __neuwoWithin: within }) : item;
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
 * @param {Set<string>} blocks
 * @param {number} index
 * @returns {string}
 */
const keyOf = (node, blocks, index) => keyClassOf(node, blocks) ?? classesOf(node)[0] ?? String(index);

/**
 * @param {string} css
 * @returns {Record<string, string>}
 */
function styleOf(css) {
  /** @type {Record<string, string>} */
  const style = {};
  for (const declaration of css.split(";")) {
    const colon = declaration.indexOf(":");
    const name = colon < 0 ? "" : declaration.slice(0, colon).trim();
    if (!name) continue;
    style[name.startsWith("--") ? name : name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = declaration.slice(colon + 1).trim();
  }
  return style;
}

/**
 * @param {TemplateNode} node
 * @returns {string}
 */
const inputTypeOf = (node) => (node.tag === "input" ? String(node.props.type ?? "text").toLowerCase() : node.tag);

/**
 * @param {TemplateNode} node
 * @returns {boolean}
 */
const isCheckable = (node) => node.tag === "input" && ["checkbox", "radio"].includes(inputTypeOf(node));

/**
 * @param {TemplateNode} node
 * @returns {TemplateNode | undefined}
 */
function controlOf(node) {
  if (node.control) return node;
  for (const child of node.children) {
    const found = typeof child === "object" && "tag" in child ? controlOf(child) : undefined;
    if (found) return found;
  }
  return undefined;
}

/**
 * Whether React holds the state, decided as React decides for its own inputs: a checkbox or radio by `checked`,
 * any other control by `value`.
 * @param {Record<string, unknown>} props
 * @param {TemplateNode | undefined} control
 * @returns {boolean}
 */
function isControlled(props, control) {
  if (!control) return props.value != null || props.checked != null;
  return isCheckable(control) ? props.checked != null : props.value != null;
}

/**
 * Gives a form element its state the way React expects: the consumer's own on the control of a controlled host,
 * as the template resolved it, and the template's as a default everywhere else, so the browser keeps what the user
 * types.
 * @param {TemplateNode} node
 * @param {Record<string, unknown>} props
 * @param {ReactNode[]} children
 * @param {Form} form
 */
function bindForm(node, props, children, form) {
  const live = node.control === true && form.controlled;
  if (isCheckable(node)) {
    delete props.checked;
    if (live) props.checked = Boolean(form.host.checked);
    else if (Object.hasOwn(node.props, "checked")) props.defaultChecked = true;
  } else if (!FIXED_VALUE.has(inputTypeOf(node))) {
    const value = node.tag === "textarea" && children.length ? children.splice(0).join("") : props.value;
    delete props.value;
    if (live) props.value = value === undefined || String(value) === String(form.host.value) ? form.host.value : value;
    else if (value !== undefined) props.defaultValue = value;
  }
  if (live && typeof form.host.onChange === "function") props.onChange = noop;
}

/**
 * @param {TemplateNode} node
 * @param {Record<string, ReactNode[]>} regions
 * @param {Set<string>} blocks
 * @param {string} key
 * @param {Form} form
 * @returns {ReactElement}
 */
function toReact(node, regions, blocks, key, form) {
  /** @type {Record<string, unknown>} */
  const props = {};
  for (const [name, value] of Object.entries(node.props)) {
    const prop = NAMES.get(name) ?? name;
    props[prop] = BOOLEANS.has(prop) ? true : value === true ? "" : value;
  }
  if (typeof props.style === "string") props.style = styleOf(props.style);
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
      const base = keyOf(child, blocks, index);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      children.push(toReact(child, regions, blocks, count ? `${base}:${count}` : base, form));
    }
  }
  if (FIELDS.has(node.tag)) bindForm(node, props, children, form);
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
 * Takes the element's own event handlers, such as `oncopied` or `oncopiedCapture`, out of the props.
 * @param {Record<string, unknown>} props
 * @returns {Record<string, (event: Event) => void>}
 */
function takeHandlers(props) {
  /** @type {Record<string, (event: Event) => void>} */
  const handlers = {};
  for (const [name, value] of Object.entries(props)) {
    if (!OWN_EVENT.test(name) || typeof value !== "function") continue;
    handlers[name] = /** @type {(event: Event) => void} */ (value);
    delete props[name];
  }
  return handlers;
}

/**
 * Marks the element as React's and binds its own event handlers, which React's hydration leaves unbound until the
 * next update.
 * @param {unknown} authorRef
 * @param {boolean} controlled
 * @param {Record<string, (event: Event) => void>} handlers
 */
function useMark(authorRef, controlled, handlers) {
  const latest = React.useRef(handlers);
  React.useLayoutEffect(() => {
    latest.current = handlers;
  });
  const names = Object.keys(handlers).join(" ");
  return useCallback(
    /** @param {Element} el */
    (el) => {
      Reflect.set(el, REACT, true);
      Reflect.set(el, CONTROLLED, controlled);
      const unbind = names
        .split(" ")
        .filter(Boolean)
        .map((name) => {
          const capture = name.endsWith(CAPTURE);
          const type = name.slice(2, capture ? -CAPTURE.length : undefined);
          /** @param {Event} event */
          const listener = (event) => latest.current[name]?.call(el, event);
          el.addEventListener(type, listener, capture);
          return () => el.removeEventListener(type, listener, capture);
        });
      const release = pass(authorRef, el);
      return () => {
        for (const each of unbind) each();
        if (typeof release === "function") release();
        else pass(authorRef, null);
      };
    },
    [authorRef, controlled, names],
  );
}

/**
 * @param {string} tag
 * @param {Template} template
 * @param {{ markHost: boolean, server: boolean, provider: boolean }} options `provider` when another template names
 *   this tag as its `within`.
 */
function hostFor(tag, template, { markHost, server, provider }) {
  /** @param {Record<string, unknown>} props */
  function NeuwoHost(props) {
    const { __neuwoWithin, defaultValue, defaultChecked, ...host } = props;
    const within = /** @type {Within | undefined} */ (__neuwoWithin);
    const scope = `neuwo${useId().replace(/[^\w-]/g, "")}-`;
    const items = flatten(/** @type {ReactNode} */ (props.children));
    const attrs = normalizeProps({ ...host, value: props.value ?? defaultValue, checked: props.checked ?? defaultChecked });
    const node = template(attrs, { id: (suffix) => scope + suffix, children: describe(items), within: within?.attrs ?? null });
    // An enclosing element such as a radio group holds a value its template has no control for.
    const controlled = !server && (provider ? props.value != null : isControlled(props, controlOf(node)));
    const mark = markHost && { ref: useMark(props.ref, controlled, takeHandlers(host)) };
    const blocks = blocksOf(node);
    const lent = provider && { attrs, controlled, hasOnChange: typeof props.onChange === "function" };
    const placed = lent ? items.map((item) => lend(item, tag, lent)) : items;
    const root = toReact(node, distribute(node, placed, slotOf), blocks, keyOf(node, blocks, 0), { host: props, controlled });
    // A field assigns a value it is handed to its live control, which would overwrite what the user typed.
    if (server || host.value == null) delete host.value;
    if (server || host.checked == null) delete host.checked;
    return reactJsx(/** @type {ElementType} */ (tag), { ...host, ...mark, children: root });
  }
  hostTags.set(NeuwoHost, tag);
  if (template.within) hostWithin.set(NeuwoHost, template.within);
  return NeuwoHost;
}

/**
 * @param {Record<string, Template>} registry
 * @param {{ markHost?: boolean, server?: boolean }} [options] `server` renders for React Server Components: no form
 *   control is controlled, the element itself gets no `value` or `checked`, and the adapter adds no function prop.
 * @returns {{ jsx: typeof reactJsx, jsxs: typeof reactJsxs, jsxDEV: typeof reactJsxDEV }}
 */
export function createRuntime(registry, { markHost = true, server = false } = {}) {
  /** @type {Map<string, ReturnType<typeof hostFor>>} */
  const hosts = new Map();
  const providers = new Set(Object.values(registry).flatMap((template) => template.within ?? []));
  /** @param {ElementType} type */
  const resolve = (type) => {
    if (typeof type !== "string" || !Object.hasOwn(registry, type)) return type;
    let host = hosts.get(type);
    if (!host) hosts.set(type, (host = hostFor(type, registry[type], { markHost, server, provider: providers.has(type) })));
    return host;
  };
  return {
    jsx: (type, props, key) => reactJsx(resolve(type), props, key),
    jsxs: (type, props, key) => reactJsxs(resolve(type), props, key),
    jsxDEV: (type, props, key, isStatic, source, self) => reactJsxDEV(resolve(type), props, key, isStatic, source, self),
  };
}
