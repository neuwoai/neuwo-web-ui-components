import { templates } from "../templates.js";
import { expandWith } from "./expand.js";

const PREFIX = /^[A-Za-z](?:[A-Za-z0-9_-]*[A-Za-z_-])?$/;

/**
 * Expands every registered `<neuwo-*>` element in an HTML document in place. Elements that already hold their
 * rendered markup, and anything inside `<template>`, `<script>`, `<style>` or `<textarea>`, are left alone, as
 * is anything a browser parses as SVG or MathML: inside `<svg>` or `<math>`, but for the points where the parser
 * returns to HTML. So is every byte outside the elements it expands, but one: a `<p>` that holds nothing but
 * elements whose markup is block content, whitespace and comments, as Markdown writes around such elements, is
 * replaced by what it holds. Ids are named from `prefix`; give each separately expanded fragment its own, so the ids never collide on a page.
 * @param {string} html
 * @param {{ prefix?: string }} [options] - `prefix` starts with a letter, ends with a letter, `_` or `-`, holds only letters, digits, `_` and `-`, and does not start with `neuwo-c`. Defaults to `neuwo-s`.
 * @returns {string}
 */
export function expand(html, options = {}) {
  const prefix = options.prefix ?? "neuwo-s";
  if (!PREFIX.test(prefix) || prefix.startsWith("neuwo-c")) {
    throw new TypeError(`The prefix ${JSON.stringify(prefix)} must start with a letter, end with a letter, "_" or "-", hold only letters, digits, "_" and "-", and not start with "neuwo-c".`);
  }
  return expandWith(html, templates, prefix);
}

/**
 * Adds the `neuwo-expand` transform, which runs `expand` on every `.html` output.
 * @param {{ addTransform: (name: string, transform: (this: { page: { outputPath: string | false } }, content: string) => string) => void }} eleventyConfig
 */
export function eleventyPlugin(eleventyConfig) {
  eleventyConfig.addTransform("neuwo-expand", function (content) {
    const path = this.page.outputPath;
    return path && path.endsWith(".html") ? expand(content) : content;
  });
}
