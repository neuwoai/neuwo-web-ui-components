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

// React's own components that render their children as they are; React 19.0 and 19.1 name no Activity.
/** @type {Set<unknown>} */
const PASS_THROUGH = new Set([Fragment, React.Suspense, React.StrictMode, React.Profiler, React.Activity].filter((type) => type !== undefined));
const CONTEXT = Symbol.for("react.context");

// React's own event props are camel case, so an `on` prop in lower case names one of the element's events.
const OWN_EVENT = /^on[a-z]/;
const CAPTURE = "Capture";

const noop = () => {};

/** @type {WeakMap<Function, string>} */
const hostTags = new WeakMap();
/** @type {WeakMap<Function, string>} */
const hostWithin = new WeakMap();
/** @type {WeakMap<object, Within>} */
const lentTo = new WeakMap();

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
 * React's `cloneElement`, keeping what was lent to the element, which is held by its props object.
 * @param {AnyElement} el
 * @param {Record<string, unknown> | null} config
 * @param {...ReactNode} children
 * @returns {AnyElement}
 */
function clone(el, config, ...children) {
  const copy = cloneElement(el, config, ...children);
  const within = lentTo.get(el.props);
  if (within) lentTo.set(copy.props, within);
  return copy;
}

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
    else out.push(el && prefix ? clone(el, { key: prefix + el.key }) : item);
  }
  return out;
}

/**
 * Whether the element passes its children through to the DOM: an element, one of React's own wrappers, a context
 * provider or a Neuwo element.
 * @param {AnyElement} el
 * @returns {boolean}
 */
const isTransparent = (el) =>
  typeof el.type === "string" ||
  PASS_THROUGH.has(el.type) ||
  (typeof el.type === "object" && el.type !== null && /** @type {{ $$typeof?: symbol }} */ (el.type).$$typeof === CONTEXT) ||
  (typeof el.type === "function" && hostTags.has(el.type));

/**
 * @param {ReactNode} node
 * @param {string} tag
 * @param {Within} within
 * @param {((tag: string) => void) | null} rendered called with the tag of each element that arrives already
 *   rendered, as a Server Component's output does
 * @returns {ReactNode}
 */
function lend(node, tag, within, rendered) {
  if (Array.isArray(node)) {
    const lent = node.map((child) => lend(child, tag, within, rendered));
    return lent.some((child, index) => child !== node[index]) ? lent : node;
  }
  const el = asElement(node);
  if (!el) return node;
  if (typeof el.type === "string") rendered?.(el.type);
  const reads = typeof el.type === "function" && hostWithin.get(el.type) === tag;
  const own = /** @type {ReactNode} */ (el.props.children);
  const children = tagOf(el) !== tag && isTransparent(el) ? lend(own, tag, within, rendered) : own;
  const ownFallback = /** @type {ReactNode} */ (el.props.fallback);
  const fallback = el.type === React.Suspense ? lend(ownFallback, tag, within, rendered) : ownFallback;
  if (!reads && children === own && fallback === ownFallback) return node;
  // React freezes a static children array in development; spread, it keeps its exemption from the key check.
  const spread = Array.isArray(children) && Object.isFrozen(own);
  const copy = clone(el, fallback === ownFallback ? null : { fallback }, ...(children === own ? [] : spread ? children : [children]));
  if (reads) lentTo.set(copy.props, within);
  return copy;
}

/**
 * Whether the items hold, at any depth, something a template cannot read, such as a component of the app's own.
 * @param {ReactNode[]} items
 * @returns {boolean}
 */
function hasOpaque(items) {
  return items.some((item) => {
    if (typeof item !== "object" || item === null) return false;
    const el = asElement(item);
    return !el || tagOf(el) === null || hasOpaque(flatten(/** @type {ReactNode} */ (el.props.children)));
  });
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
 * The element that holds the region, its wrapper.
 * @param {TemplateNode} node
 * @param {string} name
 * @returns {TemplateNode | undefined}
 */
function wrapperOf(node, name) {
  for (const child of node.children) {
    if (typeof child !== "object") continue;
    if ("region" in child && child.region === name) return node;
    const found = "tag" in child ? wrapperOf(child, name) : undefined;
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
 * The state a control renders, as the props `bindForm` reads from a controlled host: how a reader of a controlled
 * element, such as a radio in a controlled group, holds what its template made of that element's state.
 * @param {TemplateNode} control
 * @param {boolean} hasOnChange
 * @returns {Record<string, unknown>}
 */
const heldState = (control, hasOnChange) => ({
  checked: Object.hasOwn(control.props, "checked"),
  value: control.props.value,
  onChange: hasOnChange ? noop : undefined,
});

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
  const checkable = isCheckable(node);
  if (checkable) {
    delete props.checked;
    if (live) props.checked = Boolean(form.host.checked);
    else if (Object.hasOwn(node.props, "checked")) props.defaultChecked = true;
  } else if (!FIXED_VALUE.has(inputTypeOf(node))) {
    const value = node.tag === "textarea" && children.length ? children.splice(0).join("") : props.value;
    delete props.value;
    if (live) props.value = value === undefined || String(value) === String(form.host.value) ? form.host.value : value;
    else if (value !== undefined) props.defaultValue = value;
  }
  const handled = typeof form.host.onChange === "function" || (!checkable && typeof form.host.onInput === "function");
  if (live && handled) props.onChange = noop;
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
 * @param {((el: Element) => void) | null} mounted
 */
function useMark(authorRef, controlled, handlers, mounted) {
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
      mounted?.(el);
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
    [authorRef, controlled, names, mounted],
  );
}

/**
 * @param {string} tag
 * @param {Template} template
 * @param {{ markHost: boolean, server: boolean, readers: Set<string>, dev: boolean, warned: Set<string> }} options
 *   `readers` holds the tags whose templates name this tag as their `within`; `warned` holds the warnings given once.
 */
function hostFor(tag, template, { markHost, server, readers, dev, warned }) {
  const { within: enclosing } = template;
  const provider = readers.size > 0;
  /** @param {Element} el */
  const unlent = (el) => {
    if (warned.has(tag) || !el.parentElement?.closest(enclosing)) return;
    warned.add(tag);
    console.warn(
      `<${tag}> is inside <${enclosing}> in the page but was rendered without its attributes, as the JSX runtime found no ` +
        `<${enclosing}> around it in React's tree. That happens inside a component of your own, which the runtime cannot ` +
        `see into, through a portal, and in another React root. Render <${tag}> inside <${enclosing}> in the same component.`,
    );
  };
  /** @param {string} reader */
  const expanded = (reader) => {
    const key = `${reader} in ${tag}`;
    if (!readers.has(reader) || warned.has(key)) return;
    warned.add(key);
    console.warn(
      `<${reader}> reached <${tag}> already rendered, without its attributes: either a Server Component rendered it ` +
        `outside <${tag}>, as it renders the children it passes to a Client Component, or it was created with ` +
        `React.createElement or under another jsxImportSource, so it never passed through this library's JSX runtime. ` +
        `Render <${tag}> and its <${reader}> elements in the same component, or create them with this library's JSX runtime.`,
    );
  };
  /**
   * @param {TemplateNode} node
   * @param {ReactNode[]} items
   */
  const unlisted = (node, items) => {
    const key = `options in ${tag}`;
    if (warned.has(key) || wrapperOf(node, DEFAULT_REGION)?.tag !== "select") return;
    if (!hasOpaque(items.filter((item) => slotOf(item) === DEFAULT_REGION))) return;
    warned.add(key);
    console.warn(
      `<${tag}> lists the <option> and <optgroup> elements written inside it, but a component of your own renders ` +
        `some of its content after <${tag}> has read it, so the options that component renders are not listed. Write ` +
        `the options inside <${tag}> in the same component, with only elements and fragments around them.`,
    );
  };
  /** @param {Record<string, unknown>} props */
  function NeuwoHost(props) {
    const { defaultValue, defaultChecked, ...host } = props;
    const within = lentTo.get(props);
    const scope = `neuwo${useId().replace(/[^\w-]/g, "")}-`;
    const items = flatten(/** @type {ReactNode} */ (props.children));
    const attrs = normalizeProps({ ...host, value: props.value ?? defaultValue, checked: props.checked ?? defaultChecked });
    const node = template(attrs, { id: (suffix) => scope + suffix, children: describe(items), within: within?.attrs ?? null });
    if (dev) unlisted(node, items);
    const control = controlOf(node);
    const held = !server && within?.controlled === true && control ? control : null;
    // An enclosing element such as a radio group holds a value its template has no control for.
    const controlled = !server && (provider ? props.value != null : held !== null || isControlled(props, control));
    const mark = markHost && { ref: useMark(props.ref, controlled, takeHandlers(host), dev && enclosing && !within ? unlent : null) };
    const blocks = blocksOf(node);
    const lent = provider && { attrs, controlled, hasOnChange: typeof props.onChange === "function" };
    const placed = lent ? /** @type {ReactNode[]} */ (lend(items, tag, lent, dev ? expanded : null)) : items;
    const form = held ? { host: heldState(held, within?.hasOnChange === true || typeof props.onChange === "function"), controlled } : { host: props, controlled };
    const root = toReact(node, distribute(node, placed, slotOf), blocks, keyOf(node, blocks, 0), form);
    const fixed = control?.tag === "input" && FIXED_VALUE.has(inputTypeOf(control));
    // A field assigns a value it is handed to its live control, which would overwrite what the user typed.
    if ((server && !fixed) || host.value == null) delete host.value;
    if (server || host.checked == null) delete host.checked;
    return reactJsx(/** @type {ElementType} */ (tag), { ...host, ...mark, children: root });
  }
  NeuwoHost.displayName = tag;
  hostTags.set(NeuwoHost, tag);
  if (template.within) hostWithin.set(NeuwoHost, template.within);
  return NeuwoHost;
}

/**
 * @param {Record<string, Template>} registry
 * @param {{ markHost?: boolean, server?: boolean, dev?: boolean }} [options] `server` renders for React Server
 *   Components: no form control is controlled, the element itself gets no `checked`, and no `value` unless its control
 *   is an input whose value names it, such as a radio, and the adapter adds no function prop. `dev` warns once per tag
 *   when a reader mounts inside its `within` element without its attributes, once per reader and enclosing tag when
 *   that element is handed the reader already rendered, and once per tag when an element that keeps its options in a
 *   `<select>` is given something there it cannot read, such as a component of the app's own.
 * @returns {{ jsx: typeof reactJsx, jsxs: typeof reactJsxs, jsxDEV: typeof reactJsxDEV }}
 */
export function createRuntime(registry, { markHost = true, server = false, dev = false } = {}) {
  /** @type {Map<string, ReturnType<typeof hostFor>>} */
  const hosts = new Map();
  /** @type {Map<string, Set<string>>} */
  const readers = new Map();
  for (const [tag, { within }] of Object.entries(registry)) if (within) readers.set(within, (readers.get(within) ?? new Set()).add(tag));
  /** @type {Set<string>} */
  const warned = new Set();
  /** @param {ElementType} type */
  const resolve = (type) => {
    if (typeof type !== "string" || !Object.hasOwn(registry, type)) return type;
    let host = hosts.get(type);
    if (!host) hosts.set(type, (host = hostFor(type, registry[type], { markHost, server, readers: readers.get(type) ?? new Set(), dev, warned })));
    return host;
  };
  return {
    jsx: (type, props, key) => reactJsx(resolve(type), props, key),
    jsxs: (type, props, key) => reactJsxs(resolve(type), props, key),
    jsxDEV: (type, props, key, isStatic, source, self) => reactJsxDEV(resolve(type), props, key, isStatic, source, self),
  };
}
