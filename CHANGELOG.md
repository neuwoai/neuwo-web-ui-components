# Changelog

## Unreleased

- Breaking: `<neuwo-input>` renders into its own light DOM from one template, so a server-rendered
  input is styled from the first paint, and its recipe, `components/fields/field.css`, joins
  `neuwo-components.css`. Its classes are prefixed: `.field` is now `.neuwo-field` (with
  `.neuwo-field--sm`), `.field__label`, `.field__label--empty`, `.field__required` and `.field__error`
  are now `.neuwo-field__label`, `.neuwo-field__label--empty`, `.neuwo-field__required` and
  `.neuwo-field__error`, and `.input`, `.input--sm` and `.input--error` are now `.neuwo-input`,
  `.neuwo-input--sm` and `.neuwo-input--error`. The label holds two new spans: `.neuwo-field__label-content`
  around the `slot="label"` children, `display: contents`, and `.neuwo-field__label-text` around the
  `label` text.
- A native control that a light DOM component renders, such as the `<input>` in `<neuwo-input>` or the
  trigger of `<neuwo-combobox>`, keeps its own text defaults (alignment, casing, spacing, weight, style,
  line height and white space) instead of taking them from the host, so a centred or uppercase container
  does not restyle what the user types. In a shadow root the combobox trigger took its weight, style, line
  height and white space from the page, so a container with a tall line height made it taller than the
  input beside it; it no longer does.
- Breaking: `::part(field)`, `::part(label)`, `::part(input)` and `::part(error)` on `<neuwo-input>` are
  gone. Restyle through the classes, with the element name in front for weight:
  `neuwo-input .neuwo-input { border-radius: 0; }`.
- Breaking: `<neuwo-input>` is no longer form-associated. Its native `<input>` sits inside your form and
  carries `name`, `value`, `required`, `disabled`, `form` and the constraint attributes, so it submits, resets
  and validates natively, in server-rendered markup before the script has loaded too. The `value`
  attribute is the starting value, as on a native input: changing it moves only an input the user has
  not edited, and a form reset returns to it and no longer clears `error`. The element no longer
  dispatches its own `change`; the input's own `change` bubbles through it, once. On plain pages too,
  `change` and `input` listeners on the element now get the inner `<input>` as `event.target`, not the
  element; use `event.currentTarget` for the element. `form`, `validity`,
  `validationMessage`, `checkValidity()`, `reportValidity()`, `setCustomValidity()`, `focus()` and
  `blur()` act on the inner input, and `name` and `defaultValue` are now properties too.
- Breaking: in React, `onChange` on `<neuwo-input>` fires on every keystroke, as on React's own
  `<input>`, instead of when the user commits a value. `value` makes the field controlled,
  `defaultValue` starts an uncontrolled one, and `event.target` is the inner `<input>`.
- Breaking: `data-*` on `<neuwo-input>` stays on the element and is no longer copied onto the inner
  input, so a query such as `[data-testid="email"]` matches one node. `aria-*` and `title` are still
  copied, and a later change or removal now reaches the inner input too.
- Breaking: `<neuwo-textarea>` renders into its own light DOM from the same template and shell as
  `<neuwo-input>`, with its recipe, `components/fields/textarea/textarea.css`, in `neuwo-components.css`.
  The classes are those of `<neuwo-input>` (`.neuwo-field`, `.neuwo-field__label`, `.neuwo-field__error`,
  `.neuwo-input` and their modifiers), plus `.neuwo-textarea` on the native `<textarea>` for the minimum
  height and vertical resize; the unprefixed `.field`, `.input` and their parts are gone, and
  `::part(field)`, `::part(label)`, `::part(input)` and `::part(error)` no longer match. It is no longer
  form-associated: the native `<textarea>` submits, resets and validates with its form, the `value`
  attribute is its starting text, and the `change` and `input` events, `event.target`, `onChange` in React
  and `data-*` follow `<neuwo-input>` above. A value that starts with a newline survives server rendering.
- Breaking: `<neuwo-range>` renders into its own light DOM from the same shell as `<neuwo-input>`, with
  its recipe, `components/fields/range/range.css`, in `neuwo-components.css`. The native range input
  carries `.neuwo-input` and `.neuwo-range`; the unprefixed `.range`, `.field`, `.input` and their parts are
  gone, and `::part(field)`, `::part(label)`, `::part(input)` and `::part(error)` no longer match. It is no
  longer form-associated: the native input submits, resets and validates with its form, the `value`
  attribute is its starting value, and the `change` and `input` events, `event.target`, `onChange` in
  React and `data-*` follow `<neuwo-input>` above. The custom properties keep their `--neuwo-range-*` names.
- The filled part of a range track is in the first paint. The template writes `--neuwo-range-fill` onto
  the input from `min`, `max` and `value`, so server-rendered markup shows it in WebKit and Blink before the
  script loads; it used to be written by script and the track was unfilled until then. The element keeps it
  current when the thumb moves, the value is set, a bound changes and the form resets.
- Breaking: `<neuwo-combobox>` renders into its own light DOM from one template, with its recipe,
  `components/fields/combobox/combobox.css`, in `neuwo-components.css`, so a server-rendered combobox shows
  its trigger and selected label from the first paint. Its classes are prefixed: `.combobox` is now
  `.neuwo-combobox`, and `.combobox__trigger`, `.combobox__value`, `.combobox__chevron`, `.combobox__popup`,
  `.combobox__listbox`, `.combobox__option`, `.combobox__group-item`, `.combobox__group` and `.combobox__empty`
  are now `.neuwo-combobox__trigger`, `.neuwo-combobox__value`, `.neuwo-combobox__chevron`,
  `.neuwo-combobox__popup`, `.neuwo-combobox__listbox`, `.neuwo-combobox__option`,
  `.neuwo-combobox__group-item`, `.neuwo-combobox__group` and `.neuwo-combobox__empty`. The highlighted row's
  `.is-active` is now `.neuwo-combobox__option--active`. The trigger keeps the field classes (`.neuwo-input`
  and its modifiers), the shell is that of `<neuwo-input>`, and `::part(field)`, `::part(label)`,
  `::part(input)`, `::part(error)`, `::part(chevron)` and `::part(popup)` no longer match.
- Breaking: `<neuwo-combobox>` is no longer form-associated. A visually hidden native input,
  `.neuwo-combobox__form-value`, carries `name`, the starting value, `required`, `disabled` and `form`, so
  the combobox submits, resets and validates with its form, in server-rendered markup before the script has
  loaded too. The `<option>` and `<optgroup>` children stay in a hidden `<select>`,
  `.neuwo-combobox__options`. `form`, `validity`, `validationMessage`, `checkValidity()`,
  `reportValidity()` and `setCustomValidity()` act on that input, and focus that lands on it moves to the
  trigger. In React, the options must be `<option>` and `<optgroup>` elements written in place, not a
  component that renders them.
- Breaking: a required `<neuwo-combobox>` with nothing selected reports the browser's own message, such as
  "Please fill out this field.", instead of "Please select an option.". Its trigger carries
  `aria-required="true"`, since the required native input is hidden from assistive technology.
- Breaking: the hidden form value of `<neuwo-combobox>` is a text field, and so is the trigger of a
  `searchable` one, so a form whose only other field is a single text input, with no submit button, no
  longer submits when the user presses Enter in that input. This is the trade-off of carrying `required`
  natively; add a submit button to keep implicit submission.
- A value the browser or a script writes into the hidden form value of `<neuwo-combobox>`, such as autofill,
  shows in the trigger, and one no enabled option has is cleared. The form value's own `input` and `change`
  never reach the element's listeners.
- A form reset returns `<neuwo-combobox>` to the option marked `selected` when the `value` attribute names
  no enabled option; it used to clear the selection. A reset no longer removes `error`.
- Typing into the filter of a `searchable` `<neuwo-combobox>` no longer fires `input` or `change` on the
  element, so `onInput` and `onChange` in React fire only when the user picks a value.
- A blur from the trigger of `<neuwo-combobox>` reads the field's `name` on `event.target` while it is
  dispatched, so React Hook Form's `register` marks the combobox touched and validates it on blur. The
  trigger gains no `name` attribute and still submits nothing.
- The rows a `searchable` `<neuwo-combobox>` filters out are hidden; the row's `display: block` used to keep
  them on screen. The chevron turns while the list is open, which its rule never matched before.
- Breaking: in React, `value` on `<neuwo-combobox>` makes it controlled, as on React's own `<select>`. A pick
  fires `onInput` and `onChange` with the element as `event.target` and the picked value as its `value`, and
  the combobox then shows what your state says, so a pick your handler ignores is never shown; it used to show
  every pick. A `value` that names no enabled option resolves as the `value` attribute does: to the first
  enabled option marked `selected`, else to nothing, which shows the placeholder and submits an empty value;
  picking the option it resolved to fires no `change`. `defaultValue`, and `value` from a Server Component,
  give an uncontrolled combobox that keeps the user's pick across re-renders, including ones that change its
  placeholder or an option's label.
- Breaking: `<neuwo-cta>` renders into its own light DOM from one template, so a server-rendered band
  is styled from the first paint. Its classes are prefixed: `.cta` is now `.neuwo-cta` (with
  `.neuwo-cta--{banner|spotlight}`), and `.cta__body`, `.cta__glow`, `.cta__inner`, `.cta__headline`,
  `.cta__sub`, `.cta__field`, `.cta__status` and `.cta__actions` are now `.neuwo-cta__body`,
  `.neuwo-cta__glow`, `.neuwo-cta__inner`, `.neuwo-cta__headline`, `.neuwo-cta__sub`, `.neuwo-cta__field`,
  `.neuwo-cta__status` and `.neuwo-cta__actions`, with `.neuwo-cta__field--empty` and
  `.neuwo-cta__status--{success|error}`. The `cta-scan`, `cta-spin` and `cta-button-pulse` keyframes
  are now `neuwo-cta-scan`, `neuwo-cta-spin` and `neuwo-cta-button-pulse`.
- Breaking: the `<neuwo-cta>` sub wrapper, `.neuwo-cta__sub`, is a `<div>`, not a `<p>`, so it can
  hold a paragraph.
- Breaking: `::part(cta)`, `::part(inner)`, `::part(headline)`, `::part(sub)`, `::part(field)`,
  `::part(status)` and `::part(actions)` on `<neuwo-cta>` are gone. Restyle through the classes, with
  the element name in front for weight: `neuwo-cta .neuwo-cta__headline { font-weight: 500; }`.
- The `<neuwo-cta>` rules that reached your content through `::slotted` are descendant selectors now.
  `data-accent` paints at any depth in the headline (`.neuwo-cta__headline [data-accent]`), not only
  on a direct child, and the pulse ring goes on the first `<neuwo-button>` among the actions
  (`neuwo-cta[pulse] .neuwo-cta__actions > neuwo-button:first-of-type`), not the first one across
  every slot. `data-accent` no longer paints in the sub, field or actions, where `::slotted([data-accent])`
  used to match a top-level child in any slot.
- `<neuwo-cta>` now observes `pulse` and `intensity`, which it already documented. They still change
  no markup, only the ring's styles.
- The `<neuwo-cta>` scan line sweeps with `transform` instead of `left`, so a visible CTA no longer
  shifts layout.
- The gradient frame of the spotlight `<neuwo-cta>` now paints on hover before the script runs.
- The spotlight `<neuwo-cta>` isolates its stacking context, so the hover glow stays behind the card
  instead of disappearing behind a page section's background.
- Breaking: `<neuwo-notice>` renders into its own light DOM from one template, so a server-rendered
  notice is styled from the first paint. Its classes are prefixed: `.notice` is now `.neuwo-notice`
  (with `.neuwo-notice--{fixed|top|bottom|start|end|center|row|dismissible}`), and `.notice__content`,
  `.notice__title`, `.notice__message`, `.notice__actions` and `.notice__dismiss` are now
  `.neuwo-notice__content`, `.neuwo-notice__title`, `.neuwo-notice__message`, `.neuwo-notice__actions`
  and `.neuwo-notice__dismiss`, with `.neuwo-notice__{title|message|actions}--empty` on a wrapper
  nothing fills. The title wrapper is a `<div>`, not a `<p>`, so it can hold a heading or a
  paragraph. The `notice-in` keyframes are now `neuwo-notice-in`.
- Breaking: `::part(notice)`, `::part(content)`, `::part(title)`, `::part(message)`, `::part(actions)`
  and `::part(dismiss)` on `<neuwo-notice>` are gone. Restyle through the classes, with the element
  name in front for weight: `neuwo-notice .neuwo-notice { border-radius: 0; }`.
- Breaking: `role="status"` moves from the `<neuwo-notice>` element to its inner `.neuwo-notice` card,
  and the element no longer writes `role` onto itself. A `role` you set on the element, such as
  `role="dialog"` on a consent banner, still takes its place, even when a script sets it after render:
  the card then carries no role.
- Breaking: `<neuwo-copy>` renders into its own light DOM from one template, so a server-rendered
  copy wrapper shows its control from the first paint. Your content moves into a new
  `.neuwo-copy__content` wrapper inside a `display: contents` root, `.neuwo-copy`. The classes are
  prefixed: `.copy` is now `.neuwo-copy__button` and `.copy__status` is now `.neuwo-copy__status`.
  `.copy--done` is gone: for 1.2 s after a copy the host carries `data-neuwo-state="copied"`, which
  draws the tick, or `"failed"` when the clipboard refused.
- Breaking: `::part(button)` and `::part(status)` on `<neuwo-copy>` are gone. Restyle through the
  classes, with the element name in front for weight: `neuwo-copy .neuwo-copy__button { border-radius: 0; }`.
- Breaking: `<neuwo-copy>` always renders its control, since the markup cannot know whether the
  clipboard is reachable. Where it is not, as in an insecure context, a click announces
  `failed-label` instead of the control being absent. A copy with no text to write also announces
  `failed-label`, and fires no `copied`, instead of writing an empty string.
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
- Breaking: the `<neuwo-badge>` shimmer sweeps with `transform` instead of `left`, so it no longer shifts
  layout, and `--neuwo-badge-shimmer-width` is now unitless, a percentage of the badge (`35`, not `35%`).
  An override with a unit, such as `40%`, now removes the sweep.
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
- A script can still set `textContent` or `innerHTML` on a rendered light DOM element, append a child
  with a `slot`, or change its `aria-*`, `title` and `role`: the element fits the change into its
  markup in a microtask, so read the markup back after an `await`. Hosts React owns are left to React.
- Light DOM elements have a `refresh()` method, which fits the markup to the current attributes and
  children at once instead of in that microtask, and an `updated()` hook for component classes, which
  runs after every reconcile but not after the first render or adoption, to re-apply live state the
  template cannot know.
- `components/reset.css`, the reset for the light DOM components, is published and leads the component
  styles in `neuwo-components.css`.
- Page element rules such as `button { text-transform: uppercase }`, `span { line-height: 3 }` or
  `a { text-decoration: underline }` no longer reach the markup a light DOM component renders. Its text
  properties come from the host, so casing set on `neuwo-badge` still applies, and its margins, padding,
  sizes, shadows and transforms start from their defaults. Your own content inside a component, including
  foundation classes such as `.neuwo-callout`, is left alone.
- Breaking: `neuwo.js` no longer carries fonts or tokens. Link `neuwo-components.css` (or `neuwo.css`) on
  the page, or import it where you import the library; `<style data-neuwo-fonts>` is no longer read.
- `neuwo-standalone.js` is for pages that can only add a script: it embeds `neuwo-components.css`, applies
  it only when the page has not linked it, and loads the fonts from beside itself.
- New entries: `./server` exports `expand(html)`, `renderElement` and the Eleventy plugin, with its HTML
  parser bundled; `./jsx-runtime` and `./jsx-dev-runtime` wrap React's runtime for `jsxImportSource`,
  with a `react-server` build for Server Components. Elements recognise markup React rendered, from
  Client or Server Components, and leave it to React, so children passed in keep their state and DOM
  nodes across re-renders. Markup React served but has not hydrated yet is adopted as it is when the
  script defines the elements, so a field keeps the starting value that `value` in a Server Component, or
  `defaultValue`, put on its native control, and hydration finds the markup it sent.
- Through the JSX runtime, the native control inside a light DOM component behaves like React's own
  input: `value` and `checked` are controlled, `onChange` on the element fires on every keystroke with
  the native control as `event.target`, and `defaultValue` and `defaultChecked` start an uncontrolled
  control. The Server Components build takes `value` and `checked` as starting values. The JSX types
  give every element with a `value` and a `change` event `value` and `defaultValue` as a string or a
  number, and an `onChange` whose target is typed as the element. `min`, `max`, `step`, `minlength`,
  `maxlength` and `rows` on the fields take a string or a number too, so React Hook Form's
  `{...register("name")}` spreads onto every field.
- `neuwo.js` can be imported on a server, where it registers nothing, and loading it twice no longer throws.
- `neuwo-components.css` and `foundation/fonts.css` are now published, and `neuwo.css` carries the font faces.
- The metric-adjusted fallback faces also use Liberation Sans or Arimo where Arial is missing, as on most
  Linux systems, so text shifts less when the brand fonts arrive.
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
