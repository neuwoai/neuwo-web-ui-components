# Neuwo Web UI Library

Neuwo design-language web components: vanilla custom elements, zero runtime deps. The button,
badge, deal-ID chip, status dot, logo, copy wrapper, notice card, CTA band, form fields, checkbox,
toggle, radio and radio group render into light DOM and can be server-rendered; the segmented control
still uses Shadow DOM while it migrates.
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
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.1/dist/neuwo-components.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.1/dist/neuwo.js"></script>
```

**Self-hosted**, to keep every runtime request on your own origin and take the registry out of
the runtime path entirely. Copy the published `dist/` into your own static output at build time:

```js
// Eleventy
eleventyConfig.addPassthroughCopy({
  "node_modules/@neuwo/web-ui-library--demo/dist": "vendor/neuwo",
});
```

```html
<link rel="stylesheet" href="/vendor/neuwo/neuwo-components.css" />
<script type="module" src="/vendor/neuwo/neuwo.js"></script>
```

Next.js and Vite serve `public/` verbatim, so a `prebuild` script copying the same directory
into `public/vendor/neuwo` achieves the same thing.

### Versions

A page that server-renders the components fixes their markup at build time, so the markup is
part of the public API. Before 1.0, class names and markup structure change only in minor
releases; patch releases change CSS and behaviour only. Two ways to take that:

- **Float on patches**, for example `@0.2` in a jsDelivr URL. Styling and behaviour fixes reach
  every site centrally. A markup change reaches you only when you upgrade and rebuild.
- **Pin**, for example `@0.2.1`, or the version your lockfile resolves. Nothing changes until
  you decide it should. A pinned URL is immutable and cached for a year, while a floating one is
  cached at the edge for about half a day.

Either way, serve the stylesheet and the script from the same version you built with.

### Fonts

The brand fonts are `@font-face` rules inside the stylesheet, so there is nothing to inject.
Served from jsDelivr or your own origin, the `url()`s resolve to the `fonts/` folder beside the
stylesheet. A bundler treats them as ordinary CSS `url()`s: Vite, webpack and Turbopack copy the
woff2 files into the app's output and rewrite the URLs with no configuration. This is verified
with Vite 8 (dev server and build) and Next.js 16 (Turbopack and webpack).

To serve the fonts from somewhere else, override the faces by declaring your own `@font-face`
rules after the stylesheet. To avoid a swap on first paint, preload a file:

```html
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.1/dist/fonts/outfit-variable.woff2" />
```

## Consume

Components need the stylesheet and the script. Link `neuwo-components.css`, which holds the
design tokens, the font faces and every component's styles, then load the script; components
self-register.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.1/dist/neuwo-components.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.1/dist/neuwo.js"></script>
<neuwo-button variant="solid">Get started</neuwo-button>
```

In a bundler, import the stylesheet where you import the library:

```js
import "@neuwo/web-ui-library--demo/neuwo-components.css";
import "@neuwo/web-ui-library--demo";
```

The script is safe to import on a server, where it registers nothing.

Tokens are custom properties on `:root` and inherit through every component, so you re-theme by
setting them after the stylesheet:

```css
:root { --neuwo-color-blue: oklch(77% 0.18 132); }
```

For Neuwo typography on native headings and text as well, link `neuwo.css` instead. It is
`neuwo-components.css` plus typography, the page surface, navigation links and the Markdown
surface.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.1/dist/neuwo.css" />
```

Typography alone is also published as `foundation/typography.css`, and tokens alone as
`foundation/tokens.css`, for a consumer that keeps its own element styling.

### Setup per kind of site

| Site | One-time setup |
|---|---|
| Next.js, server-rendered React (React Router, Remix) | `"jsxImportSource": "@neuwo/web-ui-library--demo"` in `tsconfig`; import the stylesheet in the root layout; import the library once from a client component |
| Client-only React (Vite) | the same `jsxImportSource` line; import the stylesheet and the library at the entry |
| Eleventy | `eleventyConfig.addPlugin(neuwo)`; link the stylesheet; script tag for `neuwo.js` |
| Astro and other Node builds | call `expand(html)` from `@neuwo/web-ui-library--demo/server` on the output; link the stylesheet; load `neuwo.js` |
| Plain HTML, non-JavaScript servers | link the stylesheet and load `neuwo.js`; components render when the script runs |
| A page that can only add one script | `neuwo-standalone.js` alone; components render when the script runs |

"The stylesheet" is `neuwo-components.css`, or `neuwo.css` for Neuwo typography too. React and
Next.js are covered in [React](#react), Eleventy and other builds in [Server rendering](#server-rendering).

Without a framework, a script can change a rendered element as it would any other: set its
`textContent` or `innerHTML`, append a child with a `slot`, or set `aria-*`, `title` and `role`. The
element fits the change into its markup in a microtask, so read the markup back after an `await`,
not on the next line. As on first render, a child with no region to go to is removed, such as one
with a misspelt `slot` or any child of an element that has no regions.

### A page that can only add a script

Where you cannot link a stylesheet, load the standalone build on its own:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.1/dist/neuwo-standalone.js"></script>
<neuwo-button variant="solid">Get started</neuwo-button>
```

It embeds `neuwo-components.css`, applies it only if the page has not already linked it, and
loads the fonts from beside itself. Nothing renders until the script has run, so prefer the
linked stylesheet wherever you can add one.

### Server rendering

Import from `@neuwo/web-ui-library--demo/server`. `expand(html)` returns the HTML with every
registered `<neuwo-*>` tag written out as its full markup, so the page paints before any script
runs and still works with the script blocked.

```js
import { expand } from "@neuwo/web-ui-library--demo/server";

const output = expand('<neuwo-button variant="solid">Get started</neuwo-button>');
```

For Eleventy, add the plugin; it runs `expand` on every `.html` output:

```js
// eleventy.config.js
import { eleventyPlugin as neuwo } from "@neuwo/web-ui-library--demo/server";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(neuwo);
}
```

Then link the stylesheet and load `neuwo.js` in your layout as above. For Astro and other Node
builds, call `expand` on each page's output before it is written.

In Markdown, keep a block component, such as a field, `<neuwo-copy>`, `<neuwo-cta>` or
`<neuwo-notice>`, out of paragraphs of text. Markdown wraps a component on its own line, or a run of
them on consecutive lines, in a `<p>`, and a browser closes a paragraph at the first block element
inside it, which would move the component's markup out of the element. So `expand` replaces a
paragraph that holds only block components, whitespace and comments with what it holds, dropping the
paragraph's own attributes. A block component that shares a paragraph with text or an inline element
stays inside it and breaks.

### Links

The sheet styles bare `<a>` in prose: brand blue, underlined, deepening to `--neuwo-color-blue-dark`
on hover. Two classes ride along with it.

```html
<a class="neuwo-link" href="/privacy/">Privacy Policy</a>
<a class="neuwo-link neuwo-link--hover-green" href="/cookies/">Cookie Policy</a>
```

`.neuwo-link` states the same recipe explicitly, for an anchor whose surroundings strip link styling,
and for slotted content inside a component, where the shadow root cannot reach a nested `<a>` and
the host page has to style it. `.neuwo-link--hover-green` swaps the hover colour to the brand green.
Both underline at rest and carry the underline into the hover colour, because
`text-decoration-color` follows `currentColor`.

There is deliberately no `<neuwo-link>` element. Prose is authored in Markdown and CMSes that
emit `<a href>`, so a component would be bypassed by the very content it was built for, and a
class keeps the anchor in the source HTML: crawlable, and still a working link with the script
blocked. The trade is that a host page's own CSS can override these rules, which a shadow root
would have prevented.

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
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: var(--neuwo-z-background);
  overflow: hidden;
}

.neuwo-background__gradient {
  width: 100%;
  height: 100%;
}
```

`--neuwo-z-background` is a library token, so the stacking stays consistent with the rest of the
system. Both demo pages are wired exactly this way. The same gradient class also works on an
ordinary sized element, for a single washed panel rather than a whole page.

### Navigation links

`foundation/navigation.css` carries the brand's nav-link treatment, the centre-out underline
that grows from the middle of the text on hover and focus. Two classes:

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

The sheet styles links and nothing else. Placement, the list reset and any panel surface are
the consumer's, so navigation stays ordinary markup: a real `<ul>` keeps its list semantics,
nesting works to any depth, and a section that should collapse uses native
`<details>`/`<summary>`, which brings its own keyboard and ARIA behaviour. No script ships for
navigation.

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
permanently visible, and its shadow root forced items to be direct children and forced
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

Code is set in `--neuwo-font-mono`, a system stack (`ui-monospace`, then the developer faces most
likely installed). The brand ships no monospace face, so this is the one family token that is
not a Neuwo font.

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
- **`.neuwo-callout--info`**, **`.neuwo-callout--tip`** and **`.neuwo-callout--danger`** set the intent.

Intent is one property. Each modifier declares `--neuwo-callout-accent` and nothing else, and the block
reads that knob for both its edge and its tint. So a fourth intent needs no library change:

```css
.callout--warning {
  --neuwo-callout-accent: #d99a2b;
}
```

That example is also the honest gap. **There is no `warning` intent**, because the brand has no
amber: `--neuwo-color-blue`, `--neuwo-color-green` and `--neuwo-color-red` are the only semantic hues in the system,
and adding a fourth is a brand decision rather than a recipe one. Until one exists, the knob above
is the supported workaround.

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

Three details worth knowing:

- **The control is always rendered.** The markup cannot know whether the clipboard is reachable,
  so where it is not (an insecure context leaves `navigator.clipboard` undefined) a click announces
  `failed-label` instead of claiming success.
- **The outcome goes to a live region**, not to the button's label. Relabelling a control the user
  has just activated is announced inconsistently; a `role="status"` region is announced reliably.
  `label`, `copied-label` and `failed-label` are all yours to translate. For 1.2 s after a copy the
  host carries `data-neuwo-state`: `"copied"`, which draws the tick, or `"failed"`.
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
`<neuwo-range>`, `<neuwo-combobox>`, `<neuwo-checkbox>`, `<neuwo-toggle>`, `<neuwo-radio>` and
`<neuwo-radio-group>`) into their markup; MDX reads its own `jsxImportSource` option, not tsconfig's, so set it there too (in
`@mdx-js/*` or Next's MDX config). Elements recognise markup React rendered, from Client or Server
Components, and leave it to React, so without the setting a light DOM tag React renders stays bare.
The same setting adds every element to JSX with each attribute's allowed values and each custom
event's `detail`, so a misspelt variant fails the type check. React stays an optional peer
dependency.

React renders the markup of the sixteen light DOM elements itself, so they show from the first paint.
The Shadow DOM component (the segmented control) renders when it registers, which the first import
does in the same pass, before the browser paints. Registering later, from an effect or a script that
runs after the app, shows it as a bare tag first and the component a moment after.

React 19 sets a property where the element has one and binds events, so the elements behave like
native controls:

```tsx
<neuwo-button disabled={saving}>Save</neuwo-button>
<neuwo-checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
<neuwo-copy oncopied={(e) => toast(e.detail.text)}><pre>npm install</pre></neuwo-copy>
<neuwo-notice dismissible hidden={!open} ondismiss={(e) => { e.preventDefault(); setOpen(false); }}>...</neuwo-notice>
```

- `onChange` fires as it does on native fields. On the form fields, the checkbox, the toggle and
  the radio group that means React's own controlled and uncontrolled models, in
  [Form fields in React](#form-fields-in-react).
- A custom event binds by its exact name, so it is lower case: `oncopied`, `ondismiss`.
  `onCopied` listens for an event called `Copied`, which never fires; the types reject it.
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
- The radios may sit in your markup inside the group, in elements, fragments, `Suspense` or
  other Neuwo elements, and get the group's `name` and value there. A radio inside a component of
  your own is out of the group's reach, since the JSX runtime cannot see into it: it renders on
  its own, and development builds warn about it, so write the radios in place inside the group.
  One edge remains: a radio inside your own component, inside `Suspense`, inside a group, can
  mismatch on hydration when it is revealed.
- React Hook Form's `register` goes on the group: it reads the picked value from the group's
  `value` and checks the matching radio on a reset.
- A lone `<neuwo-radio>` outside any group behaves like React's own radio, through `checked` and
  `defaultChecked`.
- Markup React renders once and never hydrates, such as an Astro component with no client
  directive, gives the group element no `value` attribute when only `defaultValue` is set, as it
  does a field. Change an attribute of such a group later, from a script, and its radios lose
  that starting value; set `value` there instead.

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
- If the options change while the combobox is mounted, for example once they have loaded, use
  `value`. Uncontrolled, a pick whose option goes away is cleared without a `change`, so your
  state never hears of it.

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

Render `<Neuwo />` once in the root layout. Because the JSX runtime expands the sixteen light DOM
elements, the server-rendered HTML carries their full markup and they are on-brand from the first
paint, before the bundle has run. The segmented control, still on Shadow DOM, arrives as a bare tag
and renders when the bundle registers it. Import `neuwo.css` instead of `neuwo-components.css` to add the
typography and page surface.

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
| Copy wrapper | `<neuwo-copy>` | Stable |
| CTA band | `<neuwo-cta>` | Stable |
| Notice card | `<neuwo-notice>` | Stable |
| Logo | `<neuwo-logo>` | Stable |
| Modal | `<neuwo-modal>` | Planned |
| Card | `<neuwo-card>` | Planned |

Published styling files, for direct linking or non-web use:

| Artifact | Import path |
| --- | --- |
| Font faces | `@neuwo/web-ui-library--demo/foundation/fonts.css` |
| Tokens | `@neuwo/web-ui-library--demo/foundation/tokens.css` |
| Typography | `@neuwo/web-ui-library--demo/foundation/typography.css` |
| Page surface | `@neuwo/web-ui-library--demo/foundation/background.css` |
| Navigation links | `@neuwo/web-ui-library--demo/foundation/navigation.css` |
| Markdown surface | `@neuwo/web-ui-library--demo/foundation/markdown.css` |
| Font faces, tokens, reset and light DOM component recipes (one file) | `@neuwo/web-ui-library--demo/neuwo-components.css` |
| `neuwo-components.css` plus typography, page surface, navigation links and Markdown surface (one file) | `@neuwo/web-ui-library--demo/neuwo.css` |
| Component reset (before any recipe) | `@neuwo/web-ui-library--demo/components/reset.css` |
| Button recipe | `@neuwo/web-ui-library--demo/components/button/button.css` |
| Field chrome | `@neuwo/web-ui-library--demo/components/fields/field.css` |
| Selection shell (checkbox, toggle, radio group) | `@neuwo/web-ui-library--demo/components/selection/controls.css` |
| Checkbox and radio recipe | `@neuwo/web-ui-library--demo/components/selection/form-check.css` |
| Radio group recipe | `@neuwo/web-ui-library--demo/components/selection/radio/radio-group.css` |
| Toggle recipe | `@neuwo/web-ui-library--demo/components/selection/toggle/toggle.css` |
| Logo files | `@neuwo/web-ui-library--demo/logos/neuwo-logo--bg-dark.svg` |

## Restyling from the host

`<neuwo-button>`, `<neuwo-badge>`, `<neuwo-deal-id>`, `<neuwo-status-dot>`, `<neuwo-logo>`,
`<neuwo-copy>`, `<neuwo-notice>`, `<neuwo-cta>`, the form fields, `<neuwo-checkbox>`,
`<neuwo-toggle>`, `<neuwo-radio>` and `<neuwo-radio-group>` render their markup into their own light
DOM, so they have no parts. Their prefixed classes are the public hooks instead. Put the element name in
front for weight, so a rule wins without `!important`:

```css
neuwo-button .neuwo-btn { border-radius: 0; }
```

| Class | On |
| --- | --- |
| `.neuwo-btn` | the native `<button>`, or the `<a>` when `href` is set |
| `.neuwo-btn--solid`, `.neuwo-btn--outline`, `.neuwo-btn--glass` | the control, by `variant` |
| `.neuwo-btn--sm`, `.neuwo-btn--lg` | the control, by `size` |
| `.neuwo-btn--hover-s`, `.neuwo-btn--hover-l` | the control, by `hover` |
| `.neuwo-btn--wide`, `.neuwo-btn--xwide`, `.neuwo-btn--block`, `.neuwo-btn--loading` | the control, by the attribute of the same name |
| `.neuwo-btn__spinner` | the spinner, the control's first child while `loading` |
| `.neuwo-btn__start`, `.neuwo-btn__label`, `.neuwo-btn__end` | the wrappers around the `slot="start"` children, the label and the `slot="end"` children |

The three wrappers are always rendered and are `display: contents`, so they draw
no box and an empty one adds no gap. Style what they hold through inherited
properties, or target the children you passed in.

```css
.my-tag .neuwo-badge { font-weight: 500; }
.deal-ref .neuwo-deal-id { font-family: ui-monospace, monospace; }
```

| Class | On |
| --- | --- |
| `.neuwo-badge` | the pill `<span>`, which holds the label |
| `.neuwo-badge--green`, `.neuwo-badge--s`, `.neuwo-badge--l` | the pill, by `variant` and `size` |
| `.neuwo-badge--borderless`, `.neuwo-badge--glow` | the pill, by the attribute of the same name |
| `.neuwo-badge--pulse`, `.neuwo-badge--shimmer` | the pill, by `motion` |
| `.neuwo-badge--intensity-s`, `.neuwo-badge--intensity-l` | the pill, by `intensity`, only alongside a `motion` |
| `.neuwo-deal-id` | the value `<span>`, which holds the identifier |
| `.neuwo-deal-id--s`, `.neuwo-deal-id--l` | the value box, by `size` |
| `.neuwo-status-dot` | the dot `<span>`, which has no children |
| `.neuwo-status-dot--blue` | the dot, by `variant` |
| `.neuwo-status-dot--pulse`, `.neuwo-status-dot--blink` | the dot, by `motion` |
| `.neuwo-status-dot--halo-s`, `.neuwo-status-dot--halo-l` | the dot, by `halo` |
| `.neuwo-status-dot--glow-s`, `.neuwo-status-dot--glow-m`, `.neuwo-status-dot--glow-l` | the dot, by `glow` |
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
| `.neuwo-cta` | the band's root `<div>` |
| `.neuwo-cta--banner`, `.neuwo-cta--spotlight` | the band, by `variant` |
| `.neuwo-cta__body` | the banner's text column, beside the actions |
| `.neuwo-cta__glow`, `.neuwo-cta__inner` | the spotlight's blurred halo and the panel that holds everything else |
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
| `.neuwo-field__error` | the reserved error line; it was `::part(error)` |
| `.neuwo-combobox` | the combobox's box around the trigger, the chevron, the popup and the form value |
| `.neuwo-combobox__trigger` | the combobox's trigger, a `<button>`, or a text `<input>` with `searchable`, alongside `.neuwo-input` and its modifiers |
| `.neuwo-combobox__value` | the selected label or the placeholder inside the button trigger |
| `.neuwo-combobox__chevron`, `.neuwo-combobox__popup` | the chevron and the popover around the list; they were `::part(chevron)` and `::part(popup)` |
| `.neuwo-combobox__listbox`, `.neuwo-combobox__option`, `.neuwo-combobox__option--active` | the list, each option row, and the row the keyboard highlights |
| `.neuwo-combobox__group-item`, `.neuwo-combobox__group` | the row around an `<optgroup>`'s options and its label |
| `.neuwo-combobox__empty` | the "No matches" row, hidden until a filter matches nothing |
| `.neuwo-choice` | the checkbox's, toggle's or radio group's wrapper `<div>`, which stacks the row (or the radiogroup) and the error line |
| `.neuwo-choice--flush` | the radio group's wrapper, which keeps the error line right under the full-width radiogroup |
| `.neuwo-choice__error` | the reserved error line; it was `.control-error` and `::part(error)` |
| `.neuwo-form-check` | the checkbox's or radio's `<label>`, around the box and the label content; it was `::part(field)` |
| `.neuwo-form-check--error` | the checkbox's label, by `error` unless `error-muted` or `no-error-line` is set |
| `.neuwo-form-check__input` | the native checkbox or radio; it was `::part(input)` |
| `.neuwo-form-check__label` | the wrapper around the checkbox's or radio's children; it was `::part(label)` |
| `.neuwo-radio-group` | the radio group's `role="radiogroup"` `<div>`, around the legend and the radios; it was `.radio-group` and `::part(group)` |
| `.neuwo-radio-group--horizontal` | the radiogroup, by `orientation="horizontal"`, which lays the radios out in a row |
| `.neuwo-radio-group--error` | the radiogroup, by `error` unless `error-muted` or `no-error-line` is set; it rings every radio's box |
| `.neuwo-radio-group__legend` | the visible label, `hidden` while `label` is not set; it was `::part(legend)` |
| `.neuwo-radio-group__options` | the wrapper around the group's children, the radios; it was `::part(options)` |
| `.neuwo-form-toggle` | the toggle's `<label>`, around the switch, the track and the label content; it was `::part(field)` |
| `.neuwo-form-toggle--pulse`, `.neuwo-form-toggle--error` | the toggle's label, by `pulse`, and by `error` unless `error-muted` or `no-error-line` is set |
| `.neuwo-form-toggle__input` | the visually hidden native switch, `role="switch"`; it was `::part(input)` |
| `.neuwo-form-toggle__track` | the visible track, whose `::after` is the thumb; it was `::part(track)` |
| `.neuwo-form-toggle__label` | the wrapper around the toggle's children; it was `::part(label)` |

The badge and deal-id render their text as authored, so casing is yours:

```css
.hero-tags neuwo-badge { text-transform: uppercase; } /* eyebrow look */
```

Prefer a size axis where one exists (`<neuwo-badge size>`, `<neuwo-deal-id
size>`) over a font-size override, so the scale stays on-brand.

A transient state the component does not own, such as a field flashed red on a
host-driven event without a persistent `error`, is a rule on the same classes:

```css
.api-field[data-flash] .neuwo-input {
  border-color: var(--neuwo-color-red);
  box-shadow: var(--neuwo-shadow-danger);
}
```

The other elements render into a shadow root. Shadow DOM keeps the host page's
CSS out, but two channels are deliberately open, and together they reach almost
every visual detail without forking a component:

- **`::part(...)`** is the intended restyling hook. The segmented control exposes
  its internals as parts (`group`, `option`, `indicator` and `error`, listed in the
  manifest). Adjust size, weight, colour, font or spacing from the host:

  ```css
  .my-segmented::part(option) { font-weight: 500; }
  ```

- **Inherited CSS properties** cross the boundary into slotted content, so a
  host `text-transform` or `color` reaches the text of a shadow DOM element.

## Form fields share one API

`<neuwo-input>`, `<neuwo-textarea>`, `<neuwo-combobox>` and `<neuwo-range>`
share the same attributes (`name`, `value`, `label`, `disabled`, `required`,
`error`, `error-muted`, `no-error-line`, `size`), the `value`, `disabled`,
`size` and `noErrorLine` properties, and the same `change` event. The
selection controls (`<neuwo-checkbox>`, `<neuwo-toggle>`,
`<neuwo-radio-group>`, `<neuwo-segmented>`) share the error and
`no-error-line` behaviour below. The checkbox and the toggle share the
checkable API under [Checkbox and toggle](#checkbox-and-toggle), and the radio
group and its radios are under [Radio group](#radio-group). The generated
`.d.ts` shows these on the base class each control `extends`.

`<neuwo-input>`, `<neuwo-textarea>` and `<neuwo-range>` render a native `<input>`
or `<textarea>` into their own light DOM, and that control is the form control. The element carries `name`, `value`, `required`,
`disabled`, `readonly`, `placeholder`, `autocomplete`, `form` and the
constraint attributes onto it, so a form of inputs submits and validates
natively, in server-rendered markup before the script has loaded too. The
element itself is not form-associated, so each value is submitted once.

- **`value` is the starting value**, as on a native input. Changing the
  attribute moves an input the user has not edited yet, and `form.reset()`
  returns to it. The `value` property reads and writes what the field shows
  now and never touches the attribute; `defaultValue` reflects the attribute.
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
`rows`, `minlength` and `maxlength` are carried onto it. On `<neuwo-range>` the
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
and the group warns in the console once. The group renders the
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
- **The native form API** answers for the radios: `form`, `validity`,
  `validationMessage`, `checkValidity()`, `reportValidity()` and
  `setCustomValidity()` act on the first enabled radio, which shares the
  group's validity. `focus()` moves to the checked radio, else the first enabled one.
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

## Form errors

Every form control (fields and selection controls) shows an error from the consumer-set
`error` attribute: the message text, a red accent, and `aria-invalid` on the control. The
component owns no error text of its own, so the consumer decides when the error appears and
clears (`required` validity is reported natively and separately, not as this message). On
the four fields (`<neuwo-input>`, `<neuwo-textarea>`, `<neuwo-range>` and `<neuwo-combobox>`),
`<neuwo-checkbox>`, `<neuwo-toggle>` and `<neuwo-radio-group>` the message line is part of the
rendered markup, so an error the server sets shows in the first paint, and a form reset leaves
`error` alone: the page set it, so the page clears it.

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
    <neuwo-button slot="actions" type="submit" variant="solid">Get started</neuwo-button>
    <neuwo-button slot="actions" variant="outline" href="/contact/">Contact us</neuwo-button>
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
element updates it in a microtask; a field a script removes from inside its wrapper is caught up
the next time the element reconciles, when an attribute such as `status` changes or a child is
added to or removed from the element itself. A `<neuwo-input>` in the field is rendered with the
band, so a server-rendered capture form is styled, and submits, before the bundle has loaded.

## Notices

`<neuwo-notice>` is one card for every message the visitor did not ask for: a
consent banner, a language hint, a toast. What differs between those is separate
axes rather than one bundled variant, so they mix freely: `position` (which
viewport corner, or `static` to flow with the page), `layout` (actions under the
text or beside it), and `dismissible` (a consent banner deliberately is not).

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
carries its `--empty` modifier and leaves no gap. Appending to the element or replacing its content
updates the modifiers in a microtask. Content a script removes from inside a wrapper is caught up
the next time the element reconciles: when an attribute such as `position` changes, or a child is
added to or removed from the element itself. Links in the title or message share a tree with the
card, so a rule such as `neuwo-notice .neuwo-notice__message a` reaches them.

A notice announces itself politely, with `role="status"` on the `.neuwo-notice` card, unless you
declare something stronger on the element; a consent banner is a question, so give it
`role="dialog"` and a label, and the card then carries no role of its own.

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

The element renders the `<svg>` into its own light DOM, so a server-rendered logo is drawn before any script runs. The `<svg>` carries `.neuwo-logo` and one of `.neuwo-logo--bg-light`, `--bg-dark`, `--bg-dark-alt` or `--bg-colour`; there is no `::part(logo)`. Restyle through the classes, with the element name in front for weight: `neuwo-logo .neuwo-logo { opacity: 0.8; }`.

Size it with `--neuwo-logo-height` (default `1.75rem`); the width follows the aspect ratio. The
accessible name defaults to `Neuwo`, and `label=""` marks the logo decorative instead, for a
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
      href="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.1/dist/logos/neuwo-logo--bg-dark.svg" />
<img src="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.1/dist/logos/neuwo-logo--bg-dark.svg" alt="Neuwo"
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
```

See CONTRIBUTING.md for how to add or change components and keep the Neuwo Design System in
sync.
