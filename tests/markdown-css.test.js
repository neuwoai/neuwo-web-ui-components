import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Read the CSS off disk rather than via `import ... ?raw`: Vitest does not
// transform `?raw` for CSS here (it yields an empty string).
const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../src/foundation/markdown.css"), "utf8");
const tokensCss = readFileSync(join(__dirname, "../src/foundation/tokens.css"), "utf8");
const typographyCss = readFileSync(join(__dirname, "../src/foundation/typography.css"), "utf8");
// Declarations only, for the assertions that a term appears nowhere: the
// comments discuss both !important and colour literals by name.
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("markdown stylesheet", () => {
  // Scoped, not bare-tag: a list in a nav must not take the article treatment.
  // `.callout` is a class, so it carries its own scope and works outside a
  // rendered document too.
  it("scopes every element rule under .markdown, and every other rule under a class", () => {
    const selectors = declarations
      .split("}")
      .map((block) => block.split("{")[0].trim())
      .filter(Boolean);
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      for (const part of selector.split(",")) {
        expect(part.trim()).toMatch(/^\.(markdown|callout)(?![a-zA-Z0-9])/);
      }
    }
  });

  // typography.css owns headings and paragraphs; restating them here would be
  // the duplication this sheet exists to remove.
  it("never restates a heading or a paragraph typography.css already styles", () => {
    expect(declarations).not.toMatch(/\.markdown h[1-6]\s*[,{]/);
    expect(declarations).not.toMatch(/\.markdown p\s*\{/);
    expect(typographyCss).toMatch(/(?:^|\n)p \{/);
  });

  // Where the column sits and how wide it is are page decisions, as in
  // background.css and navigation.css. The only max-width is an image fitting
  // its container, never a reading measure.
  it("owns no box: no rule on the container itself, and no measure", () => {
    expect(declarations).not.toMatch(/\.markdown \{/);
    const widths = [...declarations.matchAll(/max-width:\s*([^;]+);/g)].map((m) => m[1].trim());
    expect(widths).toEqual(["100%"]);
  });

  it("sets lists on the body rhythm and closes a nested list flush", () => {
    const lists = css.match(/\.markdown ul,\n\.markdown ol \{[^}]*\}/)[0];
    expect(lists).toMatch(/color:\s*var\(--color-text\)/);
    expect(lists).toMatch(/line-height:\s*var\(--line-height-body\)/);
    expect(lists).toMatch(/padding-left:\s*var\(--space-6\)/);
    const nested = css.match(/\.markdown li > ul,\n\.markdown li > ol \{[^}]*\}/)[0];
    expect(nested).toMatch(/margin-top:\s*var\(--space-2\)/);
    expect(nested).toMatch(/margin-bottom:\s*0/);
  });

  it("lifts bold text to the heading ink at semibold", () => {
    const rule = css.match(/\.markdown strong \{[^}]*\}/)[0];
    expect(rule).toMatch(/color:\s*var\(--color-heading\)/);
    expect(rule).toMatch(/font-weight:\s*var\(--font-weight-semibold\)/);
  });

  it("marks a quote with the brand blue edge and muted italic ink", () => {
    const rule = css.match(/\.markdown blockquote \{[^}]*\}/)[0];
    expect(rule).toMatch(/border-left:\s*3px solid var\(--color-blue\)/);
    expect(rule).toMatch(/color:\s*var\(--color-text-muted\)/);
    expect(rule).toMatch(/font-style:\s*italic/);
  });

  it("draws the rule on the glass border", () => {
    const rule = css.match(/\.markdown hr \{[^}]*\}/)[0];
    expect(rule).toMatch(/border:\s*none/);
    expect(rule).toMatch(/border-top:\s*1px solid var\(--glass-border\)/);
  });

  it("blocks a standalone image but leaves an inline one alone", () => {
    const img = css.match(/\.markdown img \{[^}]*\}/)[0];
    expect(img).toMatch(/max-width:\s*100%/);
    expect(img).toMatch(/height:\s*auto/);
    const standalone = css.match(/\.markdown p > img:only-child \{[^}]*\}/)[0];
    expect(standalone).toMatch(/display:\s*block/);
    expect(standalone).toMatch(/border-radius:\s*var\(--radius-lg\)/);
  });

  it("sets code in the mono token and confines the inline chrome to inline code", () => {
    const code = css.match(/\.markdown code \{[^}]*\}/)[0];
    expect(code).toMatch(/font-family:\s*var\(--font-mono\)/);
    expect(code).toMatch(/font-size:\s*var\(--font-size-sm\)/);
    // The chrome must not double up on a sample already sitting on the panel.
    const inline = css.match(/\.markdown :not\(pre\) > code \{[^}]*\}/)[0];
    expect(inline).toMatch(/background:\s*var\(--color-grey-100\)/);
    expect(inline).toMatch(/border-radius:\s*var\(--radius-sm\)/);
    // `anywhere` counts towards min-content width, so the box fits its column.
    expect(inline).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it("scrolls a code panel rather than wrapping it, and shows its focus", () => {
    const pre = css.match(/\.markdown pre \{[^}]*\}/)[0];
    expect(pre).toMatch(/background:\s*var\(--glass-bg\)/);
    expect(pre).toMatch(/overflow-x:\s*auto/);
    expect(pre).toMatch(/tab-size:\s*2/);
    expect(pre).not.toMatch(/overflow-wrap/);
    expect(css).toMatch(/\.markdown pre:focus-visible \{[^}]*border-color:\s*var\(--color-blue\)/);
  });

  it("rules the table on the glass border and sets its head in the heading face", () => {
    const table = css.match(/\.markdown table \{[^}]*\}/)[0];
    expect(table).toMatch(/width:\s*100%/);
    expect(table).toMatch(/border-collapse:\s*collapse/);
    const cells = css.match(/\.markdown th,\n\.markdown td \{[^}]*\}/)[0];
    expect(cells).toMatch(/border-bottom:\s*1px solid var\(--glass-border\)/);
    expect(cells).toMatch(/vertical-align:\s*top/);
    const head = css.match(/\.markdown th \{[^}]*\}/)[0];
    expect(head).toMatch(/font-family:\s*var\(--font-heading\)/);
    expect(head).toMatch(/color:\s*var\(--color-heading\)/);
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
      "--space-1",
      "--space-2",
      "--space-3",
      "--space-4",
      "--space-5",
      "--space-6",
      "--space-8",
      "--radius-sm",
      "--radius-md",
      "--radius-lg",
      "--color-text",
      "--color-text-muted",
      "--color-heading",
      "--color-blue",
      "--color-green",
      "--color-red",
      "--color-grey-100",
      "--glass-bg",
      "--glass-border",
      "--font-mono",
      "--font-heading",
      "--font-size-sm",
      "--font-size-base",
      "--font-weight-semibold",
      "--line-height-body",
    ]) {
      expect(css).toContain(`var(${token})`);
      expect(tokensCss).toContain(`${token}:`);
    }
  });
});

// Same sheet: the callout is part of the Markdown surface, and nothing about it
// is a component, so it ships here rather than as a second file to link.
describe("callout recipe", () => {
  it("contains its children's margins so the padding holds", () => {
    const rule = css.match(/(?:^|\n)\.callout \{[^}]*\}/)[0];
    expect(rule).toMatch(/display:\s*flow-root/);
    expect(rule).toMatch(/padding:\s*var\(--space-4\) var\(--space-5\)/);
    // The block's own padding is the bottom gap; the last child's would double it.
    expect(css).toMatch(/\.callout > :last-child \{[^}]*margin-bottom:\s*0/);
  });

  // The callout follows the element rules, so a callout ending in a list keeps
  // its own bottom padding: the two tie on specificity and the later one wins.
  it("is ordered after the element rules it has to beat", () => {
    expect(css.indexOf(".markdown ul,")).toBeLessThan(css.indexOf(".callout > :last-child"));
  });

  // Read with a fallback, never declared on `.callout` itself: a declaration
  // here would beat the value a consumer inherits in from :root or a wrapper.
  it("reads the accent as a knob rather than declaring it on the block", () => {
    const rule = css.match(/(?:^|\n)\.callout \{[^}]*\}/)[0];
    expect(rule).not.toMatch(/--callout-accent:/);
    expect(rule).toMatch(/border-left:\s*3px solid var\(--callout-accent, var\(--color-blue\)\)/);
    expect(rule).toMatch(
      /background:\s*color-mix\(in srgb, var\(--callout-accent, var\(--color-blue\)\) 8%, transparent\)/
    );
  });

  it("labels the block with a span-level title in the heading face", () => {
    const rule = css.match(/\.callout__title \{[^}]*\}/)[0];
    expect(rule).toMatch(/display:\s*block/);
    expect(rule).toMatch(/color:\s*var\(--callout-accent, var\(--color-blue\)\)/);
    expect(rule).toMatch(/font-family:\s*var\(--font-heading\)/);
    expect(rule).toMatch(/font-weight:\s*var\(--font-weight-semibold\)/);
  });

  it("drives all three intents through the one knob", () => {
    expect(css).toMatch(/\.callout--info \{\s*--callout-accent:\s*var\(--color-blue\);/);
    expect(css).toMatch(/\.callout--tip \{\s*--callout-accent:\s*var\(--color-green\);/);
    expect(css).toMatch(/\.callout--danger \{\s*--callout-accent:\s*var\(--color-red\);/);
    // Each modifier sets the knob and nothing else, so intent stays one axis.
    for (const intent of ["info", "tip", "danger"]) {
      const body = css.match(new RegExp(`\\.callout--${intent} \\{([^}]*)\\}`))[1];
      const declared = body.split(";").filter((line) => line.trim());
      expect(declared).toHaveLength(1);
    }
  });

  // The brand has no amber, so a warning modifier would have to invent one.
  // A consumer needing it sets --callout-accent on its own class instead.
  it("ships no warning intent, because no warning colour exists", () => {
    expect(declarations).not.toContain(".callout--warning");
    expect(tokensCss).not.toMatch(/--color-(amber|orange|yellow|warning)\s*:/);
  });
});
