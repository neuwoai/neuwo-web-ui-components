/** @typedef {import("../../core/template.js").ChildInfo} ChildInfo */

const FULL = /^(https?:\/\/[^/?#]+)(.*)$/i;
const ORIGIN = /^https?:\/\/[^/]+$/;
const ENTRIES = new Set(["neuwo-nav-item", "neuwo-nav-section"]);

/**
 * The form in which a page's address compares: the path without its query, hash, trailing slash or trailing
 * `/index.html`, with `https://host` kept in front for a full URL. A root-relative root stays `/`, and a full URL's
 * root is its `https://host`.
 * @param {string | null | undefined} value - an `href` or a `current` path.
 * @returns {string | null} null for a relative, protocol-relative, `#` or non-http address.
 */
export function normalizePath(value) {
  if (typeof value !== "string") return null;
  const address = value.trim().replace(/[?#].*$/s, "");
  const full = FULL.exec(address);
  if (!full && !(address.startsWith("/") && !address.startsWith("//"))) return null;
  const path = (full ? full[2] : address).replace(/\/index\.html$/, "/").replace(/\/+$/, "");
  return full ? full[1].toLowerCase() + path : path || "/";
}

/**
 * Whether `href` names the page `current` names.
 * @param {string} href
 * @param {string} current
 * @returns {boolean}
 */
export function isPage(href, current) {
  const page = normalizePath(href);
  return page !== null && page === normalizePath(current);
}

/**
 * Whether the page `current` names lies below the page `href` names, which is never a site's root.
 * @param {string} href
 * @param {string} current
 * @returns {boolean}
 */
export function isUnder(href, current) {
  const base = normalizePath(href);
  const page = normalizePath(current);
  if (base === null || page === null || base === "/" || ORIGIN.test(base)) return false;
  return page.startsWith(`${base}/`);
}

/**
 * Whether an entry or a section anywhere among `children`, at any depth, links to the page `current` names or to a
 * page above it. An `href` on any other element, such as a link in an entry's label, never counts.
 * @param {ChildInfo[]} children
 * @param {string} current
 * @returns {boolean}
 */
export function holds(children, current) {
  return children.some((child) => {
    const href = child.tag !== null && ENTRIES.has(child.tag) ? child.attrs.href : undefined;
    if (href && (isPage(href, current) || isUnder(href, current))) return true;
    return holds(child.children ?? [], current);
  });
}
