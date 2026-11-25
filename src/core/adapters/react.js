import { Children, Fragment, cloneElement, isValidElement, useCallback, useId } from "react";
// Server Components' React has no useRef or useLayoutEffect, so naming them in an import would fail to link there.
import * as React from "react";
import { DEFAULT_REGION, blocksOf, distribute, keyClassOf, normalizeProps, withinTags } from "../template.js";
import { CONTROLLED, REACT } from "../marks.js";

/** @typedef {import("react").ReactNode} ReactNode */
/** @typedef {import("react").ElementType} ElementType */
/** @typedef {import("react").ReactElement} ReactElement */
/** @typedef {import("react").ReactElement<Record<string, unknown>>} AnyElement */
/** @typedef {import("../template.js").TemplateNode} TemplateNode */
/** @typedef {import("../template.js").ChildInfo} ChildInfo */
/** @typedef {import("../template.js").Template} Template */
/** @typedef {typeof import("react/jsx-runtime").jsx} Jsx */
/** @typedef {typeof import("react/jsx-runtime").jsxs} Jsxs */
/** @typedef {typeof import("react/jsx-dev-runtime").jsxDEV} JsxDEV */
/** @typedef {{ jsx: Jsx, jsxs: Jsxs } | { jsxDEV: JsxDEV }} Factory */
/** @typedef {(type: ElementType, props: Parameters<Jsx>[1], key: Parameters<Jsx>[2], isStatic: boolean, source?: unknown, self?: unknown) => ReactElement} Create */
/**
 * @typedef {object} Form
 * @property {Record<string, unknown>} host
 * @property {boolean} controlled
 * @property {TemplateNode} [start] the control as the starting value renders it, when the template draws another
 * @property {((el: Element | null) => void) | null} [watch] the ref that reads the control's live value once mounted
 */
/** @typedef {{ attrs: Record<string, string>, controlled: boolean, hasOnChange: boolean }} Within */

// React DOM's boolean props, copied from its setProp: it reads "" as false for these.
const BOOLEAN = [
  "allowFullScreen", "async", "autoPlay", "controls", "credentialless", "default", "defer", "disabled",
  "disablePictureInPicture", "disableRemotePlayback", "formNoValidate", "hidden", "inert", "itemScope", "loop",
  "multiple", "noModule", "noValidate", "open", "playsInline", "readOnly", "required", "reversed", "scoped", "seamless",
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
  ["popovertarget", "popoverTarget"],
  ...BOOLEAN.map((name) => /** @type {[string, string]} */ ([name.toLowerCase(), name])),
]);

/**
 * Whether React DOM reads a template attribute as a boolean, so the adapter renders it present whatever it holds.
 * @param {string} name
 * @returns {boolean}
 */
export const isBooleanAttribute = (name) => BOOLEANS.has(NAMES.get(name) ?? name);

const ATTRIBUTES = new Map([
  ...Array.from(NAMES, ([attribute, prop]) => /** @type {[string, string]} */ ([prop, attribute])),
  ["defaultChecked", "checked"],
  ["defaultValue", "value"],
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
/** @type {WeakMap<Function, string[]>} */
const hostWithin = new WeakMap();
/** @type {WeakMap<object, Within>} */
const lentTo = new WeakMap();

/**
 * @param {Element} el
 * @returns {Record<string, string>}
 */
const attributesIn = (el) => Object.fromEntries(Array.from(el.attributes, ({ name, value }) => [name, value]));

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
 * Whether the element passes its children to the DOM: an element, a React wrapper, a context provider or a Neuwo element.
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
 * @param {((tag: string) => void) | null} rendered called with the tag of each element that arrives rendered, as from a Server Component
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
  const reads = typeof el.type === "function" && hostWithin.get(el.type)?.includes(tag) === true;
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
 * Whether a list of options holds a component of the app's own that hides options or an option's label.
 * @param {ReactNode[]} items
 * @param {{ options: boolean, labels: boolean }} [found]
 * @param {boolean} [label] whether the items are an option's content
 * @returns {{ options: boolean, labels: boolean }}
 */
function unreadIn(items, found = { options: false, labels: false }, label = false) {
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const el = asElement(item);
    if (!el || !isTransparent(el)) found[label ? "labels" : "options"] = true;
    else if (label || tagOf(el) === null || el.type === "optgroup" || el.type === "option") {
      unreadIn(flatten(/** @type {ReactNode} */ (el.props.children)), found, label || el.type === "option");
    }
  }
  return found;
}

/**
 * @param {ReactNode} node
 * @returns {string}
 */
function textOf(node) {
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") return String(node);
  const el = asElement(node);
  return el && isTransparent(el) ? textOf(/** @type {ReactNode} */ (el.props.children)) : "";
}

/**
 * @param {Record<string, unknown>} style
 * @returns {string}
 */
const cssOf = (style) =>
  Object.entries(style)
    .filter(([, value]) => value != null && value !== "" && typeof value !== "boolean")
    .map(([name, value]) => `${name.startsWith("--") ? name : name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}: ${value}`)
    .join("; ");

/**
 * The attributes React props stand for, named as the markup names them, as the other adapters report them.
 * @param {Record<string, unknown>} props
 * @returns {Record<string, string>}
 */
const attributesOf = (props) => {
  const attrs = normalizeProps(Object.fromEntries(Object.entries(props).map(([name, value]) => [ATTRIBUTES.get(name) ?? name, value])));
  if (props.style && typeof props.style === "object") attrs.style = cssOf(/** @type {Record<string, unknown>} */ (props.style));
  return attrs;
};

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
      const inert = tag === "template";
      info.push({ tag, attrs: attributesOf(el.props), text: inert ? "" : textOf(children), slot: slotOf(el), children: inert ? [] : describe(flatten(children)) });
    } else if (el && isTransparent(el)) {
      const slot = slotOf(el);
      for (const child of describe(flatten(/** @type {ReactNode} */ (el.props.children)))) info.push({ ...child, slot });
    } else if (typeof item === "object") info.push({ tag: null, attrs: {}, text: "", slot: slotOf(item) });
    else if (String(item).trim() !== "") info.push({ tag: null, attrs: {}, text: String(item), slot: DEFAULT_REGION });
  }
  return info;
}

/**
 * Every element a template renders has a key class, which the contract test requires.
 * @param {TemplateNode} node
 * @param {Set<string>} blocks
 * @returns {string}
 */
const keyOf = (node, blocks) => /** @type {string} */ (keyClassOf(node, blocks));

/**
 * Splits at the semicolons outside parentheses and quotes.
 * @param {string} css
 * @returns {string[]}
 */
function declarationsOf(css) {
  /** @type {string[]} */
  const parts = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let index = 0; index < css.length; index++) {
    const char = css[index];
    if (quote) {
      if (char === "\\") index++;
      else if (char === quote) quote = "";
    } else if (char === '"' || char === "'") quote = char;
    else if (char === "(") depth++;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (char === ";" && depth === 0) {
      parts.push(css.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(css.slice(start));
  return parts;
}

/**
 * @param {string} css
 * @returns {Record<string, string>}
 */
function styleOf(css) {
  /** @type {Record<string, string>} */
  const style = {};
  for (const declaration of declarationsOf(css)) {
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
 * Whether React holds the state, decided as for its own inputs: a checkbox or radio by `checked`, others by `value`.
 * @param {Record<string, unknown>} props
 * @param {TemplateNode | undefined} control
 * @returns {boolean}
 */
function isControlled(props, control) {
  if (!control) return props.value != null || props.checked != null;
  return isCheckable(control) ? props.checked != null : props.value != null;
}

/**
 * The state a control renders, as `bindForm` reads it, for a reader of a controlled element such as a radio in a group.
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
 * The value a template gives a value-carrying control: a textarea's text, else its `value`.
 * @param {TemplateNode} node
 * @returns {string | undefined}
 */
const valueOf = (node) => (node.tag === "textarea" ? node.children.filter((child) => typeof child === "string").join("") || undefined : (node.props.value === undefined ? undefined : String(node.props.value)));

/**
 * Whether an uncontrolled control's value is drawn into its markup: any value-carrying control except a checkbox or radio.
 * @param {TemplateNode} node
 * @returns {boolean}
 */
const carriesValue = (node) => !isCheckable(node) && !FIXED_VALUE.has(inputTypeOf(node));

/**
 * A ref that reads an uncontrolled control's live value once mounted, so input made before hydration is drawn too.
 * @param {boolean} enabled
 * @param {string | undefined} start the value the control was rendered with
 * @param {(value: string) => void} draw
 */
function useWatch(enabled, start, draw) {
  return useCallback(
    /** @param {Element | null} el */
    (el) => {
      const value = /** @type {{ value?: unknown } | null} */ (el)?.value;
      if (enabled && typeof value === "string" && value !== (start ?? "")) draw(value);
    },
    [enabled, start, draw],
  );
}

/**
 * A controlled host takes the consumer's state and everything else the template's default, so the browser keeps typed input.
 * @param {TemplateNode} node
 * @param {Record<string, unknown>} props
 * @param {ReactNode[]} children
 * @param {Form} form
 */
function bindForm(node, props, children, form) {
  const live = node.control === true && form.controlled;
  const start = node.control === true ? form.start : undefined;
  const checkable = isCheckable(node);
  if (checkable) {
    delete props.checked;
    if (live) props.checked = Boolean(form.host.checked);
    else if (Object.hasOwn(node.props, "checked")) props.defaultChecked = true;
  } else if (!FIXED_VALUE.has(inputTypeOf(node))) {
    const value = node.tag === "textarea" && children.length ? children.splice(0).join("") : props.value;
    delete props.value;
    const given = start ? valueOf(start) : value;
    if (live) props.value = value === undefined || String(value) === String(form.host.value) ? form.host.value : value;
    else if (given !== undefined) props.defaultValue = given;
  }
  if (node.control === true && form.watch) props.ref = form.watch;
  const handled = typeof form.host.onChange === "function" || (!checkable && typeof form.host.onInput === "function");
  if (live && handled) props.onChange = noop;
}

/**
 * @param {TemplateNode} node
 * @param {Record<string, ReactNode[]>} regions
 * @param {Set<string>} blocks
 * @param {string} key
 * @param {Form} form
 * @param {Create} create
 * @returns {ReactElement}
 */
function toReact(node, regions, blocks, key, form, create) {
  /** @type {Record<string, unknown>} */
  const props = {};
  for (const [name, value] of Object.entries(node.props)) {
    props[NAMES.get(name) ?? name] = isBooleanAttribute(name) ? true : value === true ? "" : value;
  }
  if (typeof props.style === "string") props.style = styleOf(props.style);
  if (node.live) props.suppressHydrationWarning = true;
  const type = /** @type {ElementType} */ (node.tag);
  /** @type {ReactNode[]} */
  const children = [];
  /** @type {Map<string, number>} */
  const seen = new Map();
  for (const child of node.children) {
    if (typeof child === "string") children.push(child);
    else if ("region" in child) children.push(...(regions[child.region] ?? []));
    else if ("raw" in child) props.dangerouslySetInnerHTML = { __html: child.raw };
    else {
      const base = keyOf(child, blocks);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      children.push(toReact(child, regions, blocks, count ? `${base}:${count}` : base, form, create));
    }
  }
  if (FIELDS.has(node.tag)) bindForm(node, props, children, form);
  if (children.length > 1) return create(type, { ...props, children }, key, true);
  if (children.length === 1) props.children = children[0];
  return create(type, props, key, false);
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
 * Marks the element as React's and binds its own event handlers, which hydration leaves unbound until the next update.
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
 * @param {{ markHost: boolean, server: boolean, readers: Set<string>, dev: boolean, warned: Set<string>, create: Create }} options
 *   `readers` holds the tags whose templates name this tag as their `within`; `warned` holds the warnings given once.
 */
function hostFor(tag, template, { markHost, server, readers, dev, warned, create }) {
  const { within: enclosing } = template;
  const provider = readers.size > 0;
  /**
   * Warns once about a reader rendered without the attributes of the element around it in the page, when they would
   * change its markup.
   * @param {Element} el
   */
  const unlent = (el) => {
    const outer = warned.has(tag) ? null : el.parentElement?.closest(/** @type {string} */ (enclosing));
    if (!outer) return;
    /** @param {Record<string, string> | null} within */
    const draw = (within) => JSON.stringify(template(attributesIn(el), { id: (suffix) => suffix, children: [], within }));
    if (draw(attributesIn(outer)) === draw(null)) return;
    const name = outer.localName;
    warned.add(tag);
    console.warn(
      `<${tag}> is inside <${name}> in the page but was rendered without its attributes, as the JSX runtime found no ` +
        `<${name}> around it in React's tree. That happens inside a component of your own, which the runtime cannot ` +
        `see into, through a portal, or in another React root. Render <${tag}> inside <${name}> in the same component.`,
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
    const options = `options in ${tag}`;
    const labels = `option labels in ${tag}`;
    if ((warned.has(options) && warned.has(labels)) || wrapperOf(node, DEFAULT_REGION)?.tag !== "select") return;
    const unread = unreadIn(items.filter((item) => slotOf(item) === DEFAULT_REGION));
    if (unread.options && !warned.has(options)) {
      warned.add(options);
      console.warn(
        `<${tag}> lists the <option> and <optgroup> elements written inside it, with only fragments, context providers ` +
          `and React's own wrappers, such as Suspense, around them. A component of your own renders its options after ` +
          `<${tag}> has read them, so they are not listed. Write the options in place inside <${tag}>, in the same component.`,
      );
    }
    if (unread.labels && !warned.has(labels)) {
      warned.add(labels);
      console.warn(
        `An <option> in <${tag}> takes its label from a component of your own, which renders after <${tag}> has read ` +
          `the label, so the option's row shows no text. Write the option's label as text.`,
      );
    }
  };
  /** @param {Record<string, unknown>} props */
  function NeuwoHost(props) {
    const { defaultValue, defaultChecked, ...host } = props;
    const within = lentTo.get(props);
    const scope = `neuwo${useId().replace(/[^\w-]/g, "")}-`;
    // Server Components have no state; the runtime is fixed per build, so the hooks are called the same every time.
    /** @type {[string | null, (value: string) => void]} */
    const [drawn, draw] = server ? [null, noop] : React.useState(/** @type {string | null} */ (null));
    const items = flatten(/** @type {ReactNode} */ (props.children));
    const attrs = normalizeProps({ ...host, value: props.value ?? defaultValue, checked: props.checked ?? defaultChecked });
    /** @type {import("../template.js").TemplateContext} */
    const ctx = { id: (suffix) => scope + suffix, children: describe(items), within: within?.attrs ?? null };
    const node = template(drawn === null ? attrs : { ...attrs, value: drawn }, ctx);
    if (dev) unlisted(node, items);
    const control = controlOf(node);
    const held = !server && within?.controlled === true && control ? control : null;
    // An enclosing element such as a radio group holds a value its template has no control for.
    const controlled = !server && (provider ? props.value != null : held !== null || isControlled(props, control));
    const start = drawn === null ? control : controlOf(template(attrs, ctx));
    const watch = server ? null : useWatch(!controlled && control !== undefined && carriesValue(control), start && valueOf(start), draw);
    const mark = markHost && { ref: useMark(props.ref, controlled, takeHandlers(host), dev && enclosing && !within ? unlent : null) };
    const blocks = blocksOf(node);
    const lent = provider && { attrs, controlled, hasOnChange: typeof props.onChange === "function" };
    const placed = lent ? /** @type {ReactNode[]} */ (lend(items, tag, lent, dev ? expanded : null)) : items;
    const form = held
      ? { host: heldState(held, within?.hasOnChange === true || typeof props.onChange === "function"), controlled }
      : { host: props, controlled, start: drawn === null ? undefined : start, watch };
    const root = toReact(node, distribute(node, placed, slotOf), blocks, keyOf(node, blocks), form, create);
    const fixed = control?.tag === "input" && FIXED_VALUE.has(inputTypeOf(control));
    // A field assigns a value it is handed to its live control, which would overwrite what the user typed.
    if ((server && !fixed) || host.value == null) delete host.value;
    if (server || host.checked == null) delete host.checked;
    return create(/** @type {ElementType} */ (tag), { ...host, ...mark, children: root }, undefined, false);
  }
  NeuwoHost.displayName = tag;
  hostTags.set(NeuwoHost, tag);
  if (template.within) hostWithin.set(NeuwoHost, withinTags(template));
  return NeuwoHost;
}

/**
 * @param {Record<string, Template>} registry
 * @param {{ factory: Factory, markHost?: boolean, server?: boolean, dev?: boolean }} options `factory` is React's own runtime, `server` renders for Server Components, `dev` adds warnings.
 * @returns {{ jsx: Jsx, jsxs: Jsxs, jsxDEV: JsxDEV }}
 */
export function createRuntime(registry, { factory, markHost = true, server = false, dev = false }) {
  /** @type {Create} */
  const create = "jsxDEV" in factory
    ? (type, props, key, isStatic, source, self) => factory.jsxDEV(type, props, key, isStatic, source, self)
    : (type, props, key, isStatic) => (isStatic ? factory.jsxs : factory.jsx)(type, props, key);
  /** @type {Map<string, ReturnType<typeof hostFor>>} */
  const hosts = new Map();
  /** @type {Map<string, Set<string>>} */
  const readers = new Map();
  for (const [tag, template] of Object.entries(registry)) for (const within of withinTags(template)) readers.set(within, (readers.get(within) ?? new Set()).add(tag));
  /** @type {Set<string>} */
  const warned = new Set();
  /** @param {ElementType} type */
  const resolve = (type) => {
    if (typeof type !== "string" || !Object.hasOwn(registry, type)) return type;
    let host = hosts.get(type);
    if (!host) hosts.set(type, (host = hostFor(type, registry[type], { markHost, server, readers: readers.get(type) ?? new Set(), dev, warned, create })));
    return host;
  };
  return {
    jsx: (type, props, key) => create(resolve(type), props, key, false),
    jsxs: (type, props, key) => create(resolve(type), props, key, true),
    jsxDEV: (type, props, key, isStatic, source, self) => create(resolve(type), props, key, isStatic, source, self),
  };
}
