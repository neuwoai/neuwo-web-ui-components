# Changelog

## Unreleased

### Added

- Menus: `<neuwo-menu>`, `<neuwo-menu-group>` and `<neuwo-menu-item>`. A menu renders a top-layer
  popover panel, `<id>-panel`, that any button opens through `popovertarget`, and lines it up with
  the trigger that opened it. Its groups take a `heading`, a `select` of `one` or `many` for radio
  or checkbox items, and `no-divider`; its items a start icon, `hint`, `tone`, `disabled`,
  `checked`, link attributes and a submenu slot. The panel and rows share the combobox's look in
  `components/popup.css`; the rest is the new published `components/menu/menu.css`.
  The menu fires a cancelable `open` with the trigger just before it shows, and a cancelable
  `select` with the item's `value`, the item, the trigger and a checkable item's coming `checked`
  state before a pick takes effect. An action or link closes the menu and returns focus to the
  trigger; a checkable item changes and the menu stays open. Its `trigger` and `isOpen` properties
  report who opened it and whether it is open, and `open(trigger)` and `close()` drive it from a
  script. The keyboard follows the WAI-ARIA menu button pattern: Enter,
  Space, ArrowDown or ArrowUp on the trigger, and the arrows, Home, End, Enter, Space, Escape and
  Tab in the menu. In React, `onopen` and `onselect` bind the events.
  An item's `slot="submenu"` menu opens as a submenu, to any depth, on a click, Enter, Space or
  ArrowRight (ArrowLeft right to left), and ArrowLeft (ArrowRight right to left) or Escape closes one
  level. The root menu's `submenu` attribute places them: `flyout` beside the menu, opening on hover
  after 120 ms too; `drill` in the menu's place, with a Back row naming the item; `auto`, the
  default, beside the menu when the submenu fits in the viewport and in its place when it does not.
- Icon tokens `--neuwo-icon-chevron`, `--neuwo-icon-check` and `--neuwo-icon-dot`, masks that the
  combobox's chevron, the checkbox's tick, the radio's dot and the menu now read.
- `menu` on `<neuwo-button>`: the id of a `<neuwo-menu>` the button opens. The native button is
  then always a `<button type="button">`, with `popovertarget`, `aria-controls`,
  `aria-haspopup="menu"` and an `aria-expanded` that is `true` only on the button that opened the
  menu, and `.neuwo-btn__chevron` follows the label and turns while the menu is open. The menu
  reports the `<neuwo-button>` as its trigger.
- `icon-only` on `<neuwo-button>`: a round button whose content is its icon, padded by its font
  size, with `.neuwo-btn--icon-only` on the control. With `menu` and no content it shows three dots,
  `.neuwo-btn__dots`, and it never shows the chevron. While it loads, the spinner takes the icon's
  or the dots' place, so it stays round.
- `split` and `menu-label` on `<neuwo-button>`: with `menu`, the button renders two halves in one
  pill, `.neuwo-btn-split`. The main half, `.neuwo-btn-split__main`, is the button as it is without
  `menu`, with `href`, `type` and the form attributes; the toggle half, `.neuwo-btn-split__toggle`,
  opens the menu, holds the chevron and is named by `menu-label` (More Options by default). Only the
  main half's clicks reach listeners on the host. `disabled` disables both halves; `loading`
  disables the toggle half, and the main half too unless it is a link, which stays a link marked
  busy, as a loading link does without `split`. Solid halves stand 1px apart, outline and glass
  halves share one border line, and neither lifts on hover. Without `menu`, `split` changes nothing.
- Sidebar: `<neuwo-sidebar>`, its `<neuwo-nav-item>` entries and its folding `<neuwo-nav-section>`
  sections, a site's navigation down the side of the page. From 48rem it is a column, sticky and the
  full viewport tall, 17rem wide unless `--neuwo-sidebar-width` says otherwise, with the `brand` at
  the top, the nav scrolling on its own, an `after-nav` place and a `footer`. Below 48rem it is a
  glass bar pinned to the top, with the `brand`, the `actions` and a menu button that shows and
  hides the rest; the button is a `<summary>`, so it works before the script runs on a served page,
  the menu starts closed, and following a link in the nav closes it, unless a modifier key or the
  middle button opens the link elsewhere. `current` marks the entry naming the page with
  `aria-current="page"` and the active underline, comparing paths without the query, the hash, a
  trailing slash or `/index.html`, with percent-encoding decoded; without it the element takes
  `location.pathname`, unless React rendered it. `label` and `menu-label` name the nav and the
  button, and the `menuOpen` property reads and sets the menu. A plain click on an entry or on a
  section's own link fires a cancelable `navigate` with its `href`, so a client-side router can take
  over; in React, `onnavigate` binds it. The recipe is the new published
  `components/sidebar/sidebar.css`, and the entries and the sections' names take the
  `.neuwo-nav-link` look.
  A section folds from anywhere on its row, by a click, Enter or Space, nests to any depth, and opens
  and takes the active underline when it holds the current page or the page lies below one of its
  entries. Its chevron turns towards the inline end while it is closed. `open` starts it open, `id`
  keys it for remembering, and `href` makes its name a link beside a separate `Show <label> pages`
  toggle, though a section that only folds, with an Introduction entry first, is the recommended
  form. Only the reader closes a section: when `current` moves, the sections already open stay
  open, under React as on a plain page, with no state in the app.
  `remember` keeps the sections the reader leaves open, and the nav's scroll, for the tab in
  `sessionStorage`, under `neuwo.sidebar` or the key it names. It renders an inline script,
  `.neuwo-sidebar__remember`, after the nav, which the parser runs on a served page, so remembered
  sections are open at the first paint, and the element runs on a hand-written one; the README gives
  its Content-Security-Policy hash. A client-only React render does not run it, so such an app keeps
  its sidebar mounted instead.

### Changed

- `neuwo-components.css` now carries `.neuwo-nav-link`, so navigation styling no longer needs
  `neuwo.css`; `neuwo.css` carries it once, as before.
- The combobox's popup and option look moved to the new published `components/popup.css`, and the
  popup's entrance keyframes are now named `neuwo-popup-in` (they were `neuwo-combobox-in`). A site
  that links `components/fields/combobox/combobox.css` on its own must link `components/popup.css`
  before it.
- Each font is two files, split by `unicode-range`. The Latin file keeps the font's current name
  and covers English, Finnish, Swedish, Estonian and the other Western European languages. The new
  extension file holds the rest, Central European and Vietnamese letters and further symbols, and
  the browser downloads it only when a page uses one of its characters. An English or Finnish page
  downloads 179 KB of fonts instead of 356 KB. A page that needs both files of a family downloads a
  little more than before: 157 KB instead of 136 KB for Noto Sans.
- Preloads of the current files keep working. A site that copies the fonts must also copy the four
  new files: `outfit-ext-variable.woff2`, `noto-sans-ext-variable.woff2`,
  `noto-sans-italic-ext-variable.woff2` and `jetbrains-mono-ext-variable.woff2`. A site that
  declares its own `@font-face` rules needs one per file, with the library face's `unicode-range`.
- The notice's close button rests at 60% opacity and comes to full strength on hover and keyboard
  focus, as the copy button does, and the plain cross gains a soft square behind it there, so a
  hover shows on every close button, not only the filled one. Forced colours keep it at full
  strength.

### Fixed

- The `.neuwo-nav-link` underline disappeared under forced colours, which repaint its background,
  so a vertical nav lost its mark for the current page there. It is now drawn in the system's text
  colour; nothing changes outside forced colours.
- `custom-elements.json` describes every public method and its parameters, so a reference
  generated from it lists them all: `checkValidity()`, `reportValidity()`, `setCustomValidity()`,
  `focus()` and `blur()` on the form controls, and the combobox's `open()` and `close()`, had no
  description.
- It also describes the public properties no attribute stands for: `validity` and
  `validationMessage` on the form controls, the live `value` of the fields, `checked` and `value`
  on the checkbox, toggle and radio, and the combobox's `isOpen`, `popup` and `listbox`.
- The README documents `.neuwo-eyebrow`, the uppercase kicker `typography.css` and `neuwo.css` have
  published all along, with the other published classes.
- The README's links to the Eleventy, Next.js and React (Vite) examples are absolute links to the
  release's tag in the repository. They were relative, so they led nowhere in the npm package or
  on npmjs.com.

## 0.5.0

Two more of the Neuwo Design System's requests: a textarea that can turn its resize handle off,
and a gap between a notice's text and its close button. It adds an attribute, so it is a minor
release; nothing is renamed or removed.

### Added

- `no-resize` on `<neuwo-textarea>` turns the resize handle off, so the visitor cannot drag the box
  taller or shorter (`.neuwo-textarea--no-resize`, `resize: none`). It replaces a project rule such
  as neuwo.ai's API demo request body's `resize: none`. Without it the textarea is resizable
  vertically, as before.

### Fixed

- A dismissible `<neuwo-notice>` leaves an 8px gap (`--neuwo-space-2`) between its text and the
  close button. It reserved exactly the button's width and inset, so the text column ended at the
  button's edge: a long line, or a short title in a card that shrinks to its text, touched it.
  `.neuwo-notice--dismissible` now reserves
  `calc(var(--neuwo-space-3) + var(--neuwo-space-8) + var(--neuwo-space-2))`. A notice without
  `dismissible` is unchanged.

## 0.4.0

The rest of the Neuwo Design System's switch to the library: capitals and a steady height for
the badge, the brand's hover burst on the spotlight CTA, a filled close button for the notice,
link underlines that scale with the text, a focus ring that stands clear of a button's edge,
code-sized text in monospace fields and a short-lived error flash for the text fields. It adds
two attributes and a method, so it is a minor release; nothing is renamed or removed.

### Added

- `uppercase` on `<neuwo-badge>` sets the label in capitals with `text-transform: uppercase`
  (`.neuwo-badge--uppercase`), so the text in the markup stays as written for search, copying and
  assistive technology. It replaces a project rule such as
  `.hero-tags neuwo-badge { text-transform: uppercase; }`.
- On a `<neuwo-cta variant="spotlight" pulse>`, hovering the card plays one 0.6s burst of the
  pulse ring on the first action button (`neuwo-cta-button-burst`), as the brand's final CTA does;
  hovering the button itself plays none, and `intensity` scales the burst like the ring. Reduced
  motion turns it off, and the banner is unchanged.
- `dismiss-filled` on `<neuwo-notice>` gives the close button a subtle background,
  `--neuwo-color-white` at 15%, which strengthens to 25% on hover and keyboard focus, so it stands
  out on a busy or coloured card (`.neuwo-notice__dismiss--filled`). Without it the button is
  unchanged.
- `flashError()` on `<neuwo-input>` and `<neuwo-textarea>` shows the error look for 0.9s, the red
  border, the danger ring and the shake (no shake under reduced motion), then returns the field to
  rest. It prints no message, sets no invalid state and leaves `error` alone, and it wins over
  focus while it shows. For that moment the element carries `data-neuwo-state="error-flash"`. It
  replaces the README's `[data-flash]` recipe, so a page such as neuwo.ai's API demo no longer
  repeats the error declarations. Both elements now extend `NeuwoTextFieldElement`, which extends
  `NeuwoFieldElement`.

### Changed

- `mono` on `<neuwo-input>` and `<neuwo-textarea>` sets the value and the placeholder a step
  smaller than a prose field of the same size, as the Markdown surface's inline code is:
  `--neuwo-font-size-sm` (14px) at the standard size and `--neuwo-font-size-xs` (12px) with
  `size="sm"`. The padding stays, so a `mono` field is a little shorter than a prose one.
- A `<neuwo-textarea mono>` spaces its lines for code at `--neuwo-line-height-body` (1.6), the
  line height of the Markdown surface's code panels, instead of the tight `normal` that crowded
  multi-line JSON.
- A focused `<neuwo-button>`, copy button or notice close button rings 1px clear of its edge, so
  the ring reads against a solid fill: a 1px blue line, a 2px blur and the 20% band
  (`--neuwo-shadow-focus-ring`), drawn on the control's `::after`
  `--neuwo-shadow-focus-ring-offset` out, which leaves the gap see-through. The button's own
  border no longer turns blue, which had doubled the line on the copy button. Fields, checkboxes,
  radios and toggles keep the band against their blue border.
- Links, bare `a` and `.neuwo-link`, set their underline `0.2em` below the text instead of `2px`,
  so the gap scales with the text: 3.2px at 16px, 4px at 20px, as the design system's prose links
  do.

### Fixed

- A `<neuwo-badge motion="shimmer">` keeps the height and line of a badge without it. The sweep was
  clipped with `overflow: hidden`, which moved the pill's baseline to its bottom edge: the element
  grew from 29.19px to 36.78px and the pill rose 3.8px. It is clipped with `overflow: clip` now,
  which leaves the baseline alone, with `hidden` kept for browsers without `clip`.

## 0.3.0

Brings the library in line with the Neuwo Design System's pages: a shipped monospace face and a
`mono` field option, the design system's glowing status dot and shimmer keyframes, focus that
matches neuwo.ai on every control, a logo sized from its element, and colour fallbacks for older
browsers. It removes four unused tokens, so it is a minor release; no class or attribute is
renamed.

### Added

- A monospace brand face, JetBrains Mono (SIL Open Font License), shipped like Outfit and Noto
  Sans: `fonts/jetbrains-mono-variable.woff2`, a variable weight from 100 to 800 subset to the same
  Latin ranges, with an `@font-face` in the stylesheet and a metric-matched `JetBrains Mono
  Fallback` drawn from Courier New, or Liberation Mono or Cousine where it is missing.
  `--neuwo-font-mono` names it first, so code, Markdown `code` and `pre`, and anything else set in
  the token render the same on every machine instead of in whichever monospace face is installed.
  Its code ligatures are removed, so `!=` and `->` read exactly as typed.
- `mono` on `<neuwo-input>` and `<neuwo-textarea>` sets the value and the placeholder in the
  monospace face, for code, JSON, API keys and IDs. It adds `.neuwo-input--mono` to the control.
- `size="s"` and `halo="none"` on `<neuwo-status-dot>`: a 0.5rem dot, and a dot without its ring
  (`.neuwo-status-dot--s` and `.neuwo-status-dot--halo-none`). With no ring, `glow` is drawn as a
  box-shadow, so `<neuwo-status-dot variant="blue" size="s" halo="none" glow="m" motion="blink">`
  is the design system's glowing dot, pixel for pixel in Chromium and Firefox.
- `@keyframes neuwo-shimmer`, in `neuwo.css` and `neuwo-components.css` beside the
  `--neuwo-gradient-accent-shimmer` gradient it animates. Use them together with
  `background-size: 200% 100%` and `animation: neuwo-shimmer 4s ease-in-out infinite`, the recipe
  in the comment above the token, which named a `shimmer` keyframes the library did not ship.
- Hex fallbacks for every colour token, in browsers without `oklch()` or `color-mix()` (before
  Chrome 111, Firefox 113 and Safari 16.2), which dropped every token colour. An `@supports` block
  at the end of `tokens.css` redefines each token built from either function in hex, within one
  step of the original per channel, so every bundle carries it with no build step of your own.
  Component rules that mix `currentColor` inline, such as the status dot's ring and the button
  spinner, still need `color-mix()`.

### Removed

- The tokens `--neuwo-bg-blue-1`, `--neuwo-bg-green-1`, `--neuwo-bg-blue-2` and
  `--neuwo-bg-green-2`. Nothing read them: `.neuwo-background__gradient` writes its own
  percentages, so setting them changed nothing. Delete any rule that sets them.

### Changed

- Keyboard focus looks the same on every control and matches neuwo.ai: the control's border turns
  blue and a 3px band of 20% blue surrounds it, the shape the error state draws in red.
  `--neuwo-shadow-focus` is now `0 0 0 3px var(--neuwo-tint-blue-20)`, replacing the offset ring
  of 0.2.0, and buttons, the copy button, checkboxes, radios, the toggle and a focused Markdown
  code panel turn their border blue too. A field, checkbox or radio that shows an error and has focus
  shows focus.
- `<neuwo-logo>` is sized from the element, like an image. The element is the logo's box (its
  height from `--neuwo-logo-height`, its width from the wordmark's aspect ratio, and at most its
  container's width) and the drawing fills it, so `width: 100%; height: auto` fills a container
  and the logo shrinks in a narrow row, scaling inside its height. The element's rule now weighs
  nothing (`:where()`), so a project's single class on it wins, `display: block` included. The
  default size is unchanged. Size the element rather than the inner `.neuwo-logo`, which fills it;
  a size set on the inner class no longer sizes the element.

### Fixed

- A partly selected `<neuwo-checkbox>` (`indeterminate`) is filled blue with a white dash, like a
  checked one and like a native checkbox, instead of a white dash on the empty dark box.
- A `<neuwo-combobox>` without `searchable` shows its focus when clicked, as a clicked
  `<neuwo-input>` does. Its trigger is a button, which showed focus only after a key press.
- A required field's asterisk (`.neuwo-field__required`) takes the label's colour instead of red,
  so it no longer reads as an error message.

## 0.2.0

Every component now renders into its own light DOM from one template that the browser, the server
and React share, so a server-rendered or statically generated page shows finished components in its
first paint, and a form of Neuwo fields submits before the script has loaded. It is a breaking
release: every class, token and keyframes name gains a `neuwo-` prefix, the stylesheet must be
linked, and the form controls work through the native controls inside them, as the table below sets
out.

### Migrating from 0.1

| In 0.1 | In 0.2 | What to do |
| --- | --- | --- |
| Classes such as `.btn`, `.btn--solid`, `.field__label` and `.markdown`, and keyframes such as `button-spin` | `.neuwo-btn`, `.neuwo-btn--solid`, `.neuwo-field__label`, `.neuwo-markdown` and `neuwo-button-spin` | Add `neuwo-` to every class and keyframes name of the library in your markup and CSS. The few names that changed beyond the prefix are under Breaking. |
| Tokens such as `--color-blue` and `--space-3`, and component properties such as `--copy-inset` | `--neuwo-color-blue`, `--neuwo-space-3` and `--neuwo-copy-inset` | Add `neuwo-` to every custom property of the library that you set or read. |
| `neuwo-button::part(button) { ... }` | `neuwo-button .neuwo-btn { ... }` | Restyle through the class that replaced each part, listed below, with the element name in front so the rule wins without `!important`. |
| `neuwo.js` carried every component's styles, adopted the tokens and injected the font faces; `neuwo.css` held the foundation layers only | `neuwo-components.css` holds the font faces, the tokens and every component's styles, and the first paint needs it; `neuwo.css` is that plus typography, the page surface, navigation links and the Markdown surface | Link one of them on every page, or import it where you import the library, in a bundler too. A `<style data-neuwo-fonts>` is no longer needed or read. |
| `neuwo.js` was the one script for every page | `neuwo.js` is the lean build, with no CSS in it; `neuwo-standalone.js` embeds `neuwo-components.css` | Load `neuwo.js` beside the linked stylesheet. A page that can only add a script loads `neuwo-standalone.js` instead. |
| React rendered a bare `<neuwo-*>` tag and the element drew itself | The library's JSX runtime renders each element's markup, on the server too | Set `"jsxImportSource": "@neuwo/web-ui-library--demo"` in `tsconfig.json`, and in MDX's own options if you use MDX. Without it, a server-rendered app first reports React hydration error #418, and a `<neuwo-*>` tag React renders stays bare. |
| The fields, checkbox, toggle, radio group, segmented control and button were form-associated through `ElementInternals`, and all but the button dispatched their own `change`; the checkbox, toggle, radio, radio group and segmented control kept their `checked` or `value` attribute in step with the user | A native control inside each element does the form work, in server-rendered markup before the script loads too, and each value is submitted once. The `value` and `checked` attributes are starting values, as on native controls. `input` and `change` come from the inner control, with it as `event.target`, except on the combobox and the segmented control, which dispatch their own | Read the element from `event.currentTarget`, and its current state from the `value` or `checked` property rather than the attribute. The other consequences are under Breaking. |
| In React, `onChange` on a field fired when the user committed a value | `onChange` fires on every keystroke, as on React's own `<input>`, and `value` and `checked` make a field controlled | Update your state in `onChange`, as for a native input, or use `defaultValue` or `defaultChecked` for an uncontrolled field. |
| `--badge-shimmer-width: 35%` | `--neuwo-badge-shimmer-percent: 35` | Use the new name with a unitless number. A value with a unit removes the sweep, and neither the old name nor `--neuwo-badge-shimmer-width` is read. |
| `defaultValue` on a `<neuwo-range>` without a `value` read `""` | It reads the midpoint between `min` and `max`, where a native range starts | Expect the midpoint, or set `value`. |
| `defaultValue` on a `<neuwo-combobox>` read its `value` attribute as written | It reads the starting value the combobox resolved, so a `value` that names a disabled or missing option reads as the first enabled option marked `selected`, else `""` | Name an enabled option in `value`. |
| CDN URLs at `@0.1` | CDN URLs at `@0.2` | Change `@0.1` to `@0.2`, or pin `@0.2.0`, and serve the stylesheet and the script from the same version. |

Authoring with `slot` is unchanged: children marked `slot="actions"`, `slot="title"` and so on go
where they went in 0.1.

Each part became a class, in the order listed:

| Element | Parts in 0.1 | Classes in 0.2 |
| --- | --- | --- |
| `<neuwo-button>` | `button` | `.neuwo-btn` |
| `<neuwo-badge>`, `<neuwo-deal-id>`, `<neuwo-status-dot>`, `<neuwo-logo>` | `badge`, `value`, `dot`, `logo` | `.neuwo-badge`, `.neuwo-deal-id`, `.neuwo-status-dot`, `.neuwo-logo` |
| `<neuwo-copy>` | `button`, `status` | `.neuwo-copy__button`, `.neuwo-copy__status` |
| `<neuwo-notice>` | `notice`, `content`, `title`, `message`, `actions`, `dismiss` | `.neuwo-notice`, `.neuwo-notice__content`, `.neuwo-notice__title`, `.neuwo-notice__message`, `.neuwo-notice__actions`, `.neuwo-notice__dismiss` |
| `<neuwo-cta>` | `cta`, `inner`, `headline`, `sub`, `field`, `status`, `actions` | `.neuwo-cta`, `.neuwo-cta__inner`, `.neuwo-cta__headline`, `.neuwo-cta__sub`, `.neuwo-cta__field`, `.neuwo-cta__status`, `.neuwo-cta__actions` |
| `<neuwo-input>`, `<neuwo-textarea>`, `<neuwo-range>`, `<neuwo-combobox>` | `field`, `label`, `input`, `error` | `.neuwo-field`, `.neuwo-field__label`, `.neuwo-input`, `.neuwo-field__error` |
| `<neuwo-combobox>` | `chevron`, `popup` | `.neuwo-combobox__chevron`, `.neuwo-combobox__popup` |
| `<neuwo-checkbox>`, `<neuwo-radio>` | `field`, `input`, `label` | `.neuwo-form-check`, `.neuwo-form-check__input`, `.neuwo-form-check__label` |
| `<neuwo-toggle>` | `field`, `input`, `track`, `label` | `.neuwo-form-toggle`, `.neuwo-form-toggle__input`, `.neuwo-form-toggle__track`, `.neuwo-form-toggle__label` |
| `<neuwo-radio-group>` | `group`, `legend`, `options` | `.neuwo-radio-group`, `.neuwo-radio-group__legend`, `.neuwo-radio-group__options` |
| `<neuwo-segmented>` | `group`, `indicator`, `option` | `.neuwo-segmented`, `.neuwo-segmented__indicator`, `.neuwo-segmented__option` |
| `<neuwo-checkbox>`, `<neuwo-toggle>`, `<neuwo-radio-group>`, `<neuwo-segmented>` | `error` | `.neuwo-choice__error` |

### Breaking

- Names that changed beyond the prefix:
  - `.control-error`, the error line of the checkbox, toggle, radio group and segmented control, is
    `.neuwo-choice__error`.
  - `.is-active`, on the combobox row the keyboard highlights, is `.neuwo-combobox__option--active`.
  - `.copy`, the copy control, is `.neuwo-copy__button`; `.neuwo-copy` is now the wrapper's root.
    `.copy--done` is gone: for 1.2 s after a copy the element carries `data-neuwo-state="copied"`,
    or `"failed"` when the clipboard refused.
  - `.segmented__indicator--animated` and the indicator's `data-active` are gone: a placed pill
    carries `data-neuwo-placed`.
- Markup that a restyling rule may meet:
  - The checkbox, toggle, radio group and segmented control render a `.neuwo-choice` root around
    their row and the error line.
  - Both `<neuwo-cta>` variants render `.neuwo-cta__inner`, around `.neuwo-cta__body` and
    `.neuwo-cta__actions`, and the banner lays out its columns there instead of on
    `.neuwo-cta--banner`, so restyle its columns or gap on `.neuwo-cta__inner`.
  - The sub of `<neuwo-cta>` and the title of `<neuwo-notice>` are `<div>` wrappers, not `<p>`, so
    they can hold a paragraph.
  - In `<neuwo-cta>`, `data-accent` paints at any depth in the headline and no longer in the sub,
    field or actions, and the `pulse` ring goes on the first `<neuwo-button>` among the actions.
- Forms, beyond the table:
  - A required control left empty reports the browser's own message, such as "Please fill out this
    field.", instead of "Please select an option." or "Please tick this box.".
  - A form reset returns each control to its starting value and no longer clears `error`.
  - `data-*` on the button, the fields, the checkbox and the toggle stays on the element and is no
    longer copied onto the inner control, so a query such as `[data-testid="email"]` matches one
    node. `aria-*` and `title` are still copied.
  - A scripted `click()` on a `<neuwo-button>` no longer submits its form. Call `click()` on the
    inner `.neuwo-btn`, or `form.requestSubmit()`.
  - A `<neuwo-radio-group>` needs a `name` to group its radios, as native radios do. Without one, a
    radio that carries no `name` of its own stands alone, and the group warns once in the console.
  - A `value` on `<neuwo-segmented>` that names a disabled or missing option is neither shown nor
    submitted. It resolves as the combobox's does, to the first enabled option marked `selected`,
    else to nothing, which submits an empty value; in 0.1 that option showed as selected and the
    form submitted the value.
  - The hidden form values of `<neuwo-combobox>` and `<neuwo-segmented>` are text fields, and so is
    the trigger of a `searchable` combobox, so a form whose only other field is one text input, with
    no submit button, no longer submits when the user presses Enter in that input. Add a submit
    button to keep it.
  - In React, write the `<option>` and `<optgroup>` elements of a combobox or segmented control in
    place, with only fragments, context providers or React's own wrappers such as `Suspense` around
    them; options a component of yours renders are never listed. Write the `<neuwo-radio>` elements
    of a radio group in place too, where elements, fragments and React's own wrappers may sit
    around them: a radio inside a component of yours, rendered through a portal or by another React
    root, or passed as `children` from a Server Component to the Client Component that renders the
    group gets none of the group's attributes, so the browser does not group it. Client development
    builds warn about each case.
- An indeterminate `<neuwo-checkbox>` no longer writes `aria-checked="mixed"` onto its checkbox, since
  the native indeterminate state is announced as mixed. `indeterminate` is the inner checkbox's own
  property, which a click clears.
- `<neuwo-segmented>` is always horizontal: `orientation` is gone, and its radiogroup carries
  `aria-orientation="horizontal"`.
- `role="status"` moves from the `<neuwo-notice>` element to its `.neuwo-notice` card, and the element
  no longer writes `role` onto itself. A `role` you set on the element, such as `role="dialog"` on a
  consent banner, still takes its place, and the card then carries none. An `aria-label` or
  `aria-live` on the element no longer names or qualifies the status region.
- `<neuwo-copy>` always renders its control, since the markup cannot know whether the clipboard is
  reachable. Where it is not, as in an insecure context, a click announces `failed-label`. A copy
  with no text to write announces `failed-label` too, and fires no `copied`.

### Added

- `./server` exports `expand(html, { prefix })` and `eleventyPlugin`. `expand` writes every
  `<neuwo-*>` tag in an HTML string out as its full markup, so the page paints before any script
  runs; the plugin runs it on every `.html` output of an Eleventy site. Its HTML parser is bundled,
  so the package keeps no runtime dependencies. `prefix` names the ids `expand` writes (default
  `neuwo-s`), so fragments expanded apart and joined into one page can each take their own; one that
  breaks the rules in the README throws a `TypeError`. A `<p>` that holds only block components, as
  Markdown writes around a component on a line of its own, is replaced by the components, so the
  browser cannot move their markup out of it.
- `./jsx-runtime` and `./jsx-dev-runtime`, for `jsxImportSource`, wrap React's runtime and render every
  `<neuwo-*>` element's markup, with a `react-server` build for Server Components. Elements leave
  markup React rendered to React, so children you pass keep their state and DOM nodes across
  re-renders. A bundler resolves `.` and the two runtimes to a split build in `dist/bundler/`, which
  shares the template code through one chunk, so an app that loads both downloads it once; import
  the runtimes through the package name. React stays an optional peer dependency.
- JSX types for every element come with `jsxImportSource`, generated from the manifest: each
  attribute's allowed values, each custom event's `detail` (`copied` is
  `CustomEvent<{ text: string }>`), and an `onChange` whose `event.target` is the inner control, or
  the element on the combobox and the segmented control. `NeuwoChangeEvent`, from the JSX runtime,
  types a handler you define apart from the element.
- Through the JSX runtime, the fields, checkbox, toggle, radio, radio group, combobox and segmented
  control follow React's own models: `value` and `checked` controlled, `defaultValue` and
  `defaultChecked` uncontrolled, and in Server Components `value` and `checked` as starting values.
  React Hook Form's `register` reads, resets and validates each as it does a native field. Hydration
  keeps a value the browser restores on a back navigation, or one the user or a script enters before
  the page hydrates, with no hydration error, and handlers such as `oncopied` and `ondismiss` run
  from the first event. Markup React renders once and never hydrates, such as an Astro component
  with no client directive, keeps its `defaultValue` or `defaultChecked` when a script changes an
  attribute later. React DevTools names each element's component after its tag.
- `neuwo-components.css`, `foundation/fonts.css` and `components/reset.css` are published. The
  reset is written with CSS nesting, so a tool that reads the file must support nesting, as
  lightningcss does.
- `neuwo-standalone.js` serves a page that can only add a script. It embeds
  `neuwo-components.css`, applies it before it defines the elements and only when the page has not
  linked it, and loads the fonts from beside itself.
- An element adopts the markup the server or React rendered as it finds it, writing nothing to it.
  A change a script makes to a rendered element, such as setting `textContent`, appending a child
  with a `slot`, changing content inside a wrapper, or setting `aria-*`, `title` or `role`, is fitted
  into its markup in a microtask, and `refresh()` fits it at once. An attribute set on a copy made
  with `cloneNode(true)` reaches the copy's markup at once. The README covers copies and elements a
  script takes out of the page.
- The ids the library writes are unique on the page. A copy of a rendered element takes fresh ids
  when it is inserted, and its label and `aria-*` references follow them; ids that React's `useId`
  made are left as React wrote them, so hydration finds them.
- New classes, listed in the README's restyling table: `.neuwo-btn--block` and the button's
  `display: contents` wrappers `.neuwo-btn__start`, `.neuwo-btn__label` and `.neuwo-btn__end`;
  `.neuwo-choice` and `.neuwo-choice--flush`; `.neuwo-copy` and `.neuwo-copy__content`;
  `.neuwo-cta__body`; `.neuwo-field__label-content` and `.neuwo-field__label-text`;
  `.neuwo-textarea`; `.neuwo-radio-group--horizontal`; `.neuwo-combobox__option-label` and
  `.neuwo-segmented__option-label`; and the hidden `.neuwo-combobox__options`,
  `.neuwo-combobox__form-value`, `.neuwo-segmented__options` and `.neuwo-segmented__form-value`.
- `<neuwo-segmented>` dispatches `input` just before `change`, once each per pick, gains
  `commit(value)`, which picks as the user does, and moves to its first and last enabled option on
  Home and End.
- `<neuwo-radio>` no longer needs to be a direct child of its group: a radio inside a `<div>` or a
  `<label>` in the group joins it, and one inside a nested group belongs to that group. A radio
  outside any group is a radio of its own, with its own `name`, `value`, `checked`, `required`,
  `disabled` and `form`.
- The README covers setup per kind of site (React, Next.js, Eleventy, other Node builds, plain HTML
  and script-only pages), versioning, and React 19 props and events with React 18's limits.

### Changed

- The markup is in the page, so page CSS meets it. Page element rules such as
  `button { text-transform: uppercase }` or `div { display: block }` do not reach the markup a
  component renders: its text properties come from the host, so casing set on `neuwo-badge` still
  applies, and every other property starts from the browser's default. Your own content inside a
  component, including foundation classes such as `.neuwo-callout`, is left alone.
- A native control a component renders for the user to type into or pick from, such as the `<input>`
  in `<neuwo-input>`, the combobox's trigger or a segmented option, keeps its own text defaults
  instead of taking them from the host, so a centred or uppercase container does not restyle what
  the user types or picks, and a container with a tall line height no longer makes the combobox
  taller than an input beside it. `<neuwo-button>`'s label is your content, so it takes its line
  height, style, casing and spacing from the host.
- The first paint shows state the script used to compute: the filled part of a range track
  (`--neuwo-range-fill`, in WebKit and Blink), a combobox's selected label, the error lines, and the
  segmented control's selected option, which carries `aria-checked="true"`. The segmented control's
  sliding pill is placed only once the user picks, so nothing shifts when the script loads.
- `<neuwo-radio>` copies `aria-*` and `title` onto its input, and `<neuwo-radio-group>` and
  `<neuwo-segmented>` onto their radiogroup, which needs them for its accessible name. On every
  element that copies them, a later change or removal now reaches the control too.
- On the fields, checkbox, toggle, radio, radio group and segmented control, `form`, `validity`,
  `validationMessage`, `checkValidity()`, `reportValidity()` and `setCustomValidity()` act on the
  native control, or on the radios of a group. `focus()` on the segmented control and the radio group
  moves to the selected option or checked radio, else the first enabled one. `name`, `form`,
  `defaultValue` and `defaultChecked` are properties where they apply, and the checkbox and toggle
  have a read-only `type` of `"checkbox"`, so React Hook Form reads them as native checkboxes.
- Typing into the filter of a `searchable` `<neuwo-combobox>` no longer fires `input` on the element,
  so `onInput` and `onChange` in React fire only when the user picks a value. A value the browser or
  a script writes into its hidden form value, such as autofill, shows in the trigger.
- `neuwo.js` can be imported on a server, where it registers nothing, and loading it twice no
  longer throws.

### Fixed

- Brand fonts load when the library goes through a bundler. The faces are CSS `url()`s in the
  stylesheet, which the bundler copies into the app's output; 0.1 injected them from the script,
  so a bundled script pointed them beside its own chunk, where they were missing.
- The font swap shifts the layout less. The fallback faces take their size, ascent, descent and line
  gap from the fonts' own metrics, with a face for every weight token from 400 to 800 and italic
  faces for Noto Sans, drawn from Arial, or from Liberation Sans or Arimo where Arial is missing, as
  on most Linux systems. Text in the fallback is within 0.6% of the font's width at every token
  weight in Chromium and Firefox.
- Under forced colours, such as a high contrast theme, every control shows its keyboard focus, as an
  outline the theme paints (`--neuwo-outline-focus` at `--neuwo-outline-focus-offset`), and what
  the theme hid is drawn in its colours: the selected segmented option and its pill, the range's
  track and fill, the combobox's selected and active options and its chevron, the copy and notice
  glyphs, the status dot, the checkbox's tick and dash, the radio's dot and the toggle's thumb.
- Components and the Markdown surface mirror in a right-to-left page or container: list indents,
  the quote and callout bars, table cell alignment, the combobox's chevron, value and list, the
  required marker's gap, the toggle's thumb and the range's fill. Set the `dir` attribute rather than
  only the CSS `direction`, since the toggle's thumb, and the range's fill in Chromium, follow the
  attribute. In a right-to-left context the segmented control's ArrowLeft and ArrowRight move to the
  next and the previous option.
- The `<neuwo-combobox>` list stays inside the viewport. It is never wider than the viewport less
  8px on each side, moves back towards its trigger's other edge where it would cross the viewport's
  edge, and wraps an option label too long for it.
- A click or tap into the field of a `searchable` `<neuwo-combobox>` opens the list and leaves it
  open, where the popover's light dismiss closed it again on release, and `isOpen` and
  `aria-expanded` follow a light dismiss as the list hides, where they lagged a frame behind. A
  click on a label of a combobox, and `reportValidity()` or a submit that fails validation on a
  required `searchable` one, focus its trigger without opening the list, as on a native `<select>`;
  Tab still opens a `searchable` one.
- The rows a `searchable` `<neuwo-combobox>` filters out are hidden, where they stayed on screen, and
  the chevron turns while the list is open.
- A form reset returns a `<neuwo-combobox>` whose `value` names no enabled option to the option
  marked `selected`, where it cleared the selection.
- In Firefox the `<neuwo-range>` thumb is the size `--neuwo-range-thumb-size` sets, border included,
  as in Chromium, where it was 4px wider and taller.
- The tick and dash of `<neuwo-checkbox>` and the dot of a checked `<neuwo-radio>` are drawn in
  `--neuwo-color-white`, so they follow that token. Each mark is a mask on the `::before` of
  `.neuwo-form-check__input`, where it was a background image on the input, so restyle the mark
  there.
- The transition on the box of `<neuwo-checkbox>` stops under `prefers-reduced-motion: reduce`, as
  the toggle's did.
- In a disabled `<neuwo-segmented>` the selected option dims with the others, as a checked disabled
  checkbox does, and each option keeps its label on one line, so it no longer wraps in a narrow
  container.
- `<neuwo-copy>` copies `aria-*` and `title` from the element onto its control, so an `aria-label`
  on the element names the control when `label` is not set; `label` still wins. A failed copy draws
  a cross in the error colour, where only a screen reader learned of the failure.
- `<neuwo-cta>` no longer warns about a missing headline or action in a band a script inserts and
  fills later, such as one that gets its buttons after an `await`: it checks such a band once a
  change adds to its children. A band a script inserts empty and never fills no longer warns at all,
  where 0.1 warned when it connected; only the console output changes. Its scan line sweeps with
  `transform` instead of `left`, so a visible CTA no longer shifts layout, and the spotlight isolates
  its stacking context, so the hover glow stays behind the card instead of disappearing behind a
  page section's background.
- The `<neuwo-badge>` shimmer sweeps with `transform` instead of `left`, so it no longer shifts
  layout.
- A property a script sets on an element before the element is defined, such as `loading` on a
  button or `checked` on a checkbox from an inline script on a page whose module is deferred, reaches
  the element when it is defined, where it hid the element's own property and never reached the
  markup.

## 0.1.0

First published release. Pre-1.0, so breaking changes ship in minor bumps until the API settles.

- Renamed to the Neuwo Web UI Library, published as `@neuwo/web-ui-library--demo`.
- Licensed MIT.
- Published artefacts: `dist/neuwo.js`, the combined `dist/neuwo.css`, each foundation sheet and
  component recipe as its own file, the three woff2 faces, the four wordmark SVGs, generated
  types, and `custom-elements.json`.
