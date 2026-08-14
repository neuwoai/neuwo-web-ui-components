# @neuwo/web-ui-components

Neuwo design-language web components: vanilla custom elements, Shadow DOM, zero runtime deps.
The single source for reusable Neuwo UI and its styling (tokens, component recipes, typography).

## Consume

Load one script; components self-register.

```html
<script type="module" src="https://cdn.neuwo.ai/neuwo.js"></script>
<neuwo-button variant="solid">Get started</neuwo-button>
```

Design tokens are adopted onto the document and inherit through every shadow boundary, so you
re-theme by setting tokens on `:root`:

```css
:root { --color-blue: oklch(77% 0.18 132); }
```

Opt into Neuwo typography for native headings and text by linking the stylesheet:

```html
<link rel="stylesheet" href="https://cdn.neuwo.ai/foundation/typography.css" />
```

or, in a bundler, `import "@neuwo/web-ui-components/foundation/typography.css"`.

To link tokens, typography, the page surface and the navigation links as a single
file (handy for CSS-only or no-bundler consumers), use the combined stylesheet
instead:

```html
<link rel="stylesheet" href="https://cdn.neuwo.ai/neuwo.css" />
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

Nothing in the recipe is `!important`. `.nav-link` outranks `typography.css`'s bare `a`, and
`.nav-link:hover` outranks its `a:hover`, on specificity alone, so a consumer can still
override any property from a document stylesheet.

This replaces `<neuwo-dropdown>`, removed in the same change. That element bundled the styling
with a disclosure toggle it could not turn off, which made it unusable for navigation that is
permanently visible, and its shadow root forced items to be direct children and forced
`!important` onto their colour. Migrating: drop the element, keep the links, put `.nav-link`
(or `.nav-link--sm` inside a section) on each one, and wrap them in whatever structure the
navigation actually needs.

### Fonts

`@font-face` is ignored inside shadow roots, so the script injects the brand
font rules into `document.head` once and resolves the `woff2` files relative to
its own URL (you do not link a font stylesheet). The font files ship next to the
bundle under `fonts/`, so to preload them point at that directory:

```html
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="https://cdn.neuwo.ai/fonts/outfit-variable.woff2" />
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
| CTA band | `<neuwo-cta>` | Stable |
| Notice card | `<neuwo-notice>` | Stable |
| Logo | `<neuwo-logo>` | Stable |
| Modal | `<neuwo-modal>` | Planned |
| Card | `<neuwo-card>` | Planned |

Published styling files, for direct linking or non-web use:

| Artifact | Import path |
| --- | --- |
| Tokens | `@neuwo/web-ui-components/foundation/tokens.css` |
| Typography | `@neuwo/web-ui-components/foundation/typography.css` |
| Page surface | `@neuwo/web-ui-components/foundation/background.css` |
| Navigation links | `@neuwo/web-ui-components/foundation/navigation.css` |
| All four foundation layers (one file) | `@neuwo/web-ui-components/neuwo.css` |
| Button recipe | `@neuwo/web-ui-components/components/button/button.css` |
| Field chrome | `@neuwo/web-ui-components/components/fields/field.css` |
| Logo files | `@neuwo/web-ui-components/logos/neuwo-logo--bg-dark.svg` |

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
      href="https://cdn.neuwo.ai/logos/neuwo-logo--bg-dark.svg" />
<img src="https://cdn.neuwo.ai/logos/neuwo-logo--bg-dark.svg" alt="Neuwo"
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
