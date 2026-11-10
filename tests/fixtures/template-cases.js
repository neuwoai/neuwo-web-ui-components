import { renderElement } from "../../src/core/adapters/html.js";
import { idScope } from "../../src/core/ids.js";
import { expand } from "../../src/server/index.js";
import { templates } from "../../src/templates.js";

/** @typedef {{ tag: string, attrs?: Record<string, string>, text?: string, children?: Child[] }} ChildElement */
/** @typedef {string | ChildElement} Child */
/** @typedef {{ name: string, attrs: Record<string, string>, children: Child[] }} TemplateCase */

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
  "neuwo-deal-id": [
    { name: "default", attrs: {}, children: ["NW-CA-2026-04-8A3F"] },
    { name: "small", attrs: { size: "s" }, children: ["NW-1"] },
    { name: "large", attrs: { size: "l" }, children: ["NW-2"] },
    { name: "unknown size", attrs: { size: "xl" }, children: ["NW-3"] },
    { name: "empty", attrs: {}, children: [] },
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
 * The children as the HTML adapter receives them from the server, nested registered elements already expanded.
 * @param {Child[]} children
 */
export function renderChildren(children) {
  return children.map((child) => {
    const attrs = typeof child === "string" ? {} : { ...child.attrs };
    return {
      tag: typeof child === "string" ? null : child.tag,
      attrs,
      text: textOf(child),
      slot: attrs.slot || "default",
      html: expand(markup(child)),
    };
  });
}

/**
 * @param {string} html
 * @returns {string}
 */
export function normalise(html) {
  const holder = document.createElement("template");
  holder.innerHTML = html;
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
  return renderElement(tag, testCase.attrs, renderChildren(testCase.children), templates[tag], idScope("neuwo-s"));
}
