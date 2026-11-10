# Changelog

## Unreleased

- Under React, toggling `loading` on `<neuwo-button>` no longer remounts the children passed into it, so
  their state and DOM nodes survive: the JSX runtime now keys every element it renders from a template.
- The `<neuwo-badge>` shimmer sweeps with `transform` instead of `left`, so it no longer shifts layout.
  `--neuwo-badge-shimmer-width` is now unitless, a percentage of the badge (`35`, not `35%`).

- Breaking: `<neuwo-logo>` renders its `<svg>` into its own light DOM from one template, so a
  server-rendered logo is drawn from the first paint. Its classes are prefixed: `.logo` is now
  `.neuwo-logo`, with `.neuwo-logo--{bg-light|bg-dark|bg-dark-alt|bg-colour}`.
- Breaking: `::part(logo)` on `<neuwo-logo>` is gone. Restyle through the classes, with the element
  name in front for weight: `neuwo-logo .neuwo-logo { opacity: 0.8; }`.

- Breaking: `<neuwo-badge>`, `<neuwo-deal-id>` and `<neuwo-status-dot>` render into their own light DOM
  from one template, like the button, so server-rendered ones are styled from the first paint.
  Their classes are prefixed: `.badge` is now `.neuwo-badge` (with `.neuwo-badge--{green|s|l|borderless|glow|pulse|shimmer|intensity-s|intensity-l}`),
  `.deal-id` is now `.neuwo-deal-id` (with `.neuwo-deal-id--{s|l}`), and `.status-dot` is now
  `.neuwo-status-dot` (with `.neuwo-status-dot--{blue|pulse|blink|halo-s|halo-l|glow-s|glow-m|glow-l}`).
- The keyframes are renamed to match: `badge-pulse` and `badge-shimmer` are now `neuwo-badge-pulse` and
  `neuwo-badge-shimmer`, and `status-dot-pulse` and `status-dot-blink` are now `neuwo-status-dot-pulse`
  and `neuwo-status-dot-blink`.
- Breaking: `::part(badge)`, `::part(value)` and `::part(dot)` are gone. Restyle through the classes, with
  the element name in front for weight: `neuwo-badge .neuwo-badge { font-weight: 500; }`.
- The label of `<neuwo-badge>` and the value of `<neuwo-deal-id>` are now plain children of their
  `.neuwo-badge` and `.neuwo-deal-id` span instead of a slot.

- Breaking: `<neuwo-button>` renders into its own light DOM from one template, the same markup the
  server and the JSX runtime produce, so server-rendered buttons are styled from the first paint.
  Its classes are prefixed: `.btn` is now `.neuwo-btn`, with `.neuwo-btn--{solid|outline|glass|sm|lg}`,
  `.neuwo-btn--hover-{s|l}`, `.neuwo-btn--{wide|xwide|loading}` and `.neuwo-btn__spinner`, and the
  `button-spin` keyframes are now `neuwo-button-spin`. `block` also adds `.neuwo-btn--block`.
- `<neuwo-button>` wraps its children in three new spans, `.neuwo-btn__start`, `.neuwo-btn__label` and
  `.neuwo-btn__end`, always rendered and `display: contents`, so the layout is unchanged.
- Breaking: `::part(button)` on `<neuwo-button>` is gone. Restyle through the classes, with the element
  name in front for weight: `neuwo-button .neuwo-btn { border-radius: 0; }`.
- Breaking: `<neuwo-button>` is no longer form-associated. Its native `<button>` sits inside your form
  and submits or resets it natively, in server-rendered markup even before the script has loaded. The
  host's `form`, `name` and `value` are carried onto it, so `form="id"` still ties a button outside its
  form to that form. A scripted `click()` on the host element no longer submits; call it on the inner
  `.neuwo-btn`, or use `form.requestSubmit()`.
- `aria-*` and `title` on `<neuwo-button>` now appear on both the host and the inner control, which needs
  them for its accessible name and tooltip. `data-*` stays on the host only, so a query such as
  `[data-testid="save"]` matches one element.
- `components/reset.css`, the reset for the light DOM components, is published and leads the component
  styles in `neuwo-components.css`.
- Breaking: `neuwo.js` no longer carries fonts or tokens. Link `neuwo-components.css` (or `neuwo.css`) on
  the page, or import it where you import the library; `<style data-neuwo-fonts>` is no longer read.
- `neuwo-standalone.js` is for pages that can only add a script: it embeds `neuwo-components.css`, applies
  it only when the page has not linked it, and loads the fonts from beside itself.
- New entries: `./server` exports `expand(html)`, `renderElement` and the Eleventy plugin, with its HTML
  parser bundled; `./jsx-runtime` and `./jsx-dev-runtime` wrap React's runtime for `jsxImportSource`.
- `neuwo.js` can be imported on a server, where it registers nothing, and loading it twice no longer throws.
- `neuwo-components.css` and `foundation/fonts.css` are now published, and `neuwo.css` carries the font faces.
- Breaking: every custom property is now prefixed `--neuwo-` (tokens such as `--neuwo-color-blue`
  and component properties such as `--neuwo-copy-inset`), so the library cannot collide with a
  host page. Rename any overrides in your own CSS.
- Breaking: the foundation classes are now prefixed `neuwo-`: `.neuwo-body`, `.neuwo-background__gradient`,
  `.neuwo-nav-link`, `.neuwo-markdown`, `.neuwo-callout`, `.neuwo-link` and `.neuwo-eyebrow`, with their
  modifiers and elements. Update the class attributes in your markup.
- React JSX types, generated from the manifest, now come through `jsxImportSource`
  (`"jsxImportSource": "@neuwo/web-ui-library--demo"`) and type every element's attributes and custom
  events. Breaking: the types-only `./react` entry is removed.
- `copied` on `<neuwo-copy>` is typed `CustomEvent<{ text: string }>`.
- README: setup per kind of site (React, Next.js, Eleventy, other Node builds, plain HTML and
  script-only pages), versioning advice, and React 19 props and events with React 18's limits.
- Brand fonts now load when the stylesheet is imported through a bundler, which copies the woff2 files
  its `url()`s name into the app's output; previously the faces 404'd into a system fallback unless
  `fonts/` was served beside the bundle.

## 0.1.0

First published release. Pre-1.0, so breaking changes ship in minor bumps until the API settles.

- Renamed to the Neuwo Web UI Library, published as `@neuwo/web-ui-library--demo`.
- Licensed MIT.
- Published artefacts: `dist/neuwo.js`, the combined `dist/neuwo.css`, each foundation sheet and
  component recipe as its own file, the three woff2 faces, the four wordmark SVGs, generated
  types, and `custom-elements.json`.
