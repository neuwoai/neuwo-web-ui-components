# Neuwo Web UI Library

Neuwo design-language web components: vanilla custom elements, Shadow DOM, zero runtime deps.
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
<script type="module" src="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.1/dist/neuwo.js"></script>
```

Pin as tightly as you can bear: `@0.1` follows the latest 0.1.x and is cached at the edge for
about half a day, while `@0.1.0` is immutable and cached for a year.

**Self-hosted**, to keep every runtime request on your own origin and take the registry out of
the runtime path entirely. Copy the published `dist/` into your own static output at build time:

```js
// Eleventy
eleventyConfig.addPassthroughCopy({
  "node_modules/@neuwo/web-ui-library--demo/dist": "vendor/neuwo",
});
```

```html
<script type="module" src="/vendor/neuwo/neuwo.js"></script>
```

Next.js and Vite serve `public/` verbatim, so a `prebuild` script copying the same directory
into `public/vendor/neuwo` achieves the same thing.

### Fonts and bundlers

The bundle names each woff2 file as `new URL("./fonts/<file>", import.meta.url)`. Served as a
directory (jsDelivr or self-hosted), that resolves to the `fonts/` folder beside `neuwo.js`.
Imported through a bundler, it is the pattern Vite, webpack and Turbopack recognise: they copy
the three files into the app's output and rewrite the URLs, with no configuration. This is
verified with Vite 8 (dev server and build) and Next.js 16 (Turbopack and webpack).

A bundler that does not recognise the pattern leaves the URLs pointing beside its own output
chunk, where nothing put the fonts, and the brand faces silently fall back to a system font. In
that case, or to serve the fonts from somewhere else, declare your own `@font-face` rules inside
a `<style data-neuwo-fonts>` element; the library detects that attribute and leaves fonts alone.

## Consume

Load one script; components self-register.

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.1/dist/neuwo.js"></script>
<neuwo-button variant="solid">Get started</neuwo-button>
```

Design tokens are adopted onto the document and inherit through every shadow boundary, so you
re-theme by setting tokens on `:root`:

```css
:root { --color-blue: oklch(77% 0.18 132); }
```

Opt into Neuwo typography for native headings and text by linking the stylesheet:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.1/dist/foundation/typography.css" />
```

or, in a bundler, `import "@neuwo/web-ui-library--demo/foundation/typography.css"`.

To link every foundation sheet as one file (handy for CSS-only or no-bundler consumers), use the
combined stylesheet instead: tokens, typography, the page surface, navigation links and the
Markdown surface, in that order.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.1/dist/neuwo.css" />
```

### Links

The sheet styles bare `<a>` in prose: brand blue, underlined, deepening to `--color-blue-dark`
on hover. Two classes ride along with it.

```html
<a class="link" href="/privacy/">Privacy Policy</a>
<a class="link link--hover-green" href="/cookies/">Cookie Policy</a>
```

`.link` states the same recipe explicitly, for an anchor whose surroundings strip link styling,
and for slotted content inside a component, where the shadow root cannot reach a nested `<a>` and
the host page has to style it. `.link--hover-green` swaps the hover colour to the brand green.
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

- **`.body`** is the base ink and paper: the text font, size and line height, `--color-text`,
  `--color-body-bg`, and the two font-smoothing hints. Put it on `<body>`.
- **`.background__gradient`** is the brand's ambient wash: four translucent blue and green
  blobs. It reads correctly only over a dark surface, so pair it with `.body`.

Neither class owns a box, a position or a z-index. That is deliberate: where the wash sits and
how tall it is are page decisions, not brand ones. To reproduce the full-viewport treatment the
main website uses, the consumer supplies the frame:

```html
<body class="body">
  <div class="background">
    <div class="background__gradient"></div>
  </div>
```

```css
.background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: var(--z-background);
  overflow: hidden;
}

.background__gradient {
  width: 100%;
  height: 100%;
}
```

`--z-background` is a library token, so the stacking stays consistent with the rest of the
system. Both demo pages are wired exactly this way. The same gradient class also works on an
ordinary sized element, for a single washed panel rather than a whole page.

### Navigation links

`foundation/navigation.css` carries the brand's nav-link treatment, the centre-out underline
that grows from the middle of the text on hover and focus. Two classes:

- **`.nav-link`** is a top-level entry: base type, a 44px tap target, and the underline lifted
  off the baseline.
- **`.nav-link--sm`** is a nested entry: small type, compact, and the underline flush to the
  bottom edge.

`aria-current` takes the lifted ink without the underline, marking the current page as present
rather than as a destination.

```html
<nav aria-label="Main">
  <ul>
    <li><a class="nav-link" href="/publishers/">Publishers</a></li>
    <li><a class="nav-link" href="/company/" aria-current="page">Company</a></li>
  </ul>
</nav>
```

**`.nav-link--active`** holds the underline open. That bar-less treatment for `aria-current` is
right for a horizontal bar, where the current entry is one of several and the absent bar reads
as "you are here". Down the side of a page it is close to invisible, and a sidebar also needs to
mark the *section* the current page sits under, which `aria-current` cannot express without
lying about which page is current. One class covers both, because to a reader an open section
and the current page look alike, and it composes with `aria-current` rather than replacing it:

```html
<li>
  <a class="nav-link nav-link--active" href="/guides/">Guides</a>
  <ul>
    <li><a class="nav-link nav-link--sm" href="/guides/quickstart/">Quickstart</a></li>
    <li>
      <a class="nav-link nav-link--sm nav-link--active" href="/guides/auth/" aria-current="page"
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

A section heading takes `.nav-link` like any other entry, whether it is a link to the section's
own page or a `<summary>` that only toggles. There is no separate heading recipe, and no
opinion here about whether a heading is part of the navigation at all; that is the consumer's
structure to decide.

```html
<li>
  <a class="nav-link" href="/guides/">Guides</a>
  <ul>
    <li><a class="nav-link nav-link--sm" href="/guides/quickstart/">Quickstart</a></li>
  </ul>
</li>
```

One interaction to know when the heading is a `<summary>`: `.nav-link` sets `display: block`,
which is the documented way to strip a summary's disclosure triangle. Restore it with
`display: list-item` (and `list-style-position: inside`, so the underline still spans the
label) if you want the marker rather than your own chevron.

One value is tunable per instance. `--nav-link-gutter` drives the horizontal padding and the
underline's endpoints together, so they cannot drift apart; set it once for a denser bar:

```css
@media (min-width: 64rem) {
  .site-nav .nav-link {
    --nav-link-gutter: var(--space-3);
  }
}
```

The bar is laid out at its full span and grown with `transform: scaleX()`, not by animating a
pair of insets out from 50%. `left` and `right` are layout properties, so the old form ran
layout on every frame of every hover, and two insets at 50% resolve independently at sub-pixel
precision, which left a hair of width on a link of fractional width instead of none. If you were
overriding `::after`'s `left`/`right` to hold a bar open, that no longer works: use
`.nav-link--active`.

Nothing in the recipe is `!important`. `.nav-link` outranks `typography.css`'s bare `a`, and
`.nav-link:hover` outranks its `a:hover`, on specificity alone, so a consumer can still
override any property from a document stylesheet.

This replaces `<neuwo-dropdown>`, removed in the same change. That element bundled the styling
with a disclosure toggle it could not turn off, which made it unusable for navigation that is
permanently visible, and its shadow root forced items to be direct children and forced
`!important` onto their colour. Migrating: drop the element, keep the links, put `.nav-link`
(or `.nav-link--sm` inside a section) on each one, and wrap them in whatever structure the
navigation actually needs.

### Markdown surface

`foundation/markdown.css` is one sheet for everything a rendered document needs and no component
covers: the elements a Markdown renderer emits that `typography.css` has no opinion about
(lists, `strong`, `blockquote`, `hr`, images, `code`, `pre`, tables), plus the `.callout` an
author drops in among them. Put `.markdown` on the container the renderer writes into.

```html
<article class="markdown">{{ content }}</article>
```

It is scoped rather than bare-tag on purpose. `typography.css` can style `h1`..`h6`, `p` and `a`
globally because those are unambiguous, but a `<ul>` in a nav and a `<ul>` in an article want
different treatment, so the element rules only apply inside a container that asked for them.
`.callout` is a class, so it carries its own scope and works outside a rendered document too.

It also **never restates a heading or a paragraph**. The two sheets compose: link both, and a
document gets its type from one and its lists, quotes and code panels from the other.
Overriding the heading scale for long-form copy (a docs page usually wants a smaller `h1` than a
landing page) stays a consumer decision, and needs no `!important`.

`.markdown` owns no box. There is no measure, no `max-width` and no margin on the container, because
how wide the reading column is and where it sits are page decisions, exactly as in
`background.css` and `navigation.css`. A table wider than its column needs a scroll wrapper,
which is yours to emit:

```css
.table-scroll { overflow-x: auto; }
```

Code is set in `--font-mono`, a system stack (`ui-monospace`, then the developer faces most
likely installed). The brand ships no monospace face, so this is the one family token that is
not a Neuwo font.

#### Callouts

The tinted aside that sits in the middle of a document: a note, a tip, a caveat. Three classes
and one knob, in the same sheet, because none of it is a component and splitting it would only
make you link two files and get their order right.

```html
<div class="callout callout--tip">
  <span class="callout__title">Tip</span>
  <p>Cache the classification; the same URL returns the same topics.</p>
</div>
```

- **`.callout`** is the block: a tinted surface, an accent edge, and enough padding that a
  leading title and a trailing paragraph both sit inside it.
- **`.callout__title`** is the optional label line. A `<span>`, not a heading, so a callout never
  enters the document outline; it is an aside, not a section.
- **`.callout--info`**, **`.callout--tip`** and **`.callout--danger`** set the intent.

Intent is one property. Each modifier declares `--callout-accent` and nothing else, and the block
reads that knob for both its edge and its tint. So a fourth intent needs no library change:

```css
.callout--warning {
  --callout-accent: #d99a2b;
}
```

That example is also the honest gap. **There is no `warning` intent**, because the brand has no
amber: `--color-blue`, `--color-green` and `--color-red` are the only semantic hues in the system,
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

The wrapped content **stays in the light DOM**, and that is the whole design. Only the control
lives in the shadow root, so the panel keeps its `.markdown pre` styling and whatever syntax
colouring the page applies. An element that owned the panel inside its own shadow root could not
colour the syntax tokens at all, because `::slotted` matches only top-level slotted nodes, never
the spans nested inside the `<pre>`.

It copies `textContent`, trimmed, so nothing has to name the source: no ids, no `for` attribute,
no selector to keep in step with your renderer's output. The trim is what makes indented markup
safe, since the whitespace around a nested `<pre>` is your formatting, not the sample.

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

- **The control appears only where the clipboard is reachable.** An insecure context leaves
  `navigator.clipboard` undefined, so rather than offer a button that silently fails, the element
  renders none. The wrapped content is projected either way.
- **The outcome goes to a live region**, not to the button's label. Relabelling a control the user
  has just activated is announced inconsistently; a `role="status"` region is announced reliably.
  `label`, `copied-label` and `failed-label` are all yours to translate.
- **The corner overlay assumes a panel with room.** `.markdown neuwo-copy pre` widens the panel's
  right padding so a long first line scrolls rather than running underneath. Around something
  small, a chip say, give the wrapper its own clearance and pull the control in with
  `--copy-inset`; the library owns no box:

```css
.deal-id-copy {
  display: inline-block;
  padding-right: 2rem;
  --copy-inset: 0.125rem;
}
```

A `copied` event fires after a successful write, with the text in `detail.text`. It bubbles and is
composed, so it is reachable from the document.

### Fonts

`@font-face` is ignored inside shadow roots, so the script injects the brand
font rules into `document.head` once and resolves the `woff2` files relative to
its own URL (you do not link a font stylesheet). The font files ship next to the
bundle under `fonts/`, so to preload them point at that directory:

```html
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.1/dist/fonts/outfit-variable.woff2" />
```

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
| Tokens | `@neuwo/web-ui-library--demo/foundation/tokens.css` |
| Typography | `@neuwo/web-ui-library--demo/foundation/typography.css` |
| Page surface | `@neuwo/web-ui-library--demo/foundation/background.css` |
| Navigation links | `@neuwo/web-ui-library--demo/foundation/navigation.css` |
| All four foundation layers (one file) | `@neuwo/web-ui-library--demo/neuwo.css` |
| Button recipe | `@neuwo/web-ui-library--demo/components/button/button.css` |
| Field chrome | `@neuwo/web-ui-library--demo/components/fields/field.css` |
| Logo files | `@neuwo/web-ui-library--demo/logos/neuwo-logo--bg-dark.svg` |

## Restyling from the host

Shadow DOM keeps the host page's CSS out, but two channels are deliberately
open, and together they reach almost every visual detail without forking a
component:

- **`::part(...)`** is the intended restyling hook. Every element exposes its
  internals as parts (`badge`, `value`, `dot`, `input`, `button`, `cta`, the
  field `label` and `error`, and more, listed per component in the manifest).
  Adjust size, weight, colour, font or spacing from the host:

  ```css
  .my-tag::part(badge) { font-weight: 500; }
  .deal-ref::part(value) { font-family: ui-monospace, monospace; }
  ```

- **Inherited CSS properties** cross the boundary into slotted content. The
  badge and deal-id render their text as authored, so the host controls casing
  with `text-transform`:

  ```css
  .hero-tags neuwo-badge { text-transform: uppercase; } /* eyebrow look */
  ```

- **Transient state** is reachable too: the field controls expose
  `::part(input)`, so a host-driven flag can flash a field without the
  component owning a persistent `error`:

  ```css
  .api-field[data-flash]::part(input) {
    border-color: var(--color-red);
    box-shadow: var(--shadow-danger);
  }
  ```

Prefer a size axis where one exists (`<neuwo-badge size>`, `<neuwo-deal-id
size>`) over a `::part` font-size override, so the scale stays on-brand.

## Form fields share one API

`<neuwo-input>`, `<neuwo-textarea>`, `<neuwo-combobox>` and
`<neuwo-range>`
extend one base, so they share the same attributes and properties (`name`,
`value`, `label`, `disabled`, `required`, `error`, `error-muted`,
`no-error-line`, `size`), the same `change` event, and the same parts (`field`,
`input`, `label`, `error`). The selection controls (`<neuwo-checkbox>`,
`<neuwo-toggle>`, `<neuwo-radio-group>`, `<neuwo-segmented>`) share the error
and `no-error-line` behaviour below. The generated `.d.ts` shows these on the
base class each control `extends`.

## Form errors

Every form control (fields and selection controls) shows an error from the consumer-set
`error` attribute: the message text, a red accent, and `aria-invalid` on the control. The
component owns no error text of its own, so the consumer decides when the error appears and
clears (`required` validity is reported natively and separately, not as this message).

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
slotted control and the submit button drive it.

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

A notice announces itself politely (`role="status"`) unless you declare something
stronger; a consent banner is a question, so give it `role="dialog"` and a label.
Links inside slotted content are styled by the host page, not from inside the
component: a shadow root cannot reach an `<a>` nested in slotted markup, so link
the published `typography.css` and mark them `.link` to get the brand treatment.

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

Size it with `--logo-height` (default `1.75rem`); the width follows the aspect ratio. The
accessible name defaults to `Neuwo`, and `label=""` marks the logo decorative instead, for a
link or heading that already names the brand:

```html
<a href="/" aria-label="Neuwo home" style="--logo-height: 2.5rem">
  <neuwo-logo label=""></neuwo-logo>
</a>
```

The same four files are published under `logos/`, and an `<img>` is the better choice wherever
the logo is the page's largest paint: an element cannot draw until the bundle executes, so a
site header logo should stay a preloaded image.

```html
<link rel="preload" as="image" fetchpriority="high"
      href="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.1/dist/logos/neuwo-logo--bg-dark.svg" />
<img src="https://cdn.jsdelivr.net/npm/@neuwo/web-ui-library--demo@0.1/dist/logos/neuwo-logo--bg-dark.svg" alt="Neuwo"
     width="320" height="50" class="logo" />
```

The published files are the brand's own exports, byte for byte, so a future export can be
diffed against them. The recipe holds no colour at all: each tone lives in its file, which is
why `variant` picks a drawing rather than recolouring one, and why the four files cost about
100 bytes between them once gzipped, the path data being identical.

## Develop

```bash
npm install
npm start     # build + watch + serve the demo at http://localhost:8000/demo/
npm run build # produce dist/ (neuwo.js, neuwo.css, fonts/, logos/, foundation/*.css, components/**/*.css)
npm test      # Vitest + happy-dom
```

See CONTRIBUTING.md for how to add or change components and keep the Neuwo Design System in
sync.
