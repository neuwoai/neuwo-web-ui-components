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
