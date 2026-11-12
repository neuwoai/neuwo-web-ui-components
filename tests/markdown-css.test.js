import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Off disk, since Vitest resolves a CSS `?raw` import to an empty string.
const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../src/foundation/markdown.css"), "utf8");
const tokensCss = readFileSync(join(__dirname, "../src/foundation/tokens.css"), "utf8");
const typographyCss = readFileSync(join(__dirname, "../src/foundation/typography.css"), "utf8");
// Comments stripped, so a term a comment names cannot fail the assertions that it appears nowhere.
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("markdown stylesheet", () => {
  // Scoped, so a list in a nav does not take the article treatment.
  it("scopes every element rule under .neuwo-markdown, and every other rule under a class", () => {
    const selectors = declarations
      .split("}")
      .map((block) => block.split("{")[0].trim())
      .filter(Boolean);
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      for (const part of selector.split(",")) {
        expect(part.trim()).toMatch(/^\.neuwo-(markdown|callout)(?![a-zA-Z0-9])/);
      }
    }
  });

  it("never restates a heading or a paragraph typography.css already styles", () => {
    expect(declarations).not.toMatch(/\.neuwo-markdown h[1-6]\s*[,{]/);
    expect(declarations).not.toMatch(/\.neuwo-markdown p\s*\{/);
    expect(typographyCss).toMatch(/(?:^|\n)p \{/);
  });

  it("owns no box: no rule on the container itself, and no measure", () => {
    expect(declarations).not.toMatch(/\.neuwo-markdown \{/);
    const widths = [...declarations.matchAll(/max-width:\s*([^;]+);/g)].map((m) => m[1].trim());
    expect(widths).toEqual(["100%"]);
  });

  it("sets lists on the body rhythm and closes a nested list flush", () => {
    const lists = css.match(/\.neuwo-markdown ul,\n\.neuwo-markdown ol \{[^}]*\}/)[0];
    expect(lists).toMatch(/color:\s*var\(--neuwo-color-text\)/);
    expect(lists).toMatch(/line-height:\s*var\(--neuwo-line-height-body\)/);
    expect(lists).toMatch(/padding-inline-start:\s*var\(--neuwo-space-6\)/);
    const nested = css.match(/\.neuwo-markdown li > ul,\n\.neuwo-markdown li > ol \{[^}]*\}/)[0];
    expect(nested).toMatch(/margin-top:\s*var\(--neuwo-space-2\)/);
    expect(nested).toMatch(/margin-bottom:\s*0/);
  });

  it("lifts bold text to the heading ink at semibold", () => {
    const rule = css.match(/\.neuwo-markdown strong \{[^}]*\}/)[0];
    expect(rule).toMatch(/color:\s*var\(--neuwo-color-heading\)/);
    expect(rule).toMatch(/font-weight:\s*var\(--neuwo-font-weight-semibold\)/);
  });

  it("marks a quote with the brand blue edge and muted italic ink", () => {
    const rule = css.match(/\.neuwo-markdown blockquote \{[^}]*\}/)[0];
    expect(rule).toMatch(/border-inline-start:\s*3px solid var\(--neuwo-color-blue\)/);
    expect(rule).toMatch(/color:\s*var\(--neuwo-color-text-muted\)/);
    expect(rule).toMatch(/font-style:\s*italic/);
  });

  it("draws the rule on the glass border", () => {
    const rule = css.match(/\.neuwo-markdown hr \{[^}]*\}/)[0];
    expect(rule).toMatch(/border:\s*none/);
    expect(rule).toMatch(/border-top:\s*1px solid var\(--neuwo-glass-border\)/);
  });

  it("blocks a standalone image but leaves an inline one alone", () => {
    const img = css.match(/\.neuwo-markdown img \{[^}]*\}/)[0];
    expect(img).toMatch(/max-width:\s*100%/);
    expect(img).toMatch(/height:\s*auto/);
    const standalone = css.match(/\.neuwo-markdown p > img:only-child \{[^}]*\}/)[0];
    expect(standalone).toMatch(/display:\s*block/);
    expect(standalone).toMatch(/border-radius:\s*var\(--neuwo-radius-lg\)/);
  });

  it("sets code in the mono token and confines the inline chrome to inline code", () => {
    const code = css.match(/\.neuwo-markdown code \{[^}]*\}/)[0];
    expect(code).toMatch(/font-family:\s*var\(--neuwo-font-mono\)/);
    expect(code).toMatch(/font-size:\s*var\(--neuwo-font-size-sm\)/);
    // The chrome must not double up on a sample already sitting on the panel.
    const inline = css.match(/\.neuwo-markdown :not\(pre\) > code \{[^}]*\}/)[0];
    expect(inline).toMatch(/background:\s*var\(--neuwo-color-grey-100\)/);
    expect(inline).toMatch(/border-radius:\s*var\(--neuwo-radius-sm\)/);
    // `anywhere` counts towards min-content width, so the box fits its column.
    expect(inline).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it("scrolls a code panel rather than wrapping it, and shows its focus", () => {
    const pre = css.match(/\.neuwo-markdown pre \{[^}]*\}/)[0];
    expect(pre).toMatch(/background:\s*var\(--neuwo-glass-bg\)/);
    expect(pre).toMatch(/overflow-x:\s*auto/);
    expect(pre).toMatch(/tab-size:\s*2/);
    expect(pre).not.toMatch(/overflow-wrap/);
    expect(css).toMatch(/\.neuwo-markdown pre:focus-visible \{[^}]*border-color:\s*var\(--neuwo-color-blue\)/);
  });

  it("rules the table on the glass border and sets its head in the heading face", () => {
    const table = css.match(/\.neuwo-markdown table \{[^}]*\}/)[0];
    expect(table).toMatch(/width:\s*100%/);
    expect(table).toMatch(/border-collapse:\s*collapse/);
    const cells = css.match(/\.neuwo-markdown th,\n\.neuwo-markdown td \{[^}]*\}/)[0];
    expect(cells).toMatch(/border-bottom:\s*1px solid var\(--neuwo-glass-border\)/);
    expect(cells).toMatch(/vertical-align:\s*top/);
    const head = css.match(/\.neuwo-markdown th \{[^}]*\}/)[0];
    expect(head).toMatch(/font-family:\s*var\(--neuwo-font-heading\)/);
    expect(head).toMatch(/color:\s*var\(--neuwo-color-heading\)/);
  });

  it("carries no !important, so a consumer can override any rule", () => {
    expect(declarations).not.toContain("!important");
  });

  it("carries no raw colour literal", () => {
    expect(declarations).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(declarations).not.toMatch(/rgba?\(/);
  });

  it("only uses tokens that tokens.css defines", () => {
    for (const token of [
      "--neuwo-space-1",
      "--neuwo-space-2",
      "--neuwo-space-3",
      "--neuwo-space-4",
      "--neuwo-space-5",
      "--neuwo-space-6",
      "--neuwo-space-8",
      "--neuwo-radius-sm",
      "--neuwo-radius-md",
      "--neuwo-radius-lg",
      "--neuwo-color-text",
      "--neuwo-color-text-muted",
      "--neuwo-color-heading",
      "--neuwo-color-blue",
      "--neuwo-color-green",
      "--neuwo-color-red",
      "--neuwo-color-grey-100",
      "--neuwo-glass-bg",
      "--neuwo-glass-border",
      "--neuwo-font-mono",
      "--neuwo-font-heading",
      "--neuwo-font-size-sm",
      "--neuwo-font-size-base",
      "--neuwo-font-weight-semibold",
      "--neuwo-line-height-body",
    ]) {
      expect(css).toContain(`var(${token})`);
      expect(tokensCss).toContain(`${token}:`);
    }
  });
});

// Same sheet, since nothing about the callout is a component that would justify a second file to link.
describe("callout recipe", () => {
  it("contains its children's margins so the padding holds", () => {
    const rule = css.match(/(?:^|\n)\.neuwo-callout \{[^}]*\}/)[0];
    expect(rule).toMatch(/display:\s*flow-root/);
    expect(rule).toMatch(/padding:\s*var\(--neuwo-space-4\) var\(--neuwo-space-5\)/);
    // The block's own padding is the bottom gap; the last child's would double it.
    expect(css).toMatch(/\.neuwo-callout > :last-child \{[^}]*margin-bottom:\s*0/);
  });

  // The two tie on specificity, so the callout must come later to keep its padding after a list.
  it("is ordered after the element rules it has to beat", () => {
    expect(css.indexOf(".neuwo-markdown ul,")).toBeLessThan(css.indexOf(".neuwo-callout > :last-child"));
  });

  // A declaration on `.neuwo-callout` would beat a consumer's accent set on :root or a wrapper.
  it("reads the accent as a knob rather than declaring it on the block", () => {
    const rule = css.match(/(?:^|\n)\.neuwo-callout \{[^}]*\}/)[0];
    expect(rule).not.toMatch(/--neuwo-callout-accent:/);
    expect(rule).toMatch(/border-inline-start:\s*3px solid var\(--neuwo-callout-accent, var\(--neuwo-color-blue\)\)/);
    expect(rule).toMatch(
      /background:\s*color-mix\(in srgb, var\(--neuwo-callout-accent, var\(--neuwo-color-blue\)\) 8%, transparent\)/
    );
  });

  it("labels the block with a span-level title in the heading face", () => {
    const rule = css.match(/\.neuwo-callout__title \{[^}]*\}/)[0];
    expect(rule).toMatch(/display:\s*block/);
    expect(rule).toMatch(/color:\s*var\(--neuwo-callout-accent, var\(--neuwo-color-blue\)\)/);
    expect(rule).toMatch(/font-family:\s*var\(--neuwo-font-heading\)/);
    expect(rule).toMatch(/font-weight:\s*var\(--neuwo-font-weight-semibold\)/);
  });

  it("drives all three intents through the one knob", () => {
    expect(css).toMatch(/\.neuwo-callout--info \{\s*--neuwo-callout-accent:\s*var\(--neuwo-color-blue\);/);
    expect(css).toMatch(/\.neuwo-callout--tip \{\s*--neuwo-callout-accent:\s*var\(--neuwo-color-green\);/);
    expect(css).toMatch(/\.neuwo-callout--danger \{\s*--neuwo-callout-accent:\s*var\(--neuwo-color-red\);/);
    // Each modifier sets the knob and nothing else, so intent stays one axis.
    for (const intent of ["info", "tip", "danger"]) {
      const body = css.match(new RegExp(`\\.neuwo-callout--${intent} \\{([^}]*)\\}`))[1];
      const declared = body.split(";").filter((line) => line.trim());
      expect(declared).toHaveLength(1);
    }
  });

  // The brand has no amber, so a consumer sets --neuwo-callout-accent on its own class instead.
  it("ships no warning intent, because no warning colour exists", () => {
    expect(declarations).not.toContain(".neuwo-callout--warning");
    expect(tokensCss).not.toMatch(/--neuwo-color-(amber|orange|yellow|warning)\s*:/);
  });
});
