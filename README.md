# Neuwo Web UI Library

Neuwo design-language web components: vanilla custom elements, zero runtime deps. The button,
badge, deal-ID chip, status dot, logo, copy wrapper, notice card, CTA band, form fields, checkbox,
toggle, radio, radio group and segmented control render into light DOM and can be server-rendered.
The single source for reusable Neuwo UI and its styling (tokens, component recipes, typography).

## Install

Three ways in, depending on the consumer.

**npm**, for anything with a build step:

```bash
npm install @neuwo/web-ui-library--demo
```

**jsDelivr**, for a page with no build step. Every published file is served straight from the
npm tarball, with permissive CORS headers, so the fonts load without any configuration:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.6/dist/neuwo-components.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.6/dist/neuwo.js"></script>
```

**Self-hosted**, to keep every runtime request on your own origin and take the registry out of
the runtime path entirely. Copy the published `dist/` into your own static output at build time:

```js
// Eleventy
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";

const require = createRequire(import.meta.url);
const dist = join(dirname(require.resolve("@neuwo/web-ui-library--demo/package.json")), "dist");

eleventyConfig.addPassthroughCopy({
  [relative(process.cwd(), dist)]: "vendor/neuwo",
});
```

```html
<link rel="stylesheet" href="/vendor/neuwo/neuwo-components.css" />
<script type="module" src="/vendor/neuwo/neuwo.js"></script>
```

[demo/eleventy/](https://github.com/neuwoai/neuwo-web-ui-components/tree/v0.6.0/demo/eleventy) is a complete Eleventy site set up this way.

Next.js and Vite serve `public/` verbatim, so a `prebuild` script copying the same directory
into `public/vendor/neuwo` achieves the same thing.

### Versions

A page that server-renders the components fixes their markup at build time, so the markup is
part of the public API. Before 1.0, class names and markup structure change only in minor
releases; patch releases change CSS and behaviour only. Two ways to take that:

- **Float on patches**, for example `@0.6` in a jsDelivr URL. Styling and behaviour fixes reach
  every site centrally. A markup change reaches you only when you upgrade and rebuild.
- **Pin**, for example `@0.6.0`, or the version your lockfile resolves. Nothing changes until
  you decide it should. A pinned URL is immutable and cached for a year, while a floating one is
  cached at the edge for about half a day.

Either way, serve the stylesheet and the script from the same version you built with.

### Fonts

The brand fonts are `@font-face` rules inside the stylesheet, so there is nothing to inject.
Served from jsDelivr or your own origin, the `url()`s resolve to the `fonts/` folder beside the
stylesheet. A bundler treats them as ordinary CSS `url()`s: Vite, webpack and Turbopack copy the
woff2 files into the app's output and rewrite the URLs with no configuration. This is verified
with Vite 8 (dev server and build) and Next.js 16 (Turbopack and webpack).

Each font is two files. The Latin file, such as `noto-sans-variable.woff2`, covers English,
Finnish, Swedish, Estonian and the other Western European languages. The extension file, such as
`noto-sans-ext-variable.woff2`, holds Central European and Vietnamese letters and further symbols.
Each face has a `unicode-range`, so the browser downloads the extension file only when the page
uses one of its characters. An English or Finnish page downloads 179 KB of fonts in all.

To serve the fonts from somewhere else, override the faces by declaring your own `@font-face`
rules after the stylesheet, one per file, each with the library face's `unicode-range`. To avoid a
swap on first paint, preload a file:

```html
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.6/dist/fonts/outfit-variable.woff2" />
```

With a bundler, preload the URL the bundler gives the file, which is the fingerprinted one the
stylesheet points at, so the browser downloads the file once. Import the file from the package and
hand it to React's `preload` in the root layout:

```tsx
// app/layout.tsx
import { preload } from "react-dom";
import notoSans from "@neuwo/web-ui-library--demo/fonts/noto-sans-variable.woff2";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  preload(notoSans, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- Next.js 16 with Turbopack and Vite 8 import the file as that URL with no configuration. An app
  built with webpack (`next build --webpack`) needs a rule so that a script may import it:
  `config.module.rules.push({ test: /\.woff2$/, issuer: /\.[jt]sx?$/, type: "asset/resource" })`
  in `next.config`'s `webpack` function. Add the `webpack` function only to an app built with
  webpack: Next.js stops a Turbopack build that finds one and no `turbopack` setting.
- TypeScript needs a declaration for the import. Vite's `vite/client` types have one; in Next.js
  add `declare module "*.woff2" { const src: string; export default src; }` to a `.d.ts` file.
- Preload what the first screen shows: Noto Sans for text, and Outfit when a heading is in view.
  Preload the Latin file only. A preloaded extension file downloads on every page, which undoes
  the split.
  A preload helps where the page is rendered on the server; in an app rendered only in the browser,
  the font is requested as soon as text needs it either way.

Until a font arrives, text is drawn in Arial, or in Liberation Sans or Arimo where Arial is missing,
sized to match the font at each weight the tokens use, 400 to 800: Arial up to 500, Arial Bold from
600, and Arial Italic or Arial Bold Italic for italic text. The swap barely moves the page.

## Consume

Components need the stylesheet and the script. Link `neuwo-components.css`, which holds the
design tokens, the font faces and every component's styles, then load the script; components
self-register.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.6/dist/neuwo-components.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.6/dist/neuwo.js"></script>
<neuwo-button variant="solid">Get Started</neuwo-button>
```

In a bundler, import the stylesheet where you import the library:

```js
import "@neuwo/web-ui-library--demo/neuwo-components.css";
import "@neuwo/web-ui-library--demo";
```

The script is safe to import on a server, where it registers nothing.

A bundler resolves `.`, `./jsx-runtime` and `./jsx-dev-runtime` to a split build in `dist/bundler/`,
where the entries share their template code through a chunk, so an app that loads both the elements
and the JSX runtime downloads that code once. The CDN files, `dist/neuwo.js` and
`dist/neuwo-standalone.js`, are single self-contained bundles, so a page costs one request.

Tokens are custom properties on `:root` and inherit through every component, so you re-theme by
setting them after the stylesheet:

```css
:root { --neuwo-color-blue: oklch(77% 0.18 132); }
```

For Neuwo typography on native headings and text as well, link `neuwo.css` instead. It is
`neuwo-components.css` plus typography, the page surface and the Markdown surface
(`neuwo-components.css` already carries the navigation link classes).

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.6/dist/neuwo.css" />
```

Typography alone is also published as `foundation/typography.css`, and tokens alone as
`foundation/tokens.css`, for a consumer that keeps its own element styling.

### Setup per kind of site

| Site | One-time setup |
|---|---|
| Next.js, server-rendered React (React Router, Remix) | `"jsxImportSource": "@neuwo/web-ui-library--demo"` in `tsconfig`; import the stylesheet in the root layout; import the library once from a client component; [demo/nextjs](https://github.com/neuwoai/neuwo-web-ui-components/tree/v0.6.0/demo/nextjs) |
| Client-only React (Vite) | the same `jsxImportSource` line; import the stylesheet and the library at the entry; [demo/react-vite](https://github.com/neuwoai/neuwo-web-ui-components/tree/v0.6.0/demo/react-vite) |
| Eleventy | `eleventyConfig.addPlugin(neuwo)`; link the stylesheet; script tag for `neuwo.js`; [demo/eleventy](https://github.com/neuwoai/neuwo-web-ui-components/tree/v0.6.0/demo/eleventy) |
| Astro and other Node builds | call `expand(html)` from `@neuwo/web-ui-library--demo/server` on the output; link the stylesheet; load `neuwo.js` |
| Plain HTML, non-JavaScript servers | link the stylesheet and load `neuwo.js`; components render when the script runs |
| A page that can only add one script | `neuwo-standalone.js` alone; components render when the script runs |

"The stylesheet" is `neuwo-components.css`, or `neuwo.css` for Neuwo typography too. React and
Next.js are covered in [React](#react), Eleventy and other builds in [Server rendering](#server-rendering).

Without a framework, a script can change a rendered element as it would any other: set its
`textContent` or `innerHTML`, append a child with a `slot`, change the `slot` of a child already
placed, add or remove content inside the element's wrappers, or set `aria-*`, `title` and `role`.
The element fits the change into its markup in a microtask, so read the markup back after an
`await`, not on the next line. Taken out of the page, as a toast is between two messages, the
element still fits a change inside its wrappers, or to the `slot` of a child already placed, in a
microtask; a change to its own children, `aria-*`, `title` or `role` is fitted when it is put back.
As on first render, a child with no region to go to is removed, such as one with a misspelt `slot`
or any child of an element that has no regions.

### A page that can only add a script

Where you cannot link a stylesheet, load the standalone build on its own:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.6/dist/neuwo-standalone.js"></script>
<neuwo-button variant="solid">Get Started</neuwo-button>
```

It embeds `neuwo-components.css`, applies it only if the page has not already linked it, and
loads the fonts from beside itself. Nothing renders until the script has run, so prefer the
linked stylesheet wherever you can add one.

### Server rendering

Import from `@neuwo/web-ui-library--demo/server`. `expand(html, options?)` returns the HTML with every
registered `<neuwo-*>` tag written out as its full markup, so the page paints before any script
runs and still works with the script blocked.

```js
import { expand } from "@neuwo/web-ui-library--demo/server";

const output = expand('<neuwo-button variant="solid">Get Started</neuwo-button>');
```

For Eleventy, add the plugin; it runs `expand` on every `.html` output:

```js
// eleventy.config.js
import { eleventyPlugin as neuwo } from "@neuwo/web-ui-library--demo/server";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(neuwo);
}
```

Then link the stylesheet and load `neuwo.js` in your layout as above; [demo/eleventy](https://github.com/neuwoai/neuwo-web-ui-components/tree/v0.6.0/demo/eleventy) is a working site. For Astro and other Node
builds, call `expand` on each page's output before it is written.

Expand a whole page once, or give each separately expanded fragment its own `prefix`. Every call
numbers its ids from 1 again, so two fragments expanded with the same prefix and then joined into
one page repeat them, and a label points at the wrong control until the script runs and renames
the duplicates.

```js
const header = expand(headerHtml, { prefix: "hdr" });
const article = expand(articleHtml, { prefix: "art" });
```

A prefix starts with a letter, ends with a letter, `_` or `-`, holds only letters, digits, `_` and
`-`, and does not start with `neuwo-c`, which the browser uses. The default is `neuwo-s`, and any
other value that breaks a rule throws a `TypeError`.

Two copies adopt the markup they carry as written, because the browser builds a parsed element
exactly as a script does and the element cannot tell them apart. A clone of a `<template>`'s
`content` (`template.content.cloneNode(true)`) keeps the attributes its markup was written with, and
so do served rows cloned and renamed, say a new `name`, before the elements are defined. Set such an
attribute after the elements are defined.

A copy of a rendered element made with `cloneNode(true)` adopts its markup as written too, since the
element cannot tell a change made inside its wrappers before it was first inserted from markup
served that way. So a copy whose wrapper a script emptied, or one of whose placed children it gave a
new `slot`, keeps the old arrangement. Call `refresh()` on the copy after such a change; it fits the
markup at once, in the page or out of it. An attribute set on the copy needs no such call, as it
applies at once, and neither does a child appended to the copy itself, which is placed when the copy
is inserted.

In Markdown, keep a block component, such as a field, `<neuwo-copy>`, `<neuwo-cta>` or
`<neuwo-notice>`, out of paragraphs of text. Markdown wraps a component on its own line, or a run of
them on consecutive lines, in a `<p>`, and a browser closes a paragraph at the first block element
inside it, which would move the component's markup out of the element. So `expand` replaces a
paragraph that holds only block components, whitespace and comments with what it holds, dropping the
paragraph's own attributes. A block component that shares a paragraph with text or an inline element
stays inside it and breaks.

A tag inside `<svg>` or `<math>` is left as it is where a browser parses it as SVG or MathML rather
than as an element of the library. Where the browser parses HTML again, `expand` writes components
out as anywhere else: inside an SVG `<foreignObject>`, `<desc>` or `<title>`, a MathML `<mi>`, `<mo>`,
`<mn>`, `<ms>` or `<mtext>`, or an `<annotation-xml>` whose `encoding` is `text/html` or
`application/xhtml+xml`, and after an HTML tag, such as `<p>` or `<div>`, that ends the drawing.

### Status colours

The tokens carry four status scales for feedback: `--neuwo-color-success-*`, `--neuwo-color-info-*`,
`--neuwo-color-warning-*` and `--neuwo-color-error-*`. Each has five steps, named for their OKLCH
lightness: `400` is 40 %, then `550`, `700`, `800` and `900`, darkest to brightest, the same direction
as the grey scale. A step has the same lightness in every scale, so it reads at the same contrast on
the page whichever status it colours: about 2, 4, 7.5, 11 and 15 to 1 from `400` to `900`. A step
added later takes the name of its lightness, so none of these is ever renumbered.

| Step | Use it for |
|---|---|
| `900`, `800` | Text of any size |
| `700` | Text, icons and dots |
| `550` | Borders and large text only |
| `400` | Fills only, with `900` text on them |

```css
.quota-warning {
  color: var(--neuwo-color-warning-800);
  border-color: var(--neuwo-color-warning-550);
}
```

There is no unnumbered `--neuwo-color-warning`: name the step. The brand colours are unchanged, and
the components still draw from them: a field's error is `--neuwo-color-red`, at 62.83 % lightness,
between `error-550` and `error-700`.

### Links

The sheet styles bare `<a>` in prose: brand blue, underlined, deepening to `--neuwo-color-blue-dark`
on hover. Two classes ride along with it.

```html
<a class="neuwo-link" href="/privacy/">Privacy Policy</a>
<a class="neuwo-link neuwo-link--hover-green" href="/cookies/">Cookie Policy</a>
```

`.neuwo-link` states the same recipe explicitly, for an anchor whose surroundings strip link styling.
An anchor you put inside a component, such as a link in a checkbox's label, is plain light DOM, so
the bare `a` rule already reaches it. `.neuwo-link--hover-green` swaps the hover colour to the brand
green. Both underline at rest and carry the underline into the hover colour, because
`text-decoration-color` follows `currentColor`.

There is deliberately no `<neuwo-link>` element. Prose is authored in Markdown and CMSes that
emit `<a href>`, so a component would be bypassed by the very content it was built for, and a
class keeps the anchor in the source HTML: crawlable, and still a working link with the script
blocked. The trade is that a host page's own CSS can override these rules.

### Eyebrow

`typography.css` also publishes `.neuwo-eyebrow`, the small uppercase kicker above a heading:
`--neuwo-font-heading` (Outfit), `--neuwo-font-size-xs`, semibold, `0.08em` letter spacing and
capitals by `text-transform`, so the text in the markup stays as written. It sets type only, no
colour, margin or box, so it takes those from wherever you put it, on any element.

```html
<p class="neuwo-eyebrow">Classification API</p>
<h2>Every page, understood in milliseconds</h2>
```

It ships in `foundation/typography.css` and `neuwo.css`, not in `neuwo-components.css`.
`<neuwo-badge>` draws the same face, size, weight and spacing from the same tokens in its own
recipe, with capitals only under `uppercase`, so a badge never depends on this sheet.

### Page surface

`foundation/background.css` carries the two visuals a Neuwo page sits on, as two independent
classes:

- **`.neuwo-body`** is the base ink and paper: the text font, size and line height, `--neuwo-color-text`,
  `--neuwo-color-body-bg`, and the two font-smoothing hints. Put it on `<body>`.
- **`.neuwo-background__gradient`** is the brand's ambient wash: four translucent blue and green
  blobs. It reads correctly only over a dark surface, so pair it with `.neuwo-body`.

Neither class owns a box, a position or a z-index. That is deliberate: where the wash sits and
how tall it is are page decisions, not brand ones. To reproduce the full-viewport treatment the
main website uses, the consumer supplies the frame:

```html
<body class="neuwo-body">
  <div class="background">
    <div class="neuwo-background__gradient"></div>
  </div>
```

```css
.background {
  position: fixed;
  inset: 0;
  z-index: var(--neuwo-z-background);
  overflow: hidden;
}

.neuwo-background__gradient {
  inline-size: 100%;
  block-size: 100%;
}
```

`--neuwo-z-background` is a library token, so the stacking stays consistent with the rest of the
system. `demo/index.html`, `demo/typography.html` and the three framework examples are wired this way. The same gradient class also works on an
ordinary sized element, for a single washed panel rather than a whole page.

### Navigation links

`neuwo-components.css` carries the nav-link classes. `foundation/navigation.css` is still published
for sites that link it alone; with `components/reset.css`, link it after the reset, which names
`.neuwo-nav-link` at the same weight, so whichever sheet comes later wins. The classes carry the
brand's nav-link treatment, the centre-out underline that grows from the middle of the text on
hover and focus. Two classes:

- **`.neuwo-nav-link`** is a top-level entry: base type, a 44px tap target, and the underline lifted
  off the baseline.
- **`.neuwo-nav-link--sm`** is a nested entry: small type, compact, and the underline flush to the
  bottom edge.

`aria-current` takes the lifted ink without the underline, marking the current page as present
rather than as a destination.

```html
<nav aria-label="Main">
  <ul>
    <li><a class="neuwo-nav-link" href="/publishers/">Publishers</a></li>
    <li><a class="neuwo-nav-link" href="/company/" aria-current="page">Company</a></li>
  </ul>
</nav>
```

**`.neuwo-nav-link--active`** holds the underline open. That bar-less treatment for `aria-current` is
right for a horizontal bar, where the current entry is one of several and the absent bar reads
as "you are here". Down the side of a page it is close to invisible, and a sidebar also needs to
mark the *section* the current page sits under, which `aria-current` cannot express without
lying about which page is current. One class covers both, because to a reader an open section
and the current page look alike, and it composes with `aria-current` rather than replacing it:

```html
<li>
  <a class="neuwo-nav-link neuwo-nav-link--active" href="/guides/">Guides</a>
  <ul>
    <li><a class="neuwo-nav-link neuwo-nav-link--sm" href="/guides/quickstart/">Quickstart</a></li>
    <li>
      <a class="neuwo-nav-link neuwo-nav-link--sm neuwo-nav-link--active" href="/guides/auth/" aria-current="page"
        >Authentication</a
      >
    </li>
  </ul>
</li>
```

`<neuwo-sidebar>` builds a whole sidebar from these links and marks the current page for you; see
[Sidebar](#sidebar). Inside it, a name or link in a section's nested list takes the `--sm` look
without the class, and a section's focused row lifts its name's ink and bar as a focused link does.
Under forced colours the bar is drawn in the system's text colour, since forced colours repaint
backgrounds.

The sheet styles links and nothing else. Placement, the list reset and any panel surface are
the consumer's, so navigation stays ordinary markup: a real `<ul>` keeps its list semantics,
nesting works to any depth, and a section that should collapse uses native
`<details>`/`<summary>`, which brings its own keyboard and ARIA behaviour. No script ships with
the classes.

A section heading takes `.neuwo-nav-link` like any other entry, whether it is a link to the section's
own page or a `<summary>` that only toggles. There is no separate heading recipe, and no
opinion here about whether a heading is part of the navigation at all; that is the consumer's
structure to decide.

```html
<li>
  <a class="neuwo-nav-link" href="/guides/">Guides</a>
  <ul>
    <li><a class="neuwo-nav-link neuwo-nav-link--sm" href="/guides/quickstart/">Quickstart</a></li>
  </ul>
</li>
```

One interaction to know when the heading is a `<summary>`: `.neuwo-nav-link` sets `display: block`,
which is the documented way to strip a summary's disclosure triangle. Restore it with
`display: list-item` (and `list-style-position: inside`, so the underline still spans the
label) if you want the marker rather than your own chevron.

One value is tunable per instance. `--neuwo-nav-link-gutter` drives the horizontal padding and the
underline's endpoints together, so they cannot drift apart; set it once for a denser bar:

```css
@media (min-width: 64rem) {
  .site-nav .neuwo-nav-link {
    --neuwo-nav-link-gutter: var(--neuwo-space-3);
  }
}
```

The bar is laid out at its full span and grown with `transform: scaleX()`, not by animating a
pair of insets out from 50%. `left` and `right` are layout properties, so the old form ran
layout on every frame of every hover, and two insets at 50% resolve independently at sub-pixel
precision, which left a hair of width on a link of fractional width instead of none. If you were
overriding `::after`'s `left`/`right` to hold a bar open, that no longer works: use
`.neuwo-nav-link--active`.

Nothing in the recipe is `!important`. `.neuwo-nav-link` outranks `typography.css`'s bare `a`, and
`.neuwo-nav-link:hover` outranks its `a:hover`, on specificity alone, so a consumer can still
override any property from a document stylesheet.

This replaces `<neuwo-dropdown>`, removed in the same change. That element bundled the styling
with a disclosure toggle it could not turn off, which made it unusable for navigation that is
permanently visible, and its markup forced items to be direct children and forced
`!important` onto their colour. Migrating: drop the element, keep the links, put `.neuwo-nav-link`
(or `.neuwo-nav-link--sm` inside a section) on each one, and wrap them in whatever structure the
navigation actually needs.

### Markdown surface

`foundation/markdown.css` is one sheet for everything a rendered document needs and no component
covers: the elements a Markdown renderer emits that `typography.css` has no opinion about
(lists, `strong`, `blockquote`, `hr`, images, `code`, `pre`, tables), plus the `.neuwo-callout` an
author drops in among them. Put `.neuwo-markdown` on the container the renderer writes into.

```html
<article class="neuwo-markdown">{{ content }}</article>
```

It is scoped rather than bare-tag on purpose. `typography.css` can style `h1`..`h6`, `p` and `a`
globally because those are unambiguous, but a `<ul>` in a nav and a `<ul>` in an article want
different treatment, so the element rules only apply inside a container that asked for them.
`.neuwo-callout` is a class, so it carries its own scope and works outside a rendered document too.

It also **never restates a heading or a paragraph**. The two sheets compose: link both, and a
document gets its type from one and its lists, quotes and code panels from the other.
Overriding the heading scale for long-form copy (a docs page usually wants a smaller `h1` than a
landing page) stays a consumer decision, and needs no `!important`.

`.neuwo-markdown` owns no box. There is no measure, no `max-width` and no margin on the container, because
how wide the reading column is and where it sits are page decisions, exactly as in
`background.css` and `navigation.css`. A table wider than its column needs a scroll wrapper,
which is yours to emit:

```css
.table-scroll { overflow-x: auto; }
```

Code is set in `--neuwo-font-mono`, JetBrains Mono, which ships with Outfit and Noto Sans. Its
code ligatures are removed, so `!=` and `->` read exactly as typed, which matters for API keys
and IDs.

#### Callouts

The tinted aside that sits in the middle of a document: a note, a tip, a caveat. Three classes
and one knob, in the same sheet, because none of it is a component and splitting it would only
make you link two files and get their order right.

```html
<div class="neuwo-callout neuwo-callout--tip">
  <span class="neuwo-callout__title">Tip</span>
  <p>Cache the classification; the same URL returns the same topics.</p>
</div>
```

- **`.neuwo-callout`** is the block: a tinted surface, an accent edge, and enough padding that a
  leading title and a trailing paragraph both sit inside it.
- **`.neuwo-callout__title`** is the optional label line. A `<span>`, not a heading, so a callout never
  enters the document outline; it is an aside, not a section.
- **`.neuwo-callout--info`**, **`.neuwo-callout--tip`**, **`.neuwo-callout--warning`** and
  **`.neuwo-callout--danger`** set the intent. Warning draws `--neuwo-color-warning-800` from the
  [status colours](#status-colours).

Intent is one property. Each modifier declares `--neuwo-callout-accent` and nothing else, and the block
reads that knob for both its edge and its tint. So a fifth intent needs no library change:

```css
.app-callout--preview {
  --neuwo-callout-accent: var(--neuwo-color-info-800);
}
```

`.app-callout--preview` is your own class, not one the library ships, used beside `.neuwo-callout`.

This is deliberately not `<neuwo-notice>`, and deliberately not an element at all. `notice` is a
docked glass card with an entrance animation, for a message the visitor did not ask for; a callout
is static body content at the full measure of the column. And body content is exactly where a
custom element's upgrade shift costs most, so a class that paints with the first frame is the
right trade. `<neuwo-notice>` still owns the interrupting case, where the dismiss button and the
docking are the point.

#### Copying a code panel

`<neuwo-copy>` wraps anything whose text is worth pasting and puts a control in its top-right
corner. It is the one part of this surface that is an element rather than a class, because the
clipboard needs behaviour.

```html
<neuwo-copy>
  <pre><code>curl -X POST https://api.neuwo.ai/v1/classify</code></pre>
</neuwo-copy>
```

The element renders into its own light DOM: your content goes into a `.neuwo-copy__content`
wrapper as authored, followed by the `.neuwo-copy__button` control and a `.neuwo-copy__status`
live region. So the panel keeps its `.neuwo-markdown pre` styling and whatever syntax colouring the
page applies, and a server-rendered panel shows its control from the first paint.

It copies the text of that wrapper, trimmed, so nothing has to name the source: no ids, no `for`
attribute, no selector to keep in step with your renderer's output. The trim is what makes
indented markup safe, since the whitespace around a nested `<pre>` is your formatting, not the
sample.

For an Eleventy site, that is a one-line transform:

```js
eleventyConfig.addTransform("copyButtons", function (content) {
  if (!(this.page.outputPath || "").endsWith(".html")) return content;
  return content.replace(/<pre[\s\S]*?<\/pre>/g, (block) => `<neuwo-copy>${block}</neuwo-copy>`);
});
```

There is deliberately no helper that walks the page and wraps every `<pre>` for you. Emitting the
element keeps the markup in the shipped HTML and keeps the library declarative, and a DOM-walking
pass would be a second way to do the same thing.

Four details worth knowing:

- **The control is always rendered.** The markup cannot know whether the clipboard is reachable,
  so where it is not (an insecure context leaves `navigator.clipboard` undefined) a click announces
  `failed-label` instead of claiming success.
- **The outcome goes to a live region**, not to the button's label. Relabelling a control the user
  has just activated is announced inconsistently; a `role="status"` region is announced reliably.
  `label`, `copied-label` and `failed-label` are all yours to translate. For 1.2 s after a copy the
  host carries `data-neuwo-state`: `"copied"`, which draws the tick, or `"failed"`, which draws a
  cross in the error colour in its place. `slot="status"` is reserved for that region: a child given
  it is read out with every outcome.
- **`aria-*` and `title` on the element are copied onto the control**, as on the other elements, so
  an `aria-label` names it when `label` is not set. `label` wins over both `aria-label` and
  `aria-labelledby`.
- **The corner overlay assumes a panel with room.** `.neuwo-markdown neuwo-copy pre` widens the panel's
  right padding so a long first line scrolls rather than running underneath. Around something
  small, a chip say, give the element its own clearance and pull the control in with
  `--neuwo-copy-inset`; the library owns no box:

```css
.deal-id-copy {
  display: inline-block;
  padding-right: 2rem;
  --neuwo-copy-inset: 0.125rem;
}
```

A `copied` event fires after a successful write, with the text in `detail.text`. It bubbles, so it
is reachable from the document.

## React

Use React 19. Set the JSX import source in `tsconfig.json` (or the equivalent Babel, SWC or
esbuild option):

```json
{ "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "@neuwo/web-ui-library--demo" } }
```

Import the stylesheet and the library once, at the entry:

```tsx
// src/main.tsx
import "@neuwo/web-ui-library--demo/neuwo-components.css";
import "@neuwo/web-ui-library--demo";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(<App />);
```

`jsxImportSource` points JSX at the library's runtime, which wraps React's own and expands the
light DOM elements (`<neuwo-button>`, `<neuwo-badge>`, `<neuwo-deal-id>`, `<neuwo-status-dot>`,
`<neuwo-logo>`, `<neuwo-copy>`, `<neuwo-notice>`, `<neuwo-cta>`, `<neuwo-input>`, `<neuwo-textarea>`,
`<neuwo-range>`, `<neuwo-combobox>`, `<neuwo-checkbox>`, `<neuwo-toggle>`, `<neuwo-radio>`,
`<neuwo-radio-group>`, `<neuwo-segmented>`, `<neuwo-menu>`, `<neuwo-menu-group>`,
`<neuwo-menu-item>`, `<neuwo-sidebar>`, `<neuwo-nav-section>`, `<neuwo-nav-item>` and `<neuwo-spinner>`) into their markup; MDX reads its own
`jsxImportSource` option, not tsconfig's, so set it there too (in
`@mdx-js/*` or Next's MDX config). Elements recognise markup React rendered, from Client or Server
Components, and leave it to React, so without the setting a light DOM tag React renders stays bare.
The same setting adds every element to JSX with each attribute's allowed values and each custom
event's `detail`, so a misspelt variant fails the type check. React stays an optional peer
dependency. A working project with controlled and uncontrolled forms is in [demo/react-vite](https://github.com/neuwoai/neuwo-web-ui-components/tree/v0.6.0/demo/react-vite).

React renders the markup of all twenty-four elements itself, so they show from the first paint.

React 19 sets a property where the element has one and binds events, so the elements behave like
native controls:

```tsx
<neuwo-button disabled={saving}>Save</neuwo-button>
<neuwo-checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
<neuwo-copy oncopied={(e) => toast(e.detail.text)}><pre>npm install</pre></neuwo-copy>
<neuwo-notice dismissible hidden={!open} ondismiss={(e) => { e.preventDefault(); setOpen(false); }}>...</neuwo-notice>
```

- `onChange` fires as it does on native fields. On the form fields, the checkbox, the toggle, the
  radio group and the segmented control that means React's own controlled and uncontrolled models, in
  [Form fields in React](#form-fields-in-react).
- A custom event binds by its exact name, so it is lower case: `oncopied`, `ondismiss`, and the
  menu's `onopen` and `onselect`. `onCopied` listens for an event called `Copied`, which never
  fires; the types reject it. React's own `onSelect`, for text selected in a field, is a different
  prop and never sees a menu's pick.
- A menu item React renders only fires `select` when it is picked; drive its `checked` from state,
  as you drive a checkbox's.
- Cancel the notice's `dismiss` and drive `hidden` from state. Left alone, the element hides
  itself by setting `hidden` on a host React renders, which React does not know about.

React 18 passes every prop to a custom element as a text attribute. `disabled={false}` becomes
`disabled="false"`, which the element reads as disabled. `onClick` and `onInput` still work, but
`onChange` and custom event handlers never run. If you are stuck on 18, pass a boolean as
`disabled={saving || undefined}` and attach those listeners through a `ref` with
`addEventListener`.

### Form fields in React

`<neuwo-input>`, `<neuwo-textarea>` and `<neuwo-range>` behave like React's own `<input>` and
`<textarea>`, because the JSX runtime renders the native control inside each and hands it your
value props:

```tsx
<neuwo-input value={email} onChange={(e) => setEmail(e.target.value)} />
<neuwo-textarea defaultValue="draft" name="notes" />
```

- `value` makes the field controlled: it shows whatever your state says, and an edit your
  handler ignores is undone.
- `onChange` fires on every edit, as on a native field in React, with the inner `<input>` or
  `<textarea>` as `event.target`. It used to fire only when the user committed a value.
- `defaultValue` gives an uncontrolled field with a starting value, which keeps what the user
  types across re-renders.
- In Server Components there is no state to hold, so `value` is the starting value there.
- With React Hook Form's `register`, give a `<neuwo-range>` its starting value as `defaultValue`
  too, or pass the values to `reset(values)` once it has mounted. `defaultValues` alone leaves a
  range that has no value at its midpoint, which React Hook Form takes for the user's edit, and a
  bare `reset()` returns it there through the form's native reset. A native range behaves the same.

Type a handler you define apart from the element with `NeuwoChangeEvent`, from the JSX runtime. Its
second type is the node the event comes from, the inner control here; leave it out on the combobox
and the segmented control, which dispatch from the element itself:

```tsx
import type { NeuwoInput } from "@neuwo/web-ui-library--demo";
import type { NeuwoChangeEvent } from "@neuwo/web-ui-library--demo/jsx-runtime";

const onEmail = (e: NeuwoChangeEvent<NeuwoInput, HTMLInputElement>) => setEmail(e.target.value);
```

`e.target` is then the inner `<input>` and `e.currentTarget` the element, so read a property only
the element has, such as `noErrorLine`, from `e.currentTarget`.

`<neuwo-checkbox>` and `<neuwo-toggle>` behave like React's own checkbox:

```tsx
<neuwo-checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)}>I agree</neuwo-checkbox>
<neuwo-toggle defaultChecked name="notify">Notifications</neuwo-toggle>
```

- `checked` makes it controlled: it shows whatever your state says, and a click your handler
  ignores is undone.
- `onChange` fires on every click, with the inner checkbox as `event.target`, so
  `event.target.checked` is the new state.
- `defaultChecked` gives an uncontrolled one with a starting state, which keeps the user's choice
  across re-renders. `value` is the value submitted while it is checked, as on a native checkbox,
  and `defaultValue` is a type error.
- A click on an indeterminate controlled checkbox clears `indeterminate` even when your handler
  rejects the change, as on React's own checkbox; set it again from your state.
- React Hook Form's `register` reads and resets them as it does a native checkbox: a checked one
  gives its `value`, or `true` without one, and an unchecked one `false`.
- In Server Components `checked` is the starting state.

`<neuwo-radio-group>` holds the value of its radios, as a group of React's own radios does:

```tsx
<neuwo-radio-group name="plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
  <neuwo-radio value="free">Free</neuwo-radio>
  <neuwo-radio value="pro">Pro</neuwo-radio>
</neuwo-radio-group>
<neuwo-radio-group name="plan" defaultValue="pro">...</neuwo-radio-group>
```

- `value` makes it controlled: every radio shows whatever your state says, and a pick your
  handler ignores is undone.
- `onChange` fires once per pick with the picked radio's input as `event.target`, so
  `event.target.value` is the new value and `event.target.name` the group's.
- `defaultValue` gives an uncontrolled group with a starting value, which keeps the user's pick
  across re-renders. In Server Components `value` is the starting value.
- The radios may sit in your markup inside the group, in elements, fragments, context
  providers, `Suspense` and its `fallback`, `StrictMode`, `Profiler`, `Activity` or other Neuwo
  elements, and get the group's `name` and value there. A radio inside a component of your own is
  out of the group's reach, since the JSX runtime cannot see into it, and so is one rendered
  through a portal or by another React root: it renders on its own, and client development builds
  warn about it, so write the radios in place inside the group. One edge remains: a radio inside
  your own component, inside `Suspense`, inside a group, can mismatch on hydration when it is
  revealed.
- In Next.js, radios a Server Component passes as `children` to a Client Component that renders
  the group are rendered on the server, outside the group, so they get none of its attributes: no
  `name`, value, `required` or `form`, and the browser does not group them. Client development builds
  warn about it. Render the group and its radios in the same component, whether that is the
  Client Component or the Server Component.
- React Hook Form's `register` goes on the group: it reads the picked value from the group's
  `value` and checks the matching radio on a reset.
- A lone `<neuwo-radio>` outside any group behaves like React's own radio, through `checked` and
  `defaultChecked`.
- Markup React renders once and never hydrates, such as an Astro component with no client
  directive, gives the group element no `value` attribute when only `defaultValue` is set, as it
  does a field. The radios still keep that starting value when a script changes an attribute
  later, and `form.reset()` returns to it, for as long as the group has no `value` attribute.

`<neuwo-combobox>` follows the same two models:

```tsx
<neuwo-combobox value={plan} onChange={(e) => setPlan(e.target.value)}>
  <option value="free">Free</option>
  <option value="pro">Pro</option>
</neuwo-combobox>
<neuwo-combobox defaultValue="pro" name="plan">...</neuwo-combobox>
```

- `onInput` and `onChange` fire once each when the user picks a different value, never while
  they type into a `searchable` filter. `event.target` is the combobox itself: its `value` is the
  picked value and its `name` is the field's, as form libraries expect.
- `onBlur` gets the trigger as `event.target`, and while the blur is dispatched the trigger's
  `name` reads as the field's, so React Hook Form's `register` marks the combobox touched and
  validates it in `mode: "onBlur"`, as it does a native `<select>`. The trigger has no `name`
  attribute and submits nothing. A script that reads `name` properties during that blur, such as
  jQuery's `serializeArray()` in a `focusout` handler, sees a `searchable` combobox twice;
  `FormData` does not.
- `value` makes it controlled: it shows whatever your state says, so a pick your handler ignores
  is never shown. A `value` that names no enabled option resolves as the `value` attribute does:
  to the first enabled option marked `selected`, else to nothing, which shows the placeholder and
  submits an empty value. Picking the option it resolved to fires no `change`, since the
  combobox already holds that value.
- `defaultValue` gives an uncontrolled combobox, which shows the user's pick itself and keeps it
  across re-renders. In Server Components `value` is the starting value, as above. Setting the
  element's `value` property, as React Hook Form's `register` does on a reset, shows that value.
- Write the `<option>` and `<optgroup>` elements in place inside the combobox, with only
  fragments, context providers or React's own wrappers, such as `Suspense`, around them. Options
  a component of your own renders are never listed, since the JSX runtime reads them before that
  component renders, and an option whose label a component renders shows an empty row. Client
  development builds warn about both. The same holds for `<neuwo-segmented>`.
- If the options change while the combobox is mounted, for example once they have loaded, use
  `value`. Uncontrolled, a pick whose option goes away is cleared without a `change`, so your
  state never hears of it.
- Markup React renders once and never hydrates, such as an Astro component with no client
  directive, gives the element no `value` attribute when only `defaultValue` is set. The combobox
  still keeps that starting value when a script changes an attribute later, and `form.reset()`
  returns to it, until the `value` attribute itself is set or removed. A `defaultValue` equal to
  where the element starts without one, such as the option marked `selected`, or the midpoint of a
  `<neuwo-range>`, leaves no trace in that markup, so it moves with a later change of `selected` or
  of the bounds, as if it had not been set.

`<neuwo-segmented>` follows the combobox's models, with the same `value`, `defaultValue`, `onInput`
and `onChange`:

```tsx
<neuwo-segmented label="View" value={view} onChange={(e) => setView(e.target.value)}>
  <option value="visual">Visual</option>
  <option value="json">JSON</option>
</neuwo-segmented>
<neuwo-segmented label="View" defaultValue="json" name="view">...</neuwo-segmented>
```

- `onInput` and `onChange` fire once each per pick, with the element as `event.target`, so
  `event.target.value` is the picked value and `event.target.name` the field's.
- `value` makes it controlled: the option your state names shows selected, and a pick your
  handler ignores is never shown. `defaultValue` gives an uncontrolled one, which shows the
  user's pick itself and keeps it across re-renders. In Server Components `value` is the
  starting value.
- React Hook Form's `register` reads the picked value from the element's `value` and sets it on
  a reset, as on the combobox. `onBlur` gets the option button as `event.target`, and while the
  blur is dispatched the button's `name` reads as the field's, so `register` marks the control
  touched and validates it in `mode: "onBlur"`. The buttons have no `name` attribute and submit
  nothing. A script that reads `name` properties during that blur, such as jQuery's
  `serializeArray()` in a `focusout` handler, sees the field twice; `FormData` does not. Moving
  between the options with the arrow keys blurs each one, as it does native radios.
- Never-hydrated markup with only `defaultValue` keeps its starting value as the combobox's does.

### Next.js and server rendering

The library imports safely on a server, so no loader component is needed. Set `jsxImportSource`
in `tsconfig.json`, as above, and import the stylesheet in the root layout:

```tsx
// app/layout.tsx
import "@neuwo/web-ui-library--demo/neuwo-components.css";
```

Import the library once from a client component, so the elements register in the browser:

```tsx
"use client";
import "@neuwo/web-ui-library--demo";

export function Neuwo() {
  return null;
}
```

Render `<Neuwo />` once in the root layout. Because the JSX runtime expands all twenty-four elements,
the server-rendered HTML carries their full markup and they are on-brand from the first paint,
before the bundle has run. Import `neuwo.css` instead of `neuwo-components.css` to add the
typography and page surface. A working project is in [demo/nextjs](https://github.com/neuwoai/neuwo-web-ui-components/tree/v0.6.0/demo/nextjs).

A value the browser restores on a back navigation, or one the user or a script enters before the
page hydrates, stays: React keeps what the elements wrote into their markup by then, such as a
range's fill or a combobox's label, and reports no hydration mismatch. A controlled host whose
value a script set before hydration keeps showing that value, not the one its state holds, as
React's own controlled inputs do.

## Components

| Component | Tag | Status |
| --- | --- | --- |
| Button | `<neuwo-button>` | Stable |
| Text input | `<neuwo-input>` | Stable |
| Textarea | `<neuwo-textarea>` | Stable |
| Combobox | `<neuwo-combobox>` | Stable |
| Range slider | `<neuwo-range>` | Stable |
| Checkbox | `<neuwo-checkbox>` | Stable |
| Toggle / Switch | `<neuwo-toggle>` | Stable |
| Radio group | `<neuwo-radio-group>` / `<neuwo-radio>` | Stable |
| Segmented control | `<neuwo-segmented>` | Stable |
| Badge | `<neuwo-badge>` | Stable |
| Deal-ID chip | `<neuwo-deal-id>` | Stable |
| Status dot | `<neuwo-status-dot>` | Stable |
| Spinner | `<neuwo-spinner>` | Stable |
| Copy wrapper | `<neuwo-copy>` | Stable |
| CTA band | `<neuwo-cta>` | Stable |
| Notice card | `<neuwo-notice>` | Stable |
| Logo | `<neuwo-logo>` | Stable |
| Menu | `<neuwo-menu>` / `<neuwo-menu-group>` / `<neuwo-menu-item>` | Stable |
| Sidebar | `<neuwo-sidebar>` / `<neuwo-nav-section>` / `<neuwo-nav-item>` | Stable |
| Modal | `<neuwo-modal>` | Planned |
| Card | `<neuwo-card>` | Planned |

Published styling files, for direct linking or non-web use:

| Artifact | Import path |
| --- | --- |
| Font faces | `@neuwo/web-ui-library--demo/foundation/fonts.css` |
| Tokens | `@neuwo/web-ui-library--demo/foundation/tokens.css` |
| Typography | `@neuwo/web-ui-library--demo/foundation/typography.css` |
| Page surface | `@neuwo/web-ui-library--demo/foundation/background.css` |
| Navigation links (also inside `neuwo-components.css`; after the reset when linked alone) | `@neuwo/web-ui-library--demo/foundation/navigation.css` |
| Markdown surface | `@neuwo/web-ui-library--demo/foundation/markdown.css` |
| Font faces, tokens, reset and light DOM component recipes (one file) | `@neuwo/web-ui-library--demo/neuwo-components.css` |
| `neuwo-components.css` plus typography, page surface and Markdown surface (one file) | `@neuwo/web-ui-library--demo/neuwo.css` |
| Component reset (before any recipe) | `@neuwo/web-ui-library--demo/components/reset.css` |
| Popup panel and row (combobox, menu) | `@neuwo/web-ui-library--demo/components/popup.css` |
| Button recipe | `@neuwo/web-ui-library--demo/components/button/button.css` |
| Spinner recipe (the button's loading ring too: link it with `button/button.css`) | `@neuwo/web-ui-library--demo/components/spinner/spinner.css` |
| Menu recipe (menu, menu group, menu item) | `@neuwo/web-ui-library--demo/components/menu/menu.css` |
| Sidebar recipe (sidebar, nav section, nav entry) | `@neuwo/web-ui-library--demo/components/sidebar/sidebar.css` |
| Field chrome | `@neuwo/web-ui-library--demo/components/fields/field.css` |
| Selection shell (checkbox, toggle, radio group, segmented control) | `@neuwo/web-ui-library--demo/components/selection/controls.css` |
| Checkbox and radio recipe | `@neuwo/web-ui-library--demo/components/selection/form-check.css` |
| Radio group recipe | `@neuwo/web-ui-library--demo/components/selection/radio/radio-group.css` |
| Toggle recipe | `@neuwo/web-ui-library--demo/components/selection/toggle/toggle.css` |
| Segmented control recipe | `@neuwo/web-ui-library--demo/components/selection/segmented/segmented.css` |
| Logo files | `@neuwo/web-ui-library--demo/logos/neuwo-logo--bg-dark.svg` |

## Restyling from the host

Every element renders its markup into its own light DOM, so none has parts. Their prefixed classes
are the public hooks instead. Put the element name in
front for weight, so a rule wins without `!important`:

```css
neuwo-button .neuwo-btn { border-radius: 0; }
```

| Class | On |
| --- | --- |
| `.neuwo-btn` | the native `<button>`, or the `<a>` when `href` is set without `menu`; each half of a `split` button |
| `.neuwo-btn--solid`, `.neuwo-btn--outline`, `.neuwo-btn--glass` | the control, by `variant` |
| `.neuwo-btn--sm`, `.neuwo-btn--lg` | the control, by `size` |
| `.neuwo-btn--hover-s`, `.neuwo-btn--hover-l` | the control, by `hover` |
| `.neuwo-btn--wide`, `.neuwo-btn--xwide`, `.neuwo-btn--block`, `.neuwo-btn--loading` | the control, by the attribute of the same name |
| `.neuwo-btn__spinner` | the loading ring, also a `.neuwo-spinner`, the control's first child while `loading` |
| `.neuwo-btn__start`, `.neuwo-btn__label`, `.neuwo-btn__end` | the wrappers around the `slot="start"` children, the label and the `slot="end"` children |
| `.neuwo-btn--icon-only` | the control, by `icon-only` |
| `.neuwo-btn__chevron` | the chevron after the end wrapper while `menu` is set without `icon-only` or `split`, and the content of a `split` button's toggle half; it turns while its control has `aria-expanded="true"` |
| `.neuwo-btn__dots` | the three dots after the label wrapper, on an `icon-only` control with `menu` and no label content, unless it is loading |
| `.neuwo-btn-split` | the wrapper holding a `split` button's two halves, in place of a single `.neuwo-btn` |
| `.neuwo-btn-split__main` | the main half: a `.neuwo-btn`, the `<button>` or the `<a>` when `href` is set, with every modifier |
| `.neuwo-btn-split__toggle` | the toggle half: a `<button>` `.neuwo-btn` with the variant, size and hover modifiers, holding the chevron |

The three wrappers are always rendered and are `display: contents`, so they draw
no box and an empty one adds no gap. Style what they hold through inherited
properties, or target the children you passed in.

Keyboard focus rings a button on the control's `::after`, `--neuwo-shadow-focus-ring` drawn
`--neuwo-shadow-focus-ring-offset` (1px) clear of its edge, and the copy button and the notice's
close button ring the same way. Leave that pseudo-element to the ring, and restyle the ring
through the two tokens.

```css
.my-tag .neuwo-badge { font-weight: 500; }
.deal-ref .neuwo-deal-id { font-family: ui-monospace, monospace; }
```

| Class | On |
| --- | --- |
| `.neuwo-badge` | the pill `<span>`, which holds the label |
| `.neuwo-badge--green`, `.neuwo-badge--s`, `.neuwo-badge--l` | the pill, by `variant` and `size` |
| `.neuwo-badge--borderless`, `.neuwo-badge--uppercase`, `.neuwo-badge--glow` | the pill, by the attribute of the same name |
| `.neuwo-badge--pulse`, `.neuwo-badge--shimmer` | the pill, by `motion` |
| `.neuwo-badge--intensity-s`, `.neuwo-badge--intensity-l` | the pill, by `intensity`, only alongside a `motion` |
| `.neuwo-deal-id` | the value `<span>`, which holds the identifier |
| `.neuwo-deal-id--s`, `.neuwo-deal-id--l` | the value box, by `size` |
| `.neuwo-status-dot` | the dot `<span>`, which has no children |
| `.neuwo-status-dot--blue` | the dot, by `variant` |
| `.neuwo-status-dot--s` | the dot, by `size="s"` |
| `.neuwo-status-dot--pulse`, `.neuwo-status-dot--blink` | the dot, by `motion` |
| `.neuwo-status-dot--halo-none`, `.neuwo-status-dot--halo-s`, `.neuwo-status-dot--halo-l` | the dot, by `halo` |
| `.neuwo-status-dot--glow-s`, `.neuwo-status-dot--glow-m`, `.neuwo-status-dot--glow-l` | the dot, by `glow` |
| `.neuwo-spinner` | the ring `<span>`, which has no children |
| `.neuwo-spinner--m`, `.neuwo-spinner--l` | the ring, by `size` |
| `.neuwo-spinner--blue`, `.neuwo-spinner--green` | the ring, by `variant` |
| `.neuwo-logo` | the logo `<svg>` |
| `.neuwo-logo--bg-light`, `.neuwo-logo--bg-dark`, `.neuwo-logo--bg-dark-alt`, `.neuwo-logo--bg-colour` | the logo, by `variant` |
| `.neuwo-copy` | the copy wrapper's root `<div>`, `display: contents`, so it draws no box |
| `.neuwo-copy__content` | the wrapper around the content to copy |
| `.neuwo-copy__button` | the copy control, positioned against the host |
| `.neuwo-copy__status` | the visually hidden live region that announces the outcome |
| `.neuwo-notice` | the notice card `<div>`, which carries `role="status"` unless the element has a `role` |
| `.neuwo-notice--fixed`, `.neuwo-notice--top`, `.neuwo-notice--bottom`, `.neuwo-notice--start`, `.neuwo-notice--end`, `.neuwo-notice--center` | the card, by `position`; `static` adds none |
| `.neuwo-notice--row`, `.neuwo-notice--dismissible` | the card, by `layout="row"` and `dismissible` |
| `.neuwo-notice__content` | the text column, around the title and the message |
| `.neuwo-notice__title`, `.neuwo-notice__message`, `.neuwo-notice__actions` | the wrappers around the `slot="title"` children, the message and the `slot="actions"` children |
| `.neuwo-notice__title--empty`, `.neuwo-notice__message--empty`, `.neuwo-notice__actions--empty` | a wrapper nothing fills, taken out of the flow |
| `.neuwo-notice__dismiss` | the close button, while `dismissible` |
| `.neuwo-notice__dismiss--filled` | the close button, by `dismiss-filled` |
| `.neuwo-cta` | the band's root `<div>` |
| `.neuwo-cta--banner`, `.neuwo-cta--spotlight` | the band, by `variant` |
| `.neuwo-cta__inner` | the panel inside the band in both variants, which holds the text column and then the actions; the banner lays them out side by side |
| `.neuwo-cta__body` | the text column, around the headline, sub, field and status |
| `.neuwo-cta__glow` | the spotlight's blurred halo, before the panel |
| `.neuwo-cta__headline` | the `<h2>` (or the `heading-level` tag) around the headline |
| `.neuwo-cta__sub`, `.neuwo-cta__field`, `.neuwo-cta__actions` | the wrappers around the `slot="sub"`, `slot="field"` and `slot="actions"` children |
| `.neuwo-cta__field--empty` | the field wrapper while nothing fills it, taken out of the flow |
| `.neuwo-cta__status` | the status line, a polite live region |
| `.neuwo-cta__status--success`, `.neuwo-cta__status--error` | the status line, by `status-state` |
| `.neuwo-field` | the input's wrapper `<div>`, which stacks the label, the control and the error line; it was `::part(field)` |
| `.neuwo-field--sm` | the wrapper, by `size="sm"` |
| `.neuwo-field__label` | the `<label>`, associated with the control; it was `::part(label)` |
| `.neuwo-field__label--empty` | the label while neither `label` nor a `slot="label"` child fills it, taken out of the flow |
| `.neuwo-field__label-content` | the wrapper around the `slot="label"` children, `display: contents` |
| `.neuwo-field__label-text` | the `label` text, while no `slot="label"` child replaces it |
| `.neuwo-field__required` | the required marker after the label |
| `.neuwo-input` | the native `<input>`; it was `::part(input)` |
| `.neuwo-input--sm`, `.neuwo-input--error` | the control, by `size="sm"`, and by `error` unless `error-muted` or `no-error-line` is set |
| `.neuwo-input--mono` | the input's or the textarea's control, by `mono` |
| `.neuwo-textarea--no-resize` | the textarea's control, by `no-resize` |
| `.neuwo-field__error` | the reserved error line; it was `::part(error)` |
| `.neuwo-combobox` | the combobox's box around the trigger, the chevron, the popup and the form value |
| `.neuwo-combobox__trigger` | the combobox's trigger, a `<button>`, or a text `<input>` with `searchable`, alongside `.neuwo-input` and its modifiers |
| `.neuwo-combobox__value` | the selected label or the placeholder inside the button trigger |
| `.neuwo-combobox__chevron`, `.neuwo-combobox__popup` | the chevron and the popover around the list; they were `::part(chevron)` and `::part(popup)` |
| `.neuwo-combobox__listbox`, `.neuwo-combobox__option`, `.neuwo-combobox__option--active` | the list, each option row, and the row the keyboard highlights |
| `.neuwo-combobox__option-label` | the `<span>` around each option row's label |
| `.neuwo-combobox__group-item`, `.neuwo-combobox__group` | the row around an `<optgroup>`'s options and its label |
| `.neuwo-combobox__empty` | the "No matches" row, hidden until a filter matches nothing |
| `.neuwo-choice` | the checkbox's, toggle's, radio group's or segmented control's wrapper `<div>`, which stacks the row (or the radiogroup) and the error line |
| `.neuwo-choice--flush` | the radio group's wrapper, which keeps the error line right under the full-width radiogroup |
| `.neuwo-choice__error` | the reserved error line; it was `.control-error` and `::part(error)` |
| `.neuwo-form-check` | the checkbox's or radio's `<label>`, around the box and the label content; it was `::part(field)` |
| `.neuwo-form-check--error` | the checkbox's label, by `error` unless `error-muted` or `no-error-line` is set, and a radio's label while its nearest group has it; it rings the box |
| `.neuwo-form-check__input` | the native checkbox or radio; it was `::part(input)` |
| `.neuwo-form-check__label` | the wrapper around the checkbox's or radio's children; it was `::part(label)` |
| `.neuwo-radio-group` | the radio group's `role="radiogroup"` `<div>`, around the legend and the radios; it was `.radio-group` and `::part(group)` |
| `.neuwo-radio-group--horizontal` | the radiogroup, by `orientation="horizontal"`, which lays the radios out in a row |
| `.neuwo-radio-group--error` | the radiogroup, by `error` unless `error-muted` or `no-error-line` is set; its own radios, not those of a group nested in it, carry `.neuwo-form-check--error` meanwhile |
| `.neuwo-radio-group__legend` | the visible label, `hidden` while `label` is not set; it was `::part(legend)` |
| `.neuwo-radio-group__options` | the wrapper around the group's children, the radios; it was `::part(options)` |
| `.neuwo-form-toggle` | the toggle's `<label>`, around the switch, the track and the label content; it was `::part(field)` |
| `.neuwo-form-toggle--pulse`, `.neuwo-form-toggle--error` | the toggle's label, by `pulse`, and by `error` unless `error-muted` or `no-error-line` is set |
| `.neuwo-form-toggle__input` | the visually hidden native switch, `role="switch"`; it was `::part(input)` |
| `.neuwo-form-toggle__track` | the visible track, whose `::after` is the thumb; it was `::part(track)` |
| `.neuwo-form-toggle__label` | the wrapper around the toggle's children; it was `::part(label)` |
| `.neuwo-segmented` | the segmented control's `role="radiogroup"` pill, around the indicator, the options and the form value; it was `.segmented` and `::part(group)` |
| `.neuwo-segmented--error` | the pill, by `error` unless `error-muted` or `no-error-line` is set |
| `.neuwo-segmented__indicator` | the sliding pill behind the selected option, shown once a pick gives it `data-neuwo-placed`; it was `::part(indicator)` |
| `.neuwo-segmented__option` | each option's `<button>`, the selected one with `aria-checked="true"`, which keeps its label on one line; it was `::part(option)` |
| `.neuwo-segmented__option-label` | the `<span>` around each option's label |
| `.neuwo-segmented__options` | the hidden `<select>` that keeps your `<option>` children |
| `.neuwo-segmented__form-value` | the visually hidden native input that submits the value |
| `.neuwo-menu` | the menu's popover panel, `role="menu"`, with the id `<id>-panel` on a root menu |
| `.neuwo-menu--drill` | a submenu's panel while it drills in over its parent's |
| `.neuwo-menu--covered` | a panel while a submenu drills in over it, hidden |
| `.neuwo-menu__items` | the wrapper around the menu's groups or items |
| `.neuwo-menu__back`, `.neuwo-menu__back-icon`, `.neuwo-menu__back-to`, `.neuwo-menu__back-label` | a submenu's Back row, hidden until it drills in, and its icon, its visually hidden "Back to" and its label, the label of the item that opened it |
| `.neuwo-menu-group` | the group's `role="group"` `<div>` |
| `.neuwo-menu-group--no-divider` | the group, by `no-divider` |
| `.neuwo-menu-group__divider` | the line above the group, hidden in the first group |
| `.neuwo-menu-group__heading` | the heading, while `heading` is set |
| `.neuwo-menu-group__items` | the wrapper around the group's items |
| `.neuwo-menu-item` | the item's `role="none"` `<div>`, around the control and the submenu wrapper |
| `.neuwo-menu-item--red`, `.neuwo-menu-item--green` | the item, by `tone` |
| `.neuwo-menu-item__control` | the item's `<button>`, or the `<a>` of a link item, with the `menuitem`, `menuitemradio` or `menuitemcheckbox` role |
| `.neuwo-menu-item__check` | the check, or the dot in a `select="one"` group, shown while `aria-checked="true"` |
| `.neuwo-menu-item__start`, `.neuwo-menu-item__label` | the wrappers around the `slot="start"` children and the label |
| `.neuwo-menu-item__hint` | the `hint` text, at the inline end |
| `.neuwo-menu-item__external`, `.neuwo-menu-item__new-tab` | a `target="_blank"` link's mark and its visually hidden "(opens in a new tab)" |
| `.neuwo-menu-item__chevron` | the chevron of an item with a submenu, pointing to the inline end |
| `.neuwo-menu-item__submenu` | the wrapper around the `slot="submenu"` menu |
| `.neuwo-sidebar` | the sidebar's `<aside>`: the column from 48rem, the glass bar below |
| `.neuwo-sidebar__bar` | the row around the brand and actions wrappers; below 48rem it keeps the menu button's corner clear |
| `.neuwo-sidebar__brand`, `.neuwo-sidebar__actions` | the wrappers around the `slot="brand"` and `slot="actions"` children; the actions show only below 48rem |
| `.neuwo-sidebar__menu` | the `<details>` around the menu button and everything the menu shows and hides, its content always shown from 48rem |
| `.neuwo-sidebar__toggle`, `.neuwo-sidebar__toggle-icon` | the menu button, the details' `<summary>`, shown only below 48rem, and its three-line icon, a cross while the menu is open |
| `.neuwo-sidebar__nav` | the `<nav>`, named by `label`, which scrolls on its own |
| `.neuwo-sidebar__list` | the `<ul>` around the entries |
| `.neuwo-sidebar__after-nav`, `.neuwo-sidebar__footer` | the wrappers around the `slot="after-nav"` and `slot="footer"` children, taken out of the flow while empty; the footer is ruled off above |
| `.neuwo-sidebar__remember` | with `remember`, the `<script>` at the end of the `<aside>`, which draws nothing |
| `.neuwo-nav-item` | an entry's `<li>` |
| `.neuwo-nav-item__link` | the entry's `<a>`, alongside `.neuwo-nav-link`, with `.neuwo-nav-link--active` and `aria-current="page"` on the current page's entry |
| `.neuwo-nav-section` | a section's `<li>` |
| `.neuwo-nav-section--link`, `.neuwo-nav-section--active` | the section, by `href`, and while it holds the current page |
| `.neuwo-nav-section__details` | the `<details>` around the section's summary and list, carrying `data-key`; with `href` it draws no box, so its summary sits in the link's row |
| `.neuwo-nav-section__row` | the `<summary>` that is the whole row of a section without `href`, around the name and the chevron |
| `.neuwo-nav-section__name` | the name, alongside `.neuwo-nav-link`, with `.neuwo-nav-link--active` while the section is marked: a `<span>` in the row, or with `href` the `<a>` |
| `.neuwo-nav-section__toggle` | with `href`, the `<summary>` beside the link, named from the label (Show Guides pages), around the chevron |
| `.neuwo-nav-section__chevron` | the chevron, turned towards the inline end while the section is closed |
| `.neuwo-nav-section__list` | the nested `<ul>` around the section's entries, indented by `--neuwo-space-4` |

The badge and deal-id render their text as authored. For capitals on a badge, add `uppercase`,
which sets them with `text-transform` and leaves the text as written:

```html
<neuwo-badge variant="green" size="s" borderless uppercase motion="pulse">Live</neuwo-badge>
```

Prefer a size axis where one exists (`<neuwo-badge size>`, `<neuwo-deal-id
size>`) over a font-size override, so the scale stays on-brand.

A field flashed red for a moment needs no rule of its own: call `flashError()` on the
`<neuwo-input>` or `<neuwo-textarea>` (see [Form errors](#form-errors)).

The components and the Markdown surface mirror in a right-to-left page or container; set the `dir`
attribute there, as HTML recommends, not only the CSS `direction` property, since the toggle's thumb
and the range's fill in Chromium follow the attribute.

## Form fields share one API

`<neuwo-input>`, `<neuwo-textarea>`, `<neuwo-combobox>` and `<neuwo-range>`
share the same attributes (`name`, `value`, `label`, `disabled`, `required`,
`error`, `error-muted`, `no-error-line`, `size`), the `value`, `disabled`,
`size` and `noErrorLine` properties, and the same `change` event. The
selection controls (`<neuwo-checkbox>`, `<neuwo-toggle>`,
`<neuwo-radio-group>`, `<neuwo-segmented>`) share the error and
`no-error-line` behaviour below. The checkbox and the toggle share the
checkable API under [Checkbox and toggle](#checkbox-and-toggle), the radio
group and its radios are under [Radio group](#radio-group), and the segmented
control is under [Segmented control](#segmented-control). The generated
`.d.ts` shows these on the base class each control `extends`. `noErrorLine`, and
`defaultValue` on the fields and the segmented control, come from mixins, so the
`.d.ts` of the base lists them in the type it extends, not in its class body.

`<neuwo-input>`, `<neuwo-textarea>` and `<neuwo-range>` render a native `<input>` or `<textarea>`
into their own light DOM, and that control is the form control. The element carries `name`, `value`,
`required`, `disabled`, `readonly`, `placeholder`, `autocomplete`, `form` and the constraint
attributes onto it, so a form of inputs submits and validates natively, in server-rendered markup
before the script has loaded too. The element itself is not form-associated, so each value is
submitted once.

- **`value` is the starting value**, as on a native input. Changing the
  attribute moves an input the user has not edited yet, and `form.reset()`
  returns to it. The `value` property reads and writes what the field shows
  now and never touches the attribute; `defaultValue` reads the control's starting value, else the
  attribute, and sets the attribute.
- **The inner input's own events** reach your listeners: `input` on every
  keystroke and `change` when the user commits, both bubbling through the
  element. The element dispatches none of its own, so `event.target` is the
  inner `<input>` (its `value` is the field's); use `event.currentTarget` for
  the element.
- **The native form API** answers for the inner input: `form`, `validity`,
  `validationMessage`, `checkValidity()`, `reportValidity()` and
  `setCustomValidity()`. `focus()` and `blur()` move focus to it, and a click on
  the label focuses it.
- **`aria-*` and `title`** on the element are copied onto the inner input,
  which needs them for its accessible name and tooltip. `data-*` stays on the
  element only, so a query such as `[data-testid="email"]` matches one node.

On `<neuwo-textarea>` the `value` attribute is the textarea's starting text, and
`rows`, `minlength` and `maxlength` are carried onto it. `mono` on `<neuwo-input>` or
`<neuwo-textarea>` sets the value and the placeholder in the brand's monospace face
(`--neuwo-font-mono`), for code, JSON, API keys and IDs, a step smaller than a prose field of the
same size so code reads as code: `--neuwo-font-size-sm` at the standard size and
`--neuwo-font-size-xs` with `size="sm"`, with the same padding. A `mono` textarea also spaces its
lines for code, at `--neuwo-line-height-body` like the Markdown surface's code panels. A textarea
is resizable vertically; `no-resize` turns the handle off for a box of fixed height, such as a
request body. On `<neuwo-range>` the
bounds and `step` are carried onto the range input, and the filled part of its
track (`--neuwo-range-fill`) is written into the markup from `min`, `max` and
`value`, so it shows in the first paint.

`<neuwo-combobox>` renders the same shell around a styled trigger and list, and
its form control is a visually hidden native `<input>`,
`.neuwo-combobox__form-value`. It carries `name`, the starting value,
`required`, `disabled` and `form`, so the combobox submits, resets and validates
with its form like the other fields, in server-rendered markup before the script
has loaded too. It lies over the trigger, so the browser's validation message
points there, and focus that lands on it moves to the trigger.

- **The options** come only from the element's own `<option>` and `<optgroup>`
  children, which stay in a hidden `<select>`, `.neuwo-combobox__options`. In
  React they must be those elements written in place, not a component of yours
  that renders them: the template sees the element's children, not inside a
  component.
- **The starting value** is the `value` attribute when it names an enabled
  option, else the first enabled option marked `selected`, else nothing. A
  form reset returns to it. In React, set `value` or `defaultValue` on the
  element rather than `selected` on an `<option>`, which React warns about as it
  does on a native `<select>`.
- **Its own events**: the element dispatches `input` and then `change`, once
  each, when the user picks a different value, with the element as
  `event.target`. Typing into a `searchable` filter fires neither. The `value`
  property only accepts the value of an enabled option.
- `readonly` and `autocomplete` do not apply.

None of the fields has parts. What were the parts `field`, `input`, `label` and
`error` are the classes `.neuwo-field`, `.neuwo-input` (with `.neuwo-textarea`
or `.neuwo-range` added on the textarea and the range, and
`.neuwo-combobox__trigger` on the combobox's trigger), `.neuwo-field__label` and
`.neuwo-field__error`, listed under restyling above.

### Checkbox and toggle

`<neuwo-checkbox>` and `<neuwo-toggle>` render a native `<input type="checkbox">`
into their own light DOM, inside a `<label>` that also holds your children, and
that input is the form control. The toggle's input carries `role="switch"` and
is visually hidden behind its track. The element carries `name`, `value`,
`checked`, `required`, `disabled` and `form` onto it, so a form of them submits,
resets and validates natively, in server-rendered markup before the script has
loaded too: a checked one submits its `value`, or `on`, and an unchecked one
submits nothing.

- **`checked` is the starting state**, as on a native checkbox. Changing the
  attribute moves a checkbox the user has not clicked yet, and `form.reset()`
  returns to it. The `checked` property reads and writes the state shown now and
  never touches the attribute; `defaultChecked` reads the starting state, the
  attribute's or the one `defaultChecked` gave in React, and sets the attribute.
  `type` reads `checkbox`, as on the inner input, which is how form libraries
  such as React Hook Form tell a checkbox apart.
- **The checkbox's own events** reach your listeners: `input` and `change` on
  every click, both bubbling through the element, with the inner `<input>` as
  `event.target`. The element dispatches none of its own.
- **`indeterminate`** on `<neuwo-checkbox>` is the inner checkbox's own property,
  which a click clears, and which assistive technology already announces as
  mixed.
- **The native form API** answers for the inner input: `form`, `validity`,
  `validationMessage`, `checkValidity()`, `reportValidity()` and
  `setCustomValidity()`. `focus()` and `blur()` move focus to it.
- **`aria-*` and `title`** on the element are copied onto the inner input;
  `data-*` stays on the element only.

What were the parts `field`, `input`, `label`, `track` and `error` are the
classes `.neuwo-form-check` or `.neuwo-form-toggle`, their `__input`, `__label`
and `__track` elements, and `.neuwo-choice__error`, listed under restyling above.

### Radio group

`<neuwo-radio-group>` holds `<neuwo-radio>` elements, directly or inside your own
markup. Each radio renders a native `<input type="radio">` inside a `<label>`
that also holds its children, and that input takes the group's `name`,
`required` and `form`, and its `disabled` too, so the browser groups the radios:
one is checked at a time, Tab reaches the checked one and the arrow keys move
the choice, `required` is checked natively, and the checked radio submits its
`value` under the group's `name`, in server-rendered markup before the script
has loaded too. The group needs a `name` to group its radios, as native radios
do: without one, each radio stands alone unless it carries a `name` of its own,
and the group warns in the console once when a radio has neither. The group renders the
`role="radiogroup"` box, its legend and the error line, and has no form control
of its own.

- **`value` on the group is the starting value**: the radio of that value
  starts checked, whatever its own `checked` says; without a group `value`, a
  radio's `checked` attribute decides. Changing the attribute moves the `checked`
  attribute to the radio of the new value, which then becomes checked, as a
  native radio does, unless a click or a script has already checked or
  unchecked that radio itself; a pick changes the picked radio and the one it
  unchecked. `form.reset()` returns to the starting value and leaves `error`
  alone. The group's `value` property reads the checked radio's value,
  or an empty string, and setting it checks the radio of that value, or none;
  `defaultValue` reads the starting value and sets the attribute.
- **The picked radio's own events** reach your listeners on the group: `input`
  and `change` once per pick, with that radio's `<input>` as `event.target`.
  The group dispatches none of its own, and setting `value` fires nothing.
- **The native form API** answers for the radios. `setCustomValidity()` sets
  its message on every radio, so the message holds, and clears, whichever radio
  is enabled. `form`, `validity`, `validationMessage`, `checkValidity()` and
  `reportValidity()` read the first enabled radio, which carries that message
  and, as every radio of a native group does, the group's `valueMissing`.
  `focus()` moves to the checked radio, else the first enabled one.
- **Changing the group** reaches every radio: its `name`, `value`, `disabled`,
  `required` and `form`. An `error` change touches no radio, so the user's pick
  stays.
- **A lone `<neuwo-radio>`**, outside any group, is a radio of its own, with its
  own `name`, `value`, `checked`, `required`, `disabled` and `form`; in a group
  without a `name`, its own `name` still applies. Its
  `checked` property is live on the input, `defaultChecked` reads the starting
  state, and `type` reads `radio`.
- **`aria-*` and `title`** on a radio are copied onto its input, and on the
  group onto the radiogroup; `data-*` stays on the element only.

What were the parts `legend` and `options` on the group, and `field`, `input`
and `label` on the radio, are the classes `.neuwo-radio-group__legend`,
`.neuwo-radio-group__options` and `.neuwo-form-check` with its `__input` and
`__label` elements, listed under restyling above.

### Segmented control

`<neuwo-segmented>` renders one `<button role="radio">` per `<option>` child,
inside a horizontal `role="radiogroup"` pill, and keeps your options in a hidden
`<select>`. Its form control is a visually hidden native `<input>`,
`.neuwo-segmented__form-value`, which carries `name`, the starting value,
`required`, `disabled` and `form`, so the control submits, resets and validates
with its form, in server-rendered markup before the script has loaded too. A pick
needs the script, though: with JavaScript off the buttons do nothing, so a
`required` control with no starting value blocks its form.

```html
<neuwo-segmented name="view" label="Results view" value="visual">
  <option value="visual">Visual</option>
  <option value="json">JSON</option>
  <option value="raw" disabled>Raw</option>
</neuwo-segmented>
```

- **`value` is the starting value**, as on the combobox: the option it names
  starts selected when it is enabled, else the first enabled option marked
  `selected`, else none. Its button carries `aria-checked="true"`, which gives it
  the blue background and white text from CSS, so the selection shows from the
  first paint with no script. `form.reset()` returns to it and leaves `error`
  alone. The `value` property reads and sets the live value, selecting only an
  enabled option's value, and never touches the attribute; `defaultValue` reads
  the starting value and sets the attribute.
- **The sliding pill** appears once the user picks: the element places it under
  the selected option, from where it slides to each later pick and follows a
  resize. Until then the selected option shows its own background, so nothing
  moves or shifts when the script loads. In a disabled control the selected
  option dims with the others.
- **A pick** by click or key dispatches `input` then `change` on the element,
  once each, with the element as `event.target`; setting `value` fires nothing,
  and `commit(value)` picks as the user does. The arrow keys move the selection,
  which follows focus, wrapping past disabled options; in a right-to-left
  context ArrowLeft moves to the next option and ArrowRight to the previous.
  Home and End go to the first and last enabled option, and Space selects the
  focused one.
- **The native form API** answers for the hidden input: `form`, `validity`,
  `validationMessage`, `checkValidity()`, `reportValidity()` and
  `setCustomValidity()`. `focus()` moves to the selected option, else the first
  enabled one, and focus that lands on the hidden input, as the browser's
  validation does, moves there too.
- **It is always horizontal**, with `aria-orientation="horizontal"`; there is no
  `orientation` attribute. `label` names the radiogroup, `aria-*` and `title` on
  the element are copied onto it, and `data-*` stays on the element only.

What were the parts `group`, `indicator`, `option` and `error` are the classes
`.neuwo-segmented`, `.neuwo-segmented__indicator`, `.neuwo-segmented__option`
and `.neuwo-choice__error`, listed under restyling above.

## Form errors

Every form control (fields and selection controls) shows an error from the consumer-set
`error` attribute: the message text, a red accent, and `aria-invalid` on the control. The
component owns no error text of its own, so the consumer decides when the error appears and
clears (`required` validity is reported natively and separately, not as this message). On
the four fields (`<neuwo-input>`, `<neuwo-textarea>`, `<neuwo-range>` and `<neuwo-combobox>`),
`<neuwo-checkbox>`, `<neuwo-toggle>`, `<neuwo-radio-group>` and `<neuwo-segmented>` the message
line is part of the rendered markup, so an error the server sets shows in the first paint, and a
form reset leaves `error` alone: the page set it, so the page clears it.

Add `error-muted` alongside `error` to drop the heavy control chrome without losing the note: the
red border and box-shadow ring come off the instant the user acts, while the red message and the
invalid state (`aria-invalid`, `aria-describedby`) stay until you re-validate and remove `error`.
Use it for the "reward early, punish late" pattern, flag on commit, ease off the moment the user
acts, clear once the input validates:

```js
const group = document.querySelector("neuwo-radio-group");

// Punish late: assert the full error only on submit.
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (group.checkValidity()) {
    group.removeAttribute("error");
    group.removeAttribute("error-muted");
  } else {
    group.removeAttribute("error-muted");          // re-arm the red alarm
    group.setAttribute("error", "Please choose a tier");
  }
});

// Reward early: the instant the user acts, soften but keep the message.
group.addEventListener("change", () => {
  if (group.hasAttribute("error")) group.setAttribute("error-muted", "");
});
```

Every control reserves a fixed-height row for the message so toggling an error
never shifts layout. A control used as a plain toggle with no validation (a
toolbar `<neuwo-segmented>`, say) can drop that row with `no-error-line`, so it
carries no empty vertical space. The control is then treated as non-validated:
setting `error` alongside `no-error-line` is a misconfiguration, the message has
nowhere to render.

For a check the page runs itself, such as a run button that needs a URL, `flashError()` on a
`<neuwo-input>` or `<neuwo-textarea>` shows the error look for 0.9 s: the red border, the danger
ring and the shake, or no shake under reduced motion. It prints no message, sets no invalid state
and leaves `error` alone, so an error set meanwhile stays. It wins over focus while it shows, and
calling it again restarts it. For that moment the element carries
`data-neuwo-state="error-flash"`.

```js
run.addEventListener("click", () => {
  if (!url.value.trim()) url.flashError();
});
```

## Capture CTAs

`<neuwo-cta>` takes an inline control in its `field` slot, so an email-capture
band is the same element as any other band rather than a hand-rebuilt copy of
it. Submission stays with the page: wrap the band in your own `<form>`, and the
control in the field and the submit button drive it.

```html
<form id="capture">
  <neuwo-cta pulse>
    Ready to <span data-accent>classify at scale</span>?
    <span slot="sub">Get started with the Classification API.</span>
    <neuwo-input slot="field" type="email" name="email" size="sm" required
                 autocomplete="email" label="Work email"
                 placeholder="you@company.com"></neuwo-input>
    <neuwo-button slot="actions" type="submit" variant="solid">Get Started</neuwo-button>
    <neuwo-button slot="actions" variant="outline" href="/contact/">Contact Us</neuwo-button>
  </neuwo-cta>
</form>
```

Report the outcome through `status` and `status-state` (`muted`, `success`,
`error`). The band owns the message line and its live region, so the page's
submit handler only writes the text:

```js
cta.status = "Thanks, we will be in touch shortly.";
cta.statusState = "success";
```

Fields carry a `size="sm"` density step for placements like this one, which
tightens the control, its label and its error line together.

The element renders into its own light DOM, so a server-rendered band is styled from the first
paint. The headline goes into `.neuwo-cta__headline`, and the `slot="sub"`, `slot="field"` and
`slot="actions"` children into `.neuwo-cta__sub`, `.neuwo-cta__field` and `.neuwo-cta__actions`.
The sub wrapper is a `<div>`, so a paragraph works as the sub line. The field wrapper carries
`.neuwo-cta__field--empty` and leaves no gap while nothing fills it. Appending a field to the
element, or removing one from inside its wrapper, updates it in a microtask. A `<neuwo-input>` in
the field is rendered with the band, so a server-rendered capture form is styled, and submits,
before the bundle has loaded.

The band warns in the console when it has no headline or no button in `actions`.
It checks a band from the page's markup or the server when it starts, an empty one too, and a band
a script fills after inserting it once a change adds to its children. A band a script builds and
inserts already complete is not checked.

## Notices

`<neuwo-notice>` is one card for every message the visitor did not ask for: a
consent banner, a language hint, a toast. What differs between those is separate
axes rather than one bundled variant, so they mix freely: `position` (which
viewport corner, or `static` to flow with the page), `layout` (actions under the
text or beside it), and `dismissible` (a consent banner deliberately is not).
The close button rests at 60% opacity and comes to full strength on hover and
keyboard focus, when a soft square appears behind the cross. `dismiss-filled`
gives it a subtle background at rest, stronger on hover and keyboard focus, for a
card where the cross alone would not stand out. A
dismissible card reserves the button's corner plus a `--neuwo-space-2` gap, so its
text and actions stop 8px short of the button, even in a card that shrinks to a
short title.

Visibility is the native `hidden` attribute, so a card that waits on a decision
starts hidden in the markup. Closing is the page's to remember: the component
hides the card and fires a cancelable `dismiss`.

```html
<neuwo-notice id="lang-hint" dismissible dismiss-label="Zamknij" hidden>
  <span slot="title">Read this page in <a href="/pl/">Polski</a>?</span>
</neuwo-notice>
```

```js
const hint = document.getElementById("lang-hint");
hint.addEventListener("dismiss", () => localStorage.setItem("lang-hint", "1"));
if (!localStorage.getItem("lang-hint")) hint.hidden = false;
```

The element renders into its own light DOM, so a server-rendered notice is styled from the first
paint. The `slot="title"` children go into `.neuwo-notice__title`, the `slot="actions"` children
into `.neuwo-notice__actions` and the rest into `.neuwo-notice__message`; a wrapper nothing fills
carries its `--empty` modifier and leaves no gap. Appending to the element, replacing its content,
or adding to or removing from a wrapper updates the modifiers in a microtask, and a placed child
whose `slot` changes moves to the wrapper of its new slot. A toast that takes its notice out of the
page between messages gets the same for a change inside a wrapper or to a `slot` made meanwhile; a
change to the notice's own children is fitted when it is put back. Links in the title or message
share a tree with the card, so a rule such as `neuwo-notice .neuwo-notice__message a` reaches them.

A notice announces itself politely, with `role="status"` on the `.neuwo-notice` card, unless you
declare something stronger on the element; a consent banner is a question, so give it
`role="dialog"` and a label, and the card then carries no role of its own.

## Menus

`<neuwo-menu>` is an action menu: a list of `<neuwo-menu-group>` elements, each a list of
`<neuwo-menu-item>` elements. It renders a top-layer popover panel, hidden until a trigger opens it,
so served markup shows nothing before the script runs. Any button opens it through the browser's
own `popovertarget`, naming the panel, whose id is the menu's id followed by `-panel`, and a
`<neuwo-button>` opens it by its id (see [Menu buttons](#menu-buttons)). One menu can serve any
number of triggers.

```html
<button popovertarget="segment-actions-panel">Actions</button>

<neuwo-menu id="segment-actions" submenu="auto" align="start">
  <neuwo-menu-group heading="Segment">
    <neuwo-menu-item value="rename" hint="F2"><svg slot="start">...</svg>Rename</neuwo-menu-item>
    <neuwo-menu-item>
      <svg slot="start">...</svg>Move To
      <neuwo-menu slot="submenu">
        <neuwo-menu-group>
          <neuwo-menu-item value="sports">Sports</neuwo-menu-item>
          <neuwo-menu-item value="travel">Travel</neuwo-menu-item>
        </neuwo-menu-group>
      </neuwo-menu>
    </neuwo-menu-item>
  </neuwo-menu-group>
  <neuwo-menu-group heading="Sort By" select="one">
    <neuwo-menu-item value="name" checked>Name</neuwo-menu-item>
    <neuwo-menu-item value="reach">Reach</neuwo-menu-item>
  </neuwo-menu-group>
  <neuwo-menu-group>
    <neuwo-menu-item href="https://example.com/docs" target="_blank">Open API Docs</neuwo-menu-item>
  </neuwo-menu-group>
  <neuwo-menu-group>
    <neuwo-menu-item value="publish" tone="green">Publish</neuwo-menu-item>
    <neuwo-menu-item value="delete" tone="red">Delete</neuwo-menu-item>
  </neuwo-menu-group>
</neuwo-menu>
```

The menu lines the panel up with the trigger that opened it, below it, or above it when there is
more room there, and keeps it attached while the page scrolls or resizes. The panel is 13rem to
20rem wide, so long labels wrap, and never taller than the room beside its trigger less a margin: a
longer menu scrolls inside it. A trigger the menu did not render, such as a plain
`<button popovertarget>`, is never written to. For a simple menu, put the items in the menu
directly, as one group without a heading; a menu of groups and items mixed is not supported.

`<neuwo-menu>`:

- **`id`** names the panel `<id>-panel`, the id a trigger's `popovertarget` gives. A menu in an
  item's `submenu` slot needs none.
- **`align`**: `start` (default) or `end`, the trigger edge the panel lines up with.
- **`submenu`**: `flyout`, `drill` or `auto` (default), how submenus open, set on the root menu:
  beside the menu, in its place with a Back row, or beside it when it fits and in its place when it
  does not. See [Submenus](#submenus).

`<neuwo-menu-group>`:

- **`heading`**: a label above the items, which names the group for screen readers.
- **`select`**: absent, the items are actions; `one`, radio items, one checked at a time; `many`,
  checkbox items. The check, or the radio's dot, sits in the start position.
- **`no-divider`** drops the divider that separates the group from the one before it. The first
  group shown never has one.

`<neuwo-menu-item>`:

- **The label** is its content; **`slot="start"`** holds a start icon, muted and blue on hover, and
  **`slot="submenu"`** a nested `<neuwo-menu>`, which adds a chevron at the item's inline end and
  makes the item open it (see [Submenus](#submenus)).
- **`value`** is reported when the item is picked; without it, the label text is.
- **`hint`**: short trailing text, such as a shortcut, a file type or a plan.
- **`tone`**: `red` or `green` colours the label and the icon. Blue is left out because hover is.
- **`disabled`** dims the item, which stays focusable but cannot be picked.
- **`checked`**: the state of an item in a group with `select`, which a pick changes.
- **`href`**, with `target`, `rel` and `download`, makes a link item, a real `<a>`, unless the item
  is disabled, checkable or opens a submenu. With `target="_blank"` it shows an external-link mark
  and tells screen readers it opens a new tab.
- **`hidden`**, the global attribute, removes the item from the menu and from the keyboard order. A
  group whose items are all hidden is hidden with its heading and divider, and a divider only ever
  follows a group that shows.

Opening the menu focuses its first enabled item. Picking an item works like this:

- An action item, or a link item, closes the menu and returns focus to the trigger; a link item
  then follows its link.
- A checkable item changes and the menu stays open: in a `select="one"` group the picked item is
  checked and the others are unchecked, and in a `select="many"` group the item toggles.
- A `disabled` item cannot be picked, and the menu stays open.

The menu fires two events, both bubbling and cancelable:

- **`open`**, just before the panel shows, with `detail.trigger`, the element that opens it.
  Cancelling it keeps the menu closed. A menu that several rows share uses it to hide, disable or
  check items for the row that opened it; a `hidden` item leaves the menu and the keyboard order.
- **`select`**, when an item is picked, before the pick takes effect, as a native click comes
  before its default action. `detail` holds `value`, `item` (the `<neuwo-menu-item>`), `trigger`
  and, on a checkable item only, `checked`, the state the item is about to take. Cancelling it
  stops the pick: an action leaves the menu open, a checkable item keeps its state, and a link item
  does not navigate.

The item's own `click` bubbles as well, so a page can listen on one item instead.

```js
const menu = document.getElementById("segment-actions");
menu.addEventListener("open", (event) => {
  const live = event.detail.trigger?.dataset.status === "live";
  menu.querySelector('neuwo-menu-item[value="publish"]').hidden = live;
});
menu.addEventListener("select", (event) => {
  if (event.detail.value === "delete" && !confirm("Delete this segment?")) event.preventDefault();
});
```

`trigger` is the element that opened the menu while it is open, else null: the `<neuwo-button>`
around the button that opened it, so the page's own `data-*` attributes on it can be read, or the
button itself. `isOpen` says whether the menu is open. `open(trigger)` opens it as if `trigger`
had, firing `open` and focusing the first enabled item, and `close()` closes it as Escape does.
Clicking a second trigger while the menu is open reopens it as that trigger's menu, firing `open`
again. On a host React rendered, a pick of a checkable item only fires `select`, and React's state
decides `checked`.

The keyboard follows the WAI-ARIA menu button pattern, moving real focus between the items:

| Key | On | Does |
| --- | --- | --- |
| Enter, Space or ArrowDown | the trigger | Opens the menu on its first enabled item |
| ArrowUp | the trigger | Opens the menu on its last enabled item |
| ArrowDown and ArrowUp | an item | Moves to the next or previous item, wrapping; `hidden` items are skipped, disabled ones are not |
| Home and End | an item | Moves to the first or the last item |
| Enter or Space | an item | Picks it |
| ArrowRight (ArrowLeft right to left) | an item with a submenu | Opens the submenu on its first enabled item |
| Enter or Space | an item with a submenu | Opens the submenu on its first enabled item |
| ArrowLeft (ArrowRight right to left) | an item in a submenu | Closes the submenu and returns focus to its item |
| Escape | an item in a submenu | Closes the submenu and returns focus to its item |
| Escape | an item in the first level | Closes the menu and returns focus to the trigger |
| Tab | an item | Closes the menu and moves on from the trigger |

A click outside the menu closes it, and so does a click on the trigger that opened it. A pick
returns focus to the trigger only while focus is still in the menu, on the page's body or nowhere,
so a `select` handler that moves focus, to a rename field for example, keeps it there.

### Menu buttons

`<neuwo-button>` opens a menu itself, and takes four attributes for it:

```html
<neuwo-button variant="outline" menu="export">Export</neuwo-button>
<neuwo-button split type="submit" menu="save-options" menu-label="More Ways to Save">Save</neuwo-button>
<neuwo-button icon-only variant="outline" size="sm" menu="row-actions" aria-label="Actions for Sports Fans"></neuwo-button>
```

- **`menu`**, the id of a `<neuwo-menu>`: the button opens that menu. Without `split`, the native
  button is always a `<button type="button">`, whatever `href` and `type` say. It carries
  `popovertarget` and `aria-controls` naming the panel, `aria-haspopup="menu"`, and `aria-expanded`,
  which is `true` only while the menu is open from this button, so of several buttons sharing one
  menu only the one that opened it has `aria-expanded="true"`; Chromium still reports them all as
  expanded while the menu is open (see the row menu below). A chevron follows the label and any
  `slot="end"` children and turns while the menu is open. A button naming no menu on the page stays
  an ordinary button.
- **`split`**, with `menu`: two halves in one pill. The main half is the button as it is without
  `menu`, so `href` makes it a link and `type`, `form`, `name` and `value` act on its form. The
  toggle half is always a `<button type="button">`; it opens the menu and carries the chevron,
  `popovertarget` and the menu's `aria-*` attributes. A click on the toggle half, or on the 1px gap
  between solid halves, stops propagating at the `<neuwo-button>`, so only the main half's clicks
  reach its `click` listeners and bubble on to the page, and a click handler on the host runs the
  default action alone. `disabled` disables both halves. `loading` shows the spinner on the main
  half and disables the toggle half, and the main half too unless it is a link: a loading link stays
  a link, marked busy, that a pointer cannot click but Enter still follows, as it does without
  `split`. The halves do not lift on hover, so they stay level. The menu lines up with the toggle
  half, so give it `align="end"` to line it up with the pill's end. Without `menu`, `split` changes
  nothing. With a `menu` that names no menu on the page, the toggle half still renders and does
  nothing, since a server cannot know whether the menu exists.
- **`menu-label`**: the accessible name of a `split` button's toggle half, More Options by
  default.
- **`icon-only`**: a round button whose content is its icon, padded by its font size, so `size`
  scales it. With `menu` and no content it shows three dots, and it never shows the chevron. While
  it loads, the spinner takes the icon's place, so it stays round. Name it with `aria-label`, which
  the button forwards. It works without `menu` too, for a close or a copy button. On a `split`
  button it is ignored, and the split renders as it does without it.

`variant`, `size`, `hover`, `disabled` and `loading` combine with all of them as they do on any
button; on a `split` button, `variant`, `size`, `hover`, `disabled` and `loading` reach both halves,
`menu` and `menu-label` the toggle half, and the rest the main half. The menu reports the
`<neuwo-button>` as its `trigger`, not the native button inside it, so the page's own attributes on
the host can be read in `open` and `select`. A table writes its row menu once and gives every row a
button:

```html
<table>
  <tr>
    <td>Sports Fans</td>
    <td><neuwo-button icon-only variant="outline" size="sm" menu="row-actions" data-status="live" aria-label="Actions for Sports Fans"></neuwo-button></td>
  </tr>
  <tr>
    <td>Luxury Travel</td>
    <td><neuwo-button icon-only variant="outline" size="sm" menu="row-actions" data-status="draft" aria-label="Actions for Luxury Travel"></neuwo-button></td>
  </tr>
</table>

<neuwo-menu id="row-actions" align="end">
  <neuwo-menu-item value="rename">Rename</neuwo-menu-item>
  <neuwo-menu-item value="publish" tone="green">Publish</neuwo-menu-item>
  <neuwo-menu-item value="delete" tone="red">Delete</neuwo-menu-item>
</neuwo-menu>

<script>
  const rows = document.getElementById("row-actions");
  rows.addEventListener("open", (event) => {
    rows.querySelector('neuwo-menu-item[value="publish"]').hidden = event.detail.trigger?.dataset.status === "live";
  });
  rows.addEventListener("select", (event) => {
    const segment = event.detail.trigger?.closest("tr")?.cells[0].textContent;
    console.log(`${event.detail.value} ${segment}`);
  });
</script>
```

A click on another row's button while the menu is open moves the menu to that row and fires `open`
again for it. While a shared menu is open, Chromium reports every button that names it as expanded
to assistive technology, whatever its `aria-expanded` says, since it exposes every `popovertarget`
button of an open popover that way. A page that wants exact per-row state can give each row its own
menu.

### Submenus

An item with a `<neuwo-menu slot="submenu">` opens that menu as a submenu, on a click, on Enter or
Space, or on ArrowRight (ArrowLeft in a right-to-left page); its first enabled item takes focus.
Submenus nest to any depth, and the nested menus need no id. Each submenu is a popover of its own
inside its item, so closing a level closes the levels it opened, and opening a submenu closes the
one its sibling had open. A pick in a submenu fires `select` on the root menu and closes every
level, as in the first. ArrowLeft (ArrowRight right to left) or Escape closes one level and returns
focus to the item that opened it; Escape on the first level closes the menu.

The root menu's `submenu` attribute sets how every submenu in it opens:

| `submenu` | Opens the submenu | Pointer |
| --- | --- | --- |
| `flyout` | Beside the menu, at its inline end, else its inline start, with its first item level with the item that opened it. With no room on either side it overlaps the menu at the viewport's inline end. | Resting on an item opens its submenu after 120 ms; resting on another item of the same menu for 250 ms closes it, unless the pointer reaches the submenu first. |
| `drill` | In the menu's place: on its top and inline-start edges, at least as wide, with the menu hidden under it and a Back row at its top naming the item, which screen readers hear as "Back to" and the item's label. The Back row, ArrowLeft or Escape go up one level. | A click opens it. |
| `auto` (default) | Beside the menu when the submenu fits there, in its place when it does not, decided each time it opens. | As `flyout` while it would open beside the menu; a click otherwise. |

Room is measured against the viewport, less an 8px margin, since the panels are top-layer popovers
placed in viewport coordinates; a container's edges do not count. A submenu follows its menu while
the page scrolls. A drill-in slides in from the inline end, and the panel and drill-in animations
stop under `prefers-reduced-motion`.

An item that opens a submenu is always an action item, a `menuitem`, even in a `select` group: it
shows no check, and `checked` does nothing on it. A group's `select` applies to its own items, so an
item placed directly in a submenu, with no group of its own there, is an action too.

The elements render into their own light DOM, so `expand()` renders a whole menu on the server and
the panel is styled from the first paint once it opens; the classes are listed under restyling
above.

## Sidebar

`<neuwo-sidebar>` is a site's navigation down the side of the page: the brand at the top, a nav of
`<neuwo-nav-item>` entries and folding `<neuwo-nav-section>` sections with the
[navigation link](#navigation-links) look, and a footer. From 48rem it is a column, sticky at the
top and the full viewport tall, whose nav takes the slack and scrolls on its own. Below 48rem it is
a glass bar pinned to the top, with a menu button that shows and hides the nav under it.

```html
<div class="shell">
  <neuwo-sidebar label="Documentation" current="/guides/setup/">
    <a slot="brand" href="/"><neuwo-logo variant="bg-dark" label="Neuwo Docs"></neuwo-logo></a>
    <button slot="actions" type="button" aria-label="Setup">...</button>
    <neuwo-nav-item href="/">Getting Started</neuwo-nav-item>
    <neuwo-nav-section label="Guides">
      <neuwo-nav-item href="/guides/">Introduction</neuwo-nav-item>
      <neuwo-nav-item href="/guides/setup/">Setup</neuwo-nav-item>
      <neuwo-nav-section label="Advanced">
        <neuwo-nav-item href="/guides/advanced/caching/">Caching</neuwo-nav-item>
      </neuwo-nav-section>
    </neuwo-nav-section>
    <a slot="footer" href="https://neuwo.ai/">Back to neuwo.ai</a>
  </neuwo-sidebar>
  <main class="content">...</main>
</div>
```

The layout around the sidebar is the page's. The element draws no box of its own, so its
`<aside>` is the first item of the page's flex row, and below 48rem the row stacks:

```css
body {
  margin: 0;
}

.shell {
  display: flex;
  align-items: flex-start;
}

.content {
  flex: 1 1 auto;
  min-inline-size: 0;
  max-inline-size: 48rem;
  margin-inline: auto;
  padding: var(--neuwo-space-8);
}

@media (width < 48rem) {
  .shell {
    display: block;
  }
}
```

`min-inline-size: 0` lets the content narrow below its widest child, such as a code panel, instead
of pushing the page sideways, and without the body's default margin the column and the phone bar
reach the edges of the window.

`<neuwo-sidebar>`:

- **`current`** is the current page. The entry whose `href` names it carries `aria-current="page"`
  and the active underline, and the sections holding it are marked and open (see
  [Sections](#sections)); a page below an entry does not mark the entry. Both compare without the
  query, the hash, a trailing slash or a trailing `/index.html`, and with percent-encoding decoded,
  so `/guides`, `/guides/` and `/guides/index.html` are one page, and so are `/café/` and
  `/caf%C3%A9/`. A path from the site's root compares with a path, and a full URL with a full URL; a
  relative `href` never matches. Without `current`, the element takes `location.pathname` when its
  script runs, so served markup marks nothing until then. A React or Next.js app must pass
  `current`: before React hydrates a server-rendered sidebar, the element cannot tell that React
  rendered it, so it would write the location into markup React owns. Set it wherever the page is
  known, as a server always can, so the first paint is marked.
- **`label`** names the nav (default Main).
- **`menu-label`** names the menu button (default Menu).
- **`remember`** keeps the reader's place in the nav for the tab, the sections they leave open and
  how far the nav is scrolled (see [Remembered sections](#remembered-sections)).

The places, as slots:

| Slot | From 48rem | Below 48rem |
| --- | --- | --- |
| `brand` | the top of the column, centred; a `<neuwo-logo>` in it is 10rem wide | the start of the bar; a logo is 7rem wide |
| `actions` | not shown | in the bar, before the menu button; on a row of their own at the bar's end when they do not fit beside the brand |
| (default) | the `<neuwo-nav-item>` entries and `<neuwo-nav-section>` sections, in the nav | in the menu |
| `after-nav` | between the nav and the footer, outside the nav's scroll | in the menu, under the nav |
| `footer` | the bottom of the column, ruled off above | in the menu, under the rest |

The child in `brand` is made a flex box, so no line box stands a link taller than its logo. That
rule weighs one class, the same as a page rule such as `.site-brand { display: inline-block }`, so
the page's rule wins only when it comes later. It does not when the page's stylesheet is linked
before the library's, or under `neuwo-standalone.js`, whose adopted sheet comes after every linked
one. To set the child's `display` whatever the order, put the wrapper's class in front:
`.neuwo-sidebar__brand > .site-brand`.

`<neuwo-nav-item>` takes the page in **`href`**, and its label as its content, text or inline
markup such as a `<neuwo-badge>`.

The menu button is the `<summary>` of a `<details>` around the nav, the after-nav place and the
footer, so the browser holds its state and announces it, and on a server-rendered page it works
before the library's script runs, or without it. The menu starts closed on every page, and following
any link in the sidebar closes it, unless a modifier key or the middle button opens the link
elsewhere. When the page stays, as a client-side router keeps it, focus goes back to the menu button
rather than staying on a link the closed menu hides. From 48rem the nav shows whatever the menu's
state, so widening the window with the menu open shows the column as it should be. That takes
`::details-content`, which arrived in Chromium 131, Safari 18.4 and Firefox 143; an older browser
keeps the menu button in the column too, at its start under the brand, and shows the nav once the
reader opens it, with or without the library's script. A script reads or sets the menu's state
through the **`menuOpen`** property, for instance to close it when a panel of its own opens; it is
not reflected to an attribute.

A plain click on an entry, or on a section's own link, that leads to another page of the same origin
fires **`navigate`** on the sidebar, a cancelable, bubbling `CustomEvent` whose `detail.href` is the
link's `href`, before the browser follows it. A site with a client-side router cancels it and routes
instead, so the page around the sidebar, and the sidebar's own state, stay in place. Then it sets
`current` to the new page, so the mark and the sections follow; a React app passes the router's path
as the `current` prop instead. An entry on another origin, or one to a place in the current page
such as `#heading`, fires nothing: the browser follows it, and the menu still closes. Neither does a
click with a modifier key, or one whose default a handler has already prevented, nor the links in
the other places, which are the site's own markup: give those the router's own link. In React,
`onnavigate` binds it.

```js
document.querySelector("neuwo-sidebar").addEventListener("navigate", (event) => {
  event.preventDefault();
  router.push(event.detail.href);
  event.currentTarget.current = event.detail.href;
});
```

The column is 17rem wide unless **`--neuwo-sidebar-width`** says otherwise. The library reads it and
never declares it, so set it on the element or an ancestor. The 48rem breakpoint is fixed, since a
custom property cannot drive a media query. The space below the footer is
**`--neuwo-sidebar-end-space`**, read the same way: the column's bottom padding, `--neuwo-space-6`
unless it is set, and in the phone menu the footer's bottom margin, `--neuwo-space-4` unless it is
set. Set it to `0` or a small space for a footer that brings its own, such as a short link. The
entries are `.neuwo-nav-link` with `--neuwo-nav-link-gutter` at `--neuwo-space-2`; the classes are
listed under restyling above.

### Sections

`<neuwo-nav-section>` folds a group of entries under a name. It holds `<neuwo-nav-item>` entries and
further sections, in any order and to any depth, and a click anywhere on its row, or Enter or Space
on it, folds or unfolds it. The chevron at the row's inline end points down while the section is
open and towards the inline end while it is closed, mirrored right to left, and turns over
`--neuwo-transition-fast`, without moving under reduced motion.

- **`label`** is the section's name. A section nested in another takes the small nav-link size for
  it, as nested entries do.
- **`open`** starts the section open. It is the starting state only: removing it later leaves the
  section open.
- **`href`** makes the name a link to the section's own page, which carries `aria-current="page"`
  there, and turns the chevron into a separate toggle beside it, named from the label: Show Guides
  pages. Two targets side by side, never a link inside a toggle.
- **`id`** names the section for remembering its state; its `<details>` carries it as `data-key`.
  Without one, the label does.

Let a section only fold, and give its own page as the first entry inside it, an Introduction entry,
rather than setting `href`. A name that both links and folds is two targets in one row, and on a
phone a tap meant to look inside the section takes the reader away instead.

A section is marked, with the active underline on its name, and opens when it holds the current page
at any depth, or when the current page lies below the page of one of its entries, or below its own
`href`, as a page the nav does not list would. An entry is marked only on its own page, so such an
unlisted page lights the sections above it and no entry. Each element works its mark out from
`current` and its own contents, so no site marks anything by hand. A section works its mark out
again when its own attributes or `current` change, or when an entry or a section is added to it or
taken out of it; a change a script makes further in, such as a new `href` on an entry or an entry
added to a nested section, does not re-mark the sections around it until they render again, as they
do when `current` changes.

Only the reader closes a section. When `current` moves, as a client-side router moves it, the new
page's sections open and take the mark, and every section already open stays open, the one around
the page the reader left included. A section the reader closed stays closed through any re-render
until they open it, or until the current page moves into it. The section's `<details>` holds its
open state, so the app holds none.

Each section is a `<details>` whose `<summary>` is the row, or with `href` the toggle, so the browser
announces it as expanded or collapsed, and a served section folds before the library's script runs,
and without it.

In React, write the entries and sections as JSX directly inside `<neuwo-sidebar>`; an inline
`.map()` is fine. The JSX runtime hands them the sidebar's `current` through elements, fragments
and other Neuwo elements, but it cannot see into a component of your own, so the entries such a
component renders mark nothing, and the sections around them cannot tell that they hold the page.

### Remembered sections

`remember` keeps the reader's place in the nav as they move between the pages of a site that is not
a single-page app: the sections they leave open, and how far the nav is scrolled. With it, the
sidebar ends with a small inline script, `.neuwo-sidebar__remember`, after the nav. On each page the
script opens the sections the reader left open and scrolls the nav back, then saves both whenever a
section folds or unfolds and when the reader leaves the page. It only ever opens a section, so the
current page's sections and those with `open` stay open. A remembered section the nav no longer
holds is skipped, then forgotten at the next save.

```html
<neuwo-sidebar label="Documentation" current="/guides/setup/" remember>...</neuwo-sidebar>
```

The place lasts for the tab, in `sessionStorage`: a new tab, or the same site opened again later,
starts with only the current page's sections open. It is stored under `neuwo.sidebar`; give
`remember` a value, such as `remember="docs"`, to store it under another key, so two sidebars on one
origin keep their places apart. A section is known by its `id`, or by its label without one, joined
with the sections above it, as in `Guides/Advanced`, so renaming a section or giving it an `id`
forgets whether it was open. A label holding a `/` can match a nested section's key, so give such a
section an `id`. Where the browser refuses storage, the sidebar works as it does without
`remember`.

Below 48rem the menu starts closed on every page, so the nav's scroll is not kept there; the open
sections are. The script finds its sidebar through `document.currentScript`, which is null inside a
shadow root, so a sidebar rendered in one remembers nothing.

On a served page, from `expand()`, the Eleventy plugin or a Next.js server render, the parser runs
the script as it reaches it, so the remembered sections are open at the first paint, a hard reload
included. On a hand-written page the element runs it as it renders. The script is the same on every
page and for every key, so a Content-Security-Policy that blocks inline scripts allows it by one
hash, which changes only when a release changes the script:

```text
Content-Security-Policy: script-src 'self' 'sha256-ZTKv1/g1fvGFd27Vt77d3tOIO3zMS1nhap0AK13DzVM='
```

An HTML minifier that rewrites inline scripts changes the script, and with it the hash, so keep the
script out of its reach or allow the hash of what it writes.

React does not run a script it renders on the client, and its development build warns about one
("Encountered a script tag while rendering React component"). A client-only React app therefore
leaves `remember` off and keeps its sidebar mounted in a layout that stays between pages instead: the
sections' own `<details>` hold what is open and the nav keeps its scroll, with no state in the app.
A Next.js app does the same between client navigations, and may set `remember` as well, since its
server render carries the script and the parser runs it on a hard reload.

### Eleventy and Next.js

In Eleventy, write the sidebar into the layout and pass the page's URL as `current`. The plugin
writes it out on every page, the `remember` script included, so each page paints with its entry
marked and the reader's sections open. [demo/eleventy](https://github.com/neuwoai/neuwo-web-ui-components/tree/v0.6.0/demo/eleventy) has it in `src/_includes/base.njk`:

```njk
<div class="shell">
  <neuwo-sidebar current="{{ page.url }}" remember>
    <a slot="brand" href="/"><neuwo-logo variant="bg-dark"></neuwo-logo></a>
    <neuwo-nav-item href="/">Sign Up</neuwo-nav-item>
    <neuwo-nav-section label="Layout">
      <neuwo-nav-item href="/second/">Second Page</neuwo-nav-item>
    </neuwo-nav-section>
  </neuwo-sidebar>
  <main class="content">{{ content | safe }}</main>
</div>
```

In Next.js, render the sidebar from a client component and place it beside `{children}` in the root
layout, so it stays mounted from page to page. The component passes `usePathname()` as `current`,
cancels `navigate` and hands the `href` to the router, and links the brand with `next/link`, since
the sidebar renders only the entries' links. External and in-page entries never reach the router,
since `navigate` fires only for another page of the same origin, so the handler routes every `href`
it is handed. The entries stay JSX directly inside the sidebar:

```tsx
// app/site-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function SiteSidebar() {
  const router = useRouter();
  return (
    <neuwo-sidebar
      current={usePathname()}
      remember
      onnavigate={(event) => {
        event.preventDefault();
        router.push(event.detail.href);
      }}
    >
      <Link slot="brand" href="/">
        <neuwo-logo variant="bg-dark" />
      </Link>
      <neuwo-nav-item href="/">Sign Up</neuwo-nav-item>
      <neuwo-nav-section label="Layout">
        <neuwo-nav-item href="/second">Second Page</neuwo-nav-item>
      </neuwo-nav-section>
    </neuwo-sidebar>
  );
}
```

```tsx
// app/layout.tsx
<body className="neuwo-body">
  <Neuwo />
  <div className="shell">
    <SiteSidebar />
    <main className="content">{children}</main>
  </div>
</body>
```

A client navigation then swaps the page and leaves the sidebar as the reader had it, its open
sections and its scroll included, while the new `current` moves the mark and opens the new page's
sections. A hard reload opens the remembered sections through `remember`, whose script the server
render carries. [demo/nextjs](https://github.com/neuwoai/neuwo-web-ui-components/tree/v0.6.0/demo/nextjs) is the working app.

## Spinner

`<neuwo-spinner>` is a loading ring for anything that waits on data: inline in a sentence, beside
a label, or alone in a panel. Unset, it is as tall as the text around it and takes the text's
colour; `size="m"` (1.5rem) and `size="l"` (2.5rem) suit a panel, and `variant="blue"` or
`"green"` gives a ring of its own the brand colour. The stroke grows with the ring.

```html
<neuwo-spinner id="segments-loading" size="l" label="Loading segments"></neuwo-spinner>
<section aria-label="Segments" aria-busy="true" aria-describedby="segments-loading">...</section>

<p><neuwo-spinner label=""></neuwo-spinner> Loading results</p>
```

A screen reader hears it as a progress bar named by `label`, Loading by default; set it to the
visitor's language. Without `label`, an `aria-label` on the element names the ring, as on
`<neuwo-copy>`, but it stays on the element too, where Chromium exposes it a second time, so
`label` is the cleaner choice. An empty `label` hides the ring from screen readers, as on the
logo, for a ring beside text that already says what is loading.

While a region loads, give it `aria-busy="true"` and point its `aria-describedby` at the
spinner's `id`, as WAI-ARIA asks of a progress bar that describes a region; the description
reaches the ring through the element. Keep the spinner outside the busy region, since a screen
reader may hold back what a busy region holds until it is done. A live region inserted together
with its text is not announced reliably, so a page that wants the load spoken updates a live
region it already has.

The element draws no box of its own (`display: contents`), so place the ring through
`.neuwo-spinner` or its parent; a rule on `neuwo-spinner` itself, such as a margin, does nothing.
The ring turns, and under `prefers-reduced-motion: reduce` it stands still and fades in and out
instead, so it never looks stuck. The class works without the element, from the stylesheet alone,
and hides with `hidden`: `<span class="neuwo-spinner" role="progressbar" aria-label="Loading"></span>`.

## Logo

`<neuwo-logo>` draws the Neuwo wordmark in one of the brand's four ink pairs, each named for
the background it belongs on. It inlines the SVG, so a logo costs no request.

```html
<neuwo-logo></neuwo-logo>                      <!-- bg-dark, the default -->
<neuwo-logo variant="bg-light"></neuwo-logo>
<neuwo-logo variant="bg-colour"></neuwo-logo>
```

| `variant` | `n e u` | `w o` | Use on |
| --- | --- | --- | --- |
| `bg-dark` (default) | white | blue | dark backgrounds |
| `bg-dark-alt` | blue | white | dark backgrounds, alternative |
| `bg-light` | blue | near-black | light backgrounds |
| `bg-colour` | white | near-black | brand-coloured backgrounds, where blue would vanish |

The element renders the `<svg>` into its own light DOM, so a server-rendered logo is drawn before
any script runs. The `<svg>` carries `.neuwo-logo` and one of `.neuwo-logo--bg-light`, `--bg-dark`,
`--bg-dark-alt` or `--bg-colour`; there is no `::part(logo)`. Restyle through the classes, with the
element name in front for weight: `neuwo-logo .neuwo-logo { opacity: 0.8; }`.

The element is the logo's box, and the drawing fills it at the wordmark's aspect ratio. Size it
with `--neuwo-logo-height` (default `1.75rem`), or with `height` or `width` on the element, as on an
image; the element's own rule weighs nothing, so a single class wins, `display` included:

```css
.header-logo { display: block; }                 /* a block, still 1.75rem high */
.spec-logo { width: 100%; height: auto; }        /* fills its container, height by ratio */
.toolbar-logo { min-width: 0; }                  /* may shrink as a flex item */
```

It never grows past its container (`max-width: 100%`), and a box narrower than the ratio scales
the drawing down inside it, centred. Size the element, not the inner `.neuwo-logo`, which fills it.
The accessible name defaults to `Neuwo`, and `label=""` marks the logo decorative instead, for a
link or heading that already names the brand:

```html
<a href="/" aria-label="Neuwo home" style="--neuwo-logo-height: 2.5rem">
  <neuwo-logo label=""></neuwo-logo>
</a>
```

The same four files are published under `logos/` for an `<img>`. A server-rendered or expanded
logo draws with the first paint; only one rendered by script waits for the bundle to run. So on
a page without server rendering, a header logo that is the page's largest paint should stay a
preloaded image.

```html
<link rel="preload" as="image" fetchpriority="high"
      href="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.6/dist/logos/neuwo-logo--bg-dark.svg" />
<img src="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.6/dist/logos/neuwo-logo--bg-dark.svg" alt="Neuwo"
     width="320" height="50" class="neuwo-logo" />
```

The published files are the brand's own exports, byte for byte, so a future export can be
diffed against them. The recipe holds no colour at all: each tone lives in its file, which is
why `variant` picks a drawing rather than recolouring one, and why the four files cost about
100 bytes between them once gzipped, the path data being identical.

## Develop

```bash
npm install
npm start     # build + watch + serve the demo at http://localhost:8000/demo/
npm run build # produce dist/ (neuwo.js, neuwo.css, fonts/, logos/, foundation/*.css, components/**/*.css, types/)
npm test      # Vitest + happy-dom
npm run fonts:subset # cut each font in src/foundation/font-sources into its Latin and extension files (needs Python fonttools and brotli)
npm run fonts:fallback # print the fallback @font-face rules computed from the woff2 files
npm run tokens:fallback # rewrite the hex fallbacks at the end of tokens.css from the colour tokens
```

See CONTRIBUTING.md for how to add or change components and keep the Neuwo Design System in
sync.
