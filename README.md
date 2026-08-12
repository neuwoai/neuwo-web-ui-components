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

To link tokens and typography as a single file (handy for CSS-only or no-bundler
consumers), use the combined stylesheet instead:

```html
<link rel="stylesheet" href="https://cdn.neuwo.ai/neuwo.css" />
```

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
| Select | `<neuwo-select>` | Stable |
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
| Modal | `<neuwo-modal>` | Planned |
| Card | `<neuwo-card>` | Planned |

Published styling files, for direct linking or non-web use:

| Artifact | Import path |
| --- | --- |
| Tokens | `@neuwo/web-ui-components/foundation/tokens.css` |
| Typography | `@neuwo/web-ui-components/foundation/typography.css` |
| Tokens + typography (one file) | `@neuwo/web-ui-components/neuwo.css` |
| Button recipe | `@neuwo/web-ui-components/components/button/button.css` |
| Field chrome | `@neuwo/web-ui-components/components/fields/field.css` |

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

`<neuwo-input>`, `<neuwo-textarea>`, `<neuwo-select>`, `<neuwo-combobox>` and
`<neuwo-range>`
extend one base, so they share the same attributes and properties (`name`,
`value`, `label`, `disabled`, `required`, `error`, `error-muted`,
`no-error-line`), the same `change` event, and the same parts (`field`,
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
the published `typography.css` to give them the brand treatment.

## Develop

```bash
npm install
npm start     # build + watch + serve the demo at http://localhost:8000/demo/
npm run build # produce dist/ (neuwo.js, neuwo.css, fonts/, foundation/*.css, components/**/*.css)
npm test      # Vitest + happy-dom
```

See CONTRIBUTING.md for how to add or change components and keep the Neuwo Design System in
sync.
