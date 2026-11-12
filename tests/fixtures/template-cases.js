import { Window } from "happy-dom";
import { renderElement } from "../../src/core/adapters/html.js";
import { idScope } from "../../src/core/ids.js";
import { expand } from "../../src/server/index.js";
import { templates } from "../../src/templates.js";

/** @typedef {{ tag: string, attrs?: Record<string, string>, text?: string, children?: Child[] }} ChildElement */
/** @typedef {string | ChildElement} Child */
/** @typedef {{ name: string, attrs: Record<string, string>, children: Child[] }} TemplateCase */
/** @typedef {import("../../src/core/template.js").ChildInfo} ChildInfo */

/**
 * @param {string} value
 * @param {string} label
 * @param {Record<string, string>} [attrs]
 * @returns {ChildElement}
 */
const radio = (value, label, attrs = {}) => ({ tag: "neuwo-radio", attrs: { value, ...attrs }, text: label });

/**
 * @param {string} value
 * @param {string} label
 * @param {Record<string, string>} [attrs]
 * @returns {ChildElement}
 */
const view = (value, label, attrs = {}) => ({ tag: "option", attrs: { value, ...attrs }, text: label });

/** @type {Record<string, TemplateCase[]>} */
export const cases = {
  "neuwo-button": [
    { name: "solid default", attrs: {}, children: ["Get started"] },
    { name: "outline large", attrs: { variant: "outline", size: "lg" }, children: ["Contact us"] },
    { name: "glass disabled", attrs: { variant: "glass", disabled: "" }, children: ["Unavailable"] },
    {
      name: "link",
      attrs: { href: "https://neuwo.ai", target: "_blank", rel: "noopener", download: "" },
      children: ["Visit"],
    },
    { name: "disabled link", attrs: { href: "https://neuwo.ai", disabled: "" }, children: ["Visit"] },
    { name: "loading", attrs: { type: "submit", loading: "" }, children: ["Saving"] },
    { name: "form attributes", attrs: { type: "submit", form: "signup", name: "plan", value: "pro" }, children: ["Choose Pro"] },
    { name: "block", attrs: { block: "", hover: "l", xwide: "" }, children: ["Full width"] },
    {
      name: "start icon and forwarded attributes",
      attrs: { title: "Add", "aria-label": "Add item", "data-track": "add" },
      children: [{ tag: "span", attrs: { slot: "start" }, text: "+" }, "Add"],
    },
    {
      name: "end svg",
      attrs: { size: "sm", hover: "s", wide: "" },
      children: ["Next", { tag: "svg", attrs: { slot: "end" }, children: [{ tag: "path", attrs: { d: "M0 0" } }] }],
    },
    { name: "nested badge", attrs: {}, children: ["Inbox ", { tag: "neuwo-badge", text: "New" }] },
  ],
  "neuwo-badge": [
    { name: "default", attrs: {}, children: ["For Publishers"] },
    { name: "green borderless pulse", attrs: { variant: "green", borderless: "", motion: "pulse" }, children: ["Live"] },
    { name: "shimmer large intensity", attrs: { size: "l", motion: "shimmer", intensity: "l" }, children: ["New"] },
    { name: "small glow", attrs: { size: "s", glow: "", intensity: "s" }, children: ["Hot"] },
    { name: "unknown values", attrs: { variant: "xyz", size: "xl", motion: "xyz" }, children: ["Plain"] },
    { name: "forwarded host attributes", attrs: { title: "Tip", "aria-label": "Status", "data-track": "badge" }, children: ["Beta"] },
    { name: "nested element", attrs: {}, children: ["Sale ", { tag: "b", text: "50%" }] },
    { name: "empty", attrs: {}, children: [] },
  ],
  "neuwo-copy": [
    {
      name: "indented code panel",
      attrs: {},
      children: ["\n  ", { tag: "pre", children: [{ tag: "code", text: "npm install @neuwo/web-ui-library--demo" }] }, "\n"],
    },
    { name: "nested deal-id", attrs: {}, children: [{ tag: "neuwo-deal-id", text: "NEUWO-CTX-000123" }] },
    {
      name: "custom labels",
      attrs: { label: "Kopioi", "copied-label": "Kopioitu", "failed-label": "Kopiointi ei onnistunut" },
      children: [{ tag: "pre", text: "npm test" }],
    },
  ],
  "neuwo-cta": [
    {
      name: "banner with an accent and two actions",
      attrs: {},
      children: [
        "Ready to ",
        { tag: "span", attrs: { "data-accent": "" }, text: "classify at scale" },
        "?",
        { tag: "span", attrs: { slot: "sub" }, text: "Get started with the Classification API." },
        { tag: "neuwo-button", attrs: { slot: "actions", variant: "solid" }, text: "Get started" },
        { tag: "neuwo-button", attrs: { slot: "actions", variant: "outline" }, text: "Contact us" },
      ],
    },
    {
      name: "spotlight with a loud pulse",
      attrs: { variant: "spotlight", pulse: "", intensity: "l" },
      children: [
        "Ready to ",
        { tag: "span", attrs: { "data-accent": "" }, text: "earn more" },
        " from your content?",
        { tag: "span", attrs: { slot: "sub" }, text: "Talk to our team about monetisation." },
        { tag: "neuwo-button", attrs: { slot: "actions", size: "lg" }, text: "Contact us" },
        { tag: "neuwo-button", attrs: { slot: "actions", variant: "outline", size: "lg" }, text: "See pricing" },
      ],
    },
    {
      name: "capture field with a success status",
      attrs: { status: "Thanks, we will be in touch shortly.", "status-state": "success" },
      children: [
        "Ready to start?",
        { tag: "span", attrs: { slot: "sub" }, text: "Leave your work email." },
        { tag: "neuwo-input", attrs: { slot: "field", type: "email", name: "email", size: "sm", label: "Work email" } },
        { tag: "neuwo-button", attrs: { slot: "actions", type: "submit" }, text: "Get started" },
      ],
    },
    {
      name: "indented spotlight with a heading level and an error",
      attrs: { variant: "spotlight", "heading-level": "3", status: "Something went wrong.", "status-state": "error" },
      children: [
        "\n  Ready to go?\n  ",
        { tag: "p", attrs: { slot: "sub" }, text: "Sub line." },
        "\n  ",
        { tag: "neuwo-button", attrs: { slot: "actions", hover: "s" }, text: "Get started" },
        "\n",
      ],
    },
    {
      name: "unknown values",
      attrs: { variant: "toString", "heading-level": "9", status: "Working", "status-state": "loud" },
      children: ["Plain headline", { tag: "neuwo-button", attrs: { slot: "actions" }, text: "Go" }],
    },
  ],
  "neuwo-checkbox": [
    { name: "checked", attrs: { name: "terms", checked: "" }, children: ["I accept the terms"] },
    { name: "unchecked with a custom value", attrs: { name: "news", value: "weekly", form: "signup" }, children: ["Weekly newsletter"] },
    {
      name: "required with an error",
      attrs: { name: "terms", required: "", error: "You must accept the terms" },
      children: ["I accept the ", { tag: "a", attrs: { href: "/terms" }, text: "terms" }],
    },
    { name: "no error line", attrs: { "no-error-line": "", "aria-label": "Select all", title: "Select all", "data-x": "1" }, children: ["All"] },
  ],
  "neuwo-toggle": [
    { name: "pulse", attrs: { name: "enrich", pulse: "" }, children: ["Bid Enrichment"] },
    { name: "checked, disabled and a muted error", attrs: { checked: "", disabled: "", error: "Unavailable", "error-muted": "" }, children: ["On by default"] },
  ],
  "neuwo-radio-group": [
    {
      name: "a value",
      attrs: { name: "plan", value: "pro", label: "Plan" },
      children: [radio("free", "Free"), radio("pro", "Pro"), radio("ent", "Enterprise", { disabled: "" })],
    },
    { name: "a radio carrying checked", attrs: { name: "size" }, children: [radio("s", "S"), radio("m", "M", { checked: "" }), radio("l", "L")] },
    {
      name: "horizontal with an error",
      attrs: { name: "size", label: "Size", orientation: "horizontal", error: "Pick a size" },
      children: [radio("s", "S"), radio("m", "M")],
    },
    {
      name: "required, with a radio inside other markup",
      attrs: { name: "tier", label: "Tier", required: "", form: "signup" },
      children: [radio("free", "Free"), { tag: "div", children: [radio("pro", "Pro", { "aria-label": "Pro plan" })] }],
    },
    {
      name: "a disabled group",
      attrs: { name: "plan", value: "a", disabled: "", "aria-label": "Plan", title: "Plan", "data-x": "1", "no-error-line": "" },
      children: [radio("a", "A"), radio("b", "B")],
    },
  ],
  "neuwo-radio": [
    {
      name: "a lone radio",
      attrs: { name: "agree", value: "yes", checked: "", required: "", form: "signup", "aria-label": "Agree", title: "Agree", "data-x": "1" },
      children: ["I ", { tag: "em", text: "agree" }],
    },
    { name: "a lone radio with no value", attrs: {}, children: ["Plain"] },
  ],
  "neuwo-segmented": [
    { name: "a value", attrs: { name: "view", value: "json", label: "View" }, children: [view("visual", "Visual"), view("json", "JSON"), view("raw", "Raw", { disabled: "" })] },
    {
      name: "a selected option",
      attrs: { name: "density" },
      children: ["\n  ", view("compact", "Compact"), "\n  ", view("comfortable", "Comfortable", { selected: "" }), "\n  ", { tag: "option", text: "Spacious" }, "\n"],
    },
    {
      name: "disabled options",
      attrs: { value: "b", form: "search", "aria-label": "Mode", title: "Mode", "data-x": "1", "no-error-line": "" },
      children: [view("a", "A", { disabled: "" }), view("b", "B", { disabled: "", selected: "" }), view("c", "C")],
    },
    { name: "a disabled group", attrs: { name: "view", value: "json", disabled: "", orientation: "vertical" }, children: [view("visual", "Visual"), view("json", "JSON")] },
    { name: "required with an error", attrs: { name: "view", label: "View", required: "", error: "Choose a view" }, children: [view("visual", "Visual"), view("json", "JSON")] },
  ],
  "neuwo-deal-id": [
    { name: "default", attrs: {}, children: ["NW-CA-2026-04-8A3F"] },
    { name: "small", attrs: { size: "s" }, children: ["NW-1"] },
    { name: "large", attrs: { size: "l" }, children: ["NW-2"] },
    { name: "unknown size", attrs: { size: "xl" }, children: ["NW-3"] },
    { name: "empty", attrs: {}, children: [] },
  ],
  "neuwo-input": [
    { name: "default", attrs: {}, children: [] },
    {
      name: "label, required and error",
      attrs: { name: "email", value: "nope", form: "signup", label: "Work email", required: "", error: "That value is not allowed" },
      children: [],
    },
    {
      name: "slotted label element",
      attrs: { name: "key", required: "" },
      children: [{ tag: "span", attrs: { slot: "label" }, children: ["API key ", { tag: "a", attrs: { href: "#why" }, text: "why?" }] }],
    },
    {
      name: "small email with the constraint attributes",
      attrs: {
        size: "sm",
        type: "email",
        placeholder: "you@company.com",
        autocomplete: "email",
        readonly: "",
        min: "1",
        max: "9",
        step: "1",
        pattern: ".+@.+",
        minlength: "6",
        maxlength: "64",
        inputmode: "email",
      },
      children: [],
    },
    { name: "no error line", attrs: { label: "Search", "no-error-line": "" }, children: [] },
    { name: "forwarded host attributes", attrs: { "aria-label": "Search", title: "Search the site", "data-x": "1" }, children: [] },
    {
      name: "disabled with a muted error",
      attrs: { label: "Plan", value: "pro", disabled: "", error: "Unavailable", "error-muted": "" },
      children: [],
    },
  ],
  "neuwo-logo": [
    { name: "default", attrs: {}, children: [] },
    { name: "bg-light", attrs: { variant: "bg-light" }, children: [] },
    { name: "bg-dark-alt", attrs: { variant: "bg-dark-alt" }, children: [] },
    { name: "bg-colour", attrs: { variant: "bg-colour" }, children: [] },
    { name: "unknown variant", attrs: { variant: "teal" }, children: [] },
    { name: "inherited key variant", attrs: { variant: "toString" }, children: [] },
    { name: "custom label", attrs: { label: "Neuwo home" }, children: [] },
    { name: "decorative", attrs: { label: "" }, children: [] },
  ],
  "neuwo-textarea": [
    { name: "default", attrs: {}, children: [] },
    {
      name: "label, required, rows and error",
      attrs: { name: "message", label: "Message", required: "", rows: "6", minlength: "2", maxlength: "200", placeholder: "Say more", error: "Too short" },
      children: [],
    },
    { name: "value with two lines", attrs: { value: "line one\nline two" }, children: [] },
    { name: "value with a leading newline", attrs: { value: "\nlead" }, children: [] },
    { name: "value with markup characters", attrs: { value: "x & y < z </textarea>" }, children: [] },
    { name: "small, disabled, readonly and no error line", attrs: { size: "sm", disabled: "", readonly: "", "no-error-line": "", "aria-label": "Notes" }, children: [] },
  ],
  "neuwo-range": [
    { name: "default", attrs: {}, children: [] },
    { name: "bounds and value", attrs: { name: "views", label: "Page views", min: "0", max: "200", step: "5", value: "50", "aria-valuetext": "50 views" }, children: [] },
    { name: "no value takes the midpoint", attrs: { min: "0", max: "10" }, children: [] },
    { name: "value outside the bounds and inverted bounds", attrs: { min: "10", max: "0", value: "500", error: "Too high" }, children: [] },
    { name: "small, disabled and no error line", attrs: { size: "sm", disabled: "", "no-error-line": "", "aria-label": "Volume", value: "30" }, children: [] },
  ],
  "neuwo-combobox": [
    {
      name: "flat with value",
      attrs: { name: "fruit", label: "Fruit", value: "b", placeholder: "Pick a fruit" },
      children: [{ tag: "option", attrs: { value: "a" }, text: "Apple" }, { tag: "option", attrs: { value: "b" }, text: "Banana" }],
    },
    {
      name: "grouped with selected",
      attrs: { name: "fruit", required: "" },
      children: [
        "\n  ",
        { tag: "option", attrs: { value: "a" }, text: "Apple" },
        "\n  ",
        {
          tag: "optgroup",
          attrs: { label: "Citrus" },
          children: [
            { tag: "option", attrs: { value: "o", selected: "" }, text: "Orange" },
            { tag: "option", text: "Lemon" },
          ],
        },
        "\n",
      ],
    },
    {
      name: "searchable",
      attrs: { searchable: "", name: "country", value: "fi", placeholder: "Start typing", "aria-label": "Country" },
      children: [{ tag: "option", attrs: { value: "fi" }, text: "Finland" }, { tag: "option", attrs: { value: "fr" }, text: "France" }],
    },
    {
      name: "disabled options",
      attrs: { form: "order", disabled: "", value: "c" },
      children: [{ tag: "option", attrs: { value: "a" }, text: "Apple" }, { tag: "option", attrs: { value: "c", disabled: "", selected: "" }, text: "Cherry" }],
    },
    { name: "empty", attrs: {}, children: [] },
    {
      name: "small with an error",
      attrs: { size: "sm", label: "Plan", error: "Please choose", placeholder: "Select one" },
      children: [{ tag: "option", attrs: { value: "pro" }, text: "Pro" }],
    },
  ],
  "neuwo-notice": [
    { name: "default message", attrs: {}, children: ["Read this page in Polish?"] },
    {
      name: "language hint",
      attrs: { position: "static", dismissible: "", "dismiss-label": "Close" },
      children: [{ tag: "span", attrs: { slot: "title" }, children: ["Read this page in ", { tag: "a", attrs: { href: "/pl/" }, text: "Polski" }, "?"] }],
    },
    {
      name: "indented consent banner",
      attrs: { position: "bottom-center", layout: "row", role: "dialog", "aria-label": "Cookies" },
      children: [
        "\n  ",
        { tag: "span", attrs: { slot: "title" }, text: "We use cookies" },
        "\n  We use analytics cookies.\n  ",
        { tag: "neuwo-button", attrs: { slot: "actions", variant: "glass", size: "sm" }, text: "Reject" },
        "\n  ",
        { tag: "neuwo-button", attrs: { slot: "actions", size: "sm" }, text: "Accept" },
        "\n",
      ],
    },
    { name: "top-start toast", attrs: { position: "top-start", dismissible: "" }, children: [{ tag: "span", attrs: { slot: "title" }, text: "Saved" }] },
    { name: "unknown values", attrs: { position: "toString", layout: "grid" }, children: ["Hint"] },
    {
      name: "indented title only",
      attrs: { position: "top-end" },
      children: ["\n  ", { tag: "span", attrs: { slot: "title" }, text: "Only a headline" }, "\n"],
    },
    { name: "empty", attrs: {}, children: [] },
  ],
  "neuwo-status-dot": [
    { name: "default", attrs: {}, children: [] },
    { name: "blue blink", attrs: { variant: "blue", motion: "blink" }, children: [] },
    { name: "pulse with large halo", attrs: { motion: "pulse", halo: "l" }, children: [] },
    { name: "small halo and medium glow", attrs: { halo: "s", glow: "m" }, children: [] },
    { name: "unknown values", attrs: { variant: "xyz", motion: "xyz", halo: "xl", glow: "xl" }, children: [] },
    { name: "forwarded host attributes", attrs: { title: "Online", "aria-label": "Online" }, children: [] },
  ],
};

/** @param {string} value */
const escape = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/**
 * @param {Child} child
 * @returns {string}
 */
export function markup(child) {
  if (typeof child === "string") return escape(child);
  const attrs = Object.entries(child.attrs ?? {}).map(([name, value]) => ` ${name}="${escape(value)}"`).join("");
  const inner = child.children ? child.children.map(markup).join("") : escape(child.text ?? "");
  return `<${child.tag}${attrs}>${inner}</${child.tag}>`;
}

/**
 * @param {Child} child
 * @returns {string}
 */
const textOf = (child) => (typeof child === "string" ? child : child.children ? child.children.map(textOf).join("") : (child.text ?? ""));

/**
 * @param {Child} child
 * @returns {ChildInfo}
 */
function describe(child) {
  if (typeof child === "string") return { tag: null, attrs: {}, text: child, slot: "default" };
  const attrs = { ...child.attrs };
  const nested = child.children ?? (child.text ? [child.text] : []);
  return { tag: child.tag, attrs, text: textOf(child), slot: attrs.slot || "default", children: nested.map(describe) };
}

const PROVIDERS = new Set(Object.values(templates).flatMap((template) => template.within ?? []));

/**
 * Expands the markup of a child as it sits in its host, so an element that reads the host as its `within` gets
 * the host's attributes; the host itself is left as it is.
 * @param {string} html
 * @param {{ tag: string, attrs: Record<string, string> }} host
 */
function expandIn(html, { tag, attrs }) {
  const registry = Object.fromEntries(Object.entries(templates).filter(([name]) => name !== tag));
  const close = `</${tag}>`;
  const open = markup({ tag, attrs, children: [] }).slice(0, -close.length);
  return expand(`${open}${html}${close}`, registry).slice(open.length, -close.length);
}

/**
 * The children as the HTML adapter receives them from the server, nested registered elements already expanded,
 * inside `host` when one is given.
 * @param {Child[]} children
 * @param {{ tag: string, attrs: Record<string, string> }} [host]
 */
export function renderChildren(children, host) {
  return children.map((child) => ({
    ...describe(child),
    html: host && PROVIDERS.has(host.tag) ? expandIn(markup(child), host) : expand(markup(child)),
  }));
}

const REFERENCES = ["for", "aria-describedby", "aria-labelledby", "aria-controls"];

/** @type {Window | undefined} */
let blank;

/**
 * happy-dom's parser keeps the newline after `<textarea>` that a browser drops, so `parsed` markup loses one here.
 * @param {string} html
 * @param {boolean} parsed
 * @returns {string}
 */
export function normalise(html, parsed) {
  if (typeof parsed !== "boolean") throw new TypeError("normalise() needs parsed: true for markup a browser would parse, false for a DOM tree");
  // happy-dom upgrades elements in a template's content, which browsers never do, so it parses where none is defined.
  blank ??= new Window();
  const holder = blank.document.createElement("template");
  holder.innerHTML = html;
  if (parsed) {
    for (const area of holder.content.querySelectorAll("textarea")) {
      if (area.textContent.startsWith("\n")) area.textContent = area.textContent.slice(1);
    }
  }
  /** @type {Map<string, string>} */
  const ids = new Map();
  for (const el of holder.content.querySelectorAll("[id]")) if (!ids.has(el.id)) ids.set(el.id, `id-${ids.size + 1}`);
  for (const el of holder.content.querySelectorAll("*")) {
    if (el.hasAttribute("id")) el.id = ids.get(el.id);
    for (const name of REFERENCES) {
      if (el.hasAttribute(name)) el.setAttribute(name, el.getAttribute(name).replace(/\S+/g, (token) => ids.get(token) ?? token));
    }
  }
  for (const el of holder.content.querySelectorAll("*")) {
    const attrs = Array.from(el.attributes, ({ name, value }) => [name, value]).sort(([a], [b]) => (a < b ? -1 : 1));
    for (const [name] of attrs) el.removeAttribute(name);
    for (const [name, value] of attrs) el.setAttribute(name, value);
  }
  return holder.innerHTML;
}

/**
 * @param {string} tag
 * @param {TemplateCase} testCase
 * @returns {string}
 */
export function renderHtml(tag, testCase) {
  return renderElement(tag, testCase.attrs, renderChildren(testCase.children, { tag, attrs: testCase.attrs }), templates[tag], idScope("neuwo-s"));
}
